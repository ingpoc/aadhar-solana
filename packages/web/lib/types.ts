export interface Identity {
  id: string;
  did: string;
  solanaPublicKey: string;
  verificationStatus?: {
    aadhaar: 'verified' | 'pending';
    pan: 'verified' | 'pending';
    education: 'verified' | 'pending';
  };
  reputationScore?: number;
  stakedAmount?: string;
  createdAt: string;
  updatedAt?: string;
  phoneNumber?: string;
  user?: {
    email?: string;
    phone?: string;
  };
}

export interface IdentityResponse {
  success: boolean;
  data: {
    id: string;
    did: string;
    solanaPublicKey: string;
    transactionSignature?: string;
    createdAt: string;
  };
}

export interface ReputationScore {
  score: number;
  history?: Array<{
    timestamp: string;
    score: number;
    reason?: string;
  }>;
}

export interface VerificationRequest {
  id: string;
  identityId: string;
  type: 'aadhaar' | 'pan' | 'education';
  status: 'pending' | 'completed' | 'failed';
  completedAt?: string;
  proofHash?: string;
}

export interface Credential {
  id: string;
  identityId: string;
  type: string;
  claims: Record<string, any>;
  issuer: string;
  issuedAt: string;
  expiresAt?: string;
  revoked: boolean;
}

export interface StakingInfo {
  identityId: string;
  amount: string;
  lockedUntil?: string;
  rewards?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
