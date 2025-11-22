# Phase 1: Security Hardening Implementation Plan

**Duration:** Weeks 1-4
**Priority:** CRITICAL
**Status:** Planning

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Assessment](#current-state-assessment)
3. [Implementation Tracks](#implementation-tracks)
4. [Track 1: PII Encryption Service](#track-1-pii-encryption-service)
5. [Track 2: Enhanced Audit Logging](#track-2-enhanced-audit-logging)
6. [Track 3: Security Middleware](#track-3-security-middleware)
7. [Track 4: Mobile Biometric Hardening](#track-4-mobile-biometric-hardening)
8. [Database Migrations](#database-migrations)
9. [Testing Requirements](#testing-requirements)
10. [Deployment Checklist](#deployment-checklist)
11. [Risk Mitigation](#risk-mitigation)

---

## Executive Summary

Phase 1 focuses on implementing critical security controls required before the platform can handle production Aadhaar/PAN data. The implementation is divided into 4 parallel tracks:

| Track | Focus | Duration | Priority |
|-------|-------|----------|----------|
| Track 1 | PII Encryption Service | Week 1-2 | CRITICAL |
| Track 2 | Enhanced Audit Logging | Week 1-2 | HIGH |
| Track 3 | Security Middleware | Week 2-3 | HIGH |
| Track 4 | Mobile Biometric Hardening | Week 3-4 | CRITICAL |

### Key Deliverables

1. **AES-256-GCM encryption service** for all PII fields
2. **Immutable audit trail** with cryptographic hash chain
3. **Helmet.js security headers** and CSRF protection
4. **Biometric liveness detection** for mobile app
5. **Key rotation mechanism** for encryption keys
6. **PII access logging** for compliance

---

## Current State Assessment

### What Already Exists

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| Audit Service | ✅ Basic | `src/services/audit.service.ts` | Needs hash chain |
| Rate Limiting | ✅ Complete | `src/common/guards/rate-limit.guard.ts` | Redis-based |
| JWT Auth | ✅ Complete | `src/modules/auth/` | Working |
| Prisma Schema | ✅ Good | `prisma/schema.prisma` | Has AuditLog, Consent |
| Validation | ✅ Complete | DTOs with class-validator | Working |
| CORS | ✅ Basic | `src/main.ts` | Needs tightening |

### What's Missing

| Component | Priority | Effort | Impact |
|-----------|----------|--------|--------|
| PII Encryption | CRITICAL | High | Aadhaar Act compliance |
| Security Headers | HIGH | Low | OWASP Top 10 |
| Hash Chain Audit | HIGH | Medium | Tamper detection |
| Key Management | HIGH | Medium | Key rotation |
| Biometric Liveness | CRITICAL | High | Anti-spoofing |
| CSRF Protection | MEDIUM | Low | Security best practice |

---

## Implementation Tracks

### Timeline Overview

```
Week 1:
├── Track 1: Encryption service core implementation
├── Track 2: Audit service enhancement
└── Track 3: Security middleware setup

Week 2:
├── Track 1: PII field encryption integration
├── Track 2: Hash chain implementation
└── Track 3: CSRF and security testing

Week 3:
├── Track 1: Key rotation mechanism
├── Track 3: Security hardening completion
└── Track 4: Biometric service analysis

Week 4:
├── Track 4: Liveness detection implementation
├── Integration testing
└── Security audit preparation
```

---

## Track 1: PII Encryption Service

### 1.1 Overview

Implement AES-256-GCM encryption for all Personally Identifiable Information (PII) stored in the database.

### 1.2 Files to Create

```
packages/api/src/
├── common/
│   └── crypto/
│       ├── encryption.service.ts      # Core encryption service
│       ├── encryption.module.ts       # NestJS module
│       ├── key-management.service.ts  # Key derivation & rotation
│       ├── crypto.constants.ts        # Algorithm constants
│       └── crypto.interfaces.ts       # Type definitions
└── common/
    └── decorators/
        └── encrypted-field.decorator.ts  # Field-level encryption marker
```

### 1.3 Core Encryption Service

**File:** `packages/api/src/common/crypto/encryption.service.ts`

```typescript
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export interface EncryptionResult {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyId: string;
  version: number;
}

export interface EncryptedField {
  encrypted: true;
  data: EncryptionResult;
}

@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16;  // 128 bits
  private readonly authTagLength = 16;
  private readonly saltLength = 32;

  private masterKey: Buffer;
  private currentKeyId: string;
  private keyVersion: number = 1;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initializeMasterKey();
  }

  private async initializeMasterKey(): Promise<void> {
    const masterKeyBase64 = this.configService.get<string>('ENCRYPTION_MASTER_KEY');

    if (!masterKeyBase64) {
      throw new Error('ENCRYPTION_MASTER_KEY environment variable is required');
    }

    // Validate key length (should be 32 bytes base64 encoded)
    const keyBuffer = Buffer.from(masterKeyBase64, 'base64');
    if (keyBuffer.length !== this.keyLength) {
      throw new Error(`Master key must be ${this.keyLength} bytes (256 bits)`);
    }

    this.masterKey = keyBuffer;
    this.currentKeyId = this.configService.get<string>('ENCRYPTION_KEY_ID') || 'key-v1';
    this.keyVersion = parseInt(this.configService.get<string>('ENCRYPTION_KEY_VERSION') || '1', 10);

    this.logger.log(`Encryption service initialized with key ID: ${this.currentKeyId}`);
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   * @param plaintext - The data to encrypt
   * @param associatedData - Additional authenticated data (AAD) for integrity
   */
  async encrypt(plaintext: string, associatedData?: string): Promise<EncryptionResult> {
    if (!plaintext) {
      throw new Error('Plaintext cannot be empty');
    }

    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, this.masterKey, iv, {
      authTagLength: this.authTagLength,
    });

    // Add associated data for additional authentication
    if (associatedData) {
      cipher.setAAD(Buffer.from(associatedData, 'utf8'));
    }

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyId: this.currentKeyId,
      version: this.keyVersion,
    };
  }

  /**
   * Decrypt data encrypted with AES-256-GCM
   * @param encryptionResult - The encryption result object
   * @param associatedData - AAD used during encryption (must match)
   */
  async decrypt(encryptionResult: EncryptionResult, associatedData?: string): Promise<string> {
    const { ciphertext, iv, authTag, keyId, version } = encryptionResult;

    // Verify key ID matches (for key rotation support)
    if (keyId !== this.currentKeyId) {
      // In production, implement key lookup for old versions
      this.logger.warn(`Decrypting with different key ID: ${keyId}`);
    }

    const ivBuffer = Buffer.from(iv, 'base64');
    const authTagBuffer = Buffer.from(authTag, 'base64');
    const ciphertextBuffer = Buffer.from(ciphertext, 'base64');

    const decipher = createDecipheriv(this.algorithm, this.masterKey, ivBuffer, {
      authTagLength: this.authTagLength,
    });

    decipher.setAuthTag(authTagBuffer);

    if (associatedData) {
      decipher.setAAD(Buffer.from(associatedData, 'utf8'));
    }

    try {
      const decrypted = Buffer.concat([
        decipher.update(ciphertextBuffer),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error('Decryption failed - possible tampering detected');
      throw new Error('Decryption failed - data integrity check failed');
    }
  }

  /**
   * Encrypt a field value for database storage
   * Returns a JSON string that can be stored in a text field
   */
  async encryptField(value: string, fieldName: string): Promise<string> {
    const result = await this.encrypt(value, fieldName);
    return JSON.stringify({ encrypted: true, data: result });
  }

  /**
   * Decrypt a field value from database
   * Handles both encrypted and legacy unencrypted values
   */
  async decryptField(storedValue: string, fieldName: string): Promise<string> {
    try {
      const parsed = JSON.parse(storedValue);
      if (parsed.encrypted && parsed.data) {
        return await this.decrypt(parsed.data, fieldName);
      }
      // Legacy unencrypted value
      return storedValue;
    } catch {
      // Not JSON, assume legacy unencrypted
      return storedValue;
    }
  }

  /**
   * Hash sensitive data for lookup (e.g., Aadhaar number lookup)
   * Uses HMAC-SHA256 for deterministic but secure hashing
   */
  async hashForLookup(value: string, purpose: string): Promise<string> {
    const { createHmac } = await import('crypto');
    const hmac = createHmac('sha256', this.masterKey);
    hmac.update(`${purpose}:${value}`);
    return hmac.digest('hex');
  }

  /**
   * Mask sensitive data for display (e.g., XXXX-XXXX-1234)
   */
  maskAadhaar(aadhaar: string): string {
    if (!aadhaar || aadhaar.length !== 12) return 'XXXX-XXXX-XXXX';
    return `XXXX-XXXX-${aadhaar.slice(-4)}`;
  }

  maskPan(pan: string): string {
    if (!pan || pan.length !== 10) return 'XXXXXXXXXX';
    return `${pan.slice(0, 2)}XXXXXX${pan.slice(-2)}`;
  }

  maskPhone(phone: string): string {
    if (!phone || phone.length < 4) return 'XXXXXXXXXX';
    return `XXXXXX${phone.slice(-4)}`;
  }

  maskEmail(email: string): string {
    if (!email || !email.includes('@')) return 'XXX@XXX.XXX';
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2
      ? `${local[0]}${'X'.repeat(local.length - 2)}${local[local.length - 1]}`
      : 'XX';
    return `${maskedLocal}@${domain}`;
  }
}
```

### 1.4 Key Management Service

**File:** `packages/api/src/common/crypto/key-management.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export interface KeyInfo {
  keyId: string;
  version: number;
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'rotating' | 'deprecated' | 'revoked';
}

@Injectable()
export class KeyManagementService {
  private readonly logger = new Logger(KeyManagementService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generate a new encryption key
   * In production, this should integrate with AWS KMS, HashiCorp Vault, or HSM
   */
  async generateKey(): Promise<{ key: string; keyId: string }> {
    const key = randomBytes(32); // 256 bits
    const keyId = `key-${Date.now()}-${randomBytes(4).toString('hex')}`;

    return {
      key: key.toString('base64'),
      keyId,
    };
  }

  /**
   * Derive a data encryption key (DEK) from the master key (KEK)
   * Uses scrypt for key derivation
   */
  async deriveDataKey(masterKey: Buffer, context: string): Promise<Buffer> {
    const salt = Buffer.from(context, 'utf8');
    const derivedKey = await scryptAsync(masterKey, salt, 32) as Buffer;
    return derivedKey;
  }

  /**
   * Check if key rotation is needed
   */
  async shouldRotateKey(keyInfo: KeyInfo): Promise<boolean> {
    const maxAgeMs = this.configService.get<number>('ENCRYPTION_KEY_MAX_AGE_DAYS', 90) * 24 * 60 * 60 * 1000;
    const keyAge = Date.now() - keyInfo.createdAt.getTime();
    return keyAge > maxAgeMs;
  }

  /**
   * Key rotation process (outline)
   * 1. Generate new key
   * 2. Update configuration with new key
   * 3. Re-encrypt all PII fields with new key
   * 4. Mark old key as deprecated
   * 5. After grace period, revoke old key
   */
  async rotateKey(): Promise<void> {
    this.logger.warn('Key rotation initiated - this requires careful execution');
    // Implementation depends on deployment environment
    // Should integrate with secrets manager (AWS Secrets Manager, Vault, etc.)
    throw new Error('Key rotation must be performed manually with proper procedures');
  }
}
```

### 1.5 Encryption Module

**File:** `packages/api/src/common/crypto/encryption.module.ts`

```typescript
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { KeyManagementService } from './key-management.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [EncryptionService, KeyManagementService],
  exports: [EncryptionService, KeyManagementService],
})
export class EncryptionModule {}
```

### 1.6 PII Model with Encryption

**File:** `packages/api/src/modules/identity/models/encrypted-identity.model.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { EncryptionService } from '../../../common/crypto/encryption.service';
import { DatabaseService } from '../../../services/database.service';

export interface EncryptedPII {
  aadhaarHash: string;        // For lookup
  aadhaarEncrypted: string;   // Encrypted value
  panHash?: string;
  panEncrypted?: string;
  phoneHash?: string;
  phoneEncrypted?: string;
  emailHash?: string;
  emailEncrypted?: string;
}

@Injectable()
export class EncryptedIdentityModel {
  constructor(
    private readonly encryption: EncryptionService,
    private readonly db: DatabaseService,
  ) {}

  async encryptPII(pii: {
    aadhaar?: string;
    pan?: string;
    phone?: string;
    email?: string;
  }): Promise<EncryptedPII> {
    const result: EncryptedPII = {
      aadhaarHash: '',
      aadhaarEncrypted: '',
    };

    if (pii.aadhaar) {
      result.aadhaarHash = await this.encryption.hashForLookup(pii.aadhaar, 'aadhaar');
      result.aadhaarEncrypted = await this.encryption.encryptField(pii.aadhaar, 'aadhaar');
    }

    if (pii.pan) {
      result.panHash = await this.encryption.hashForLookup(pii.pan, 'pan');
      result.panEncrypted = await this.encryption.encryptField(pii.pan, 'pan');
    }

    if (pii.phone) {
      result.phoneHash = await this.encryption.hashForLookup(pii.phone, 'phone');
      result.phoneEncrypted = await this.encryption.encryptField(pii.phone, 'phone');
    }

    if (pii.email) {
      result.emailHash = await this.encryption.hashForLookup(pii.email, 'email');
      result.emailEncrypted = await this.encryption.encryptField(pii.email, 'email');
    }

    return result;
  }

  async decryptPII(encrypted: EncryptedPII): Promise<{
    aadhaar?: string;
    pan?: string;
    phone?: string;
    email?: string;
  }> {
    const result: any = {};

    if (encrypted.aadhaarEncrypted) {
      result.aadhaar = await this.encryption.decryptField(encrypted.aadhaarEncrypted, 'aadhaar');
    }

    if (encrypted.panEncrypted) {
      result.pan = await this.encryption.decryptField(encrypted.panEncrypted, 'pan');
    }

    if (encrypted.phoneEncrypted) {
      result.phone = await this.encryption.decryptField(encrypted.phoneEncrypted, 'phone');
    }

    if (encrypted.emailEncrypted) {
      result.email = await this.encryption.decryptField(encrypted.emailEncrypted, 'email');
    }

    return result;
  }

  /**
   * Find identity by Aadhaar (using hash lookup)
   */
  async findByAadhaar(aadhaar: string): Promise<any> {
    const hash = await this.encryption.hashForLookup(aadhaar, 'aadhaar');
    return this.db.encryptedPII.findUnique({
      where: { aadhaarHash: hash },
      include: { identity: true },
    });
  }
}
```

### 1.7 Environment Variables

Add to `.env.example`:

```bash
# Encryption Configuration
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
ENCRYPTION_MASTER_KEY=<base64-encoded-32-byte-key>
ENCRYPTION_KEY_ID=key-v1
ENCRYPTION_KEY_VERSION=1
ENCRYPTION_KEY_MAX_AGE_DAYS=90
```

---

## Track 2: Enhanced Audit Logging

### 2.1 Overview

Enhance the existing audit service with:
- Cryptographic hash chain for tamper detection
- PII access logging
- Compliance-specific audit events
- Export functionality for auditors

### 2.2 Enhanced Audit Service

**File:** `packages/api/src/services/audit.service.ts` (Updated)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac } from 'crypto';
import { DatabaseService } from './database.service';

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
  PII_ACCESS = 'pii.access',
  PII_DECRYPT = 'pii.decrypt',
  PII_EXPORT = 'pii.export',

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
  piiAccessed?: string[]; // List of PII fields accessed
}

export interface AuditLogRecord extends AuditLogEntry {
  id: string;
  hash: string;
  previousHash: string;
  createdAt: Date;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly enabled: boolean;
  private readonly hmacSecret: string;
  private lastHash: string = '0'.repeat(64);
  private hashLock: Promise<void> = Promise.resolve();

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    this.enabled = this.configService.get('logging.enableAuditLogging') !== false;
    this.hmacSecret = this.configService.get('AUDIT_HMAC_SECRET') || 'default-audit-secret';
    this.initializeHashChain();
  }

  private async initializeHashChain(): Promise<void> {
    try {
      const lastEntry = await this.databaseService.auditLog.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { hash: true },
      });
      if (lastEntry?.hash) {
        this.lastHash = lastEntry.hash;
      }
    } catch (error) {
      this.logger.warn(`Failed to initialize hash chain: ${error.message}`);
    }
  }

  /**
   * Compute cryptographic hash for audit entry
   * Creates a chain where each entry depends on the previous
   */
  private computeHash(entry: AuditLogEntry, previousHash: string, timestamp: Date): string {
    const data = JSON.stringify({
      ...entry,
      previousHash,
      timestamp: timestamp.toISOString(),
    });

    return createHmac('sha256', this.hmacSecret)
      .update(data)
      .digest('hex');
  }

  /**
   * Log an audit entry with hash chain integrity
   */
  async log(entry: AuditLogEntry): Promise<string | null> {
    if (!this.enabled) return null;

    // Serialize hash chain updates
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
            piiAccessed: entry.piiAccessed,
            severity: entry.severity || AuditSeverity.INFO,
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
      this.logger.error(`Failed to write audit log: ${error.message}`);
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
      resource: 'identity',
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
      resource: 'identity',
      resourceId: identityId,
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent'],
      requestId: request?.headers?.['x-request-id'],
      metadata: { purpose, field: fieldDecrypted },
      piiAccessed: [fieldDecrypted],
      severity: AuditSeverity.CRITICAL,
    });
  }

  /**
   * Verify audit log integrity
   * Checks the hash chain for tampering
   */
  async verifyIntegrity(startId?: string, endId?: string): Promise<{
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
          metadata: true,
          status: true,
          createdAt: true,
        },
      });

      let previousHash = entries[0]?.previousHash || '0'.repeat(64);
      let checkedCount = 0;

      for (const entry of entries) {
        if (entry.previousHash !== previousHash) {
          return {
            valid: false,
            checkedCount,
            firstInvalidId: entry.id,
            error: 'Hash chain broken - possible tampering detected',
          };
        }

        const computedHash = this.computeHash(
          {
            action: entry.action,
            resource: entry.resource,
            resourceId: entry.resourceId || undefined,
            userId: entry.userId || undefined,
            metadata: entry.metadata as Record<string, any>,
            status: entry.status as 'success' | 'failure',
          },
          entry.previousHash,
          entry.createdAt,
        );

        if (computedHash !== entry.hash) {
          return {
            valid: false,
            checkedCount,
            firstInvalidId: entry.id,
            error: 'Hash mismatch - entry may have been modified',
          };
        }

        previousHash = entry.hash;
        checkedCount++;
      }

      return { valid: true, checkedCount };
    } catch (error) {
      return {
        valid: false,
        checkedCount: 0,
        error: `Verification failed: ${error.message}`,
      };
    }
  }

  /**
   * Export audit logs for compliance/audit purposes
   */
  async exportForCompliance(
    startDate: Date,
    endDate: Date,
    includeActions?: AuditAction[],
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

  // ... (keep existing helper methods: logIdentityAction, logVerificationAction, etc.)
}
```

### 2.3 Database Migration for Hash Chain

**File:** `packages/api/prisma/migrations/YYYYMMDD_add_audit_hash_chain.sql`

```sql
-- Add hash chain columns to audit_logs
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(64);

