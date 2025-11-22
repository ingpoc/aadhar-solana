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

// Consent API (DPDP Act)
export interface ConsentPurposeResponse {
  type: string;
  name: string;
  description: string;
  dataElements: string[];
  required: boolean;
  retentionPeriod: string;
  thirdParties: string[];
}

export interface ConsentRecordResponse {
  id: string;
  userId: string;
  consentType: string;
  purpose: string;
  dataElements: string[];
  status: string;
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedReason?: string;
  version: string;
  consentArtifact?: string;
}

export const consentApi = {
  getPurposes: () =>
    api.get<ConsentPurposeResponse[]>('/consent/purposes'),

  getAll: (params?: { status?: string; type?: string }) =>
    api.get<ConsentRecordResponse[]>('/consent', { params }),

  checkConsent: (type: string) =>
    api.get<{ hasConsent: boolean; consent?: ConsentRecordResponse }>(`/consent/check/${type}`),

  grantConsent: (data: {
    consentType: string;
    purpose?: string;
    dataElements?: string[];
    expiresInDays?: number;
  }) => api.post<ConsentRecordResponse>('/consent/grant', data),

  revokeConsent: (consentId: string, reason?: string) =>
    api.delete<ConsentRecordResponse>(`/consent/${consentId}`, { data: { reason } }),

  getReceipt: (consentId: string) =>
    api.get<{ receipt: string }>(`/consent/${consentId}/receipt`),
};

// Data Rights API (DPDP Act)
export interface DataRightsRequestResponse {
  id: string;
  userId: string;
  requestType: string;
  status: string;
  dataCategories: string[];
  reason?: string;
  deadline: string;
  processedAt?: string;
  processedBy?: string;
  responseData?: Record<string, unknown>;
  exportFormat?: string;
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

export const dataRightsApi = {
  submitAccessRequest: (data: {
    dataCategories: string[];
    reason?: string;
  }) => api.post<DataRightsRequestResponse>('/data-rights/access', data),

  submitErasureRequest: (data: {
    dataCategories: string[];
    reason: string;
    confirmation: boolean;
  }) => api.post<DataRightsRequestResponse>('/data-rights/erasure', data),

  submitCorrectionRequest: (data: {
    field: string;
    currentValue: string;
    correctedValue: string;
    reason: string;
    supportingDocuments?: string[];
  }) => api.post<DataRightsRequestResponse>('/data-rights/correction', data),

  submitPortabilityRequest: (data: {
    dataCategories: string[];
    format: 'json' | 'csv' | 'xml';
  }) => api.post<DataRightsRequestResponse>('/data-rights/portability', data),

  submitGrievance: (data: {
    category: string;
    subject: string;
    description: string;
    previousRequestId?: string;
  }) => api.post<DataRightsRequestResponse>('/data-rights/grievance', data),

  getRequests: (params?: { status?: string; type?: string; page?: number; limit?: number }) =>
    api.get<{ items: DataRightsRequestResponse[]; total: number }>('/data-rights/requests', { params }),

  getRequestById: (id: string) =>
    api.get<DataRightsRequestResponse>(`/data-rights/requests/${id}`),

  downloadExport: (requestId: string) =>
    api.get<Blob>(`/data-rights/export/${requestId}`, { responseType: 'blob' }),

  cancelRequest: (id: string) =>
    api.post<DataRightsRequestResponse>(`/data-rights/requests/${id}/cancel`),
};

// Privacy API
export interface PrivacyNoticeResponse {
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

export const privacyApi = {
  getCurrentNotice: () =>
    api.get<PrivacyNoticeResponse>('/privacy/notice/current'),

  acknowledgeNotice: (noticeId: string) =>
    api.post('/privacy/notice/acknowledge', { noticeId }),

  hasAcknowledged: () =>
    api.get<{ acknowledged: boolean; notice?: PrivacyNoticeResponse }>('/privacy/notice/status'),

  getNoticeHistory: () =>
    api.get<PrivacyNoticeResponse[]>('/privacy/notice/history'),
};

// Activity & Audit API
export interface ActivityLogResponse {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogResponse {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: string;
  ipAddress?: string;
  status: string;
  metadata?: Record<string, unknown>;
  hash: string;
}

export const activityApi = {
  getRecentActivity: (params?: { limit?: number }) =>
    api.get<ActivityLogResponse[]>('/activity/recent', { params }),

  getAuditLogs: (params?: {
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get<{ items: AuditLogResponse[]; total: number }>('/activity/audit', { params }),

  exportAuditLogs: (params: {
    startDate: string;
    endDate: string;
    format: 'json' | 'csv';
  }) => api.get<Blob>('/activity/audit/export', { params, responseType: 'blob' }),
};
