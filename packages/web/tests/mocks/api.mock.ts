/**
 * API Mocks for Testing
 */

import { vi } from 'vitest';
import type { Identity } from '@/types';

// Mock identity data
export const mockIdentity: Identity = {
  id: 'test-identity-id',
  did: 'did:aadhaar:11111111111111111111',
  solanaPublicKey: '11111111111111111111111111111111',
  verificationStatus: {
    aadhaar: 'verified',
    pan: 'pending',
    education: 'pending',
  },
  reputationScore: 500,
  stakedAmount: '0',
  createdAt: '2024-01-01T00:00:00.000Z',
  lastUpdated: '2024-01-01T00:00:00.000Z',
};

// Mock user data
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  did: 'did:aadhaar:11111111111111111111',
  solanaPublicKey: '11111111111111111111111111111111',
};

// Mock tokens
export const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 3600,
};

// Mock credentials
export const mockCredentials = [
  {
    id: 'cred-1',
    credentialId: 'cred_123456',
    credentialType: 'AadhaarVerification',
    issuedAt: '2024-01-01T00:00:00.000Z',
    expiresAt: '2025-01-01T00:00:00.000Z',
    revoked: false,
    verifiable: true,
  },
  {
    id: 'cred-2',
    credentialId: 'cred_789012',
    credentialType: 'PANVerification',
    issuedAt: '2024-02-01T00:00:00.000Z',
    expiresAt: '2025-02-01T00:00:00.000Z',
    revoked: false,
    verifiable: true,
  },
];

// Mock reputation data
export const mockReputation = {
  score: 500,
  tier: 'Silver',
  history: [
    { date: '2024-01-01', score: 500, change: 0, reason: 'Initial score' },
    { date: '2024-01-15', score: 550, change: 50, reason: 'Aadhaar verification' },
  ],
};

// Mock staking data
export const mockStaking = {
  stakedAmount: '1000000000',
  rewards: '10000000',
  stakingHistory: [
    {
      id: 'stake-1',
      amount: '1000000000',
      timestamp: '2024-01-01T00:00:00.000Z',
      type: 'stake',
    },
  ],
};

// API mock functions
export const createApiMocks = () => ({
  // Identity API
  identityApi: {
    getById: vi.fn().mockResolvedValue({ data: mockIdentity }),
    getByPublicKey: vi.fn().mockResolvedValue({ data: mockIdentity }),
    create: vi.fn().mockResolvedValue({ data: mockIdentity }),
    update: vi.fn().mockResolvedValue({ data: mockIdentity }),
  },

  // Auth API
  authApi: {
    getNonce: vi.fn().mockResolvedValue({
      data: {
        nonce: 'mock-nonce',
        message: 'Sign this message to authenticate',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      },
    }),
    authenticateWallet: vi.fn().mockResolvedValue({ data: mockTokens }),
    getMe: vi.fn().mockResolvedValue({ data: mockUser }),
    logout: vi.fn().mockResolvedValue({ success: true }),
    refresh: vi.fn().mockResolvedValue({ data: mockTokens }),
  },

  // Credentials API
  credentialsApi: {
    list: vi.fn().mockResolvedValue({ data: mockCredentials }),
    getById: vi.fn().mockResolvedValue({ data: mockCredentials[0] }),
    verify: vi.fn().mockResolvedValue({ data: { valid: true } }),
    request: vi.fn().mockResolvedValue({
      data: { credentialId: 'new-cred-id', status: 'pending' },
    }),
  },

  // Verification API
  verificationApi: {
    requestAadhaar: vi.fn().mockResolvedValue({
      data: { verificationId: 'ver-1', status: 'pending' },
    }),
    requestPAN: vi.fn().mockResolvedValue({
      data: { verificationId: 'ver-2', status: 'pending' },
    }),
    getStatus: vi.fn().mockResolvedValue({
      data: { verificationId: 'ver-1', status: 'completed' },
    }),
  },

  // Reputation API
  reputationApi: {
    get: vi.fn().mockResolvedValue({ data: mockReputation }),
    getHistory: vi.fn().mockResolvedValue({ data: mockReputation.history }),
  },

  // Staking API
  stakingApi: {
    getInfo: vi.fn().mockResolvedValue({ data: mockStaking }),
    stake: vi.fn().mockResolvedValue({ data: { success: true, txSignature: 'tx-sig' } }),
    unstake: vi.fn().mockResolvedValue({ data: { success: true, txSignature: 'tx-sig' } }),
    claimRewards: vi.fn().mockResolvedValue({ data: { success: true, amount: '10000000' } }),
  },

  // Token manager
  tokenManager: {
    getAccessToken: vi.fn().mockReturnValue('mock-access-token'),
    getRefreshToken: vi.fn().mockReturnValue('mock-refresh-token'),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
    isTokenExpired: vi.fn().mockReturnValue(false),
  },
});

// Mock the API module
export const apiMocks = createApiMocks();

vi.mock('@/lib/api', () => ({
  identityApi: apiMocks.identityApi,
  authApi: apiMocks.authApi,
  credentialsApi: apiMocks.credentialsApi,
  verificationApi: apiMocks.verificationApi,
  reputationApi: apiMocks.reputationApi,
  stakingApi: apiMocks.stakingApi,
  tokenManager: apiMocks.tokenManager,
  // Re-export types
  Identity: {} as any,
}));

// Helper to reset all API mocks
export function resetApiMocks() {
  Object.values(apiMocks).forEach((api) => {
    Object.values(api).forEach((fn) => {
      if (typeof fn === 'function' && 'mockClear' in fn) {
        fn.mockClear();
      }
    });
  });
}

// Helper to make API call fail
export function makeApiFail(api: keyof typeof apiMocks, method: string, error = new Error('API Error')) {
  const apiObj = apiMocks[api] as Record<string, any>;
  if (apiObj[method]) {
    apiObj[method].mockRejectedValue(error);
  }
}