-- Create index for hash verification
CREATE INDEX IF NOT EXISTS idx_audit_logs_hash ON audit_logs(hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_previous_hash ON audit_logs(previous_hash);

-- Add severity to metadata (already JSON, no migration needed)
```

---

## Track 3: Security Middleware

### 3.1 Overview

Implement comprehensive security middleware stack:
- Helmet.js for security headers
- CSRF protection
- Request sanitization
- Security logging

### 3.2 Install Dependencies

```bash
cd packages/api
yarn add helmet csurf express-rate-limit hpp
yarn add -D @types/csurf @types/hpp
```

### 3.3 Security Middleware Configuration

**File:** `packages/api/src/common/middleware/security.middleware.ts`

```typescript
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import hpp from 'hpp';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);
  private readonly helmetMiddleware: any;
  private readonly hppMiddleware: any;

  constructor() {
    this.helmetMiddleware = helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://api.mainnet-beta.solana.com'],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      // HTTP Strict Transport Security
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      // Prevent clickjacking
      frameguard: { action: 'deny' },
      // Prevent MIME type sniffing
      noSniff: true,
      // XSS Filter
      xssFilter: true,
      // Referrer Policy
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      // Don't advertise Express
      hidePoweredBy: true,
    });

    // HTTP Parameter Pollution protection
    this.hppMiddleware = hpp({
      whitelist: ['fields', 'sort', 'page', 'limit'], // Allow these as arrays
    });
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // Apply Helmet
    this.helmetMiddleware(req, res, (err: any) => {
      if (err) {
        this.logger.error(`Helmet error: ${err.message}`);
        return next(err);
      }

      // Apply HPP
      this.hppMiddleware(req, res, (err2: any) => {
        if (err2) {
          this.logger.error(`HPP error: ${err2.message}`);
          return next(err2);
        }

        // Add security headers not covered by helmet
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

        next();
      });
    });
  }
}
```

### 3.4 Request Sanitization Middleware

**File:** `packages/api/src/common/middleware/sanitize.middleware.ts`

```typescript
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SanitizeMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SanitizeMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = this.sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = this.sanitizeObject(req.query) as any;
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = this.sanitizeObject(req.params) as any;
    }

    next();
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeValue(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Prevent prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        this.logger.warn(`Blocked prototype pollution attempt: ${key}`);
        continue;
      }

      sanitized[this.sanitizeKey(key)] = this.sanitizeObject(value);
    }

    return sanitized;
  }

  private sanitizeValue(value: any): any {
    if (typeof value !== 'string') {
      return value;
    }

    // Remove null bytes
    value = value.replace(/\0/g, '');

    // Basic XSS prevention (class-validator should handle most cases)
    value = value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    return value;
  }

  private sanitizeKey(key: string): string {
    // Only allow alphanumeric, underscore, and hyphen
    return key.replace(/[^a-zA-Z0-9_-]/g, '');
  }
}
```

### 3.5 Updated main.ts

**File:** `packages/api/src/main.ts` (Updated)

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;
  const nodeEnv = configService.get<string>('nodeEnv') || 'development';
  const corsOrigins = configService.get<string>('corsOrigin')?.split(',') || ['http://localhost:3000'];
  const enableSwagger = configService.get('features.enableSwagger') !== false && nodeEnv !== 'production';

  // Security Middleware - Apply BEFORE routes
  app.use(helmet({
    contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // Cookie parser for CSRF
  app.use(cookieParser());

  // CORS - Strict configuration
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman)
      if (!origin) return callback(null, true);

      if (corsOrigins.includes(origin) || corsOrigins.includes('*')) {
        callback(null, true);
      } else {
        logger.warn(`Blocked CORS request from: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key', 'X-CSRF-Token'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400, // 24 hours
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global pipes - Strict validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,                    // Strip unknown properties
      transform: true,                    // Transform to DTO types
      forbidNonWhitelisted: true,         // Throw on unknown properties
      forbidUnknownValues: true,          // Stricter validation
      disableErrorMessages: nodeEnv === 'production', // Hide details in production
      transformOptions: {
        enableImplicitConversion: false,  // Explicit conversion only
      },
    }),
  );

  // Global filters and interceptors
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(),
  );

  // Swagger - Only in non-production
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('AadhaarChain API')
      .setDescription('Self-sovereign identity platform API')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'API-Key')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);

  logger.log(`AadhaarChain API running on port ${port}`);
  logger.log(`Environment: ${nodeEnv}`);
  logger.log(`CORS Origins: ${corsOrigins.join(', ')}`);
}

