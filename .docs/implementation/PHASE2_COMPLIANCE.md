# Phase 2: Regulatory Compliance Implementation Plan

**Duration:** Weeks 5-8
**Priority:** HIGH
**Status:** Planning
**Dependencies:** Phase 1 (Security Hardening) - COMPLETED

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Regulatory Landscape](#regulatory-landscape)
3. [Implementation Tracks](#implementation-tracks)
4. [Track 1: Consent Management System](#track-1-consent-management-system)
5. [Track 2: Data Subject Rights (DPDP Act)](#track-2-data-subject-rights-dpdp-act)
6. [Track 3: Aadhaar Act Compliance](#track-3-aadhaar-act-compliance)
7. [Track 4: Privacy Notice & Breach Notification](#track-4-privacy-notice--breach-notification)
8. [Database Migrations](#database-migrations)
9. [API Endpoints](#api-endpoints)
10. [Testing Requirements](#testing-requirements)
11. [Deployment Checklist](#deployment-checklist)

---

## Executive Summary

Phase 2 implements regulatory compliance features required for handling Indian citizen identity data. The implementation addresses two critical regulations:

| Regulation | Full Name | Effective | Penalty |
|------------|-----------|-----------|---------|
| DPDP Act 2023 | Digital Personal Data Protection Act | 2024 | Up to ₹250 Cr |
| Aadhaar Act 2016 | Aadhaar (Targeted Delivery of Financial and Other Subsidies, Benefits and Services) Act | 2016 | Up to ₹1 Cr + 3 years imprisonment |

### Key Deliverables

1. **Consent Management System** - Granular consent collection, storage, and revocation
2. **Data Subject Rights Portal** - Right to access, erasure, portability, and correction
3. **Aadhaar Compliance Module** - Masked storage, purpose limitation, access logging
4. **Privacy Notice System** - Dynamic privacy notices with version tracking
5. **Breach Notification System** - 72-hour breach reporting workflow

### Implementation Tracks

| Track | Focus | Duration | Priority |
|-------|-------|----------|----------|
| Track 1 | Consent Management System | Week 5-6 | CRITICAL |
| Track 2 | Data Subject Rights | Week 5-6 | HIGH |
| Track 3 | Aadhaar Act Compliance | Week 6-7 | CRITICAL |
| Track 4 | Privacy Notice & Breach Notification | Week 7-8 | HIGH |

---

## Regulatory Landscape

### DPDP Act 2023 Requirements

| Requirement | Section | Description | Status |
|-------------|---------|-------------|--------|
| Consent | Section 6 | Clear, informed, specific consent | ❌ Missing |
| Purpose Limitation | Section 5 | Data used only for stated purpose | ❌ Missing |
| Data Minimization | Section 5 | Collect only necessary data | ⚠️ Partial |
| Right to Access | Section 11 | Data principal can access their data | ❌ Missing |
| Right to Correction | Section 12 | Request correction of inaccurate data | ❌ Missing |
| Right to Erasure | Section 12 | Request deletion of personal data | ❌ Missing |
| Data Portability | Section 12 | Export data in machine-readable format | ❌ Missing |
| Grievance Redressal | Section 13 | Mechanism to address complaints | ❌ Missing |
| Breach Notification | Section 8 | Report breaches within 72 hours | ❌ Missing |
| Privacy Notice | Section 5 | Clear notice before processing | ❌ Missing |

### Aadhaar Act 2016 Requirements

| Requirement | Section | Description | Status |
|-------------|---------|-------------|--------|
| Encrypted Storage | Section 29 | Aadhaar must be encrypted | ✅ Phase 1 |
| Masking | Section 29 | Display only last 4 digits | ❌ Missing |
| Purpose Logging | Section 29 | Log purpose of each access | ❌ Missing |
| Consent per Access | Section 8 | Fresh consent for each use | ❌ Missing |
| Audit Trail | Section 29 | 5-year audit retention | ✅ Phase 1 |
| No Storage in Logs | Section 29 | No Aadhaar in error/debug logs | ⚠️ Partial |

---

## Implementation Tracks

### Timeline Overview

```
Week 5:
├── Track 1: Consent service core implementation
├── Track 2: Data access request system
└── Track 3: Aadhaar masking and purpose logging

Week 6:
├── Track 1: Consent UI components
├── Track 2: Right to erasure implementation
└── Track 3: Aadhaar access controls

Week 7:
├── Track 2: Data portability export
├── Track 3: Aadhaar audit reports
└── Track 4: Privacy notice system

Week 8:
├── Track 4: Breach notification workflow
├── Integration testing
└── Compliance documentation
```

---

## Track 1: Consent Management System

### 1.1 Overview

Implement a comprehensive consent management system that:
- Collects granular, purpose-specific consent
- Tracks consent history and versions
- Supports consent withdrawal at any time
- Provides consent receipts to users

### 1.2 Files to Create

```
packages/api/src/
├── modules/
│   └── consent/
│       ├── consent.module.ts
│       ├── consent.controller.ts
│       ├── consent.service.ts
│       ├── dto/
│       │   ├── grant-consent.dto.ts
│       │   ├── revoke-consent.dto.ts
│       │   └── consent-query.dto.ts
│       ├── entities/
│       │   └── consent.entity.ts
│       └── interfaces/
│           └── consent.interfaces.ts
```

### 1.3 Consent Types and Purposes

```typescript
// packages/api/src/modules/consent/interfaces/consent.interfaces.ts

/**
 * Consent Types aligned with DPDP Act 2023
 */
export enum ConsentType {
  // Identity Data
  IDENTITY_CREATION = 'identity.creation',
  IDENTITY_VERIFICATION = 'identity.verification',
  IDENTITY_SHARING = 'identity.sharing',

  // PII Categories
  AADHAAR_VERIFICATION = 'pii.aadhaar.verification',
  AADHAAR_STORAGE = 'pii.aadhaar.storage',
  PAN_VERIFICATION = 'pii.pan.verification',
  PAN_STORAGE = 'pii.pan.storage',
  PHONE_VERIFICATION = 'pii.phone.verification',
  EMAIL_VERIFICATION = 'pii.email.verification',
  BIOMETRIC_PROCESSING = 'pii.biometric.processing',

  // Credential Operations
  CREDENTIAL_ISSUANCE = 'credential.issuance',
  CREDENTIAL_SHARING = 'credential.sharing',
  CREDENTIAL_VERIFICATION = 'credential.verification',

  // Data Processing
  ANALYTICS = 'processing.analytics',
  MARKETING = 'processing.marketing',
  THIRD_PARTY_SHARING = 'processing.third_party',

  // Platform Operations
  ACCOUNT_MANAGEMENT = 'platform.account',
  NOTIFICATIONS = 'platform.notifications',
  SERVICE_IMPROVEMENT = 'platform.improvement',
}

export enum ConsentStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  PENDING = 'pending',
}

export interface ConsentPurpose {
  type: ConsentType;
  description: string;
  dataElements: string[];
  retentionPeriod: number; // days
  isRequired: boolean;
  thirdParties?: string[];
}

export interface ConsentRecord {
  id: string;
  userId: string;
  identityId?: string;
  consentType: ConsentType;
  purpose: string;
  dataElements: string[];
  status: ConsentStatus;
  grantedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  revocationReason?: string;
  consentArtifact: string; // Cryptographic proof
  version: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConsentArtifact {
  consentId: string;
  userId: string;
  consentType: ConsentType;
  purpose: string;
  timestamp: string;
  hash: string;
  signature?: string;
}
```

### 1.4 Consent Service

```typescript
// packages/api/src/modules/consent/consent.service.ts

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomUUID } from 'crypto';
import { DatabaseService } from '../../services/database.service';
import { AuditService, AuditAction } from '../../services/audit.service';
import {
  ConsentType,
  ConsentStatus,
  ConsentPurpose,
  ConsentRecord,
  ConsentArtifact,
} from './interfaces/consent.interfaces';

/**
 * Consent Management Service
 *
 * Implements DPDP Act 2023 consent requirements:
 * - Granular, purpose-specific consent
 * - Clear and informed consent collection
 * - Easy withdrawal mechanism
 * - Consent receipts and artifacts
 */
@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);
  private readonly hmacSecret: string;

  // Purpose definitions with data elements and retention periods
  private readonly purposeDefinitions: Map<ConsentType, ConsentPurpose> = new Map([
    [ConsentType.AADHAAR_VERIFICATION, {
      type: ConsentType.AADHAAR_VERIFICATION,
      description: 'Verify your identity using Aadhaar via government APIs',
      dataElements: ['aadhaar_number', 'name', 'date_of_birth', 'gender', 'address'],
      retentionPeriod: 0, // Not stored after verification
      isRequired: false,
    }],
    [ConsentType.AADHAAR_STORAGE, {
      type: ConsentType.AADHAAR_STORAGE,
      description: 'Store encrypted Aadhaar number for future verifications',
      dataElements: ['aadhaar_hash', 'aadhaar_encrypted'],
      retentionPeriod: 1825, // 5 years as per regulations
      isRequired: false,
    }],
    [ConsentType.PAN_VERIFICATION, {
      type: ConsentType.PAN_VERIFICATION,
      description: 'Verify your PAN card via government APIs',
      dataElements: ['pan_number', 'name'],
      retentionPeriod: 0,
      isRequired: false,
    }],
    [ConsentType.IDENTITY_CREATION, {
      type: ConsentType.IDENTITY_CREATION,
      description: 'Create a decentralized identity linked to your wallet',
      dataElements: ['wallet_address', 'did'],
      retentionPeriod: -1, // Until account deletion
      isRequired: true,
    }],
    [ConsentType.CREDENTIAL_ISSUANCE, {
      type: ConsentType.CREDENTIAL_ISSUANCE,
      description: 'Issue verifiable credentials based on your verified identity',
      dataElements: ['credential_type', 'claims'],
      retentionPeriod: -1,
      isRequired: false,
    }],
    [ConsentType.BIOMETRIC_PROCESSING, {
      type: ConsentType.BIOMETRIC_PROCESSING,
      description: 'Process biometric data for authentication',
      dataElements: ['biometric_template_hash'],
      retentionPeriod: 365,
      isRequired: false,
    }],
    [ConsentType.ANALYTICS, {
      type: ConsentType.ANALYTICS,
      description: 'Analyze usage patterns to improve services',
      dataElements: ['usage_data', 'device_info'],
      retentionPeriod: 365,
      isRequired: false,
    }],
    [ConsentType.NOTIFICATIONS, {
      type: ConsentType.NOTIFICATIONS,
      description: 'Send notifications about your identity and credentials',
      dataElements: ['email', 'phone', 'push_token'],
      retentionPeriod: -1,
      isRequired: false,
    }],
  ]);

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {
    this.hmacSecret = this.configService.get('CONSENT_HMAC_SECRET') || 'consent-secret-change-in-production';
  }

  /**
   * Get purpose definition for a consent type
   */
  getPurposeDefinition(type: ConsentType): ConsentPurpose | undefined {
    return this.purposeDefinitions.get(type);
  }

  /**
   * Get all available consent purposes
   */
  getAllPurposes(): ConsentPurpose[] {
    return Array.from(this.purposeDefinitions.values());
  }

  /**
   * Grant consent for a specific purpose
   */
  async grantConsent(
    userId: string,
    consentType: ConsentType,
    request?: {
      ipAddress?: string;
      userAgent?: string;
      identityId?: string;
      customPurpose?: string;
      expiresInDays?: number;
    },
  ): Promise<ConsentRecord> {
    const purpose = this.purposeDefinitions.get(consentType);
    if (!purpose) {
      throw new BadRequestException(`Unknown consent type: ${consentType}`);
    }

    // Check for existing active consent
    const existing = await this.getActiveConsent(userId, consentType);
    if (existing) {
      throw new BadRequestException('Active consent already exists for this purpose');
    }

    // Calculate expiration
    const expiresAt = this.calculateExpiration(
      purpose.retentionPeriod,
      request?.expiresInDays,
    );

    // Generate consent artifact
    const artifact = this.generateConsentArtifact({
      userId,
      consentType,
      purpose: request?.customPurpose || purpose.description,
    });

    // Store consent
    const consent = await this.databaseService.consent.create({
      data: {
        userId,
        identityId: request?.identityId,
        consentType,
        purpose: request?.customPurpose || purpose.description,
        dataElements: purpose.dataElements,
        status: ConsentStatus.ACTIVE,
        grantedAt: new Date(),
        expiresAt,
        consentArtifact: JSON.stringify(artifact),
        version: 1,
        ipAddress: request?.ipAddress,
        userAgent: request?.userAgent,
      },
    });

    // Audit log
    await this.auditService.log({
      action: AuditAction.CONSENT_GRANT,
      userId,
      resource: 'consent',
      resourceId: consent.id,
      ipAddress: request?.ipAddress,
      userAgent: request?.userAgent,
      metadata: {
        consentType,
        dataElements: purpose.dataElements,
        expiresAt: expiresAt?.toISOString(),
      },
    });

    this.logger.log(`Consent granted: ${consentType} for user ${userId}`);

    return consent as ConsentRecord;
  }

  /**
   * Revoke consent
   */
  async revokeConsent(
    userId: string,
    consentId: string,
    reason?: string,
    request?: { ipAddress?: string; userAgent?: string },
  ): Promise<ConsentRecord> {
    const consent = await this.databaseService.consent.findFirst({
      where: {
        id: consentId,
        userId,
        status: ConsentStatus.ACTIVE,
      },
    });

    if (!consent) {
      throw new NotFoundException('Active consent not found');
    }

    // Update consent status
    const updated = await this.databaseService.consent.update({
      where: { id: consentId },
      data: {
        status: ConsentStatus.REVOKED,
        revokedAt: new Date(),
        revocationReason: reason,
      },
    });

    // Audit log
    await this.auditService.log({
      action: AuditAction.CONSENT_REVOKE,
      userId,
      resource: 'consent',
      resourceId: consentId,
      ipAddress: request?.ipAddress,
      userAgent: request?.userAgent,
      metadata: {
        consentType: consent.consentType,
        reason,
      },
    });

    this.logger.log(`Consent revoked: ${consent.consentType} for user ${userId}`);

    return updated as ConsentRecord;
  }

  /**
   * Get active consent for a specific type
   */
  async getActiveConsent(
    userId: string,
    consentType: ConsentType,
  ): Promise<ConsentRecord | null> {
    const consent = await this.databaseService.consent.findFirst({
      where: {
        userId,
        consentType,
        status: ConsentStatus.ACTIVE,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    return consent as ConsentRecord | null;
  }

  /**
   * Check if user has active consent for a purpose
   */
  async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const consent = await this.getActiveConsent(userId, consentType);
    return consent !== null;
  }

  /**
   * Get all consents for a user
   */
  async getUserConsents(
    userId: string,
    options?: { includeRevoked?: boolean; includeExpired?: boolean },
  ): Promise<ConsentRecord[]> {
    const where: any = { userId };

    if (!options?.includeRevoked && !options?.includeExpired) {
      where.status = ConsentStatus.ACTIVE;
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];
    } else if (!options?.includeRevoked) {
      where.status = { not: ConsentStatus.REVOKED };
    }

    const consents = await this.databaseService.consent.findMany({
      where,
      orderBy: { grantedAt: 'desc' },
    });

    return consents as ConsentRecord[];
  }

  /**
   * Get consent history for audit purposes
   */
  async getConsentHistory(
    userId: string,
    consentType?: ConsentType,
  ): Promise<ConsentRecord[]> {
    const where: any = { userId };
    if (consentType) {
      where.consentType = consentType;
    }

    const consents = await this.databaseService.consent.findMany({
      where,
      orderBy: { grantedAt: 'desc' },
    });

    return consents as ConsentRecord[];
  }

  /**
   * Verify consent is valid before data processing
   * Throws if consent is missing or invalid
   */
  async verifyConsentForProcessing(
    userId: string,
    consentType: ConsentType,
    requestedDataElements?: string[],
  ): Promise<void> {
    const consent = await this.getActiveConsent(userId, consentType);

    if (!consent) {
      throw new BadRequestException(
        `Consent required for ${consentType}. Please grant consent before proceeding.`,
      );
    }

    // Verify data elements are covered
    if (requestedDataElements && requestedDataElements.length > 0) {
      const consentedElements = new Set(consent.dataElements);
      const missingElements = requestedDataElements.filter(
        (el) => !consentedElements.has(el),
      );

      if (missingElements.length > 0) {
        throw new BadRequestException(
          `Consent does not cover the following data elements: ${missingElements.join(', ')}`,
        );
      }
    }
  }

  /**
   * Generate consent artifact (cryptographic proof)
   */
  private generateConsentArtifact(params: {
    userId: string;
    consentType: ConsentType;
    purpose: string;
  }): ConsentArtifact {
    const consentId = randomUUID();
    const timestamp = new Date().toISOString();

    const dataToHash = JSON.stringify({
      consentId,
      userId: params.userId,
      consentType: params.consentType,
      purpose: params.purpose,
      timestamp,
    });

    const hash = createHmac('sha256', this.hmacSecret)
      .update(dataToHash)
      .digest('hex');

    return {
      consentId,
      userId: params.userId,
      consentType: params.consentType,
      purpose: params.purpose,
      timestamp,
      hash,
    };
  }

  /**
   * Calculate consent expiration
   */
  private calculateExpiration(
    defaultRetention: number,
    customDays?: number,
  ): Date | null {
    const days = customDays ?? defaultRetention;

    if (days < 0) {
      return null; // No expiration
    }

    if (days === 0) {
      // Immediate expiration (for one-time processing)
      return new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    }

    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Process expired consents (run as scheduled job)
   */
  async processExpiredConsents(): Promise<number> {
    const result = await this.databaseService.consent.updateMany({
      where: {
        status: ConsentStatus.ACTIVE,
        expiresAt: { lt: new Date() },
      },
      data: {
        status: ConsentStatus.EXPIRED,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} consents`);
    }

    return result.count;
  }

  /**
   * Generate consent receipt for user
   */
  async generateConsentReceipt(consentId: string): Promise<{
    receipt: string;
    artifact: ConsentArtifact;
  }> {
    const consent = await this.databaseService.consent.findUnique({
      where: { id: consentId },
    });

    if (!consent) {
      throw new NotFoundException('Consent not found');
    }

    const artifact = JSON.parse(consent.consentArtifact) as ConsentArtifact;
    const purpose = this.purposeDefinitions.get(consent.consentType as ConsentType);

    const receipt = `
CONSENT RECEIPT
===============
Consent ID: ${consent.id}
User ID: ${consent.userId}
Purpose: ${consent.purpose}
Data Elements: ${consent.dataElements.join(', ')}
Status: ${consent.status}
Granted At: ${consent.grantedAt.toISOString()}
${consent.expiresAt ? `Expires At: ${consent.expiresAt.toISOString()}` : 'No Expiration'}
${consent.revokedAt ? `Revoked At: ${consent.revokedAt.toISOString()}` : ''}
Artifact Hash: ${artifact.hash}

This receipt serves as proof of consent under the
Digital Personal Data Protection Act, 2023.
    `.trim();

    return { receipt, artifact };
  }
}
```

### 1.5 Consent Controller

```typescript
// packages/api/src/modules/consent/consent.controller.ts

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConsentService } from './consent.service';
import { GrantConsentDto, RevokeConsentDto, ConsentQueryDto } from './dto';
import { ConsentType } from './interfaces/consent.interfaces';

@ApiTags('Consent')
@Controller('consent')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Get('purposes')
  @ApiOperation({ summary: 'Get all consent purposes with descriptions' })
  getAllPurposes() {
    return this.consentService.getAllPurposes();
  }

  @Get()
  @ApiOperation({ summary: 'Get all consents for current user' })
  async getMyConsents(
    @CurrentUser() user: any,
    @Query() query: ConsentQueryDto,
  ) {
    return this.consentService.getUserConsents(user.id, {
      includeRevoked: query.includeRevoked,
      includeExpired: query.includeExpired,
    });
  }

  @Get('check/:type')
  @ApiOperation({ summary: 'Check if user has active consent for a purpose' })
  async checkConsent(
    @CurrentUser() user: any,
    @Param('type') type: ConsentType,
  ) {
    const hasConsent = await this.consentService.hasConsent(user.id, type);
    const consent = hasConsent
      ? await this.consentService.getActiveConsent(user.id, type)
      : null;

    return {
      hasConsent,
      consent,
      purpose: this.consentService.getPurposeDefinition(type),
    };
  }

  @Post('grant')
  @ApiOperation({ summary: 'Grant consent for a specific purpose' })
  async grantConsent(
    @CurrentUser() user: any,
    @Body() dto: GrantConsentDto,
    @Req() req: any,
  ) {
    return this.consentService.grantConsent(user.id, dto.consentType, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      identityId: dto.identityId,
      customPurpose: dto.customPurpose,
      expiresInDays: dto.expiresInDays,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke a consent' })
  async revokeConsent(
    @CurrentUser() user: any,
    @Param('id') consentId: string,
    @Body() dto: RevokeConsentDto,
    @Req() req: any,
  ) {
    return this.consentService.revokeConsent(user.id, consentId, dto.reason, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Get consent receipt' })
  async getConsentReceipt(@Param('id') consentId: string) {
    return this.consentService.generateConsentReceipt(consentId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get consent history for audit' })
  async getConsentHistory(
    @CurrentUser() user: any,
    @Query('type') type?: ConsentType,
  ) {
    return this.consentService.getConsentHistory(user.id, type);
  }
}
```

### 1.6 Consent DTOs

```typescript
// packages/api/src/modules/consent/dto/grant-consent.dto.ts

import { IsEnum, IsOptional, IsString, IsNumber, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsentType } from '../interfaces/consent.interfaces';

export class GrantConsentDto {
  @ApiProperty({ enum: ConsentType })
  @IsEnum(ConsentType)
  consentType: ConsentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  identityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customPurpose?: string;

  @ApiPropertyOptional({ description: 'Custom expiration in days' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3650)
  expiresInDays?: number;
}

// packages/api/src/modules/consent/dto/revoke-consent.dto.ts

export class RevokeConsentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

// packages/api/src/modules/consent/dto/consent-query.dto.ts

export class ConsentQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  includeRevoked?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  includeExpired?: boolean;
}
```

---

## Track 2: Data Subject Rights (DPDP Act)

### 2.1 Overview

Implement Data Subject Rights as mandated by DPDP Act 2023:
- Right to Access (Section 11)
- Right to Correction (Section 12)
- Right to Erasure (Section 12)
- Right to Data Portability (Section 12)
- Grievance Redressal (Section 13)

### 2.2 Files to Create

```
packages/api/src/
├── modules/
│   └── data-rights/
│       ├── data-rights.module.ts
│       ├── data-rights.controller.ts
│       ├── data-rights.service.ts
│       ├── dto/
│       │   ├── access-request.dto.ts
│       │   ├── erasure-request.dto.ts
│       │   ├── correction-request.dto.ts
│       │   └── portability-request.dto.ts
│       └── interfaces/
│           └── data-rights.interfaces.ts
```

### 2.3 Data Rights Service

```typescript
// packages/api/src/modules/data-rights/data-rights.service.ts

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { DatabaseService } from '../../services/database.service';
import { AuditService } from '../../services/audit.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { ConsentService } from '../consent/consent.service';
import {
  DataAccessRequest,
  ErasureRequest,
  CorrectionRequest,
  PortabilityRequest,
  RequestStatus,
  RequestType,
} from './interfaces/data-rights.interfaces';

/**
 * Data Subject Rights Service
 *
 * Implements DPDP Act 2023 data subject rights:
 * - Right to Access (Section 11)
 * - Right to Correction (Section 12)
 * - Right to Erasure (Section 12)
 * - Right to Data Portability
 */
@Injectable()
export class DataRightsService {
  private readonly logger = new Logger(DataRightsService.name);
  private readonly responseDeadline: number; // days

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
    private readonly encryptionService: EncryptionService,
    private readonly consentService: ConsentService,
  ) {
    this.responseDeadline = this.configService.get<number>('DATA_RIGHTS_RESPONSE_DAYS', 30);
  }

  // ===========================
  // Right to Access
  // ===========================

  /**
   * Submit data access request
   */
  async submitAccessRequest(
    userId: string,
    request: { categories?: string[]; reason?: string },
  ): Promise<DataAccessRequest> {
    const requestId = this.generateRequestId('ACCESS');
    const deadline = new Date(Date.now() + this.responseDeadline * 24 * 60 * 60 * 1000);

    const accessRequest = await this.databaseService.dataRightsRequest.create({
      data: {
        id: requestId,
        userId,
        requestType: RequestType.ACCESS,
        status: RequestStatus.PENDING,
        categories: request.categories || ['all'],
        reason: request.reason,
        submittedAt: new Date(),
        responseDeadline: deadline,
      },
    });

    await this.auditService.log({
      action: 'data_rights.access_request',
      userId,
      resource: 'data_rights_request',
      resourceId: requestId,
      metadata: { categories: request.categories },
    });

    return accessRequest as DataAccessRequest;
  }

  /**
   * Process data access request
   */
  async processAccessRequest(requestId: string): Promise<{
    data: Record<string, any>;
    format: string;
    generatedAt: Date;
  }> {
    const request = await this.databaseService.dataRightsRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const userData = await this.collectUserData(request.userId, request.categories as string[]);

    // Update request status
    await this.databaseService.dataRightsRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.COMPLETED,
        completedAt: new Date(),
        responseData: JSON.stringify(userData),
      },
    });

    return {
      data: userData,
      format: 'JSON',
      generatedAt: new Date(),
    };
  }

  /**
   * Collect all user data across the system
   */
  private async collectUserData(
    userId: string,
    categories: string[],
  ): Promise<Record<string, any>> {
    const includeAll = categories.includes('all');
    const data: Record<string, any> = {};

    // User profile
    if (includeAll || categories.includes('profile')) {
      const user = await this.databaseService.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      data.profile = user;
    }

    // Identity data
    if (includeAll || categories.includes('identity')) {
      const identities = await this.databaseService.identity.findMany({
        where: { userId },
        select: {
          id: true,
          did: true,
          solanaPublicKey: true,
          verificationBitmap: true,
          reputationScore: true,
          createdAt: true,
        },
      });
      data.identities = identities;
    }

    // Verification history
    if (includeAll || categories.includes('verifications')) {
      const verifications = await this.databaseService.verificationRequest.findMany({
        where: { identity: { userId } },
        select: {
          id: true,
          verificationType: true,
          status: true,
          createdAt: true,
          completedAt: true,
        },
      });
      data.verifications = verifications;
    }

    // Credentials
    if (includeAll || categories.includes('credentials')) {
      const credentials = await this.databaseService.credential.findMany({
        where: { identity: { userId } },
        select: {
          id: true,
          credentialId: true,
          credentialType: true,
          issuedAt: true,
          expiresAt: true,
          revoked: true,
        },
      });
      data.credentials = credentials;
    }

    // Reputation history
    if (includeAll || categories.includes('reputation')) {
      const reputation = await this.databaseService.reputationHistory.findMany({
        where: { identity: { userId } },
        select: {
          id: true,
          eventType: true,
          scoreDelta: true,
          newScore: true,
          createdAt: true,
        },
      });
      data.reputation = reputation;
    }

    // Consent history
    if (includeAll || categories.includes('consents')) {
      const consents = await this.consentService.getUserConsents(userId, {
        includeRevoked: true,
        includeExpired: true,
      });
      data.consents = consents;
    }

    // Staking data
    if (includeAll || categories.includes('staking')) {
      const stakes = await this.databaseService.stakeAccount.findMany({
        where: { identityId: { in: (data.identities || []).map((i: any) => i.id) } },
        select: {
          id: true,
          amount: true,
          pendingRewards: true,
          stakedAt: true,
          status: true,
        },
      });
      data.staking = stakes;
    }

    // Audit logs (last 90 days)
    if (includeAll || categories.includes('activity')) {
      const auditLogs = await this.databaseService.auditLog.findMany({
        where: {
          userId,
          createdAt: { gt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
        select: {
          action: true,
          resource: true,
          ipAddress: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });
      data.activityLog = auditLogs;
    }

    return data;
  }

  // ===========================
  // Right to Erasure
  // ===========================

  /**
   * Submit erasure request (Right to be Forgotten)
   */
  async submitErasureRequest(
    userId: string,
    request: { scope: 'full' | 'partial'; categories?: string[]; reason: string },
  ): Promise<ErasureRequest> {
    const requestId = this.generateRequestId('ERASURE');
    const deadline = new Date(Date.now() + this.responseDeadline * 24 * 60 * 60 * 1000);

    const erasureRequest = await this.databaseService.dataRightsRequest.create({
      data: {
        id: requestId,
        userId,
        requestType: RequestType.ERASURE,
        status: RequestStatus.PENDING,
        categories: request.scope === 'full' ? ['all'] : request.categories,
        reason: request.reason,
        submittedAt: new Date(),
        responseDeadline: deadline,
        metadata: { scope: request.scope },
      },
    });

    await this.auditService.log({
      action: 'data_rights.erasure_request',
      userId,
      resource: 'data_rights_request',
      resourceId: requestId,
      metadata: { scope: request.scope, categories: request.categories },
    });

    return erasureRequest as ErasureRequest;
  }

  /**
   * Process erasure request
   * NOTE: Some data may be retained for legal/regulatory requirements
   */
  async processErasureRequest(requestId: string): Promise<{
    deletedCategories: string[];
    retainedCategories: { category: string; reason: string }[];
  }> {
    const request = await this.databaseService.dataRightsRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const categories = request.categories as string[];
    const includeAll = categories.includes('all');
    const deletedCategories: string[] = [];
    const retainedCategories: { category: string; reason: string }[] = [];

    // Delete user profile (if full erasure)
    if (includeAll || categories.includes('profile')) {
      // Anonymize instead of delete for audit trail integrity
      await this.databaseService.user.update({
        where: { id: request.userId },
        data: {
          email: null,
          phone: null,
          status: 'deleted',
        },
      });
      deletedCategories.push('profile');
    }

    // Delete encrypted PII
    if (includeAll || categories.includes('pii')) {
      await this.databaseService.encryptedPII.deleteMany({
        where: { identityId: { in: await this.getUserIdentityIds(request.userId) } },
      });
      deletedCategories.push('pii');
    }

    // Delete credentials
    if (includeAll || categories.includes('credentials')) {
      await this.databaseService.credential.deleteMany({
        where: { identity: { userId: request.userId } },
      });
      deletedCategories.push('credentials');
    }

    // Revoke all consents
    if (includeAll || categories.includes('consents')) {
      await this.databaseService.consent.updateMany({
        where: { userId: request.userId, status: 'active' },
        data: { status: 'revoked', revokedAt: new Date(), revocationReason: 'Erasure request' },
      });
      deletedCategories.push('consents');
    }

    // Retain audit logs (regulatory requirement)
    if (includeAll || categories.includes('activity')) {
      retainedCategories.push({
        category: 'activity',
        reason: 'Audit logs retained for 5 years as per regulatory requirements',
      });
    }

    // Retain verification records (Aadhaar Act requirement)
    if (includeAll || categories.includes('verifications')) {
      retainedCategories.push({
        category: 'verifications',
        reason: 'Verification records retained for 5 years as per Aadhaar Act',
      });
    }

    // Update request status
    await this.databaseService.dataRightsRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.COMPLETED,
        completedAt: new Date(),
        responseData: JSON.stringify({ deletedCategories, retainedCategories }),
      },
    });

    return { deletedCategories, retainedCategories };
  }

  // ===========================
  // Right to Correction
  // ===========================

  /**
   * Submit correction request
   */
  async submitCorrectionRequest(
    userId: string,
    request: {
      field: string;
      currentValue: string;
      correctedValue: string;
      reason: string;
      evidence?: string;
    },
  ): Promise<CorrectionRequest> {
    const requestId = this.generateRequestId('CORRECTION');
    const deadline = new Date(Date.now() + this.responseDeadline * 24 * 60 * 60 * 1000);

    const correctionRequest = await this.databaseService.dataRightsRequest.create({
      data: {
        id: requestId,
        userId,
        requestType: RequestType.CORRECTION,
        status: RequestStatus.PENDING,
        reason: request.reason,
        submittedAt: new Date(),
        responseDeadline: deadline,
        metadata: {
          field: request.field,
          currentValue: request.currentValue,
          correctedValue: request.correctedValue,
          evidence: request.evidence,
        },
      },
    });

    await this.auditService.log({
      action: 'data_rights.correction_request',
      userId,
      resource: 'data_rights_request',
      resourceId: requestId,
      metadata: { field: request.field },
    });

    return correctionRequest as CorrectionRequest;
  }

  // ===========================
  // Right to Data Portability
  // ===========================

  /**
   * Submit data portability request
   */
  async submitPortabilityRequest(
    userId: string,
    request: { format: 'json' | 'csv' | 'xml'; categories?: string[] },
  ): Promise<PortabilityRequest> {
    const requestId = this.generateRequestId('PORTABILITY');
    const deadline = new Date(Date.now() + this.responseDeadline * 24 * 60 * 60 * 1000);

    const portabilityRequest = await this.databaseService.dataRightsRequest.create({
      data: {
        id: requestId,
        userId,
        requestType: RequestType.PORTABILITY,
        status: RequestStatus.PENDING,
        categories: request.categories || ['all'],
        submittedAt: new Date(),
        responseDeadline: deadline,
        metadata: { format: request.format },
      },
    });

    return portabilityRequest as PortabilityRequest;
  }

  /**
   * Generate portable data export
   */
  async generatePortableExport(
    requestId: string,
  ): Promise<{ data: string; format: string; filename: string }> {
    const request = await this.databaseService.dataRightsRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const userData = await this.collectUserData(request.userId, request.categories as string[]);
    const metadata = request.metadata as any;
    const format = metadata?.format || 'json';

    let exportData: string;
    let filename: string;

    switch (format) {
      case 'csv':
        exportData = this.convertToCSV(userData);
        filename = `data_export_${request.userId}_${Date.now()}.csv`;
        break;
      case 'xml':
        exportData = this.convertToXML(userData);
        filename = `data_export_${request.userId}_${Date.now()}.xml`;
        break;
      default:
        exportData = JSON.stringify(userData, null, 2);
        filename = `data_export_${request.userId}_${Date.now()}.json`;
    }

    // Update request status
    await this.databaseService.dataRightsRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    return { data: exportData, format, filename };
  }

  // ===========================
  // Grievance Redressal
  // ===========================

  /**
   * Submit grievance
   */
  async submitGrievance(
    userId: string,
    grievance: {
      category: 'consent' | 'access' | 'erasure' | 'correction' | 'other';
      description: string;
      relatedRequestId?: string;
    },
  ): Promise<{ grievanceId: string; status: string; responseDeadline: Date }> {
    const grievanceId = this.generateRequestId('GRIEVANCE');
    const deadline = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days

    await this.databaseService.dataRightsRequest.create({
      data: {
        id: grievanceId,
        userId,
        requestType: 'GRIEVANCE' as RequestType,
        status: RequestStatus.PENDING,
        reason: grievance.description,
        submittedAt: new Date(),
        responseDeadline: deadline,
        metadata: {
          category: grievance.category,
          relatedRequestId: grievance.relatedRequestId,
        },
      },
    });

    await this.auditService.log({
      action: 'data_rights.grievance',
      userId,
      resource: 'data_rights_request',
      resourceId: grievanceId,
      metadata: { category: grievance.category },
    });

    return {
      grievanceId,
      status: 'pending',
      responseDeadline: deadline,
    };
  }

  // ===========================
  // Helper Methods
  // ===========================

  private generateRequestId(type: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${type}-${timestamp}-${random}`;
  }

  private async getUserIdentityIds(userId: string): Promise<string[]> {
    const identities = await this.databaseService.identity.findMany({
      where: { userId },
      select: { id: true },
    });
    return identities.map((i) => i.id);
  }

  private convertToCSV(data: Record<string, any>): string {
    // Simplified CSV conversion
    const lines: string[] = [];
    for (const [category, items] of Object.entries(data)) {
      if (Array.isArray(items) && items.length > 0) {
        const headers = Object.keys(items[0]);
        lines.push(`# ${category}`);
        lines.push(headers.join(','));
        for (const item of items) {
          lines.push(headers.map((h) => JSON.stringify(item[h] ?? '')).join(','));
        }
        lines.push('');
      }
    }
    return lines.join('\n');
  }

  private convertToXML(data: Record<string, any>): string {
    const toXML = (obj: any, tag: string): string => {
      if (Array.isArray(obj)) {
        return obj.map((item, i) => toXML(item, `item_${i}`)).join('');
      }
      if (typeof obj === 'object' && obj !== null) {
        const children = Object.entries(obj)
          .map(([k, v]) => toXML(v, k))
          .join('');
        return `<${tag}>${children}</${tag}>`;
      }
      return `<${tag}>${obj}</${tag}>`;
    };

    return `<?xml version="1.0" encoding="UTF-8"?>\n<data_export>\n${toXML(data, 'data')}\n</data_export>`;
  }
}
```

---

## Track 3: Aadhaar Act Compliance

### 3.1 Overview

Implement Aadhaar Act 2016 specific compliance requirements:
- Aadhaar number masking (display only last 4 digits)
- Purpose limitation and logging
- Per-access consent verification
- 5-year audit retention
- No Aadhaar in logs/errors

### 3.2 Aadhaar Compliance Service

```typescript
// packages/api/src/modules/aadhaar/aadhaar-compliance.service.ts

import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../services/database.service';
import { AuditService, AuditAction, AuditSeverity } from '../../services/audit.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { ConsentService } from '../consent/consent.service';
import { ConsentType } from '../consent/interfaces/consent.interfaces';

/**
 * Valid purposes for Aadhaar access under the Act
 */
export enum AadhaarAccessPurpose {
  IDENTITY_VERIFICATION = 'identity_verification',
  AUTHENTICATION = 'authentication',
  E_KYC = 'e_kyc',
  CREDENTIAL_ISSUANCE = 'credential_issuance',
  REGULATORY_COMPLIANCE = 'regulatory_compliance',
  LEGAL_REQUIREMENT = 'legal_requirement',
}

export interface AadhaarAccessLog {
  id: string;
  userId: string;
  identityId: string;
  purpose: AadhaarAccessPurpose;
  accessType: 'view_masked' | 'decrypt_full' | 'verify' | 'store';
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  consentId?: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * Aadhaar Act Compliance Service
 *
 * Implements Aadhaar Act 2016 requirements:
 * - Section 29: Security of identity information
 * - Section 8: Authentication requirements
 * - UIDAI Circulars on Aadhaar handling
 */
@Injectable()
export class AadhaarComplianceService {
  private readonly logger = new Logger(AadhaarComplianceService.name);
  private readonly retentionYears = 5; // As per Aadhaar Act

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
    private readonly encryptionService: EncryptionService,
    private readonly consentService: ConsentService,
  ) {}

  /**
   * Validate and mask Aadhaar number for display
   * ONLY last 4 digits should be visible
   */
  maskAadhaar(aadhaar: string): string {
    // Remove any spaces or dashes
    const cleaned = aadhaar.replace(/[\s-]/g, '');

    if (cleaned.length !== 12 || !/^\d{12}$/.test(cleaned)) {
      return 'XXXX-XXXX-XXXX';
    }

    return `XXXX-XXXX-${cleaned.slice(-4)}`;
  }

  /**
   * Verify Aadhaar access is authorized
   * Checks consent and logs access
   */
  async authorizeAadhaarAccess(
    userId: string,
    identityId: string,
    purpose: AadhaarAccessPurpose,
    accessType: 'view_masked' | 'decrypt_full' | 'verify' | 'store',
    request?: { ip?: string; userAgent?: string },
  ): Promise<{ authorized: boolean; consentId?: string; reason?: string }> {
    // Check consent based on purpose
    const requiredConsent = this.getRequiredConsentType(purpose, accessType);

    if (requiredConsent) {
      const hasConsent = await this.consentService.hasConsent(userId, requiredConsent);

      if (!hasConsent) {
        // Log unauthorized access attempt
        await this.logAadhaarAccess({
          userId,
          identityId,
          purpose,
          accessType,
          success: false,
          errorMessage: 'Consent not granted',
          ipAddress: request?.ip,
          userAgent: request?.userAgent,
        });

        return {
          authorized: false,
          reason: `Consent required for ${purpose}. Please grant ${requiredConsent} consent.`,
        };
      }

      const consent = await this.consentService.getActiveConsent(userId, requiredConsent);

      // Log authorized access
      await this.logAadhaarAccess({
        userId,
        identityId,
        purpose,
        accessType,
        success: true,
        consentId: consent?.id,
        ipAddress: request?.ip,
        userAgent: request?.userAgent,
      });

      return { authorized: true, consentId: consent?.id };
    }

    // Log access for purposes that don't require consent (e.g., legal requirement)
    await this.logAadhaarAccess({
      userId,
      identityId,
      purpose,
      accessType,
      success: true,
      ipAddress: request?.ip,
      userAgent: request?.userAgent,
    });

    return { authorized: true };
  }

  /**
   * Get required consent type for Aadhaar access
   */
  private getRequiredConsentType(
    purpose: AadhaarAccessPurpose,
    accessType: string,
  ): ConsentType | null {
    // Legal requirements don't need consent
    if (purpose === AadhaarAccessPurpose.LEGAL_REQUIREMENT) {
      return null;
    }

    switch (accessType) {
      case 'store':
        return ConsentType.AADHAAR_STORAGE;
      case 'decrypt_full':
      case 'verify':
        return ConsentType.AADHAAR_VERIFICATION;
      case 'view_masked':
        return ConsentType.IDENTITY_CREATION; // Basic consent is enough for masked view
      default:
        return ConsentType.AADHAAR_VERIFICATION;
    }
  }

  /**
   * Log Aadhaar access for compliance
   */
  private async logAadhaarAccess(params: {
    userId: string;
    identityId: string;
    purpose: AadhaarAccessPurpose;
    accessType: string;
    success: boolean;
    errorMessage?: string;
    consentId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    // Use critical severity for all Aadhaar access
    await this.auditService.log({
      action: params.success ? AuditAction.PII_ACCESS : 'pii.access.denied',
      userId: params.userId,
      resource: 'aadhaar',
      resourceId: params.identityId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        purpose: params.purpose,
        accessType: params.accessType,
        consentId: params.consentId,
      },
      status: params.success ? 'success' : 'failure',
      errorMessage: params.errorMessage,
      severity: AuditSeverity.CRITICAL,
      piiAccessed: ['aadhaar'],
    });

    // Also store in dedicated Aadhaar access log table
    await this.databaseService.aadhaarAccessLog.create({
      data: {
        userId: params.userId,
        identityId: params.identityId,
        purpose: params.purpose,
        accessType: params.accessType,
        timestamp: new Date(),
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        consentId: params.consentId,
        success: params.success,
        errorMessage: params.errorMessage,
      },
    });
  }

  /**
   * Retrieve Aadhaar with compliance checks
   * Never returns full Aadhaar without proper authorization
   */
  async getAadhaar(
    requestingUserId: string,
    identityId: string,
    purpose: AadhaarAccessPurpose,
    options: {
      returnFull?: boolean;
      request?: { ip?: string; userAgent?: string };
    } = {},
  ): Promise<{ masked: string; full?: string }> {
    const accessType = options.returnFull ? 'decrypt_full' : 'view_masked';

    // Authorize access
    const auth = await this.authorizeAadhaarAccess(
      requestingUserId,
      identityId,
      purpose,
      accessType,
      options.request,
    );

    if (!auth.authorized) {
      throw new ForbiddenException(auth.reason);
    }

    // Get encrypted PII
    const encryptedPII = await this.databaseService.encryptedPII.findUnique({
      where: { identityId },
    });

    if (!encryptedPII || !encryptedPII.aadhaarEncrypted) {
      throw new ForbiddenException('Aadhaar not found for this identity');
    }

    // Decrypt for processing
    const fullAadhaar = await this.encryptionService.decryptField(
      { encrypted: true, data: JSON.parse(encryptedPII.aadhaarEncrypted) },
    );

    const masked = this.maskAadhaar(fullAadhaar);

    if (options.returnFull) {
      // Log full decryption
      await this.auditService.logPIIDecrypt(
        requestingUserId,
        identityId,
        'aadhaar',
        purpose,
        options.request,
      );

      return { masked, full: fullAadhaar };
    }

    return { masked };
  }

  /**
   * Validate Aadhaar format
   */
  validateAadhaarFormat(aadhaar: string): { valid: boolean; error?: string } {
    const cleaned = aadhaar.replace(/[\s-]/g, '');

    if (cleaned.length !== 12) {
      return { valid: false, error: 'Aadhaar must be 12 digits' };
    }

    if (!/^\d{12}$/.test(cleaned)) {
      return { valid: false, error: 'Aadhaar must contain only digits' };
    }

    // First digit cannot be 0 or 1
    if (cleaned[0] === '0' || cleaned[0] === '1') {
      return { valid: false, error: 'Invalid Aadhaar number' };
    }

    // Verhoeff checksum validation (simplified)
    if (!this.validateVerhoeff(cleaned)) {
      return { valid: false, error: 'Invalid Aadhaar checksum' };
    }

    return { valid: true };
  }

  /**
   * Verhoeff checksum validation for Aadhaar
   */
  private validateVerhoeff(num: string): boolean {
    const d = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
      [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
      [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
      [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
      [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
      [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
      [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
      [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
      [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    ];

    const p = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
      [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
      [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
      [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
      [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
      [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
      [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
    ];

    let c = 0;
    const reversed = num.split('').reverse();

    for (let i = 0; i < reversed.length; i++) {
      c = d[c][p[i % 8][parseInt(reversed[i], 10)]];
    }

    return c === 0;
  }

  /**
   * Sanitize Aadhaar from logs and error messages
   */
  sanitizeForLogging(message: string): string {
    // Pattern to match 12-digit Aadhaar numbers
    const aadhaarPattern = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
    return message.replace(aadhaarPattern, 'XXXX-XXXX-XXXX');
  }

  /**
   * Generate Aadhaar access report for audit
   */
  async generateAccessReport(
    identityId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalAccesses: number;
    accessesByPurpose: Record<string, number>;
    accessesByType: Record<string, number>;
    logs: AadhaarAccessLog[];
  }> {
    const logs = await this.databaseService.aadhaarAccessLog.findMany({
      where: {
        identityId,
        timestamp: { gte: startDate, lte: endDate },
      },
      orderBy: { timestamp: 'desc' },
    });

    const accessesByPurpose: Record<string, number> = {};
    const accessesByType: Record<string, number> = {};

    for (const log of logs) {
      accessesByPurpose[log.purpose] = (accessesByPurpose[log.purpose] || 0) + 1;
      accessesByType[log.accessType] = (accessesByType[log.accessType] || 0) + 1;
    }

    return {
      totalAccesses: logs.length,
      accessesByPurpose,
      accessesByType,
      logs: logs as AadhaarAccessLog[],
    };
  }

  /**
   * Check if Aadhaar access log retention is compliant (5 years)
   */
  async verifyRetentionCompliance(): Promise<{
    compliant: boolean;
    oldestLog: Date | null;
    issues: string[];
  }> {
    const issues: string[] = [];

    const oldestLog = await this.databaseService.aadhaarAccessLog.findFirst({
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true },
    });

    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    // Check if any logs were deleted that should be retained
    const deletedLogsCount = await this.databaseService.auditLog.count({
      where: {
        action: 'aadhaar_access_log.delete',
        createdAt: { gt: fiveYearsAgo },
      },
    });

    if (deletedLogsCount > 0) {
      issues.push(`${deletedLogsCount} Aadhaar access logs were deleted within retention period`);
    }

    return {
      compliant: issues.length === 0,
      oldestLog: oldestLog?.timestamp || null,
      issues,
    };
  }
}
```

---

## Track 4: Privacy Notice & Breach Notification

### 4.1 Privacy Notice System

```typescript
// packages/api/src/modules/privacy/privacy-notice.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';

export interface PrivacyNotice {
  id: string;
  version: string;
  effectiveDate: Date;
  content: PrivacyNoticeContent;
  isActive: boolean;
  createdAt: Date;
}

export interface PrivacyNoticeContent {
  title: string;
  lastUpdated: string;
  sections: {
    dataCollected: string;
    purposeOfProcessing: string;
    dataRetention: string;
    dataSharing: string;
    yourRights: string;
    security: string;
    contact: string;
    grievanceOfficer: {
      name: string;
      email: string;
      address: string;
    };
  };
}

@Injectable()
export class PrivacyNoticeService {
  private readonly logger = new Logger(PrivacyNoticeService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get current active privacy notice
   */
  async getCurrentNotice(): Promise<PrivacyNotice | null> {
    const notice = await this.databaseService.privacyNotice.findFirst({
      where: { isActive: true },
      orderBy: { effectiveDate: 'desc' },
    });
    return notice as PrivacyNotice | null;
  }

  /**
   * Check if user has acknowledged current privacy notice
   */
  async hasUserAcknowledged(userId: string): Promise<boolean> {
    const currentNotice = await this.getCurrentNotice();
    if (!currentNotice) return true;

    const acknowledgment = await this.databaseService.privacyAcknowledgment.findFirst({
      where: {
        userId,
        privacyNoticeId: currentNotice.id,
      },
    });

    return acknowledgment !== null;
  }

  /**
   * Record user acknowledgment of privacy notice
   */
  async recordAcknowledgment(
    userId: string,
    request?: { ip?: string; userAgent?: string },
  ): Promise<void> {
    const currentNotice = await this.getCurrentNotice();
    if (!currentNotice) return;

    await this.databaseService.privacyAcknowledgment.create({
      data: {
        userId,
        privacyNoticeId: currentNotice.id,
        acknowledgedAt: new Date(),
        ipAddress: request?.ip,
        userAgent: request?.userAgent,
      },
    });
  }

  /**
   * Create new privacy notice version
   */
  async createNoticeVersion(
    content: PrivacyNoticeContent,
    effectiveDate: Date,
  ): Promise<PrivacyNotice> {
    // Deactivate current notice
    await this.databaseService.privacyNotice.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new version
    const version = await this.generateVersion();
    const notice = await this.databaseService.privacyNotice.create({
      data: {
        version,
        effectiveDate,
        content: content as any,
        isActive: true,
      },
    });

    return notice as PrivacyNotice;
  }

  private async generateVersion(): Promise<string> {
    const count = await this.databaseService.privacyNotice.count();
    return `${count + 1}.0`;
  }
}
```

### 4.2 Breach Notification System

```typescript
// packages/api/src/modules/breach/breach-notification.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../services/database.service';
import { AuditService, AuditSeverity } from '../../services/audit.service';

export enum BreachSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum BreachStatus {
  DETECTED = 'detected',
  INVESTIGATING = 'investigating',
  CONTAINED = 'contained',
  NOTIFIED_DPDPA = 'notified_dpdpa',
  NOTIFIED_USERS = 'notified_users',
  RESOLVED = 'resolved',
}

export interface DataBreach {
  id: string;
  title: string;
  description: string;
  severity: BreachSeverity;
  status: BreachStatus;
  detectedAt: Date;
  containedAt?: Date;
  resolvedAt?: Date;
  affectedUsers: number;
  affectedDataTypes: string[];
  rootCause?: string;
  remediation?: string;
  dpdpaNotifiedAt?: Date;
  usersNotifiedAt?: Date;
}

/**
 * Data Breach Notification Service
 *
 * Implements DPDP Act 2023 breach notification requirements:
 * - Report to Data Protection Board within 72 hours
 * - Notify affected data principals
 * - Maintain breach register
 */
@Injectable()
export class BreachNotificationService {
  private readonly logger = new Logger(BreachNotificationService.name);
  private readonly notificationDeadlineHours = 72;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Report a data breach
   */
  async reportBreach(breach: {
    title: string;
    description: string;
    severity: BreachSeverity;
    affectedDataTypes: string[];
    estimatedAffectedUsers?: number;
  }): Promise<DataBreach> {
    const breachRecord = await this.databaseService.dataBreach.create({
      data: {
        title: breach.title,
        description: breach.description,
        severity: breach.severity,
        status: BreachStatus.DETECTED,
        detectedAt: new Date(),
        affectedUsers: breach.estimatedAffectedUsers || 0,
        affectedDataTypes: breach.affectedDataTypes,
      },
    });

    // Log breach with critical severity
    await this.auditService.log({
      action: 'security.breach_detected',
      resource: 'data_breach',
      resourceId: breachRecord.id,
      metadata: {
        severity: breach.severity,
        affectedDataTypes: breach.affectedDataTypes,
      },
      severity: AuditSeverity.CRITICAL,
    });

    // Check if DPDPA notification is required
    if (this.requiresDPDPANotification(breach.severity)) {
      this.logger.error(
        `CRITICAL: Data breach detected. DPDPA notification required within 72 hours. Breach ID: ${breachRecord.id}`,
      );
    }

    return breachRecord as DataBreach;
  }

  /**
   * Update breach status
   */
  async updateBreachStatus(
    breachId: string,
    status: BreachStatus,
    details?: { rootCause?: string; remediation?: string },
  ): Promise<DataBreach> {
    const updateData: any = { status };

    if (status === BreachStatus.CONTAINED) {
      updateData.containedAt = new Date();
    } else if (status === BreachStatus.RESOLVED) {
      updateData.resolvedAt = new Date();
    } else if (status === BreachStatus.NOTIFIED_DPDPA) {
      updateData.dpdpaNotifiedAt = new Date();
    } else if (status === BreachStatus.NOTIFIED_USERS) {
      updateData.usersNotifiedAt = new Date();
    }

    if (details?.rootCause) {
      updateData.rootCause = details.rootCause;
    }
    if (details?.remediation) {
      updateData.remediation = details.remediation;
    }

    const breach = await this.databaseService.dataBreach.update({
      where: { id: breachId },
      data: updateData,
    });

    await this.auditService.log({
      action: `security.breach_${status}`,
      resource: 'data_breach',
      resourceId: breachId,
      metadata: { status, details },
      severity: AuditSeverity.CRITICAL,
    });

    return breach as DataBreach;
  }

  /**
   * Get affected users for a breach
   */
  async getAffectedUsers(breachId: string): Promise<string[]> {
    // Implementation depends on breach type
    // This would query based on affected data types
    const breach = await this.databaseService.dataBreach.findUnique({
      where: { id: breachId },
    });

    if (!breach) return [];

    // Example: If PII was affected, get all users with PII
    const affectedDataTypes = breach.affectedDataTypes as string[];

    if (affectedDataTypes.includes('aadhaar') || affectedDataTypes.includes('pii')) {
      const users = await this.databaseService.encryptedPII.findMany({
        select: { identity: { select: { userId: true } } },
      });
      return users.map((u) => u.identity.userId);
    }

    return [];
  }

  /**
   * Generate breach notification for DPDPA
   */
  async generateDPDPANotification(breachId: string): Promise<string> {
    const breach = await this.databaseService.dataBreach.findUnique({
      where: { id: breachId },
    });

    if (!breach) throw new Error('Breach not found');

    return `
DATA BREACH NOTIFICATION
As per Section 8 of Digital Personal Data Protection Act, 2023

1. ORGANIZATION DETAILS
   Name: AadhaarChain Platform
   Registration: [Registration Number]

2. BREACH DETAILS
   Breach ID: ${breach.id}
   Date Detected: ${breach.detectedAt.toISOString()}
   Description: ${breach.description}
   Severity: ${breach.severity}

3. DATA AFFECTED
   Types: ${(breach.affectedDataTypes as string[]).join(', ')}
   Estimated Affected Individuals: ${breach.affectedUsers}

4. ROOT CAUSE
   ${breach.rootCause || 'Under investigation'}

5. REMEDIATION MEASURES
   ${breach.remediation || 'In progress'}

6. CONTAINMENT STATUS
   Status: ${breach.status}
   ${breach.containedAt ? `Contained At: ${breach.containedAt.toISOString()}` : 'Containment in progress'}

7. CONTACT
   Data Protection Officer: [DPO Name]
   Email: dpo@aadhaarchain.io
   Phone: [Phone Number]

Date: ${new Date().toISOString()}
    `.trim();
  }

  /**
   * Check if breach requires DPDPA notification
   */
  private requiresDPDPANotification(severity: BreachSeverity): boolean {
    return severity === BreachSeverity.HIGH || severity === BreachSeverity.CRITICAL;
  }

  /**
   * Get breaches requiring notification
   */
  async getBreachesPendingNotification(): Promise<DataBreach[]> {
    const deadline = new Date(Date.now() - this.notificationDeadlineHours * 60 * 60 * 1000);

    const breaches = await this.databaseService.dataBreach.findMany({
      where: {
        severity: { in: [BreachSeverity.HIGH, BreachSeverity.CRITICAL] },
        dpdpaNotifiedAt: null,
        detectedAt: { lt: deadline },
      },
    });

    return breaches as DataBreach[];
  }
}
```

---

## Database Migrations

### Prisma Schema Updates

```prisma
// Add to packages/api/prisma/schema.prisma

// Enhanced Consent Model
model Consent {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  identityId      String?   @map("identity_id")
  consentType     String    @map("consent_type")
  purpose         String
  dataElements    String[]  @map("data_elements")
  status          String    @default("active")
  grantedAt       DateTime  @default(now()) @map("granted_at")
  expiresAt       DateTime? @map("expires_at")
  revokedAt       DateTime? @map("revoked_at")
  revocationReason String?  @map("revocation_reason")
  consentArtifact String    @map("consent_artifact") @db.Text
  version         Int       @default(1)
  ipAddress       String?   @map("ip_address")
  userAgent       String?   @map("user_agent")

  @@index([userId])
  @@index([consentType])
  @@index([status])
  @@map("consents")
}

// Data Rights Requests
model DataRightsRequest {
  id               String    @id
  userId           String    @map("user_id")
  requestType      String    @map("request_type")
  status           String    @default("pending")
  categories       String[]  @default([])
  reason           String?
  submittedAt      DateTime  @default(now()) @map("submitted_at")
  responseDeadline DateTime  @map("response_deadline")
  completedAt      DateTime? @map("completed_at")
  responseData     String?   @map("response_data") @db.Text
  metadata         Json?

  @@index([userId])
  @@index([requestType])
  @@index([status])
  @@map("data_rights_requests")
}

// Aadhaar Access Log (5-year retention)
model AadhaarAccessLog {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  identityId   String   @map("identity_id")
  purpose      String
  accessType   String   @map("access_type")
  timestamp    DateTime @default(now())
  ipAddress    String?  @map("ip_address")
  userAgent    String?  @map("user_agent")
  consentId    String?  @map("consent_id")
  success      Boolean  @default(true)
  errorMessage String?  @map("error_message")

  @@index([userId])
  @@index([identityId])
  @@index([timestamp])
  @@index([purpose])
  @@map("aadhaar_access_logs")
}

// Privacy Notice
model PrivacyNotice {
  id            String    @id @default(uuid())
  version       String
  effectiveDate DateTime  @map("effective_date")
  content       Json
  isActive      Boolean   @default(true) @map("is_active")
  createdAt     DateTime  @default(now()) @map("created_at")

  acknowledgments PrivacyAcknowledgment[]

  @@index([isActive])
  @@index([effectiveDate])
  @@map("privacy_notices")
}

// Privacy Acknowledgment
model PrivacyAcknowledgment {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  privacyNoticeId String   @map("privacy_notice_id")
  acknowledgedAt  DateTime @default(now()) @map("acknowledged_at")
  ipAddress       String?  @map("ip_address")
  userAgent       String?  @map("user_agent")

  privacyNotice PrivacyNotice @relation(fields: [privacyNoticeId], references: [id])

  @@unique([userId, privacyNoticeId])
  @@map("privacy_acknowledgments")
}

// Data Breach Register
model DataBreach {
  id                String    @id @default(uuid())
  title             String
  description       String    @db.Text
  severity          String
  status            String    @default("detected")
  detectedAt        DateTime  @default(now()) @map("detected_at")
  containedAt       DateTime? @map("contained_at")
  resolvedAt        DateTime? @map("resolved_at")
  affectedUsers     Int       @default(0) @map("affected_users")
  affectedDataTypes String[]  @map("affected_data_types")
  rootCause         String?   @map("root_cause") @db.Text
  remediation       String?   @db.Text
  dpdpaNotifiedAt   DateTime? @map("dpdpa_notified_at")
  usersNotifiedAt   DateTime? @map("users_notified_at")
  createdAt         DateTime  @default(now()) @map("created_at")

  @@index([severity])
  @@index([status])
  @@index([detectedAt])
  @@map("data_breaches")
}
```

---

## API Endpoints

### New Endpoints Summary

| Module | Endpoint | Method | Description |
|--------|----------|--------|-------------|
| Consent | `/consent/purposes` | GET | List all consent purposes |
| Consent | `/consent` | GET | Get user's consents |
| Consent | `/consent/check/:type` | GET | Check consent status |
| Consent | `/consent/grant` | POST | Grant consent |
| Consent | `/consent/:id` | DELETE | Revoke consent |
| Consent | `/consent/:id/receipt` | GET | Get consent receipt |
| Data Rights | `/data-rights/access` | POST | Submit access request |
| Data Rights | `/data-rights/erasure` | POST | Submit erasure request |
| Data Rights | `/data-rights/correction` | POST | Submit correction request |
| Data Rights | `/data-rights/portability` | POST | Submit portability request |
| Data Rights | `/data-rights/grievance` | POST | Submit grievance |
| Data Rights | `/data-rights/requests` | GET | List user's requests |
| Data Rights | `/data-rights/requests/:id` | GET | Get request status |
| Data Rights | `/data-rights/export/:id` | GET | Download data export |
| Privacy | `/privacy/notice` | GET | Get current privacy notice |
| Privacy | `/privacy/acknowledge` | POST | Acknowledge notice |

---

## Testing Requirements

### Unit Tests

1. **Consent Service Tests**
   - Grant consent with valid/invalid types
   - Revoke consent verification
   - Consent expiration handling
   - Artifact generation and validation

2. **Data Rights Tests**
   - Access request processing
   - Erasure with retention rules
   - Portability export formats
   - Deadline calculations

3. **Aadhaar Compliance Tests**
   - Masking accuracy (XXXX-XXXX-1234)
   - Verhoeff checksum validation
   - Access authorization flow
   - Log sanitization

### Integration Tests

1. **End-to-End Consent Flow**
   - User grants consent
   - Data processing with consent check
   - Consent revocation
   - Post-revocation access denial

2. **Data Rights Request Flow**
   - Submit request
   - Admin processing
   - Data export generation
   - User notification

---

## Deployment Checklist

### Pre-Deployment

- [ ] Run database migrations
- [ ] Configure CONSENT_HMAC_SECRET
- [ ] Set DATA_RIGHTS_RESPONSE_DAYS (default: 30)
- [ ] Create initial privacy notice
- [ ] Configure DPO contact details
- [ ] Set up breach notification email templates

### Compliance Verification

- [ ] Consent collection UI implemented
- [ ] All PII access goes through consent check
- [ ] Aadhaar masking verified (XXXX-XXXX-XXXX)
- [ ] Access logs include purpose
- [ ] Data export includes all categories
- [ ] Erasure respects retention requirements
- [ ] Privacy notice acknowledgment flow works
- [ ] Breach notification workflow tested

### Post-Deployment

- [ ] Monitor consent grant/revoke rates
- [ ] Track data rights request volumes
- [ ] Verify Aadhaar access log retention
- [ ] Schedule breach notification drills
- [ ] Set up compliance dashboard

---

## Success Criteria

Phase 2 is complete when:

1. **Consent Management**
   - [ ] Granular consent collection working
   - [ ] Consent receipts generated
   - [ ] Revocation immediate and complete
   - [ ] Consent required before PII processing

2. **Data Subject Rights**
   - [ ] Access requests processed within 30 days
   - [ ] Erasure with proper retention
   - [ ] Portable export in JSON/CSV/XML
   - [ ] Grievance mechanism operational

3. **Aadhaar Compliance**
   - [ ] All Aadhaar displays masked
   - [ ] Purpose logged for every access
   - [ ] 5-year retention configured
   - [ ] No Aadhaar in logs/errors

4. **Privacy & Breach**
   - [ ] Privacy notice with acknowledgment
   - [ ] Breach register maintained
   - [ ] 72-hour notification workflow ready

---

*Document Version: 1.0*
*Last Updated: 2025-11-22*
*Author: Claude Code Analysis*
