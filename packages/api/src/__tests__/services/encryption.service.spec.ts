/**
 * EncryptionService Unit Tests
 *
 * Tests for AES-256-GCM encryption service
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { KeyManagementService } from '../../common/crypto/key-management.service';
import { CRYPTO_CONSTANTS } from '../../common/crypto/crypto.interfaces';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let keyManagementService: KeyManagementService;

  // Test key (32 bytes = 256 bits, base64 encoded)
  const TEST_MASTER_KEY = Buffer.from(
    '0123456789abcdef0123456789abcdef',
    'utf8'
  ).toString('base64');

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, any> = {
        ENCRYPTION_MASTER_KEY: TEST_MASTER_KEY,
        ENCRYPTION_KEY_ID: 'test-key-001',
        ENCRYPTION_KEY_VERSION: 1,
        ENCRYPTION_KEY_MAX_AGE_DAYS: 90,
        HMAC_SECRET: 'test-hmac-secret-key',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        KeyManagementService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
    keyManagementService = module.get<KeyManagementService>(KeyManagementService);
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt plaintext correctly', () => {
      const plaintext = 'Hello, World! This is sensitive data.';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'Same plaintext';

      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should include correct metadata in encryption result', () => {
      const plaintext = 'Test data';

      const encrypted = service.encrypt(plaintext);

      expect(encrypted.keyId).toBe('test-key-001');
      expect(encrypted.version).toBe(CRYPTO_CONSTANTS.CURRENT_VERSION);
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.ciphertext).toBeDefined();
    });

    it('should encrypt and decrypt empty string', () => {
      const plaintext = '';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt unicode characters', () => {
      const plaintext = '你好世界! 🌍 Привет мир!';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt large data', () => {
      const plaintext = 'x'.repeat(100000);

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for tampered ciphertext', () => {
      const plaintext = 'Original data';
      const encrypted = service.encrypt(plaintext);

      // Tamper with ciphertext
      const tamperedCiphertext = Buffer.from(encrypted.ciphertext, 'base64');
      tamperedCiphertext[0] ^= 0xff; // Flip bits
      encrypted.ciphertext = tamperedCiphertext.toString('base64');

      expect(() => service.decrypt(encrypted)).toThrow();
    });

    it('should throw error for tampered auth tag', () => {
      const plaintext = 'Original data';
      const encrypted = service.encrypt(plaintext);

      // Tamper with auth tag
      const tamperedAuthTag = Buffer.from(encrypted.authTag, 'base64');
      tamperedAuthTag[0] ^= 0xff;
      encrypted.authTag = tamperedAuthTag.toString('base64');

      expect(() => service.decrypt(encrypted)).toThrow();
    });

    it('should support encrypt with AAD (Additional Authenticated Data)', () => {
      const plaintext = 'Sensitive data';
      const aad = 'user:123:identity';

      const encrypted = service.encrypt(plaintext, aad);
      const decrypted = service.decrypt(encrypted, aad);

      expect(decrypted).toBe(plaintext);
    });

    it('should fail decryption with wrong AAD', () => {
      const plaintext = 'Sensitive data';
      const aad = 'user:123:identity';

      const encrypted = service.encrypt(plaintext, aad);

      expect(() => service.decrypt(encrypted, 'wrong:aad')).toThrow();
    });
  });

  describe('encryptField/decryptField', () => {
    it('should encrypt field and return EncryptedField object', () => {
      const value = '123456789012';

      const encrypted = service.encryptField(value);

      expect(encrypted.encrypted).toBe(true);
      expect(encrypted.data).toBeDefined();
      expect(encrypted.data.ciphertext).toBeDefined();
    });

    it('should decrypt EncryptedField object', () => {
      const value = 'test@example.com';

      const encrypted = service.encryptField(value);
      const decrypted = service.decryptField(encrypted);

      expect(decrypted).toBe(value);
    });

    it('should handle null values', () => {
      const encrypted = service.encryptField('');
      expect(encrypted.encrypted).toBe(true);

      const decrypted = service.decryptField(encrypted);
      expect(decrypted).toBe('');
    });
  });

  describe('hashForLookup', () => {
    it('should produce consistent hash for same input', () => {
      const value = '123456789012';
      const context = 'aadhaar';

      const hash1 = service.hashForLookup(value, context);
      const hash2 = service.hashForLookup(value, context);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const context = 'aadhaar';

      const hash1 = service.hashForLookup('123456789012', context);
      const hash2 = service.hashForLookup('987654321098', context);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different contexts', () => {
      const value = '123456789012';

      const hash1 = service.hashForLookup(value, 'aadhaar');
      const hash2 = service.hashForLookup(value, 'pan');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce 64-character hex string (SHA-256)', () => {
      const hash = service.hashForLookup('test', 'context');

      expect(hash.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });
  });

  describe('PII masking', () => {
    describe('maskAadhaar', () => {
      it('should mask Aadhaar correctly', () => {
        const aadhaar = '123456789012';
        const masked = service.maskAadhaar(aadhaar);

        expect(masked).toBe('XXXX-XXXX-9012');
      });

      it('should handle Aadhaar with spaces', () => {
        const aadhaar = '1234 5678 9012';
        const masked = service.maskAadhaar(aadhaar);

        expect(masked).toBe('XXXX-XXXX-9012');
      });

      it('should return placeholder for invalid Aadhaar', () => {
        const masked = service.maskAadhaar('invalid');

        expect(masked).toBe('XXXX-XXXX-XXXX');
      });
    });

    describe('maskPan', () => {
      it('should mask PAN correctly', () => {
        const pan = 'ABCDE1234F';
        const masked = service.maskPan(pan);

        expect(masked).toBe('AXXXX234F');
      });

      it('should return placeholder for invalid PAN', () => {
        const masked = service.maskPan('invalid');

        expect(masked).toBe('XXXXXXXXXX');
      });
    });

    describe('maskPhone', () => {
      it('should mask phone correctly', () => {
        const phone = '9876543210';
        const masked = service.maskPhone(phone);

        expect(masked).toBe('XXXXXX3210');
      });

      it('should handle phone with country code', () => {
        const phone = '+919876543210';
        const masked = service.maskPhone(phone);

        expect(masked).toBe('XXXXXX3210');
      });

      it('should return placeholder for invalid phone', () => {
        const masked = service.maskPhone('123');

        expect(masked).toBe('XXXXXXXXXX');
      });
    });

    describe('maskEmail', () => {
      it('should mask email correctly', () => {
        const email = 'test@example.com';
        const masked = service.maskEmail(email);

        expect(masked).toBe('t***t@example.com');
      });

      it('should mask short email correctly', () => {
        const email = 'a@b.com';
        const masked = service.maskEmail(email);

        expect(masked).toBe('a***a@b.com');
      });

      it('should return placeholder for invalid email', () => {
        const masked = service.maskEmail('invalid');

        expect(masked).toBe('***@***.***');
      });
    });
  });

  describe('getKeyInfo', () => {
    it('should return current key information', () => {
      const keyInfo = service.getKeyInfo();

      expect(keyInfo.keyId).toBe('test-key-001');
      expect(keyInfo.version).toBe(1);
      expect(keyInfo.algorithm).toBe(CRYPTO_CONSTANTS.ALGORITHM);
      expect(keyInfo.status).toBe('active');
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted field', () => {
      const encrypted = service.encryptField('test');

      expect(service.isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plain object', () => {
      const plain = { data: 'test' };

      expect(service.isEncrypted(plain)).toBe(false);
    });

    it('should return false for null', () => {
      expect(service.isEncrypted(null)).toBe(false);
    });

    it('should return false for string', () => {
      expect(service.isEncrypted('test')).toBe(false);
    });
  });
});

describe('KeyManagementService', () => {
  let service: KeyManagementService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        ENCRYPTION_KEY_MAX_AGE_DAYS: 90,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeyManagementService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<KeyManagementService>(KeyManagementService);
  });

  describe('generateKey', () => {
    it('should generate a valid encryption key', () => {
      const { key, keyId } = service.generateKey();

      // Should be base64 encoded 32 bytes
      const keyBuffer = Buffer.from(key, 'base64');
      expect(keyBuffer.length).toBe(CRYPTO_CONSTANTS.KEY_LENGTH);

      // Key ID should have expected format
      expect(keyId).toMatch(/^key-\d+-[a-f0-9]+$/);
    });

    it('should generate unique keys', () => {
      const key1 = service.generateKey();
      const key2 = service.generateKey();

      expect(key1.key).not.toBe(key2.key);
      expect(key1.keyId).not.toBe(key2.keyId);
    });
  });

  describe('validateKeyStrength', () => {
    it('should accept valid key', () => {
      const { key } = service.generateKey();
      const { valid, errors } = service.validateKeyStrength(key);

      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it('should reject all-zeros key', () => {
      const zeroKey = Buffer.alloc(32, 0).toString('base64');
      const { valid, errors } = service.validateKeyStrength(zeroKey);

      expect(valid).toBe(false);
      expect(errors.some((e) => e.includes('zeros'))).toBe(true);
    });

    it('should reject all-ones key', () => {
      const onesKey = Buffer.alloc(32, 0xff).toString('base64');
      const { valid, errors } = service.validateKeyStrength(onesKey);

      expect(valid).toBe(false);
      expect(errors.some((e) => e.includes('ones'))).toBe(true);
    });

    it('should reject sequential key', () => {
      const sequentialKey = Buffer.from(
        Array.from({ length: 32 }, (_, i) => i)
      ).toString('base64');
      const { valid, errors } = service.validateKeyStrength(sequentialKey);

      expect(valid).toBe(false);
      expect(errors.some((e) => e.includes('sequential'))).toBe(true);
    });

    it('should reject key with wrong length', () => {
      const shortKey = Buffer.alloc(16, 0x42).toString('base64');
      const { valid, errors } = service.validateKeyStrength(shortKey);

      expect(valid).toBe(false);
      expect(errors.some((e) => e.includes('length'))).toBe(true);
    });

    it('should reject low entropy key', () => {
      const lowEntropyKey = Buffer.alloc(32, 0x42).toString('base64');
      const { valid, errors } = service.validateKeyStrength(lowEntropyKey);

      expect(valid).toBe(false);
      expect(errors.some((e) => e.includes('entropy'))).toBe(true);
    });
  });

  describe('deriveDataKey', () => {
    it('should derive consistent key for same master key and context', async () => {
      const masterKey = Buffer.from('master-key-for-derivation-test!', 'utf8');
      const context = 'aadhaar';

      const derived1 = await service.deriveDataKey(masterKey, context);
      const derived2 = await service.deriveDataKey(masterKey, context);

      expect(derived1.toString('hex')).toBe(derived2.toString('hex'));
    });

    it('should derive different keys for different contexts', async () => {
      const masterKey = Buffer.from('master-key-for-derivation-test!', 'utf8');

      const derived1 = await service.deriveDataKey(masterKey, 'aadhaar');
      const derived2 = await service.deriveDataKey(masterKey, 'pan');

      expect(derived1.toString('hex')).not.toBe(derived2.toString('hex'));
    });

    it('should derive key of correct length', async () => {
      const masterKey = Buffer.from('master-key-for-derivation-test!', 'utf8');

      const derived = await service.deriveDataKey(masterKey, 'test');

      expect(derived.length).toBe(CRYPTO_CONSTANTS.KEY_LENGTH);
    });
  });

  describe('shouldRotateKey', () => {
    it('should return true for expired key', () => {
      const keyInfo = service.createKeyInfo('old-key', 1);
      keyInfo.createdAt = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago

      expect(service.shouldRotateKey(keyInfo)).toBe(true);
    });

    it('should return false for fresh key', () => {
      const keyInfo = service.createKeyInfo('new-key', 1);

      expect(service.shouldRotateKey(keyInfo)).toBe(false);
    });
  });

  describe('getDaysUntilExpiration', () => {
    it('should return positive days for fresh key', () => {
      const keyInfo = service.createKeyInfo('new-key', 1);

      const days = service.getDaysUntilExpiration(keyInfo);

      expect(days).toBeGreaterThan(80);
      expect(days).toBeLessThanOrEqual(90);
    });

    it('should return 0 for expired key', () => {
      const keyInfo = service.createKeyInfo('old-key', 1);
      keyInfo.createdAt = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);

      const days = service.getDaysUntilExpiration(keyInfo);

      expect(days).toBe(0);
    });
  });

  describe('getKeyGenerationCommand', () => {
    it('should return valid node command', () => {
      const command = service.getKeyGenerationCommand();

      expect(command).toContain('node');
      expect(command).toContain('randomBytes');
      expect(command).toContain('base64');
    });
  });
});
