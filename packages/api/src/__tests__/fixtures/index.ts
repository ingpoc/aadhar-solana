/**
 * Test Fixtures and Data Factories
 */

import { v4 as uuidv4 } from 'uuid';
import { Keypair } from '@solana/web3.js';

// ============== Identity Fixtures ==============

export interface IdentityFixture {
  id: string;
  solanaPublicKey: string;
  did: string;
  verificationBitmap: number;
  reputationScore: number;
  stakedAmount: number;
  metadataUri: string;
  createdAt: Date;
  updatedAt: Date;
}

export function createIdentityFixture(overrides: Partial<IdentityFixture> = {}): IdentityFixture {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toString();

  return {
    id: uuidv4(),
    solanaPublicKey: publicKey,
    did: `did:aadhaar:${publicKey.slice(0, 20)}`,
    verificationBitmap: 0,
    reputationScore: 500,
    stakedAmount: 0,
    metadataUri: `https://metadata.aadhaarchain.io/${uuidv4()}.json`,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============== User Fixtures ==============

export interface UserFixture {
  id: string;
  email: string | null;
  phone: string;
  identityId: string;
  role: 'USER' | 'ADMIN' | 'ISSUER';
  createdAt: Date;
  updatedAt: Date;
}

export function createUserFixture(overrides: Partial<UserFixture> = {}): UserFixture {
  return {
    id: uuidv4(),
    email: `test-${Date.now()}@example.com`,
    phone: `9${Math.floor(Math.random() * 900000000 + 100000000)}`,
    identityId: uuidv4(),
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============== Credential Fixtures ==============

export interface CredentialFixture {
  id: string;
  credentialId: string;
  identityId: string;
  issuerId: string | null;
  credentialType: string;
  issuedAt: Date;
  expiresAt: Date | null;
  revoked: boolean;
  revokedAt: Date | null;
  proofHash: string;
  metadataUri: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createCredentialFixture(overrides: Partial<CredentialFixture> = {}): CredentialFixture {
  const now = new Date();
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  return {
    id: uuidv4(),
    credentialId: `cred_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
    identityId: uuidv4(),
    issuerId: uuidv4(),
    credentialType: 'AadhaarVerification',
    issuedAt: now,
    expiresAt: oneYearFromNow,
    revoked: false,
    revokedAt: null,
    proofHash: `0x${Buffer.from(uuidv4()).toString('hex')}`,
    metadataUri: `https://credentials.aadhaarchain.io/${uuidv4()}.json`,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ============== Verification Fixtures ==============

export interface VerificationFixture {
  id: string;
  identityId: string;
  verificationType: 'AADHAAR' | 'PAN' | 'VOTER_ID' | 'EDUCATIONAL' | 'BANK_ACCOUNT';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  requestId: string;
  txnId: string | null;
  proofHash: string | null;
  verifiedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function createVerificationFixture(
  overrides: Partial<VerificationFixture> = {}
): VerificationFixture {
  const now = new Date();
  const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

  return {
    id: uuidv4(),
    identityId: uuidv4(),
    verificationType: 'AADHAAR',
    status: 'PENDING',
    requestId: `req_${Date.now()}`,
    txnId: `txn_${Date.now()}`,
    proofHash: null,
    verifiedAt: null,
    expiresAt: tenMinutesFromNow,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ============== Staking Fixtures ==============

export interface StakeFixture {
  id: string;
  identityId: string;
  amount: number;
  rewards: number;
  stakedAt: Date;
  lastRewardClaim: Date | null;
  cooldownEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createStakeFixture(overrides: Partial<StakeFixture> = {}): StakeFixture {
  const now = new Date();

  return {
    id: uuidv4(),
    identityId: uuidv4(),
    amount: 1000000000, // 1 SOL in lamports
    rewards: 0,
    stakedAt: now,
    lastRewardClaim: null,
    cooldownEndsAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ============== Reputation Event Fixtures ==============

export interface ReputationEventFixture {
  id: string;
  identityId: string;
  eventType: string;
  scoreDelta: number;
  newScore: number;
  source: string;
  description: string | null;
  createdAt: Date;
}

export function createReputationEventFixture(
  overrides: Partial<ReputationEventFixture> = {}
): ReputationEventFixture {
  return {
    id: uuidv4(),
    identityId: uuidv4(),
    eventType: 'VERIFICATION_COMPLETED',
    scoreDelta: 50,
    newScore: 550,
    source: 'verification-oracle',
    description: 'Aadhaar verification completed successfully',
    createdAt: new Date(),
    ...overrides,
  };
}

// ============== JWT Token Fixtures ==============

export interface TokenPayload {
  sub: string;
  identityId: string;
  role: string;
  iat: number;
  exp: number;
}

export function createTokenPayload(overrides: Partial<TokenPayload> = {}): TokenPayload {
  const now = Math.floor(Date.now() / 1000);

  return {
    sub: uuidv4(),
    identityId: uuidv4(),
    role: 'USER',
    iat: now,
    exp: now + 3600, // 1 hour
    ...overrides,
  };
}

// ============== Batch Creation Helpers ==============

export function createMultipleIdentities(count: number): IdentityFixture[] {
  return Array.from({ length: count }, () => createIdentityFixture());
}

export function createMultipleCredentials(
  count: number,
  identityId?: string
): CredentialFixture[] {
  return Array.from({ length: count }, () =>
    createCredentialFixture(identityId ? { identityId } : {})
  );
}

export function createMultipleVerifications(
  count: number,
  identityId?: string
): VerificationFixture[] {
  const types: VerificationFixture['verificationType'][] = [
    'AADHAAR',
    'PAN',
    'VOTER_ID',
    'EDUCATIONAL',
    'BANK_ACCOUNT',
  ];

  return Array.from({ length: count }, (_, i) =>
    createVerificationFixture({
      identityId,
      verificationType: types[i % types.length],
    })
  );
}