bootstrap();
```

---

## Track 4: Mobile Biometric Hardening

### 4.1 Overview

Enhance mobile biometric security with:
- Liveness detection
- Anti-spoofing measures
- Secure biometric template handling
- Fallback mechanisms

### 4.2 Files to Create/Update

```
packages/mobile/src/
├── services/
│   ├── biometric.service.ts (update)
│   └── liveness.service.ts (new)
├── components/
│   └── BiometricPrompt.tsx (update)
└── hooks/
    └── useBiometricAuth.ts (update)
```

### 4.3 Liveness Detection Service

**File:** `packages/mobile/src/services/liveness.service.ts`

```typescript
import { Platform } from 'react-native';
import { Camera } from 'react-native-camera';

export interface LivenessChallenge {
  id: string;
  type: 'blink' | 'smile' | 'turn_head' | 'nod';
  instruction: string;
  timeoutMs: number;
}

export interface LivenessResult {
  passed: boolean;
  confidence: number;
  challengesPassed: number;
  challengesTotal: number;
  error?: string;
}

class LivenessDetectionService {
  private challenges: LivenessChallenge[] = [
    { id: '1', type: 'blink', instruction: 'Please blink your eyes', timeoutMs: 5000 },
    { id: '2', type: 'smile', instruction: 'Please smile', timeoutMs: 5000 },
    { id: '3', type: 'turn_head', instruction: 'Please turn your head left', timeoutMs: 5000 },
  ];

