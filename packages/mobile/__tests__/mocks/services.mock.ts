/**
 * Service Mocks for Mobile App Testing
 */

// Mock user data
export const mockUser = {
  id: 'test-user-id',
  phone: '9876543210',
  email: 'test@example.com',
  identityId: 'test-identity-id',
  createdAt: '2024-01-01T00:00:00.000Z',
};

// Mock identity data
export const mockIdentity = {
  id: 'test-identity-id',
  did: 'did:aadhaar:11111111111111111111',
  solanaPublicKey: 'TestPublicKey123456789012345678901234567890123',
  verificationBitmap: 1,
  reputationScore: 500,
  stakedAmount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
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
  },
  {
    id: 'cred-2',
    credentialId: 'cred_789012',
    credentialType: 'PANVerification',
    issuedAt: '2024-02-01T00:00:00.000Z',
    expiresAt: '2025-02-01T00:00:00.000Z',
    revoked: false,
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

// Auth service mock
export const mockAuthService = {
  sendOTP: jest.fn().mockResolvedValue({ requestId: 'otp-request-id', sent: true }),
  verifyOTP: jest.fn().mockResolvedValue({
    success: true,
    user: mockUser,
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  }),
  isAuthenticated: jest.fn().mockResolvedValue(true),
  getMe: jest.fn().mockResolvedValue(mockUser),
  logout: jest.fn().mockResolvedValue(true),
  refreshToken: jest.fn().mockResolvedValue({
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
  }),
};

// Identity service mock
export const mockIdentityService = {
  getIdentity: jest.fn().mockResolvedValue(mockIdentity),
  createIdentity: jest.fn().mockResolvedValue({
    ...mockIdentity,
    transactionSignature: 'mock-tx-signature',
  }),
  updateIdentity: jest.fn().mockResolvedValue(mockIdentity),
};

// Credential service mock
export const mockCredentialService = {
  getCredentials: jest.fn().mockResolvedValue(mockCredentials),
  getCredentialById: jest.fn().mockResolvedValue(mockCredentials[0]),
  requestCredential: jest.fn().mockResolvedValue({
    credentialId: 'new-cred-id',
    status: 'pending',
  }),
};

// Reputation service mock
export const mockReputationService = {
  getReputation: jest.fn().mockResolvedValue(mockReputation),
  getHistory: jest.fn().mockResolvedValue(mockReputation.history),
};

// Verification service mock
export const mockVerificationService = {
  requestAadhaarVerification: jest.fn().mockResolvedValue({
    verificationId: 'ver-id',
    status: 'pending',
  }),
  requestPANVerification: jest.fn().mockResolvedValue({
    verificationId: 'ver-id-2',
    status: 'pending',
  }),
  getVerificationStatus: jest.fn().mockResolvedValue({
    verificationId: 'ver-id',
    status: 'completed',
  }),
};

// Biometric service mock
export const mockBiometricService = {
  isAvailable: jest.fn().mockResolvedValue({ available: true, biometryType: 'FaceID' }),
  authenticate: jest.fn().mockResolvedValue({ success: true }),
  enrollBiometrics: jest.fn().mockResolvedValue({ success: true }),
  removeBiometrics: jest.fn().mockResolvedValue({ success: true }),
};

// Reset all mocks helper
export function resetAllMocks() {
  Object.values(mockAuthService).forEach((fn) => fn.mockClear?.());
  Object.values(mockIdentityService).forEach((fn) => fn.mockClear?.());
  Object.values(mockCredentialService).forEach((fn) => fn.mockClear?.());
  Object.values(mockReputationService).forEach((fn) => fn.mockClear?.());
  Object.values(mockVerificationService).forEach((fn) => fn.mockClear?.());
  Object.values(mockBiometricService).forEach((fn) => fn.mockClear?.());
}

// Service error helpers
export function makeServiceFail(service: Record<string, jest.Mock>, method: string, error = 'Service error') {
  if (service[method]) {
    service[method].mockRejectedValue({
      response: { data: { error: { message: error } } },
    });
  }
}

export function makeServiceSucceed(service: Record<string, jest.Mock>, method: string, value: any) {
  if (service[method]) {
    service[method].mockResolvedValue(value);
  }
}

// Module mock setup
jest.mock('../../src/services', () => ({
  authService: mockAuthService,
  identityService: mockIdentityService,
  credentialService: mockCredentialService,
  reputationService: mockReputationService,
  verificationService: mockVerificationService,
  biometricService: mockBiometricService,
  User: {},
  Identity: {},
  Credential: {},
}));
