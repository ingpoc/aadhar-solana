import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'crypto';
import { DatabaseService } from '../../services/database.service';
import { AuditService, AuditAction } from '../../services/audit.service';
import {
  ConsentType,
  ConsentStatus,
  ConsentPurpose,
  ConsentRecord,
  ConsentArtifact,
  GrantConsentParams,
  ConsentQueryOptions,
  CONSENT_PURPOSE_DEFINITIONS,
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
    return CONSENT_PURPOSE_DEFINITIONS.get(type);
  }

  /**
   * Get all available consent purposes
   */
  getAllPurposes(): ConsentPurpose[] {
    return Array.from(CONSENT_PURPOSE_DEFINITIONS.values());
  }

  /**
   * Grant consent for a specific purpose
   */
  async grantConsent(
    userId: string,
    consentType: ConsentType,
    params?: GrantConsentParams,
  ): Promise<ConsentRecord> {
    const purpose = CONSENT_PURPOSE_DEFINITIONS.get(consentType);
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
      params?.expiresInDays,
    );

    // Generate consent artifact
    const artifact = this.generateConsentArtifact({
      userId,
      consentType,
      purpose: params?.customPurpose || purpose.description,
    });

    // Store consent
    const consent = await this.databaseService.consent.create({
      data: {
        userId,
        identityId: params?.identityId,
        consentType,
        purpose: params?.customPurpose || purpose.description,
        dataElements: purpose.dataElements,
        status: ConsentStatus.ACTIVE,
        grantedAt: new Date(),
        expiresAt,
        consentArtifact: JSON.stringify(artifact),
        version: 1,
        ipAddress: params?.ipAddress,
        userAgent: params?.userAgent,
      },
    });

    // Audit log
    await this.auditService.log({
      action: AuditAction.CONSENT_GRANT,
      userId,
      resource: 'consent',
      resourceId: consent.id,
      ipAddress: params?.ipAddress,
      userAgent: params?.userAgent,
      metadata: {
        consentType,
        dataElements: purpose.dataElements,
        expiresAt: expiresAt?.toISOString(),
      },
    });

    this.logger.log(`Consent granted: ${consentType} for user ${userId}`);

    return this.mapToConsentRecord(consent);
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

    return this.mapToConsentRecord(updated);
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

    return consent ? this.mapToConsentRecord(consent) : null;
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
    options?: ConsentQueryOptions,
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

    return consents.map((c) => this.mapToConsentRecord(c));
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

    return consents.map((c) => this.mapToConsentRecord(c));
  }

  /**
   * Verify consent is valid before data processing
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

    if (requestedDataElements && requestedDataElements.length > 0) {
      const consentedElements = new Set(consent.dataElements);
      const missingElements = requestedDataElements.filter(
        (el) => !consentedElements.has(el),
      );

      if (missingElements.length > 0) {
        throw new BadRequestException(
          `Consent does not cover: ${missingElements.join(', ')}`,
        );
      }
    }
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

    const receipt = `
CONSENT RECEIPT
===============
Consent ID: ${consent.id}
User ID: ${consent.userId}
Purpose: ${consent.purpose}
Data Elements: ${(consent.dataElements as string[]).join(', ')}
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

  /**
   * Process expired consents (scheduled job)
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
      return null;
    }

    if (days === 0) {
      return new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    }

    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Map database record to ConsentRecord interface
   */
  private mapToConsentRecord(consent: any): ConsentRecord {
    return {
      id: consent.id,
      userId: consent.userId,
      identityId: consent.identityId,
      consentType: consent.consentType as ConsentType,
      purpose: consent.purpose,
      dataElements: consent.dataElements as string[],
      status: consent.status as ConsentStatus,
      grantedAt: consent.grantedAt,
      expiresAt: consent.expiresAt,
      revokedAt: consent.revokedAt,
      revocationReason: consent.revocationReason,
      consentArtifact: consent.consentArtifact,
      version: consent.version,
      ipAddress: consent.ipAddress,
      userAgent: consent.userAgent,
    };
  }
}
