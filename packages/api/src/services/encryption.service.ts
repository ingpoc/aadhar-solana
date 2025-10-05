import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;

  generateKey(): Buffer {
    return crypto.randomBytes(this.keyLength);
  }

  encrypt(plaintext: string, key: Buffer): { encrypted: Buffer; iv: Buffer; tag: Buffer } {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const tag = cipher.getAuthTag();

    return { encrypted, iv, tag };
  }

  decrypt(encryptedData: Buffer, key: Buffer, iv: Buffer, tag: Buffer): string {
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  }

  encryptField(plaintext: string, key: Buffer): Buffer {
    const { encrypted, iv, tag } = this.encrypt(plaintext, key);
    return Buffer.concat([iv, tag, encrypted]);
  }

  decryptField(encryptedField: Buffer, key: Buffer): string {
    const iv = encryptedField.slice(0, this.ivLength);
    const tag = encryptedField.slice(this.ivLength, this.ivLength + this.tagLength);
    const encrypted = encryptedField.slice(this.ivLength + this.tagLength);

    return this.decrypt(encrypted, key, iv, tag);
  }

  hash(data: string): Buffer {
    return crypto.createHash('sha256').update(data).digest();
  }

  generateZKCommitment(value: string, randomness: Buffer): Buffer {
    const data = Buffer.concat([Buffer.from(value, 'utf8'), randomness]);
    return crypto.createHash('sha256').update(data).digest();
  }

  generateAgeCommitment(dob: string): { commitment: Buffer; randomness: Buffer } {
    const birthDate = new Date(dob);
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const randomness = crypto.randomBytes(32);
    const commitment = this.generateZKCommitment(age.toString(), randomness);
    return { commitment, randomness };
  }

  generateGenderCommitment(gender: string): { commitment: Buffer; randomness: Buffer } {
    const randomness = crypto.randomBytes(32);
    const commitment = this.generateZKCommitment(gender.toLowerCase(), randomness);
    return { commitment, randomness };
  }

  signData(data: Buffer, privateKey: Buffer): Buffer {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    return sign.sign({ key: privateKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING });
  }

  verifySignature(data: Buffer, signature: Buffer, publicKey: Buffer): boolean {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    return verify.verify(
      { key: publicKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING },
      signature
    );
  }
}
