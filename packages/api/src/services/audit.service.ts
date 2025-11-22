import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { DatabaseService } from './database.service';

/**
 * Audit Action Types for comprehensive logging
 */
export enum AuditAction {
  // Authentication
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_REGISTER = 'auth.register',
  AUTH_TOKEN_REFRESH = 'auth.token_refresh',
  AUTH_FAILED = 'auth.failed',

  // Identity
  IDENTITY_CREATE = 'identity.create',
  IDENTITY_UPDATE = 'identity.update',
  IDENTITY_DELETE = 'identity.delete',
  IDENTITY_VIEW = 'identity.view',

  // Verification
  VERIFICATION_REQUEST = 'verification.request',
  VERIFICATION_COMPLETE = 'verification.complete',
  VERIFICATION_FAIL = 'verification.fail',

  // Credentials
  CREDENTIAL_ISSUE = 'credential.issue',
  CREDENTIAL_REVOKE = 'credential.revoke',
  CREDENTIAL_VERIFY = 'credential.verify',

  // PII Access (CRITICAL for compliance)
  PII_STORE = 'pii.store',
  PII_ACCESS = 'pii.access',
  PII_DECRYPT = 'pii.decrypt',
  PII_DELETE = 'pii.delete',
  PII_EXPORT = 'pii.export',

  // Staking
  STAKING_STAKE = 'staking.stake',
  STAKING_UNSTAKE = 'staking.unstake',
  STAKING_CLAIM = 'staking.claim',
  STAKING_SLASH = 'staking.slash',

  // Admin
  ADMIN_CONFIG_CHANGE = 'admin.config_change',
  ADMIN_USER_MODIFY = 'admin.user_modify',
  ADMIN_KEY_ROTATE = 'admin.key_rotate',

  // Consent
  CONSENT_GRANT = 'consent.grant',
  CONSENT_REVOKE = 'consent.revoke',
}

export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export interface AuditLogEntry {
  action: AuditAction | string;
  userId?: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  status?: 'success' | 'failure';
  errorMessage?: string;
  severity?: AuditSeverity;
  piiAccessed?: string[];
}

export interface AuditLogRecord extends AuditLogEntry {
  id: string;
  hash: string;
  previousHash: string;
  createdAt: Date;
}

/**
 * Enhanced Audit Service with Hash Chain
 *
 * Features:
 * - Cryptographic hash chain for tamper detection
 * - PII access logging for compliance
 * - Integrity verification
 * - Compliance export functionality
 */
@Injectable()
export class AuditService implements OnModuleInit {
  private readonly logger = new Logger(AuditService.name);
  private readonly enabled: boolean;
  private readonly hmacSecret: string;

