import { Injectable, Logger } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { DatabaseService } from '../../services/database.service';
import { AuditService } from '../../services/audit.service';
import { PIIData, EncryptedPIIData, MaskedPIIData } from './crypto.interfaces';

/**
 * Encrypted PII Service
 *
 * Handles secure storage and retrieval of Personally Identifiable Information.
 * All PII is encrypted at rest using AES-256-GCM.
 * Hash-based lookups allow searching without decryption.
 *
 * Compliance:
 * - Aadhaar Act 2016: Encrypted storage of Aadhaar numbers
 * - DPDP Act 2023: Data protection requirements
 */
@Injectable()
export class EncryptedPIIService {
  private readonly logger = new Logger(EncryptedPIIService.name);

  constructor(
    private readonly encryption: EncryptionService,
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Encrypt and store PII data for an identity
   *
   * @param identityId - The identity to associate PII with
   * @param piiData - The raw PII data to encrypt
   * @param userId - User performing the action (for audit)
   */
  async storePII(
    identityId: string,
    piiData: PIIData,
    userId?: string,
    request?: { ip?: string; headers?: Record<string, string> },
  ): Promise<EncryptedPIIData> {
    const encryptedData: EncryptedPIIData = {
      encryptionKeyId: this.encryption.getKeyInfo().keyId,
    };

    // Encrypt Aadhaar
    if (piiData.aadhaar) {
      if (!this.encryption.validateAadhaarFormat(piiData.aadhaar)) {
        throw new Error('Invalid Aadhaar format');
      }
      encryptedData.aadhaarHash = await this.encryption.hashForLookup(
        piiData.aadhaar,
        'aadhaar'
      );
      encryptedData.aadhaarEncrypted = await this.encryption.encryptField(
        piiData.aadhaar,
        'aadhaar'
      );
    }

    // Encrypt PAN
    if (piiData.pan) {
      if (!this.encryption.validatePanFormat(piiData.pan)) {
        throw new Error('Invalid PAN format');
      }
      encryptedData.panHash = await this.encryption.hashForLookup(piiData.pan, 'pan');
      encryptedData.panEncrypted = await this.encryption.encryptField(
        piiData.pan,
        'pan'
      );
    }

    // Encrypt phone
    if (piiData.phone) {
      encryptedData.phoneHash = await this.encryption.hashForLookup(
        piiData.phone,
        'phone'
      );
      encryptedData.phoneEncrypted = await this.encryption.encryptField(
        piiData.phone,
        'phone'
      );
    }

    // Encrypt email
    if (piiData.email) {
      encryptedData.emailHash = await this.encryption.hashForLookup(
        piiData.email,
        'email'
      );
      encryptedData.emailEncrypted = await this.encryption.encryptField(
        piiData.email,
        'email'
      );
    }

    // Encrypt other fields
    if (piiData.fullName) {
      encryptedData.fullNameEncrypted = await this.encryption.encryptField(
        piiData.fullName,
        'fullName'
      );
    }

    if (piiData.dateOfBirth) {
      encryptedData.dateOfBirthEncrypted = await this.encryption.encryptField(
        piiData.dateOfBirth,
        'dateOfBirth'
      );
    }

    if (piiData.address) {
      encryptedData.addressEncrypted = await this.encryption.encryptField(
        piiData.address,
        'address'
      );
    }

    // Store in database
    await this.db.encryptedPII.upsert({
      where: { identityId },
      create: {
        identityId,
        aadhaarHash: encryptedData.aadhaarHash,
        aadhaarEncrypted: encryptedData.aadhaarEncrypted,
        panHash: encryptedData.panHash,
        panEncrypted: encryptedData.panEncrypted,
        phoneHash: encryptedData.phoneHash,
        phoneEncrypted: encryptedData.phoneEncrypted,
        emailHash: encryptedData.emailHash,
        emailEncrypted: encryptedData.emailEncrypted,
        fullNameEncrypted: encryptedData.fullNameEncrypted,
        dateOfBirthEncrypted: encryptedData.dateOfBirthEncrypted,
        addressEncrypted: encryptedData.addressEncrypted,
        encryptionKeyId: encryptedData.encryptionKeyId,
      },
      update: {
        aadhaarHash: encryptedData.aadhaarHash,
        aadhaarEncrypted: encryptedData.aadhaarEncrypted,
        panHash: encryptedData.panHash,
        panEncrypted: encryptedData.panEncrypted,
        phoneHash: encryptedData.phoneHash,
        phoneEncrypted: encryptedData.phoneEncrypted,
        emailHash: encryptedData.emailHash,
        emailEncrypted: encryptedData.emailEncrypted,
        fullNameEncrypted: encryptedData.fullNameEncrypted,
        dateOfBirthEncrypted: encryptedData.dateOfBirthEncrypted,
        addressEncrypted: encryptedData.addressEncrypted,
        encryptionKeyId: encryptedData.encryptionKeyId,
      },
    });

    // Audit log
    await this.audit.log({
      action: 'pii.store',
      userId,
      resource: 'encrypted_pii',
      resourceId: identityId,
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent'],
      requestId: request?.headers?.['x-request-id'],
      metadata: {
        fieldsStored: Object.keys(piiData).filter(
          (k) => piiData[k as keyof PIIData]
        ),
      },
      status: 'success',
    });

    this.logger.log(`Stored encrypted PII for identity: ${identityId}`);
    return encryptedData;
  }

  /**
   * Retrieve and decrypt PII data
   * This is a sensitive operation and is always logged
   *
   * @param identityId - The identity to retrieve PII for
   * @param fields - Specific fields to decrypt (defaults to all)
   * @param purpose - Reason for accessing PII (required for audit)
   * @param userId - User performing the action
   */
  async retrievePII(
    identityId: string,
    fields: (keyof PIIData)[] = ['aadhaar', 'pan', 'phone', 'email', 'fullName'],
    purpose: string,
    userId?: string,
    request?: { ip?: string; headers?: Record<string, string> },
  ): Promise<PIIData> {
    // Log PII access attempt
    await this.audit.log({
      action: 'pii.access',
      userId,
      resource: 'encrypted_pii',
      resourceId: identityId,
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent'],
      requestId: request?.headers?.['x-request-id'],
      metadata: {
        purpose,
        fieldsRequested: fields,
      },
      status: 'success',
    });

    const encrypted = await this.db.encryptedPII.findUnique({
      where: { identityId },
    });

    if (!encrypted) {
      return {};
    }

    const decrypted: PIIData = {};

    // Decrypt requested fields
    if (fields.includes('aadhaar') && encrypted.aadhaarEncrypted) {
      decrypted.aadhaar = await this.encryption.decryptField(
        encrypted.aadhaarEncrypted,
        'aadhaar'
      );
      await this.logDecryption(identityId, 'aadhaar', purpose, userId, request);
    }

    if (fields.includes('pan') && encrypted.panEncrypted) {
      decrypted.pan = await this.encryption.decryptField(
        encrypted.panEncrypted,
        'pan'
      );
      await this.logDecryption(identityId, 'pan', purpose, userId, request);
    }

    if (fields.includes('phone') && encrypted.phoneEncrypted) {
      decrypted.phone = await this.encryption.decryptField(
        encrypted.phoneEncrypted,
        'phone'
      );
      await this.logDecryption(identityId, 'phone', purpose, userId, request);
    }

    if (fields.includes('email') && encrypted.emailEncrypted) {
      decrypted.email = await this.encryption.decryptField(
        encrypted.emailEncrypted,
        'email'
      );
      await this.logDecryption(identityId, 'email', purpose, userId, request);
    }

    if (fields.includes('fullName') && encrypted.fullNameEncrypted) {
      decrypted.fullName = await this.encryption.decryptField(
        encrypted.fullNameEncrypted,
        'fullName'
      );
    }

    if (fields.includes('dateOfBirth') && encrypted.dateOfBirthEncrypted) {
      decrypted.dateOfBirth = await this.encryption.decryptField(
        encrypted.dateOfBirthEncrypted,
        'dateOfBirth'
      );
    }

    if (fields.includes('address') && encrypted.addressEncrypted) {
      decrypted.address = await this.encryption.decryptField(
        encrypted.addressEncrypted,
        'address'
      );
    }

    return decrypted;
  }

  /**
   * Get masked PII data (safe for display)
   * Does not require decryption for hash-based fields
   */
  async getMaskedPII(identityId: string): Promise<MaskedPIIData> {
    const pii = await this.retrievePII(
      identityId,
      ['aadhaar', 'pan', 'phone', 'email', 'fullName'],
      'display_masked',
    );

    return {
      aadhaar: pii.aadhaar ? this.encryption.maskAadhaar(pii.aadhaar) : undefined,
      pan: pii.pan ? this.encryption.maskPan(pii.pan) : undefined,
      phone: pii.phone ? this.encryption.maskPhone(pii.phone) : undefined,
      email: pii.email ? this.encryption.maskEmail(pii.email) : undefined,
      fullName: pii.fullName, // Name is not masked
    };
  }

  /**
   * Find identity by Aadhaar number (using hash lookup)
   * Does not decrypt the Aadhaar number
   */
  async findByAadhaar(aadhaar: string): Promise<string | null> {
    const hash = await this.encryption.hashForLookup(aadhaar, 'aadhaar');

    const result = await this.db.encryptedPII.findUnique({
      where: { aadhaarHash: hash },
      select: { identityId: true },
    });

    return result?.identityId || null;
  }

  /**
   * Find identity by PAN (using hash lookup)
   */
  async findByPan(pan: string): Promise<string | null> {
    const hash = await this.encryption.hashForLookup(pan, 'pan');

    const result = await this.db.encryptedPII.findFirst({
      where: { panHash: hash },
      select: { identityId: true },
    });

    return result?.identityId || null;
  }

  /**
   * Find identity by phone (using hash lookup)
   */
  async findByPhone(phone: string): Promise<string | null> {
    const hash = await this.encryption.hashForLookup(phone, 'phone');

    const result = await this.db.encryptedPII.findFirst({
      where: { phoneHash: hash },
      select: { identityId: true },
    });

    return result?.identityId || null;
  }

  /**
   * Find identity by email (using hash lookup)
   */
  async findByEmail(email: string): Promise<string | null> {
    const hash = await this.encryption.hashForLookup(email, 'email');

    const result = await this.db.encryptedPII.findFirst({
      where: { emailHash: hash },
      select: { identityId: true },
    });

    return result?.identityId || null;
  }

  /**
   * Delete PII data for an identity (for right to erasure)
   */
  async deletePII(
    identityId: string,
    userId?: string,
    request?: { ip?: string; headers?: Record<string, string> },
  ): Promise<void> {
    await this.db.encryptedPII.delete({
      where: { identityId },
    });

    await this.audit.log({
      action: 'pii.delete',
      userId,
      resource: 'encrypted_pii',
      resourceId: identityId,
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent'],
      requestId: request?.headers?.['x-request-id'],
      metadata: { reason: 'right_to_erasure' },
      status: 'success',
    });

    this.logger.log(`Deleted PII for identity: ${identityId}`);
  }

  /**
   * Log PII decryption event
   */
  private async logDecryption(
    identityId: string,
    field: string,
    purpose: string,
    userId?: string,
    request?: { ip?: string; headers?: Record<string, string> },
  ): Promise<void> {
    await this.audit.log({
      action: 'pii.decrypt',
      userId,
      resource: 'encrypted_pii',
      resourceId: identityId,
      ipAddress: request?.ip,
      userAgent: request?.headers?.['user-agent'],
      requestId: request?.headers?.['x-request-id'],
      metadata: { field, purpose },
      status: 'success',
    });
  }
}
