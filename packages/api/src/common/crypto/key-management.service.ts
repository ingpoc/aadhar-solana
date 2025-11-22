import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { KeyInfo, KeyStatus, CRYPTO_CONSTANTS } from './crypto.interfaces';

const scryptAsync = promisify(scrypt);

/**
 * Key Management Service
 *
 * Handles:
 * - Key generation
 * - Key derivation (KEK -> DEK)
 * - Key rotation planning
 * - Key status tracking
 *
 * Note: In production, integrate with:
 * - AWS KMS
 * - HashiCorp Vault
 * - Azure Key Vault
 * - Hardware Security Module (HSM)
 */
@Injectable()
export class KeyManagementService {
  private readonly logger = new Logger(KeyManagementService.name);
  private readonly maxKeyAgeDays: number;

  constructor(private readonly configService: ConfigService) {
    this.maxKeyAgeDays = this.configService.get<number>(
      'ENCRYPTION_KEY_MAX_AGE_DAYS',
      90
    );
  }

  /**
   * Generate a new random encryption key
   * Returns base64-encoded key suitable for ENCRYPTION_MASTER_KEY
   */
  generateKey(): { key: string; keyId: string } {
    const key = randomBytes(CRYPTO_CONSTANTS.KEY_LENGTH);
    const keyId = this.generateKeyId();

    this.logger.log(`Generated new encryption key with ID: ${keyId}`);

    return {
      key: key.toString('base64'),
      keyId,
    };
  }

  /**
   * Generate a unique key identifier
   */
  generateKeyId(): string {
    const timestamp = Date.now();
    const random = randomBytes(4).toString('hex');
    return `key-${timestamp}-${random}`;
  }

  /**
   * Derive a Data Encryption Key (DEK) from a Key Encryption Key (KEK)
   * Uses scrypt for secure key derivation
   *
   * @param masterKey - The master key (KEK)
   * @param context - Context string for key separation (e.g., 'aadhaar', 'pan')
   */
  async deriveDataKey(masterKey: Buffer, context: string): Promise<Buffer> {
    // Use context as salt for deterministic derivation
    const salt = Buffer.from(`aadhaarchain:dek:${context}`, 'utf8');

    const derivedKey = (await scryptAsync(
      masterKey,
      salt,
      CRYPTO_CONSTANTS.KEY_LENGTH,
      {
        N: 16384, // CPU/memory cost parameter
        r: 8,     // Block size
        p: 1,     // Parallelization
      }
    )) as Buffer;

    return derivedKey;
  }

  /**
   * Check if a key should be rotated based on age
   */
  shouldRotateKey(keyInfo: KeyInfo): boolean {
    const maxAgeMs = this.maxKeyAgeDays * 24 * 60 * 60 * 1000;
    const keyAge = Date.now() - keyInfo.createdAt.getTime();
    return keyAge > maxAgeMs;
  }

  /**
   * Get days until key expiration
   */
  getDaysUntilExpiration(keyInfo: KeyInfo): number {
    const maxAgeMs = this.maxKeyAgeDays * 24 * 60 * 60 * 1000;
    const keyAge = Date.now() - keyInfo.createdAt.getTime();
    const remainingMs = maxAgeMs - keyAge;
    return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  }

  /**
   * Create key info object for current key
   */
  createKeyInfo(keyId: string, version: number): KeyInfo {
    const createdAt = new Date();
    const expiresAt = new Date(
      createdAt.getTime() + this.maxKeyAgeDays * 24 * 60 * 60 * 1000
    );

    return {
      keyId,
      version,
      createdAt,
      expiresAt,
      status: 'active' as KeyStatus,
      algorithm: CRYPTO_CONSTANTS.ALGORITHM,
    };
  }

  /**
   * Validate key strength
   * Checks if a key meets security requirements
   */
  validateKeyStrength(keyBase64: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      const keyBuffer = Buffer.from(keyBase64, 'base64');

      // Check length
      if (keyBuffer.length !== CRYPTO_CONSTANTS.KEY_LENGTH) {
        errors.push(
          `Key length must be ${CRYPTO_CONSTANTS.KEY_LENGTH} bytes (${CRYPTO_CONSTANTS.KEY_LENGTH * 8} bits). ` +
          `Got ${keyBuffer.length} bytes.`
        );
      }

      // Check for weak patterns (all zeros, all ones, etc.)
      const allZeros = keyBuffer.every((b) => b === 0);
      const allOnes = keyBuffer.every((b) => b === 0xff);
      const sequential = this.isSequential(keyBuffer);

      if (allZeros) errors.push('Key cannot be all zeros');
      if (allOnes) errors.push('Key cannot be all ones');
      if (sequential) errors.push('Key cannot be sequential');

      // Check entropy (rough estimate)
      const uniqueBytes = new Set(keyBuffer).size;
      if (uniqueBytes < 16) {
        errors.push(
          `Key has low entropy (only ${uniqueBytes} unique byte values). ` +
          'Use a cryptographically secure random generator.'
        );
      }
    } catch (e) {
      errors.push('Invalid base64 encoding');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if a buffer contains sequential bytes
   */
  private isSequential(buffer: Buffer): boolean {
    if (buffer.length < 3) return false;

    let ascending = true;
    let descending = true;

    for (let i = 1; i < buffer.length; i++) {
      if (buffer[i] !== buffer[i - 1] + 1) ascending = false;
      if (buffer[i] !== buffer[i - 1] - 1) descending = false;
      if (!ascending && !descending) return false;
    }

    return ascending || descending;
  }

  /**
   * Key rotation procedure (outline)
   *
   * WARNING: This is a complex operation that requires:
   * 1. Generating a new key
   * 2. Updating the encryption service with new key
   * 3. Re-encrypting all existing PII data
   * 4. Verifying re-encryption success
   * 5. Deprecating the old key
   * 6. After grace period, revoking the old key
   *
   * This should be run as a background job with monitoring
   */
  async initiateKeyRotation(): Promise<void> {
    this.logger.warn('Key rotation initiated');
    this.logger.warn('This operation requires manual execution with proper procedures');

    throw new Error(
      'Key rotation must be performed manually. Steps:\n' +
      '1. Generate new key: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"\n' +
      '2. Update ENCRYPTION_MASTER_KEY_NEW in environment\n' +
      '3. Run re-encryption migration script\n' +
      '4. Verify all data re-encrypted successfully\n' +
      '5. Update ENCRYPTION_MASTER_KEY to new key\n' +
      '6. Increment ENCRYPTION_KEY_VERSION\n' +
      '7. Restart services\n' +
      '8. After grace period, remove old key from backup systems'
    );
  }

  /**
   * Generate a command for creating a new key
   */
  getKeyGenerationCommand(): string {
    return `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`;
  }
}
