import { api } from './client';

// Types
export interface Identity {
  id: string;
  solanaPublicKey: string;
  did: string;
  verificationBitmap: number;
  reputationScore: number;
  stakedAmount: string;
  metadataUri?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationRequest {
  id: string;
  identityId: string;
  verificationType: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  requestDataHash?: string;
  proofHash?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Credential {
  id: string;
  credentialId: string;
  identityId: string;
  issuerId?: string;
  credentialType: string;
  issuedAt: string;
  expiresAt?: string;
  revoked: boolean;
  metadataUri?: string;
  proofHash?: string;
}

export interface ReputationScore {
  identityId: string;
  score: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  verifiedTypes: string[];
}

export interface ReputationEvent {
  id: string;
  identityId: string;
  eventType: string;
  scoreDelta: number;
  newScore: number;
  description?: string;
  createdAt: string;
}

export interface StakeInfo {
  identityId: string;
  stakedAmount: string;
  pendingRewards: string;
  lockedUntil?: string;
  unstakeRequested: boolean;
  unstakeRequestTime?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Auth API
export const authApi = {
  getNonce: () =>
    api.get<{ nonce: string; message: string; expiresAt: string }>('/auth/nonce'),

  authenticateWallet: (data: {
    solanaPublicKey: string;
    signature: string;
    message: string;
  }) => api.post<TokenPair>('/auth/wallet', data),

  refresh: (refreshToken: string) =>
    api.post<TokenPair>('/auth/refresh', { refreshToken }),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  logoutAll: () =>
    api.post('/auth/logout-all'),

  getMe: () =>
    api.get<{ id: string; email?: string; did?: string; solanaPublicKey?: string }>('/auth/me'),
};

// Identity API
export const identityApi = {
  create: (data: {
    solanaPublicKey: string;
    did: string;
    metadataUri?: string;
    recoveryKeys?: string[];
  }) => api.post<{ identity: Identity; transaction: string }>('/identity', data),

  getByPublicKey: (publicKey: string) =>
    api.get<Identity>(`/identity/wallet/${publicKey}`),

  getById: (id: string) =>
    api.get<Identity>(`/identity/${id}`),

  update: (id: string, data: {
    metadataUri?: string;
  }) => api.patch<Identity>(`/identity/${id}`, data),

  addRecoveryKey: (id: string, recoveryKey: string) =>
    api.post(`/identity/${id}/recovery-keys`, { recoveryKey }),
};

// Verification API
export const verificationApi = {
  initiateAadhaar: (data: {
    identityId: string;
    aadhaarNumber: string;
    consent: boolean;
  }) => api.post<{ requestId: string; txnId: string; message: string }>('/verification/aadhaar/initiate', data),

  verifyAadhaarOTP: (data: {
    requestId: string;
    otp: string;
    txnId: string;
  }) => api.post<VerificationRequest>('/verification/aadhaar/verify', data),

  verifyPAN: (data: {
    identityId: string;
    panNumber: string;
    fullName: string;
    dateOfBirth?: string;
  }) => api.post<VerificationRequest>('/verification/pan', data),

  getStatus: (requestId: string) =>
    api.get<VerificationRequest>(`/verification/${requestId}`),

  getByIdentity: (identityId: string) =>
    api.get<VerificationRequest[]>(`/verification/identity/${identityId}`),
};

// Credentials API
export const credentialsApi = {
  getAll: (params?: { identityId?: string; type?: string; page?: number; limit?: number }) =>
    api.get<{ items: Credential[]; total: number }>('/credentials', { params }),

  getById: (id: string) =>
    api.get<Credential>(`/credentials/${id}`),

  verify: (id: string) =>
    api.get<{ valid: boolean; credential: Credential }>(`/credentials/${id}/verify`),

  getByIdentity: (identityId: string) =>
    api.get<Credential[]>(`/credentials/identity/${identityId}`),
};

// Reputation API
export const reputationApi = {
  getScore: (identityId: string) =>
    api.get<ReputationScore>(`/reputation/${identityId}`),

  getHistory: (identityId: string, params?: { page?: number; limit?: number }) =>
    api.get<{ items: ReputationEvent[]; total: number }>(`/reputation/${identityId}/history`, { params }),

  getTier: (score: number) => {
    if (score >= 900) return 'diamond';
    if (score >= 800) return 'platinum';
    if (score >= 700) return 'gold';
    if (score >= 600) return 'silver';
    return 'bronze';
  },
};

// Staking API
export const stakingApi = {
  getInfo: (identityId: string) =>
    api.get<StakeInfo>(`/staking/${identityId}`),

  stake: (data: {
    identityId: string;
    amount: string;
    lockPeriodDays: number;
  }) => api.post<{ transaction: string; stakePDA: string }>('/staking/stake', data),

  requestUnstake: (identityId: string) =>
    api.post<{ transaction: string }>(`/staking/${identityId}/unstake`),

  completeUnstake: (identityId: string) =>
    api.post<{ transaction: string }>(`/staking/${identityId}/unstake/complete`),

  claimRewards: (identityId: string) =>
    api.post<{ transaction: string; amount: string }>(`/staking/${identityId}/claim`),

  getPool: () =>
    api.get<{ totalStaked: string; rewardRate: number; minStake: string }>('/staking/pool'),
};
