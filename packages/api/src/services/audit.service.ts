import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  status?: 'success' | 'failure';
  errorMessage?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly enabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    this.enabled = this.configService.get('logging.enableAuditLogging') !== false;
  }

  async log(entry: AuditLogEntry): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.databaseService.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          requestId: entry.requestId,
          metadata: entry.metadata,
          status: entry.status || 'success',
          errorMessage: entry.errorMessage,
        },
      });
    } catch (error) {
      // Don't throw - audit logging should not break the main flow
      this.logger.error(`Failed to write audit log: ${error.message}`);
    }
  }

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
}
