/**
 * Solana Service Mock for Testing
 */

import { PublicKey, Keypair } from '@solana/web3.js';

// Mock PublicKey
export const mockPublicKey = new PublicKey('11111111111111111111111111111111');

// Mock Keypair
export const mockKeypair = Keypair.generate();

/**
 * Create Solana Service Mock
 */
export const createSolanaServiceMock = () => ({
  // Connection methods
  getConnection: jest.fn().mockReturnValue({
    getBalance: jest.fn().mockResolvedValue(1000000000),
    getAccountInfo: jest.fn().mockResolvedValue(null),
    confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
    sendTransaction: jest.fn().mockResolvedValue('mock-signature'),
  }),

  // Identity methods
  createIdentity: jest.fn().mockResolvedValue({
    signature: 'mock-create-identity-signature',
    identityPda: mockPublicKey.toString(),
  }),

  getIdentity: jest.fn().mockResolvedValue({
    authority: mockPublicKey.toString(),
    did: 'did:aadhaar:test',
    verificationBitmap: 0,
    reputationScore: 500,
    stakedAmount: 0,
  }),

  updateIdentity: jest.fn().mockResolvedValue({
    signature: 'mock-update-identity-signature',
  }),

  // Credential methods
  issueCredential: jest.fn().mockResolvedValue({
    signature: 'mock-issue-credential-signature',
    credentialPda: mockPublicKey.toString(),
  }),

  verifyCredential: jest.fn().mockResolvedValue({
    valid: true,
    status: 'active',
    holder: mockPublicKey.toString(),
  }),

  revokeCredential: jest.fn().mockResolvedValue({
    signature: 'mock-revoke-credential-signature',
  }),

  // Verification methods
  recordVerification: jest.fn().mockResolvedValue({
    signature: 'mock-verification-signature',
    verificationBitmap: 1,
  }),

  // Staking methods
  stake: jest.fn().mockResolvedValue({
    signature: 'mock-stake-signature',
  }),

  unstake: jest.fn().mockResolvedValue({
    signature: 'mock-unstake-signature',
  }),

  getStakeInfo: jest.fn().mockResolvedValue({
    stakedAmount: 1000000000,
    rewards: 10000000,
    lastStakeTime: Date.now() / 1000,
  }),

  // Reputation methods
  getReputationScore: jest.fn().mockResolvedValue({
    score: 500,
    tier: 'silver',
    positiveEvents: 5,
    negativeEvents: 1,
  }),

  updateReputation: jest.fn().mockResolvedValue({
    signature: 'mock-reputation-signature',
    newScore: 550,
  }),

  // Utility methods
  getBalance: jest.fn().mockResolvedValue(1000000000),

  deriveIdentityPda: jest.fn().mockReturnValue([mockPublicKey, 255]),

  deriveCredentialPda: jest.fn().mockReturnValue([mockPublicKey, 255]),

  // Transaction helpers
  signAndSendTransaction: jest.fn().mockResolvedValue('mock-signature'),

  confirmTransaction: jest.fn().mockResolvedValue(true),
});

/**
 * Mock Solana Program IDL types
 */
export const mockProgramAccounts = {
  identityAccount: {
    authority: mockPublicKey,
    did: 'did:aadhaar:test123',
    verificationBitmap: 0,
    reputationScore: 500,
    stakedAmount: 0,
    metadataUri: 'https://example.com/metadata',
    recoveryKeys: [],
    createdAt: BigInt(Date.now() / 1000),
    bump: 255,
  },
  credentialConfig: {
    admin: mockPublicKey,
    identityRegistry: mockPublicKey,
    defaultValidityPeriod: BigInt(86400 * 365),
    maxValidityPeriod: BigInt(86400 * 365 * 5),
    totalSchemas: BigInt(10),
    totalCredentials: BigInt(100),
    bump: 255,
  },
  reputationScore: {
    identity: mockPublicKey,
    score: BigInt(500),
    tier: { silver: {} },
    positiveEvents: 5,
    negativeEvents: 1,
    totalPointsEarned: BigInt(250),
    totalPointsLost: BigInt(30),
    lastEvent: BigInt(Date.now() / 1000),
    createdAt: BigInt(Date.now() / 1000),
    bump: 255,
  },
};
