/**
 * Cryptographic interfaces and types for AadhaarChain
 * Implements AES-256-GCM encryption for PII protection
 */

export interface EncryptionResult {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded initialization vector (16 bytes) */
  iv: string;
  /** Base64-encoded authentication tag (16 bytes) */
  authTag: string;
  /** Identifier of the key used for encryption */
  keyId: string;
  /** Version of the encryption scheme */
  version: number;
}

export interface EncryptedField {
  /** Marker indicating this is an encrypted field */
  encrypted: true;
  /** The encryption data */
  data: EncryptionResult;
}

export interface KeyInfo {
  /** Unique identifier for the key */
  keyId: string;
  /** Version number for key rotation tracking */
  version: number;
  /** When the key was created */
  createdAt: Date;
  /** When the key expires */
  expiresAt: Date;
  /** Current status of the key */
  status: KeyStatus;
  /** Algorithm used */
  algorithm: string;
}

export type KeyStatus = 'active' | 'rotating' | 'deprecated' | 'revoked';

export interface EncryptionConfig {
  /** Master key for encryption (base64 encoded) */
  masterKey: string;
  /** Current key identifier */
  keyId: string;
  /** Key version number */
  keyVersion: number;
  /** Maximum age of key in days before rotation */
  keyMaxAgeDays: number;
}

export interface PIIData {
  aadhaar?: string;
  pan?: string;
  phone?: string;
  email?: string;
  fullName?: string;
  dateOfBirth?: string;
  address?: string;
}

export interface EncryptedPIIData {
  /** Hash for Aadhaar lookup (HMAC-SHA256) */
  aadhaarHash?: string;
  /** Encrypted Aadhaar number */
  aadhaarEncrypted?: string;
  /** Hash for PAN lookup */
  panHash?: string;
  /** Encrypted PAN */
  panEncrypted?: string;
  /** Hash for phone lookup */
  phoneHash?: string;
  /** Encrypted phone */
  phoneEncrypted?: string;
  /** Hash for email lookup */
  emailHash?: string;
  /** Encrypted email */
  emailEncrypted?: string;
  /** Encrypted full name */
  fullNameEncrypted?: string;
  /** Encrypted date of birth */
  dateOfBirthEncrypted?: string;
  /** Encrypted address */
  addressEncrypted?: string;
  /** Key ID used for encryption */
  encryptionKeyId: string;
}

export interface MaskedPIIData {
  aadhaar?: string; // XXXX-XXXX-1234
  pan?: string; // ABXXXX34F
  phone?: string; // XXXXXX7890
  email?: string; // t***t@example.com
  fullName?: string; // Full name (not masked)
}

export const CRYPTO_CONSTANTS = {
  /** AES-256-GCM algorithm identifier */
  ALGORITHM: 'aes-256-gcm',
  /** Key length in bytes (256 bits) */
  KEY_LENGTH: 32,
  /** IV length in bytes (128 bits) */
  IV_LENGTH: 16,
  /** Authentication tag length in bytes */
  AUTH_TAG_LENGTH: 16,
  /** Salt length for key derivation */
  SALT_LENGTH: 32,
  /** Current encryption version */
  CURRENT_VERSION: 1,
} as const;
