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

// ============== Consent Types (DPDP Act) ==============

export enum ConsentType {
  IDENTITY_CREATION = 'identity.creation',
  AADHAAR_VERIFICATION = 'pii.aadhaar.verification',
  AADHAAR_STORAGE = 'pii.aadhaar.storage',
  PAN_VERIFICATION = 'pii.pan.verification',
  PAN_STORAGE = 'pii.pan.storage',
  CREDENTIAL_ISSUANCE = 'credential.issuance',
  CREDENTIAL_SHARING = 'credential.sharing',
  REPUTATION_CALCULATION = 'reputation.calculation',
  STAKING_PARTICIPATION = 'staking.participation',
  MARKETING_COMMUNICATIONS = 'marketing.communications',
  ANALYTICS_COLLECTION = 'analytics.collection',
  THIRD_PARTY_SHARING = 'third_party.sharing',
  CROSS_BORDER_TRANSFER = 'cross_border.transfer',
  BIOMETRIC_PROCESSING = 'biometric.processing',
  AUTOMATED_DECISIONS = 'automated.decisions',
  RESEARCH_PURPOSES = 'research.purposes',
  GOVERNMENT_VERIFICATION = 'government.verification',
  DATA_ENRICHMENT = 'data.enrichment',
}

export enum ConsentStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  PENDING = 'pending',
}

export interface ConsentPurpose {
  type: ConsentType;
  name: string;
  description: string;
  dataElements: string[];
  required: boolean;
  retentionPeriod: string;
  thirdParties: string[];
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  purpose: string;
  dataElements: string[];
  status: ConsentStatus;
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedReason?: string;
  version: string;
  consentArtifact?: string;
}

export interface GrantConsentData {
  consentType: ConsentType;
  purpose?: string;
  dataElements?: string[];
  expiresInDays?: number;
}

// ============== Data Rights Types (DPDP Act) ==============

export enum DataRightsRequestType {
  ACCESS = 'access',
  ERASURE = 'erasure',
  CORRECTION = 'correction',
  PORTABILITY = 'portability',
  GRIEVANCE = 'grievance',
}

export enum DataRightsRequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export const DATA_CATEGORIES = [
  'identity',
  'verification',
  'credentials',
  'reputation',
  'staking',
  'transactions',
  'audit_logs',
  'consent_records',
] as const;

export type DataCategory = typeof DATA_CATEGORIES[number];

export interface DataRightsRequest {
  id: string;
  userId: string;
  requestType: DataRightsRequestType;
  status: DataRightsRequestStatus;
  dataCategories: string[];
  reason?: string;
  deadline: string;
  processedAt?: string;
  processedBy?: string;
  responseData?: Record<string, unknown>;
  exportFormat?: 'json' | 'csv' | 'xml';
  exportFileUrl?: string;
  correctionField?: string;
  correctionOldValue?: string;
  correctionNewValue?: string;
  grievanceCategory?: string;
  grievanceDetails?: string;
  grievanceResponse?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccessRequestData {
  dataCategories: DataCategory[];
  reason?: string;
}

export interface ErasureRequestData {
  dataCategories: DataCategory[];
  reason: string;
  confirmation: boolean;
}

export interface CorrectionRequestData {
  field: string;
  currentValue: string;
  correctedValue: string;
  reason: string;
  supportingDocuments?: string[];
}

export interface PortabilityRequestData {
  dataCategories: DataCategory[];
  format: 'json' | 'csv' | 'xml';
}

export interface GrievanceData {
  category: string;
  subject: string;
  description: string;
  previousRequestId?: string;
}

// ============== Privacy Types ==============

export interface PrivacyNotice {
  id: string;
  version: string;
  effectiveDate: string;
  content: {
    summary: string;
    fullText: string;
    dataCollected: string[];
    purposes: string[];
    retentionPeriods: Record<string, string>;
    thirdParties: string[];
    rights: string[];
    contact: {
      dpo: string;
      email: string;
      address: string;
    };
  };
  isActive: boolean;
}

export interface PrivacyAcknowledgment {
  userId: string;
  privacyNoticeId: string;
  acknowledgedAt: string;
}

// ============== Activity & Audit Types ==============

export interface ActivityLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: string;
  ipAddress?: string;
  status: 'success' | 'failure';
  metadata?: Record<string, unknown>;
  hash: string;
  previousHash?: string;
}