  // Hash chain state
  private lastHash: string = '0'.repeat(64);
  private hashLock: Promise<void> = Promise.resolve();
  private initialized: boolean = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    this.enabled = this.configService.get('logging.enableAuditLogging') !== false;
    this.hmacSecret = this.configService.get('AUDIT_HMAC_SECRET') || 'default-audit-secret-change-in-production';
  }

  async onModuleInit(): Promise<void> {
    await this.initializeHashChain();
  }

  /**
   * Initialize hash chain from last database entry
   */
  private async initializeHashChain(): Promise<void> {
    try {
      const lastEntry = await this.databaseService.auditLog.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { hash: true },
      });

      if (lastEntry?.hash) {
        this.lastHash = lastEntry.hash;
      }

      this.initialized = true;
      this.logger.log('Audit hash chain initialized');
    } catch (error) {
      this.logger.warn(`Failed to initialize hash chain: ${(error as Error).message}`);
      this.initialized = true; // Continue with default hash
    }
  }

  /**
   * Compute HMAC-SHA256 hash for audit entry
   */
  private computeHash(
    entry: AuditLogEntry,
    previousHash: string,
    timestamp: Date,
  ): string {
    const data = JSON.stringify({
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      userId: entry.userId,
      status: entry.status,
      previousHash,
      timestamp: timestamp.toISOString(),
    });

    return createHmac('sha256', this.hmacSecret).update(data).digest('hex');
  }

  /**
   * Log an audit entry with hash chain integrity
   */
  async log(entry: AuditLogEntry): Promise<string | null> {
    if (!this.enabled) return null;

    // Serialize hash chain updates to prevent race conditions
    const previousLock = this.hashLock;
    let resolveCurrentLock: () => void;
    this.hashLock = new Promise((resolve) => {
      resolveCurrentLock = resolve;
    });

    try {
      await previousLock;

      const timestamp = new Date();
      const previousHash = this.lastHash;
      const hash = this.computeHash(entry, previousHash, timestamp);

      const record = await this.databaseService.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          requestId: entry.requestId,
          metadata: {
            ...entry.metadata,
            severity: entry.severity || AuditSeverity.INFO,
            piiAccessed: entry.piiAccessed,
          },
          status: entry.status || 'success',
          errorMessage: entry.errorMessage,
          hash,
          previousHash,
        },
      });

      this.lastHash = hash;
      return record.id;
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${(error as Error).message}`);
      return null;
    } finally {
      resolveCurrentLock!();
    }
  }

  /**
   * Log PII access - CRITICAL for compliance
   */
  async logPIIAccess(
    userId: string,
    identityId: string,
    fieldsAccessed: string[],
    purpose: string,
    request?: { ip?: string; headers?: Record<string, string> },
  ): Promise<void> {
    await this.log({
      action: AuditAction.PII_ACCESS,
      userId,
      resource: 'encrypted_pii',
      resourceId: identityId,
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent'],
      requestId: request?.headers?.['x-request-id'],
      metadata: { purpose },
      piiAccessed: fieldsAccessed,
      severity: AuditSeverity.CRITICAL,
    });
  }

  /**
   * Log PII decryption - CRITICAL for compliance
   */
  async logPIIDecrypt(
    userId: string,
    identityId: string,
    fieldDecrypted: string,
    purpose: string,
    request?: { ip?: string; headers?: Record<string, string> },
  ): Promise<void> {
    await this.log({
      action: AuditAction.PII_DECRYPT,
      userId,
      resource: 'encrypted_pii',
      resourceId: identityId,
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent'],
      requestId: request?.headers?.['x-request-id'],
      metadata: { purpose, field: fieldDecrypted },
      piiAccessed: [fieldDecrypted],
      severity: AuditSeverity.CRITICAL,
    });
  }

  // =====================
  // Convenience Methods
  // =====================

  async logIdentityAction(
    action: 'create' | 'update' | 'delete' | 'verify',
    identityId: string,
    userId?: string,
    metadata?: Record<string, any>,
    request?: { ip?: string; headers?: Record<string, string> },
  ): Promise<void> {
    await this.log({
      userId,
      action: `identity.${action}`,
      resource: 'identity',
      resourceId: identityId,
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent'],
      requestId: request?.headers?.['x-request-id'],
      metadata,
    });
  }

  async logVerificationAction(
    action: 'request' | 'complete' | 'fail' | 'expire',
    verificationId: string,
    userId?: string,
    metadata?: Record<string, any>,
    request?: { ip?: string; headers?: Record<string, string> },
  ): Promise<void> {
    await this.log({
      userId,
      action: `verification.${action}`,
      resource: 'verification',
      resourceId: verificationId,
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent'],
      requestId: request?.headers?.['x-request-id'],
      metadata,
    });
  }

  async logCredentialAction(
    action: 'issue' | 'revoke' | 'suspend' | 'verify',
    credentialId: string,
    userId?: string,
    metadata?: Record<string, any>,
    request?: { ip?: string; headers?: Record<string, string> },
  ): Promise<void> {
    await this.log({
      userId,
      action: `credential.${action}`,
      resource: 'credential',
      resourceId: credentialId,
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent'],
      requestId: request?.headers?.['x-request-id'],
      metadata,
    });
  }

  async logStakingAction(
    action: 'stake' | 'unstake' | 'claim' | 'slash',
    stakeId: string,
    userId?: string,
    metadata?: Record<string, any>,
    request?: { ip?: string; headers?: Record<string, string> },
  ): Promise<void> {
    await this.log({
      userId,
      action: `staking.${action}`,
      resource: 'stake',
      resourceId: stakeId,
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent'],
      requestId: request?.headers?.['x-request-id'],
      metadata,
    });
  }

  async logAuthAction(
    action: 'login' | 'logout' | 'refresh' | 'register' | 'password_reset',
    userId?: string,
    metadata?: Record<string, any>,
    request?: { ip?: string; headers?: Record<string, string> },
    status: 'success' | 'failure' = 'success',
    errorMessage?: string,
  ): Promise<void> {
    await this.log({
      userId,
      action: `auth.${action}`,
      resource: 'auth',
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent'],
      requestId: request?.headers?.['x-request-id'],
      metadata,
      status,
      errorMessage,
    });
  }

  // =====================
  // Integrity Verification
  // =====================

  /**
   * Verify audit log integrity
   * Checks the hash chain for tampering
   */
  async verifyIntegrity(
    startId?: string,
    endId?: string,
  ): Promise<{
    valid: boolean;
    checkedCount: number;
    firstInvalidId?: string;
    error?: string;
  }> {
    try {
      const where: any = {};
      if (startId) where.id = { gte: startId };
      if (endId) where.id = { ...where.id, lte: endId };

      const entries = await this.databaseService.auditLog.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          hash: true,
          previousHash: true,
          action: true,
          resource: true,
          resourceId: true,
          userId: true,
          status: true,
          createdAt: true,
        },
      });

      if (entries.length === 0) {
        return { valid: true, checkedCount: 0 };
      }

      let previousHash = entries[0].previousHash || '0'.repeat(64);
      let checkedCount = 0;

      for (const entry of entries) {
        // Check chain linkage
        if (entry.previousHash !== previousHash) {
          return {
            valid: false,
            checkedCount,
            firstInvalidId: entry.id,
            error: 'Hash chain broken - possible tampering detected',
          };
        }

        // Verify hash computation
        const computedHash = this.computeHash(
          {
            action: entry.action,
            resource: entry.resource,
            resourceId: entry.resourceId || undefined,
            userId: entry.userId || undefined,
            status: entry.status as 'success' | 'failure',
          },
          entry.previousHash!,
          entry.createdAt,
        );

        if (entry.hash && computedHash !== entry.hash) {
          return {
            valid: false,
            checkedCount,
            firstInvalidId: entry.id,
            error: 'Hash mismatch - entry may have been modified',
          };
        }

        previousHash = entry.hash || previousHash;
        checkedCount++;
      }

      return { valid: true, checkedCount };
    } catch (error) {
      return {
        valid: false,
        checkedCount: 0,
        error: `Verification failed: ${(error as Error).message}`,
      };
    }
  }

  // =====================
  // Query Methods
  // =====================

  async getAuditLogs(
    filters: {
      userId?: string;
      action?: string;
      resource?: string;
      startDate?: Date;
      endDate?: Date;
    },
    pagination: { page: number; limit: number },
  ): Promise<{ items: any[]; total: number }> {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = { contains: filters.action };
    if (filters.resource) where.resource = filters.resource;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [items, total] = await Promise.all([
      this.databaseService.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.databaseService.auditLog.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Export audit logs for compliance purposes
   */
  async exportForCompliance(
    startDate: Date,
    endDate: Date,
    includeActions?: string[],
  ): Promise<AuditLogRecord[]> {
    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (includeActions?.length) {
      where.action = { in: includeActions };
    }

    const entries = await this.databaseService.auditLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    // Log the export itself
    await this.log({
      action: 'audit.export',
      resource: 'audit_log',
      metadata: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        recordCount: entries.length,
        actions: includeActions,
      },
      severity: AuditSeverity.WARNING,
    });

    return entries as AuditLogRecord[];
  }

  /**
   * Get PII access logs for a specific identity
   */
  async getPIIAccessLogs(
    identityId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any[]> {
    const where: any = {
      resourceId: identityId,
      action: {
        in: [
          AuditAction.PII_ACCESS,
          AuditAction.PII_DECRYPT,
          AuditAction.PII_EXPORT,
        ],
      },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    return this.databaseService.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}
