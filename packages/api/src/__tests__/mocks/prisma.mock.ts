/**
 * Prisma Client Mock for Testing
 */

import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

// Create a deep mock of PrismaClient
export const prismaMock = mockDeep<PrismaClient>();

// Reset mock between tests
beforeEach(() => {
  mockReset(prismaMock);
});

export type MockPrismaClient = DeepMockProxy<PrismaClient>;

/**
 * Create a mock transaction
 */
export function mockTransaction<T>(result: T) {
  prismaMock.$transaction.mockImplementation(async (fn) => {
    if (typeof fn === 'function') {
      return fn(prismaMock);
    }
    return result;
  });
}

/**
 * Mock identity data
 */
export const mockIdentity = {
  id: 'test-identity-id',
  solanaPublicKey: 'TestPublicKey123456789012345678901234567890123',
  did: 'did:aadhaar:TestPublicKey1234567890',
  verificationBitmap: 0,
  reputationScore: 500,
  stakedAmount: 0,
  metadataUri: 'https://example.com/metadata.json',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

/**
 * Mock credential data
 */
export const mockCredential = {
  id: 'test-credential-id',
  credentialId: 'cred_123456',
  identityId: 'test-identity-id',
  issuerId: 'test-issuer-id',
  credentialType: 'AadhaarVerification',
  issuedAt: new Date('2024-01-01'),
  expiresAt: new Date('2025-01-01'),
  revoked: false,
  revokedAt: null,
  proofHash: '0x1234567890abcdef',
  metadataUri: 'https://example.com/cred.json',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

/**
 * Mock user data
 */
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  phone: '9876543210',
  identityId: 'test-identity-id',
  role: 'USER',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

/**
 * Mock verification data
 */
export const mockVerification = {
  id: 'test-verification-id',
  identityId: 'test-identity-id',
  verificationType: 'AADHAAR',
  status: 'COMPLETED',
  requestId: 'req_123456',
  proofHash: '0xabcdef123456',
  verifiedAt: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};