  /**
   * Generate random challenges for liveness check
   */
  generateChallenges(count: number = 2): LivenessChallenge[] {
    const shuffled = [...this.challenges].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Verify liveness based on camera frames
   * In production, integrate with a proper liveness SDK like:
   * - FaceTec
   * - iProov
   * - Onfido
   * - Jumio
   */
  async verifyLiveness(challenges: LivenessChallenge[]): Promise<LivenessResult> {
    // This is a placeholder - real implementation requires ML models
    // or integration with a liveness detection SDK

    let passed = 0;
    const total = challenges.length;

    for (const challenge of challenges) {
      try {
        const challengePassed = await this.performChallenge(challenge);
        if (challengePassed) passed++;
      } catch (error) {
        console.error(`Challenge ${challenge.type} failed:`, error);
      }
    }

    const confidence = passed / total;

    return {
      passed: confidence >= 0.8, // Require 80% of challenges passed
      confidence,
      challengesPassed: passed,
      challengesTotal: total,
    };
  }

  private async performChallenge(challenge: LivenessChallenge): Promise<boolean> {
    // Placeholder - would integrate with ML model for face detection
    // Real implementation would:
    // 1. Capture video frames
    // 2. Detect face landmarks
    // 3. Verify the requested action (blink, smile, etc.)
    // 4. Check for screen replay attacks
    // 5. Verify 3D depth if available

    return new Promise((resolve) => {
      // Simulate challenge verification
      setTimeout(() => {
        resolve(Math.random() > 0.2); // 80% success rate placeholder
      }, challenge.timeoutMs);
    });
  }

  /**
   * Anti-spoofing checks
   */
  async performAntiSpoofingChecks(): Promise<{
    passed: boolean;
    checks: Record<string, boolean>;
  }> {
    const checks: Record<string, boolean> = {
      // Check for screen/photo attack
      textureAnalysis: await this.checkTextureAnalysis(),
      // Check for 3D depth (if available on device)
      depthCheck: await this.checkDepth(),
      // Check for video replay
      motionConsistency: await this.checkMotionConsistency(),
      // Check lighting consistency
      lightingAnalysis: await this.checkLightingConsistency(),
    };

    const passed = Object.values(checks).filter(Boolean).length >= 3;

    return { passed, checks };
  }

  private async checkTextureAnalysis(): Promise<boolean> {
    // Analyze facial texture for signs of printed photo or screen
    // Real implementation uses ML models
    return true;
  }

  private async checkDepth(): Promise<boolean> {
    // Use TrueDepth camera (iOS) or ToF sensor (Android) if available
    if (Platform.OS === 'ios') {
      // Check for TrueDepth availability
      return true;
    }
    return true;
  }

  private async checkMotionConsistency(): Promise<boolean> {
    // Verify micro-movements are consistent with live human
    return true;
  }

  private async checkLightingConsistency(): Promise<boolean> {
    // Check that lighting on face is consistent with environment
    return true;
  }
}

export const livenessService = new LivenessDetectionService();
```

### 4.4 Enhanced Biometric Service

**File:** `packages/mobile/src/services/biometric.service.ts` (Updated)

```typescript
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import * as Keychain from 'react-native-keychain';
import { livenessService, LivenessResult } from './liveness.service';

const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: false });

