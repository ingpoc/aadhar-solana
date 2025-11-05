import { PublicKey } from '@solana/web3.js';

export interface Identity {
  id: string;
  userId: string;
  solanaPublicKey: string;
  did: string;
  verificationBitmap: bigint | string;
  reputationScore: number;
  stakedAmount: bigint | string;
  metadataUri?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface VerificationRequest {
  id: string;
  identityId: string;
  verificationType: VerificationType;
  status: VerificationStatus;
  requestDataHash?: string;
  proofHash?: string;
  apiSetuRequestId?: string;
  createdAt: Date | string;
  completedAt?: Date | string;
  expiresAt?: Date | string;
}

export enum VerificationType {
  AADHAAR = 'aadhaar',
  PAN = 'pan',
  EMAIL = 'email',
  PHONE = 'phone',
  BANK_ACCOUNT = 'bank_account',
  EDUCATIONAL = 'educational',
}

export enum VerificationStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export interface Credential {
  id: string;
  credentialId: string;
  identityId: string;
  issuerId?: string;
  credentialType: string;
  issuedAt: Date | string;
  expiresAt?: Date | string;
  revoked: boolean;
  revokedAt?: Date | string;
  metadataUri?: string;
  proofHash?: string;
}

export interface ReputationHistory {
  id: string;
  identityId: string;
  eventType: string;
  scoreDelta: number;
  newScore: number;
  description?: string;
  createdAt: Date | string;
}

export interface StakeAccount {
  id: string;
  identityId: string;
  amount: bigint | string;
  stakedAt: Date | string;
  unlockTime?: Date | string;
  status: StakeStatus;
}

export enum StakeStatus {
  ACTIVE = 'active',
  UNLOCKING = 'unlocking',
  UNLOCKED = 'unlocked',
  SLASHED = 'slashed',
}

export interface VerificationBitmap {
  aadhaar: boolean;
  pan: boolean;
  educational: boolean;
  email: boolean;
  phone: boolean;
  bankAccount: boolean;
}

export interface ReputationBreakdown {
  baseScore: number;
  verificationBonus: number;
  activityScore: number;
  penaltyScore: number;
  totalScore: number;
}

export interface CreateIdentityData {
  userId: string;
  solanaPublicKey: string;
  did: string;
  phoneNumber?: string;
}

export interface VerifyAadhaarData {
  identityId: string;
  aadhaarNumber: string;
  consent: boolean;
}

export interface VerifyPANData {
  identityId: string;
  panNumber: string;
  consent: boolean;
}

export interface IssueCredentialData {
  identityId: string;
  type: string;
  claims: Record<string, any>;
}

export interface StakeData {
  identityId: string;
  amount: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
