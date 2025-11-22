/**
 * Export all test mocks
 */

export * from './wallet.mock';
export * from './api.mock';

// Re-export commonly used mocks
export {
  mockPublicKey,
  mockPublicKeyString,
  createWalletContextMock,
  createDisconnectedWalletMock,
  mockUseWallet,
  mockUseConnection,
  resetWalletMocks,
  setWalletDisconnected,
  setWalletConnecting,
} from './wallet.mock';

export {
  mockIdentity,
  mockUser,
  mockTokens,
  mockCredentials,
  mockReputation,
  mockStaking,
  apiMocks,
  resetApiMocks,
  makeApiFail,
} from './api.mock';
