/**
 * useIdentity Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useIdentity } from '@/hooks/useIdentity';
import {
  mockUseWallet,
  createWalletContextMock,
  createDisconnectedWalletMock,
  mockPublicKey,
} from '../mocks';

// Mock the API
const mockIdentityApi = {
  getById: vi.fn(),
  create: vi.fn(),
};

// Mock lib/api module
vi.mock('@/lib/api', () => ({
  identityApi: mockIdentityApi,
}));

// Mock lib/utils
vi.mock('@/lib/utils', () => ({
  generateDID: vi.fn((pk) => `did:aadhaar:${pk.toString().slice(0, 20)}`),
}));

describe('useIdentity', () => {
  const mockIdentityData = {
    id: 'test-identity-id',
    did: 'did:aadhaar:11111111111111111111',
    solanaPublicKey: mockPublicKey.toString(),
    verificationStatus: {
      aadhaar: 'verified',
      pan: 'pending',
    },
    reputationScore: 500,
    stakedAmount: '0',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWallet.mockReturnValue(createWalletContextMock());
    mockIdentityApi.getById.mockResolvedValue({ data: mockIdentityData });
    mockIdentityApi.create.mockResolvedValue({ data: mockIdentityData });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should have initial loading state', () => {
      mockIdentityApi.getById.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useIdentity());

      expect(result.current.loading).toBe(true);
      expect(result.current.identity).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('with connected wallet', () => {
    it('should fetch identity when wallet is connected', async () => {
      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockIdentityApi.getById).toHaveBeenCalled();
      expect(result.current.identity).toEqual(mockIdentityData);
      expect(result.current.hasIdentity).toBe(true);
    });

    it('should handle identity not found', async () => {
      const error = new Error('Not found');
      (error as any).response = { status: 404 };
      mockIdentityApi.getById.mockRejectedValue(error);

      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.identity).toBeNull();
      expect(result.current.error).toBeNull(); // 404 is not treated as error
      expect(result.current.hasIdentity).toBe(false);
    });

    it('should set error on API failure', async () => {
      const error = new Error('Network error');
      mockIdentityApi.getById.mockRejectedValue(error);

      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('with disconnected wallet', () => {
    it('should not fetch identity when wallet is disconnected', async () => {
      mockUseWallet.mockReturnValue(createDisconnectedWalletMock());

      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockIdentityApi.getById).not.toHaveBeenCalled();
      expect(result.current.identity).toBeNull();
    });

    it('should clear identity when wallet disconnects', async () => {
      // Start connected
      const { result, rerender } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.identity).toEqual(mockIdentityData);
      });

      // Disconnect wallet
      mockUseWallet.mockReturnValue(createDisconnectedWalletMock());
      rerender();

      await waitFor(() => {
        expect(result.current.identity).toBeNull();
      });
    });
  });

  describe('createIdentity', () => {
    it('should create identity successfully', async () => {
      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear the initial fetch call
      mockIdentityApi.getById.mockClear();

      let createdIdentity: any;
      await act(async () => {
        createdIdentity = await result.current.createIdentity('9876543210');
      });

      expect(mockIdentityApi.create).toHaveBeenCalledWith({
        userId: mockPublicKey.toBase58(),
        solanaPublicKey: mockPublicKey.toBase58(),
        did: expect.stringContaining('did:aadhaar:'),
        phoneNumber: '9876543210',
      });
      expect(createdIdentity).toEqual(mockIdentityData);
      expect(result.current.identity).toEqual(mockIdentityData);
    });

    it('should throw error when wallet not connected', async () => {
      mockUseWallet.mockReturnValue(createDisconnectedWalletMock());

      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.createIdentity()).rejects.toThrow('Wallet not connected');
    });

    it('should handle creation error', async () => {
      mockIdentityApi.create.mockRejectedValue(new Error('Creation failed'));

      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.createIdentity()).rejects.toThrow('Creation failed');
      expect(result.current.error).toBe('Creation failed');
    });
  });

  describe('refreshIdentity', () => {
    it('should refresh identity data', async () => {
      const { result } = renderHook(() => useIdentity());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updatedIdentity = { ...mockIdentityData, reputationScore: 600 };
      mockIdentityApi.getById.mockResolvedValue({ data: updatedIdentity });

      await act(async () => {
        await result.current.refreshIdentity();
      });

      expect(result.current.identity).toEqual(updatedIdentity);
    });
  });
});
