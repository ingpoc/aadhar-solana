export { api, tokenManager, extractApiError } from './client';
export type { ApiError } from './client';

export {
  authApi,
  identityApi,
  verificationApi,
  credentialsApi,
  reputationApi,
  stakingApi,
} from './endpoints';

export type {
  Identity,
  VerificationRequest,
  Credential,
  ReputationScore,
  ReputationEvent,
  StakeInfo,
  TokenPair,
} from './endpoints';
