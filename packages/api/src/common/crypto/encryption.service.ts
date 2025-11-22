import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHmac,
  scrypt,
} from 'crypto';
import { promisify } from 'util';
import {
  EncryptionResult,
  EncryptedField,
  CRYPTO_CONSTANTS,
} from './crypto.interfaces';

const scryptAsync = promisify(scrypt);

/**
 * AES-256-GCM Encryption Service for PII Protection
 *
 * Features:
 * - Authenticated encryption with associated data (AEAD)
 * - Deterministic hashing for lookups
 * - Field-level encryption/decryption
 * - PII masking utilities
 *
 * Compliance:
 * - Aadhaar Act 2016 requirements
 * - DPDP Act 2023 requirements
 */
@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);

  private masterKey: Buffer | null = null;
  private currentKeyId: string = 'key-v1';
  private keyVersion: number = 1;
  private initialized: boolean = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initializeMasterKey();
  }

  /**
   * Initialize the master encryption key from environment
   */
  private async initializeMasterKey(): Promise<void> {
    const masterKeyBase64 = this.configService.get<string>('ENCRYPTION_MASTER_KEY');

    if (!masterKeyBase64) {
      this.logger.warn(
        'ENCRYPTION_MASTER_KEY not set - encryption service running in degraded mode. ' +
        'Generate a key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
      );
      // Generate a temporary key for development (NOT for production)
      const devKey = randomBytes(CRYPTO_CONSTANTS.KEY_LENGTH);
      this.masterKey = devKey;
      this.logger.warn('Using auto-generated development key - DO NOT USE IN PRODUCTION');
    } else {
      const keyBuffer = Buffer.from(masterKeyBase64, 'base64');

      if (keyBuffer.length !== CRYPTO_CONSTANTS.KEY_LENGTH) {
        throw new Error(
          `Master key must be ${CRYPTO_CONSTANTS.KEY_LENGTH} bytes (256 bits). ` +
          `Got ${keyBuffer.length} bytes.`
        );
      }

      this.masterKey = keyBuffer;
    }

    this.currentKeyId = this.configService.get<string>('ENCRYPTION_KEY_ID') || 'key-v1';
    this.keyVersion = parseInt(
      this.configService.get<string>('ENCRYPTION_KEY_VERSION') || '1',
      10
    );

    this.initialized = true;
    this.logger.log(`Encryption service initialized with key ID: ${this.currentKeyId}`);
  }

  /**
   * Ensure the service is initialized before use
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.masterKey) {
      throw new Error('Encryption service not initialized');
    }
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   *
   * @param plaintext - The data to encrypt
   * @param associatedData - Additional authenticated data (AAD) for context binding
   * @returns Encryption result with ciphertext, IV, and auth tag
   */
  async encrypt(plaintext: string, associatedData?: string): Promise<EncryptionResult> {
    this.ensureInitialized();

    if (!plaintext) {
      throw new Error('Plaintext cannot be empty');
    }

    const iv = randomBytes(CRYPTO_CONSTANTS.IV_LENGTH);
    const cipher = createCipheriv(
      CRYPTO_CONSTANTS.ALGORITHM,
      this.masterKey!,
      iv,
      { authTagLength: CRYPTO_CONSTANTS.AUTH_TAG_LENGTH }
    );

    // Add associated data for additional authentication (prevents context switching attacks)
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
   *
   * @param encryptionResult - The encryption result from encrypt()
   * @param associatedData - AAD used during encryption (must match exactly)
   * @returns Decrypted plaintext
   */
  async decrypt(
    encryptionResult: EncryptionResult,
    associatedData?: string
  ): Promise<string> {
    this.ensureInitialized();

    const { ciphertext, iv, authTag, keyId } = encryptionResult;

    // Log if decrypting with different key ID (for key rotation monitoring)
    if (keyId !== this.currentKeyId) {
      this.logger.warn(
        `Decrypting data encrypted with key ID: ${keyId} (current: ${this.currentKeyId})`
      );
    }

    const ivBuffer = Buffer.from(iv, 'base64');
    const authTagBuffer = Buffer.from(authTag, 'base64');
    const ciphertextBuffer = Buffer.from(ciphertext, 'base64');

    const decipher = createDecipheriv(
      CRYPTO_CONSTANTS.ALGORITHM,
      this.masterKey!,
      ivBuffer,
      { authTagLength: CRYPTO_CONSTANTS.AUTH_TAG_LENGTH }
    );

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
      this.logger.error('Decryption failed - possible tampering or wrong key');
      throw new Error('Decryption failed - data integrity check failed');
    }
  }

  /**
   * Encrypt a field value for database storage
   * Returns a JSON string that can be stored in a text column
   *
   * @param value - The value to encrypt
   * @param fieldName - Field name used as AAD for context binding
   */
  async encryptField(value: string, fieldName: string): Promise<string> {
    if (!value) return '';

    const result = await this.encrypt(value, fieldName);
    const encryptedField: EncryptedField = { encrypted: true, data: result };
    return JSON.stringify(encryptedField);
  }

  /**
   * Decrypt a field value from database storage
   * Handles both encrypted JSON and legacy unencrypted values
   *
   * @param storedValue - The stored value (may be encrypted JSON or plain text)
   * @param fieldName - Field name used as AAD during encryption
   */
  async decryptField(storedValue: string, fieldName: string): Promise<string> {
    if (!storedValue) return '';

    try {
      const parsed = JSON.parse(storedValue);

      if (parsed.encrypted === true && parsed.data) {
        return await this.decrypt(parsed.data, fieldName);
      }

      // JSON but not encrypted format - return as-is
      return storedValue;
    } catch {
      // Not valid JSON - assume legacy unencrypted value
      return storedValue;
    }
  }

  /**
   * Create a deterministic hash for lookup purposes
   * Uses HMAC-SHA256 for secure, keyed hashing
   *
   * @param value - The value to hash
   * @param purpose - Purpose identifier (e.g., 'aadhaar', 'pan')
   * @returns Hex-encoded hash
   */
  async hashForLookup(value: string, purpose: string): Promise<string> {
    this.ensureInitialized();

    if (!value) return '';

    // Normalize the value (lowercase, trim whitespace)
    const normalized = value.toLowerCase().trim().replace(/\s+/g, '');

    const hmac = createHmac('sha256', this.masterKey!);
    hmac.update(`${purpose}:${normalized}`);
    return hmac.digest('hex');
  }

  /**
   * Derive a purpose-specific key from the master key
   * Used for isolating encryption contexts
   */
  async deriveKey(purpose: string): Promise<Buffer> {
    this.ensureInitialized();

    const salt = Buffer.from(purpose, 'utf8');
    const derivedKey = await scryptAsync(
      this.masterKey!,
      salt,
      CRYPTO_CONSTANTS.KEY_LENGTH
    ) as Buffer;

    return derivedKey;
  }

  // =====================
  // PII Masking Utilities
  // =====================

  /**
   * Mask Aadhaar number for display
   * Format: XXXX-XXXX-1234
   */
  maskAadhaar(aadhaar: string): string {
    if (!aadhaar) return '';

    // Remove any existing formatting
    const cleaned = aadhaar.replace(/[\s-]/g, '');

    if (cleaned.length !== 12) {
      return 'XXXX-XXXX-XXXX';
    }

    return `XXXX-XXXX-${cleaned.slice(-4)}`;
  }

  /**
   * Mask PAN for display
   * Format: ABXXXX34F (show first 2 and last 2 chars)
   */
  maskPan(pan: string): string {
    if (!pan) return '';

    const cleaned = pan.toUpperCase().replace(/\s/g, '');

    if (cleaned.length !== 10) {
      return 'XXXXXXXXXX';
    }

    return `${cleaned.slice(0, 2)}XXXXXX${cleaned.slice(-2)}`;
  }

  /**
   * Mask phone number for display
   * Format: XXXXXX7890 (show last 4 digits)
   */
  maskPhone(phone: string): string {
    if (!phone) return '';

    // Remove any formatting, keep only digits
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length < 4) {
      return 'XXXXXXXXXX';
    }

    const visibleDigits = cleaned.slice(-4);
    const maskedLength = Math.max(0, cleaned.length - 4);

    return 'X'.repeat(maskedLength) + visibleDigits;
  }

  /**
   * Mask email for display
   * Format: t***t@example.com (show first and last char of local part)
   */
  maskEmail(email: string): string {
    if (!email || !email.includes('@')) {
      return '***@***.***';
    }

    const [local, domain] = email.split('@');

    if (local.length <= 2) {
      return `**@${domain}`;
    }

    const first = local[0];
    const last = local[local.length - 1];
    const maskedMiddle = '*'.repeat(Math.min(local.length - 2, 5));

    return `${first}${maskedMiddle}${last}@${domain}`;
  }

  /**
   * Mask a generic string (show first and last n characters)
   */
  maskString(value: string, showFirst: number = 2, showLast: number = 2): string {
    if (!value) return '';

    if (value.length <= showFirst + showLast) {
      return '*'.repeat(value.length);
    }

    const first = value.slice(0, showFirst);
    const last = value.slice(-showLast);
    const maskedLength = value.length - showFirst - showLast;

    return `${first}${'*'.repeat(maskedLength)}${last}`;
  }

  // =====================
  // Utility Methods
  // =====================

  /**
   * Get current encryption key info
   */
  getKeyInfo(): { keyId: string; version: number } {
    return {
      keyId: this.currentKeyId,
      version: this.keyVersion,
    };
  }

  /**
   * Check if a stored value is encrypted
   */
  isEncrypted(storedValue: string): boolean {
    if (!storedValue) return false;

    try {
      const parsed = JSON.parse(storedValue);
      return parsed.encrypted === true && parsed.data !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Validate Aadhaar number format (12 digits, starts with 2-9)
   */
  validateAadhaarFormat(aadhaar: string): boolean {
    const cleaned = aadhaar.replace(/[\s-]/g, '');
    return /^[2-9]\d{11}$/.test(cleaned);
  }

  /**
   * Validate PAN format (AAAAA9999A)
   */
  validatePanFormat(pan: string): boolean {
    const cleaned = pan.toUpperCase().replace(/\s/g, '');
    return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(cleaned);
  }
}
