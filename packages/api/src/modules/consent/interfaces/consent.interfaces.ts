/**
 * Consent Management Interfaces
 *
 * Implements DPDP Act 2023 consent requirements:
 * - Granular, purpose-specific consent
 * - Clear and informed consent collection
 * - Easy withdrawal mechanism
 */

/**
 * Consent Types aligned with DPDP Act 2023
 */
export enum ConsentType {
  // Identity Data
  IDENTITY_CREATION = 'identity.creation',
  IDENTITY_VERIFICATION = 'identity.verification',
  IDENTITY_SHARING = 'identity.sharing',

  // PII Categories
  AADHAAR_VERIFICATION = 'pii.aadhaar.verification',
  AADHAAR_STORAGE = 'pii.aadhaar.storage',
  PAN_VERIFICATION = 'pii.pan.verification',
  PAN_STORAGE = 'pii.pan.storage',
  PHONE_VERIFICATION = 'pii.phone.verification',
  EMAIL_VERIFICATION = 'pii.email.verification',
  BIOMETRIC_PROCESSING = 'pii.biometric.processing',

  // Credential Operations
  CREDENTIAL_ISSUANCE = 'credential.issuance',
  CREDENTIAL_SHARING = 'credential.sharing',
  CREDENTIAL_VERIFICATION = 'credential.verification',

  // Data Processing
  ANALYTICS = 'processing.analytics',
  MARKETING = 'processing.marketing',
  THIRD_PARTY_SHARING = 'processing.third_party',

  // Platform Operations
  ACCOUNT_MANAGEMENT = 'platform.account',
  NOTIFICATIONS = 'platform.notifications',
  SERVICE_IMPROVEMENT = 'platform.improvement',
}

export enum ConsentStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  PENDING = 'pending',
}

export interface ConsentPurpose {
  type: ConsentType;
  description: string;
  dataElements: string[];
  retentionPeriod: number; // days, -1 = until deletion
  isRequired: boolean;
  thirdParties?: string[];
}

