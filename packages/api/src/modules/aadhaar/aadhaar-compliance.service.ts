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
  private readonly retentionYears = 5;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
    private readonly encryptionService: EncryptionService,
    private readonly consentService: ConsentService,
  ) {}

  /**
   * Mask Aadhaar number for display - ONLY last 4 digits visible
   */
  maskAadhaar(aadhaar: string): string {
    const cleaned = aadhaar.replace(/[\s-]/g, '');
    if (cleaned.length !== 12 || !/^\d{12}$/.test(cleaned)) {
      return 'XXXX-XXXX-XXXX';
    }
    return `XXXX-XXXX-${cleaned.slice(-4)}`;
  }

  /**
   * Authorize Aadhaar access with consent check
   */
  async authorizeAadhaarAccess(
    userId: string,
    identityId: string,
    purpose: AadhaarAccessPurpose,
    accessType: 'view_masked' | 'decrypt_full' | 'verify' | 'store',
    request?: { ip?: string; userAgent?: string },
  ): Promise<{ authorized: boolean; consentId?: string; reason?: string }> {
    const requiredConsent = this.getRequiredConsentType(purpose, accessType);

    if (requiredConsent) {
      const hasConsent = await this.consentService.hasConsent(userId, requiredConsent);

      if (!hasConsent) {
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
        return ConsentType.IDENTITY_CREATION;
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

    // Store in dedicated Aadhaar access log table
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
   */
  async getAadhaar(
    requestingUserId: string,
    identityId: string,
    purpose: AadhaarAccessPurpose,
    options: { returnFull?: boolean; request?: { ip?: string; userAgent?: string } } = {},
  ): Promise<{ masked: string; full?: string }> {
    const accessType = options.returnFull ? 'decrypt_full' : 'view_masked';

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

    const encryptedPII = await this.databaseService.encryptedPII.findUnique({
      where: { identityId },
    });

    if (!encryptedPII || !encryptedPII.aadhaarEncrypted) {
      throw new ForbiddenException('Aadhaar not found for this identity');
    }

    const fullAadhaar = this.encryptionService.decryptField(
      { encrypted: true, data: JSON.parse(encryptedPII.aadhaarEncrypted) },
    );

    const masked = this.maskAadhaar(fullAadhaar);

    if (options.returnFull) {
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
   * Validate Aadhaar format with Verhoeff checksum
   */
  validateAadhaarFormat(aadhaar: string): { valid: boolean; error?: string } {
    const cleaned = aadhaar.replace(/[\s-]/g, '');

    if (cleaned.length !== 12) {
      return { valid: false, error: 'Aadhaar must be 12 digits' };
    }

    if (!/^\d{12}$/.test(cleaned)) {
      return { valid: false, error: 'Aadhaar must contain only digits' };
    }

    if (cleaned[0] === '0' || cleaned[0] === '1') {
      return { valid: false, error: 'Invalid Aadhaar number' };
    }

    if (!this.validateVerhoeff(cleaned)) {
      return { valid: false, error: 'Invalid Aadhaar checksum' };
    }

    return { valid: true };
  }

  /**
   * Verhoeff checksum validation
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
}
