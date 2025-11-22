export { api, tokenManager, extractApiError } from './apiClient';
export type { ApiError } from './apiClient';

export { authService } from './authService';
export type { SendOTPResponse, VerifyOTPResponse, User } from './authService';

export { identityService } from './identityService';
export type { Identity, CreateIdentityRequest } from './identityService';

export { verificationService } from './verificationService';
export type { InitiateAadhaarResponse, VerificationResult } from './verificationService';

export { credentialService } from './credentialService';
export type { Credential, CredentialVerification } from './credentialService';

export { reputationService } from './reputationService';
export type { ReputationScore, ReputationEvent } from './reputationService';

export { biometricService } from './biometricService';
export type { BiometricCapabilities, AuthenticationResult } from './biometricService';