export interface ConsentRecord {
  id: string;
  userId: string;
  identityId?: string;
  consentType: ConsentType;
  purpose: string;
  dataElements: string[];
  status: ConsentStatus;
  grantedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  revocationReason?: string;
  consentArtifact: string;
  version: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConsentArtifact {
  consentId: string;
  userId: string;
  consentType: ConsentType;
  purpose: string;
  timestamp: string;
  hash: string;
  signature?: string;
}

export interface GrantConsentParams {
  ipAddress?: string;
  userAgent?: string;
  identityId?: string;
  customPurpose?: string;
  expiresInDays?: number;
}

export interface ConsentQueryOptions {
  includeRevoked?: boolean;
  includeExpired?: boolean;
}

/**
 * Purpose definitions with data elements and retention periods
 */
export const CONSENT_PURPOSE_DEFINITIONS: Map<ConsentType, ConsentPurpose> = new Map([
  [ConsentType.AADHAAR_VERIFICATION, {
    type: ConsentType.AADHAAR_VERIFICATION,
    description: 'Verify your identity using Aadhaar via government APIs',
    dataElements: ['aadhaar_number', 'name', 'date_of_birth', 'gender', 'address'],
    retentionPeriod: 0,
    isRequired: false,
  }],
  [ConsentType.AADHAAR_STORAGE, {
    type: ConsentType.AADHAAR_STORAGE,
    description: 'Store encrypted Aadhaar number for future verifications',
    dataElements: ['aadhaar_hash', 'aadhaar_encrypted'],
    retentionPeriod: 1825, // 5 years
    isRequired: false,
  }],
  [ConsentType.PAN_VERIFICATION, {
    type: ConsentType.PAN_VERIFICATION,
    description: 'Verify your PAN card via government APIs',
    dataElements: ['pan_number', 'name'],
    retentionPeriod: 0,
    isRequired: false,
  }],
  [ConsentType.PAN_STORAGE, {
    type: ConsentType.PAN_STORAGE,
    description: 'Store encrypted PAN for future verifications',
    dataElements: ['pan_hash', 'pan_encrypted'],
    retentionPeriod: 1825,
    isRequired: false,
  }],
  [ConsentType.IDENTITY_CREATION, {
    type: ConsentType.IDENTITY_CREATION,
    description: 'Create a decentralized identity linked to your wallet',
    dataElements: ['wallet_address', 'did'],
    retentionPeriod: -1,
    isRequired: true,
  }],
  [ConsentType.IDENTITY_VERIFICATION, {
    type: ConsentType.IDENTITY_VERIFICATION,
    description: 'Verify your identity for platform services',
    dataElements: ['verification_status', 'verification_type'],
    retentionPeriod: -1,
    isRequired: false,
  }],
  [ConsentType.IDENTITY_SHARING, {
    type: ConsentType.IDENTITY_SHARING,
    description: 'Share your identity information with third parties',
    dataElements: ['did', 'verification_status', 'credentials'],
    retentionPeriod: 365,
    isRequired: false,
  }],
  [ConsentType.PHONE_VERIFICATION, {
    type: ConsentType.PHONE_VERIFICATION,
    description: 'Verify your phone number via OTP',
    dataElements: ['phone_number'],
    retentionPeriod: 0,
    isRequired: false,
  }],
  [ConsentType.EMAIL_VERIFICATION, {
    type: ConsentType.EMAIL_VERIFICATION,
    description: 'Verify your email address',
    dataElements: ['email'],
    retentionPeriod: 0,
    isRequired: false,
  }],
  [ConsentType.BIOMETRIC_PROCESSING, {
    type: ConsentType.BIOMETRIC_PROCESSING,
    description: 'Process biometric data for authentication',
    dataElements: ['biometric_template_hash'],
    retentionPeriod: 365,
    isRequired: false,
  }],
  [ConsentType.CREDENTIAL_ISSUANCE, {
    type: ConsentType.CREDENTIAL_ISSUANCE,
    description: 'Issue verifiable credentials based on your verified identity',
    dataElements: ['credential_type', 'claims'],
    retentionPeriod: -1,
    isRequired: false,
  }],
  [ConsentType.CREDENTIAL_SHARING, {
    type: ConsentType.CREDENTIAL_SHARING,
    description: 'Share credentials with verifiers',
    dataElements: ['credential_id', 'verifier_did'],
    retentionPeriod: 365,
    isRequired: false,
  }],
  [ConsentType.CREDENTIAL_VERIFICATION, {
    type: ConsentType.CREDENTIAL_VERIFICATION,
    description: 'Allow others to verify your credentials',
    dataElements: ['credential_status', 'verification_proof'],
    retentionPeriod: -1,
    isRequired: false,
  }],
  [ConsentType.ANALYTICS, {
    type: ConsentType.ANALYTICS,
    description: 'Analyze usage patterns to improve services',
    dataElements: ['usage_data', 'device_info'],
    retentionPeriod: 365,
    isRequired: false,
  }],
  [ConsentType.MARKETING, {
    type: ConsentType.MARKETING,
    description: 'Receive marketing communications',
    dataElements: ['email', 'phone', 'preferences'],
    retentionPeriod: 365,
    isRequired: false,
  }],
  [ConsentType.THIRD_PARTY_SHARING, {
    type: ConsentType.THIRD_PARTY_SHARING,
    description: 'Share data with third-party partners',
    dataElements: ['profile_data', 'usage_data'],
    retentionPeriod: 365,
    isRequired: false,
    thirdParties: ['partner_services'],
  }],
  [ConsentType.ACCOUNT_MANAGEMENT, {
    type: ConsentType.ACCOUNT_MANAGEMENT,
    description: 'Manage your account and profile',
    dataElements: ['account_data', 'profile_data'],
    retentionPeriod: -1,
    isRequired: true,
  }],
  [ConsentType.NOTIFICATIONS, {
    type: ConsentType.NOTIFICATIONS,
    description: 'Send notifications about your identity and credentials',
    dataElements: ['email', 'phone', 'push_token'],
    retentionPeriod: -1,
    isRequired: false,
  }],
  [ConsentType.SERVICE_IMPROVEMENT, {
    type: ConsentType.SERVICE_IMPROVEMENT,
    description: 'Use anonymized data to improve services',
    dataElements: ['anonymized_usage_data'],
    retentionPeriod: 730,
    isRequired: false,
  }],
]);