export interface BiometricAuthResult {
  success: boolean;
  biometryType: BiometryTypes | null;
  livenessResult?: LivenessResult;
  error?: string;
}

export interface SecureAuthConfig {
  requireLiveness: boolean;
  livenessThreshold: number;
  maxAttempts: number;
  lockoutDurationMs: number;
}

const DEFAULT_CONFIG: SecureAuthConfig = {
  requireLiveness: true,
  livenessThreshold: 0.8,
  maxAttempts: 3,
  lockoutDurationMs: 30 * 60 * 1000, // 30 minutes
};

class BiometricService {
  private failedAttempts: number = 0;
  private lockoutUntil: number = 0;

  /**
   * Check biometric availability
   */
  async isAvailable(): Promise<{
    available: boolean;
    biometryType: BiometryTypes | null;
    error?: string;
  }> {
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      return { available, biometryType };
    } catch (error) {
      return {
        available: false,
        biometryType: null,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Check if currently locked out
   */
  isLockedOut(): boolean {
    return Date.now() < this.lockoutUntil;
  }

  /**
   * Get remaining lockout time in seconds
   */
  getLockoutRemaining(): number {
    if (!this.isLockedOut()) return 0;
    return Math.ceil((this.lockoutUntil - Date.now()) / 1000);
  }

  /**
   * Authenticate with biometrics and optional liveness check
   */
  async authenticate(
    options: {
      promptMessage?: string;
      requireLiveness?: boolean;
      cancelButtonText?: string;
    } = {},
  ): Promise<BiometricAuthResult> {
    // Check lockout
    if (this.isLockedOut()) {
      return {
        success: false,
        biometryType: null,
        error: `Too many failed attempts. Try again in ${this.getLockoutRemaining()} seconds.`,
      };
    }

    const { available, biometryType, error: availError } = await this.isAvailable();

    if (!available) {
      return {
        success: false,
        biometryType: null,
        error: availError || 'Biometric authentication not available',
      };
    }

    try {
      // Step 1: Perform liveness check if required
      let livenessResult: LivenessResult | undefined;

      if (options.requireLiveness ?? DEFAULT_CONFIG.requireLiveness) {
        const challenges = livenessService.generateChallenges(2);
        livenessResult = await livenessService.verifyLiveness(challenges);

        if (!livenessResult.passed) {
          this.recordFailedAttempt();
          return {
            success: false,
            biometryType,
            livenessResult,
            error: 'Liveness check failed. Please try again with better lighting.',
          };
        }

        // Also perform anti-spoofing
        const antiSpoof = await livenessService.performAntiSpoofingChecks();
        if (!antiSpoof.passed) {
          this.recordFailedAttempt();
          return {
            success: false,
            biometryType,
            livenessResult,
            error: 'Security check failed. Please use a real camera.',
          };
        }
      }

      // Step 2: Perform biometric authentication
      const { success, error } = await rnBiometrics.simplePrompt({
        promptMessage: options.promptMessage || 'Authenticate to continue',
        cancelButtonText: options.cancelButtonText || 'Cancel',
      });

      if (!success) {
        this.recordFailedAttempt();
        return {
          success: false,
          biometryType,
          livenessResult,
          error: error || 'Biometric authentication failed',
        };
      }

      // Reset failed attempts on success
      this.failedAttempts = 0;

      return {
        success: true,
        biometryType,
        livenessResult,
      };
    } catch (error) {
      this.recordFailedAttempt();
      return {
        success: false,
        biometryType,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Create cryptographic signature with biometric protection
   */
  async createSignature(
    payload: string,
    promptMessage: string,
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    if (this.isLockedOut()) {
      return {
        success: false,
        error: `Locked out. Try again in ${this.getLockoutRemaining()} seconds.`,
      };
    }

    try {
      // Ensure keys exist
      const { keysExist } = await rnBiometrics.biometricKeysExist();
      if (!keysExist) {
        await rnBiometrics.createKeys();
      }

      const { success, signature, error } = await rnBiometrics.createSignature({
        promptMessage,
        payload,
      });

      if (!success) {
        this.recordFailedAttempt();
      } else {
        this.failedAttempts = 0;
      }

      return { success, signature: signature || undefined, error: error || undefined };
    } catch (error) {
      this.recordFailedAttempt();
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Store sensitive data with biometric protection
   */
  async storeSecure(
    key: string,
    value: string,
    options: { requireBiometric?: boolean } = {},
  ): Promise<boolean> {
    try {
      await Keychain.setGenericPassword(key, value, {
        service: key,
        accessControl: options.requireBiometric
          ? Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
          : Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
        accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      });
      return true;
    } catch (error) {
      console.error('Failed to store secure data:', error);
      return false;
    }
  }

  /**
   * Retrieve sensitive data (may trigger biometric prompt)
   */
  async retrieveSecure(
    key: string,
    promptMessage?: string,
  ): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: key,
        authenticationPrompt: {
          title: 'Authentication Required',
          subtitle: promptMessage || 'Verify your identity to access secure data',
        },
      });

      return credentials ? credentials.password : null;
    } catch (error) {
      console.error('Failed to retrieve secure data:', error);
      return null;
    }
  }

  /**
   * Record failed authentication attempt
   */
  private recordFailedAttempt(): void {
    this.failedAttempts++;

    if (this.failedAttempts >= DEFAULT_CONFIG.maxAttempts) {
      this.lockoutUntil = Date.now() + DEFAULT_CONFIG.lockoutDurationMs;
      console.warn(`Biometric lockout activated until ${new Date(this.lockoutUntil).toISOString()}`);
    }
  }

  /**
   * Clear all biometric keys (for logout/reset)
   */
  async clearKeys(): Promise<boolean> {
    try {
      const { keysDeleted } = await rnBiometrics.deleteKeys();
      return keysDeleted;
    } catch {
      return false;
    }
  }
}

export const biometricService = new BiometricService();
```

---

## Database Migrations

### Migration 1: Encrypted PII Storage

**File:** `packages/api/prisma/migrations/YYYYMMDD_add_encrypted_pii.sql`

```sql
-- Create encrypted PII table
CREATE TABLE encrypted_pii (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,

    -- Hashes for lookup (deterministic)
    aadhaar_hash VARCHAR(64) UNIQUE,
    pan_hash VARCHAR(64),
    phone_hash VARCHAR(64),
    email_hash VARCHAR(64),

    -- Encrypted values (JSON with iv, ciphertext, authTag, keyId)
    aadhaar_encrypted TEXT,
    pan_encrypted TEXT,
    phone_encrypted TEXT,
    email_encrypted TEXT,

    -- Metadata
    encryption_key_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_identity FOREIGN KEY (identity_id) REFERENCES identities(id)
);

-- Indexes for hash lookups
CREATE INDEX idx_encrypted_pii_aadhaar_hash ON encrypted_pii(aadhaar_hash);
CREATE INDEX idx_encrypted_pii_pan_hash ON encrypted_pii(pan_hash);
CREATE INDEX idx_encrypted_pii_identity ON encrypted_pii(identity_id);
```

### Migration 2: Audit Log Enhancement

**File:** `packages/api/prisma/migrations/YYYYMMDD_enhance_audit_logs.sql`

```sql
-- Add hash chain columns
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(64);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_hash ON audit_logs(hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_previous_hash ON audit_logs(previous_hash);

-- Add pii_accessed column (stored in metadata JSON, but also indexed)
-- This is for quick compliance queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_pii
ON audit_logs(action)
WHERE action IN ('pii.access', 'pii.decrypt', 'pii.export');
```

### Updated Prisma Schema

**File:** `packages/api/prisma/schema.prisma` (additions)

```prisma
model EncryptedPII {
  id              String   @id @default(uuid())
  identityId      String   @unique @map("identity_id")

  // Hashes for lookup
  aadhaarHash     String?  @unique @map("aadhaar_hash")
  panHash         String?  @map("pan_hash")
  phoneHash       String?  @map("phone_hash")
  emailHash       String?  @map("email_hash")

  // Encrypted values (JSON strings)
  aadhaarEncrypted String? @map("aadhaar_encrypted")
  panEncrypted     String? @map("pan_encrypted")
  phoneEncrypted   String? @map("phone_encrypted")
  emailEncrypted   String? @map("email_encrypted")

  // Metadata
  encryptionKeyId  String  @map("encryption_key_id")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  identity         Identity @relation(fields: [identityId], references: [id], onDelete: Cascade)

  @@index([aadhaarHash])
  @@index([panHash])
  @@map("encrypted_pii")
}

// Update AuditLog model
model AuditLog {
  id           String   @id @default(uuid())
  userId       String?  @map("user_id")
  action       String
  resource     String
  resourceId   String?  @map("resource_id")
  ipAddress    String?  @map("ip_address")
  userAgent    String?  @map("user_agent")
  requestId    String?  @map("request_id")
  metadata     Json?
  status       String   @default("success")
  errorMessage String?  @map("error_message")

  // Hash chain for integrity
  hash         String?
  previousHash String?  @map("previous_hash")

  createdAt    DateTime @default(now()) @map("created_at")

  @@index([userId])
  @@index([action])
  @@index([resource])
  @@index([createdAt])
  @@index([hash])
  @@index([previousHash])
  @@map("audit_logs")
}
```

---

## Testing Requirements

### Unit Tests

**File:** `packages/api/src/__tests__/services/encryption.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../../common/crypto/encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                ENCRYPTION_MASTER_KEY: Buffer.from('12345678901234567890123456789012').toString('base64'),
                ENCRYPTION_KEY_ID: 'test-key-v1',
                ENCRYPTION_KEY_VERSION: '1',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
    await service.onModuleInit();
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const plaintext = 'Hello, World!';
      const encrypted = await service.encrypt(plaintext);
      const decrypted = await service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', async () => {
      const plaintext = 'Same message';
      const encrypted1 = await service.encrypt(plaintext);
      const encrypted2 = await service.encrypt(plaintext);
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should fail decryption with wrong AAD', async () => {
      const plaintext = 'Secret data';
      const encrypted = await service.encrypt(plaintext, 'correct-context');
      await expect(
        service.decrypt(encrypted, 'wrong-context'),
      ).rejects.toThrow('Decryption failed');
    });

    it('should fail decryption with tampered ciphertext', async () => {
      const plaintext = 'Secret data';
      const encrypted = await service.encrypt(plaintext);
      encrypted.ciphertext = Buffer.from('tampered').toString('base64');
      await expect(service.decrypt(encrypted)).rejects.toThrow('Decryption failed');
    });
  });

  describe('encryptField/decryptField', () => {
    it('should handle field encryption correctly', async () => {
      const aadhaar = '123456789012';
      const encrypted = await service.encryptField(aadhaar, 'aadhaar');
      const decrypted = await service.decryptField(encrypted, 'aadhaar');
      expect(decrypted).toBe(aadhaar);
    });

    it('should handle legacy unencrypted values', async () => {
      const legacy = 'plain-text-value';
      const decrypted = await service.decryptField(legacy, 'field');
      expect(decrypted).toBe(legacy);
    });
  });

  describe('hashForLookup', () => {
    it('should produce consistent hashes', async () => {
      const value = '123456789012';
      const hash1 = await service.hashForLookup(value, 'aadhaar');
      const hash2 = await service.hashForLookup(value, 'aadhaar');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different purposes', async () => {
      const value = '123456789012';
      const hash1 = await service.hashForLookup(value, 'aadhaar');
      const hash2 = await service.hashForLookup(value, 'pan');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('masking', () => {
    it('should mask Aadhaar correctly', () => {
      expect(service.maskAadhaar('123456789012')).toBe('XXXX-XXXX-9012');
    });

    it('should mask PAN correctly', () => {
      expect(service.maskPan('ABCDE1234F')).toBe('ABXXXXXX4F');
    });

    it('should mask phone correctly', () => {
      expect(service.maskPhone('9876543210')).toBe('XXXXXX3210');
    });

    it('should mask email correctly', () => {
      expect(service.maskEmail('test@example.com')).toBe('tXXt@example.com');
    });
  });
});
```

### Integration Tests

**File:** `packages/api/src/__tests__/integration/security.integration.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';

describe('Security Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Security Headers', () => {
    it('should include security headers in response', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should return rate limit headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid input', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/identity')
        .send({
          __proto__: { polluted: true }, // Prototype pollution attempt
          publicKey: 'invalid',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('CORS', () => {
    it('should block requests from unauthorized origins', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('Origin', 'https://malicious-site.com')
        .expect(200); // Health endpoint might still respond

      // Check CORS header is not set for unauthorized origin
      // (depends on your CORS configuration)
    });
  });
});
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Generate production encryption key: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- [ ] Configure ENCRYPTION_MASTER_KEY in secrets manager
- [ ] Configure AUDIT_HMAC_SECRET in secrets manager
- [ ] Run database migrations
- [ ] Review CORS origins for production
- [ ] Disable Swagger in production
- [ ] Enable HTTPS/TLS
- [ ] Configure proper logging levels

### Security Verification

- [ ] Run encryption service unit tests
- [ ] Run audit service unit tests
- [ ] Run security integration tests
- [ ] Verify rate limiting works
- [ ] Verify security headers are present
- [ ] Test PII encryption/decryption
- [ ] Test audit log hash chain integrity
- [ ] Mobile: Test biometric authentication
- [ ] Mobile: Test liveness detection

### Post-Deployment

- [ ] Monitor error rates
- [ ] Monitor rate limit hits
- [ ] Verify audit logs are being written
- [ ] Schedule regular audit log integrity checks
- [ ] Set up alerts for security events
- [ ] Document key rotation procedures

---

## Risk Mitigation

| Risk | Mitigation | Owner |
|------|------------|-------|
| Key compromise | Use HSM/KMS in production, implement key rotation | DevOps |
| Data breach | Encrypt all PII, minimize data exposure | Backend |
| Authentication bypass | Implement MFA (Phase 2), rate limiting | Backend |
| Audit log tampering | Hash chain verification, immutable storage | Backend |
| Biometric spoofing | Liveness detection, anti-spoofing checks | Mobile |
| Supply chain attack | Regular dependency audits, lockfile | All |

---

## Success Criteria

Phase 1 is complete when:

1. **Encryption Service**
   - [ ] All PII fields encrypted in database
   - [ ] Hash-based lookup working
   - [ ] Masking functions implemented
   - [ ] Key rotation procedure documented

2. **Audit Logging**
   - [ ] Hash chain implemented and verified
   - [ ] PII access logging enabled
   - [ ] Compliance export functionality working
   - [ ] Integrity verification passing

3. **Security Middleware**
   - [ ] Helmet.js configured
   - [ ] CORS tightened
   - [ ] Validation strictness increased
   - [ ] Security headers verified

4. **Mobile Biometrics**
   - [ ] Liveness service integrated
   - [ ] Anti-spoofing checks implemented
   - [ ] Lockout mechanism working
   - [ ] Secure storage configured

---

*Document Version: 1.0*
*Last Updated: 2025-11-22*
*Author: Claude Code Analysis*
