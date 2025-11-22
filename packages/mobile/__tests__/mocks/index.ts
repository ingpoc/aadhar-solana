/**
 * Export all test mocks for Mobile App
 */

export * from './services.mock';

// Re-export commonly used mocks
export {
  mockUser,
  mockIdentity,
  mockCredentials,
  mockReputation,
  mockAuthService,
  mockIdentityService,
  mockCredentialService,
  mockReputationService,
  mockVerificationService,
  mockBiometricService,
  resetAllMocks,
  makeServiceFail,
  makeServiceSucceed,
} from './services.mock';
