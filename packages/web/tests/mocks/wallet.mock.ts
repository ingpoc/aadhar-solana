/**
 * Solana Wallet Adapter Mocks for Testing
 */

import { vi } from 'vitest';
import { PublicKey } from '@solana/web3.js';

// Mock public key for testing
export const mockPublicKey = new PublicKey('11111111111111111111111111111111');
export const mockPublicKeyString = mockPublicKey.toString();

// Mock wallet context values
export const createWalletContextMock = (overrides = {}) => ({
  publicKey: mockPublicKey,
  connected: true,
  connecting: false,
  disconnecting: false,
  autoConnect: false,
  wallet: {
    adapter: {
      name: 'Mock Wallet',
      url: 'https://mock-wallet.com',
      icon: 'https://mock-wallet.com/icon.png',
      readyState: 'Installed',
      publicKey: mockPublicKey,
      connecting: false,
      connected: true,
    },
    readyState: 'Installed',
  },
  wallets: [],
  select: vi.fn(),
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  signTransaction: vi.fn(),
  signAllTransactions: vi.fn(),
  signMessage: vi.fn().mockResolvedValue(new Uint8Array(64)),
  sendTransaction: vi.fn(),
  ...overrides,
});

// Disconnected wallet state
export const createDisconnectedWalletMock = () =>
  createWalletContextMock({
    publicKey: null,
    connected: false,
    wallet: null,
  });

// Connecting wallet state
export const createConnectingWalletMock = () =>
  createWalletContextMock({
    publicKey: null,
    connected: false,
    connecting: true,
  });

// Mock useWallet hook
export const mockUseWallet = vi.fn().mockReturnValue(createWalletContextMock());

// Mock useConnection hook
export const mockUseConnection = vi.fn().mockReturnValue({
  connection: {
    getBalance: vi.fn().mockResolvedValue(1000000000),
    getAccountInfo: vi.fn().mockResolvedValue(null),
    confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
    getLatestBlockhash: vi.fn().mockResolvedValue({
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 12345,
    }),
    sendTransaction: vi.fn().mockResolvedValue('mock-signature'),
  },
});

// Mock the wallet adapter modules
vi.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => mockUseWallet(),
  useConnection: () => mockUseConnection(),
  WalletProvider: ({ children }: any) => children,
  ConnectionProvider: ({ children }: any) => children,
}));

vi.mock('@solana/wallet-adapter-react-ui', () => ({
  WalletModalProvider: ({ children }: any) => children,
  WalletMultiButton: () => null,
  WalletDisconnectButton: () => null,
}));

// Helper to reset wallet state
export function resetWalletMocks() {
  mockUseWallet.mockReturnValue(createWalletContextMock());
  mockUseConnection.mockReturnValue({
    connection: {
      getBalance: vi.fn().mockResolvedValue(1000000000),
      getAccountInfo: vi.fn().mockResolvedValue(null),
      confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'mock-blockhash',
        lastValidBlockHeight: 12345,
      }),
      sendTransaction: vi.fn().mockResolvedValue('mock-signature'),
    },
  });
}

// Helper to set disconnected state
export function setWalletDisconnected() {
  mockUseWallet.mockReturnValue(createDisconnectedWalletMock());
}

// Helper to set connecting state
export function setWalletConnecting() {
  mockUseWallet.mockReturnValue(createConnectingWalletMock());
}
