/**
 * Credentials Slice Tests
 */

import { configureStore } from '@reduxjs/toolkit';
import credentialsReducer, {
  fetchCredentials,
  fetchCredentialById,
  verifyCredential,
  setCredentials,
  addCredential,
  updateCredential,
  selectCredential,
  clearVerification,
  clearCredentials,
  clearError,
} from '../../../src/store/slices/credentialsSlice';
import { mockCredentials, resetAllMocks } from '../../mocks/services.mock';

// Mock the credential service
const mockCredentialService = {
  getByIdentity: jest.fn(),
  getById: jest.fn(),
  verify: jest.fn(),
};

jest.mock('../../../src/services', () => ({
  credentialService: mockCredentialService,
  Credential: {},
  CredentialVerification: {},
}));

// Create a test store
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      credentials: credentialsReducer,
    },
    preloadedState: {
      credentials: {
        credentials: [],
        selectedCredential: null,
        verification: null,
        isLoading: false,
        isVerifying: false,
        error: null,
        ...preloadedState,
      },
    },
  });
};

describe('credentialsSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCredentialService.getByIdentity.mockResolvedValue(mockCredentials);
    mockCredentialService.getById.mockResolvedValue(mockCredentials[0]);
    mockCredentialService.verify.mockResolvedValue({
      valid: true,
      issuerVerified: true,
      signatureValid: true,
      verifiedAt: '2024-01-01T00:00:00.000Z',
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const store = createTestStore();
      const state = store.getState().credentials;

      expect(state.credentials).toEqual([]);
      expect(state.selectedCredential).toBeNull();
      expect(state.verification).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isVerifying).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('synchronous actions', () => {
    describe('setCredentials', () => {
      it('should set credentials array', () => {
        const store = createTestStore();

        store.dispatch(setCredentials(mockCredentials));

        expect(store.getState().credentials.credentials).toEqual(mockCredentials);
      });
    });

    describe('addCredential', () => {
      it('should add a new credential', () => {
        const store = createTestStore();
        const newCredential = mockCredentials[0];

        store.dispatch(addCredential(newCredential));

        expect(store.getState().credentials.credentials).toContainEqual(newCredential);
      });

      it('should not add duplicate credential', () => {
        const store = createTestStore({ credentials: mockCredentials });

        store.dispatch(addCredential(mockCredentials[0]));

        expect(store.getState().credentials.credentials.length).toBe(mockCredentials.length);
      });
    });

    describe('updateCredential', () => {
      it('should update existing credential', () => {
        const store = createTestStore({ credentials: mockCredentials });
        const updatedCredential = { ...mockCredentials[0], revoked: true };

        store.dispatch(updateCredential(updatedCredential));

        const updated = store.getState().credentials.credentials.find(
          (c) => c.id === updatedCredential.id
        );
        expect(updated?.revoked).toBe(true);
      });

      it('should not update if credential not found', () => {
        const store = createTestStore({ credentials: mockCredentials });
        const nonExistent = { ...mockCredentials[0], id: 'non-existent' };

        store.dispatch(updateCredential(nonExistent));

        expect(store.getState().credentials.credentials.length).toBe(mockCredentials.length);
      });
    });

    describe('selectCredential', () => {
      it('should select a credential by id', () => {
        const store = createTestStore({ credentials: mockCredentials });

        store.dispatch(selectCredential(mockCredentials[0].id));

        expect(store.getState().credentials.selectedCredential).toEqual(mockCredentials[0]);
      });

      it('should clear selection when null passed', () => {
        const store = createTestStore({
          credentials: mockCredentials,
          selectedCredential: mockCredentials[0],
        });

        store.dispatch(selectCredential(null));

        expect(store.getState().credentials.selectedCredential).toBeNull();
      });

      it('should set null if credential not found', () => {
        const store = createTestStore({ credentials: mockCredentials });

        store.dispatch(selectCredential('non-existent-id'));

        expect(store.getState().credentials.selectedCredential).toBeNull();
      });
    });

    describe('clearVerification', () => {
      it('should clear verification state', () => {
        const store = createTestStore({
          verification: { valid: true },
        });

        store.dispatch(clearVerification());

        expect(store.getState().credentials.verification).toBeNull();
      });
    });

    describe('clearCredentials', () => {
      it('should clear all credential state', () => {
        const store = createTestStore({
          credentials: mockCredentials,
          selectedCredential: mockCredentials[0],
          verification: { valid: true },
        });

        store.dispatch(clearCredentials());

        const state = store.getState().credentials;
        expect(state.credentials).toEqual([]);
        expect(state.selectedCredential).toBeNull();
        expect(state.verification).toBeNull();
      });
    });

    describe('clearError', () => {
      it('should clear error state', () => {
        const store = createTestStore({ error: 'Some error' });

        store.dispatch(clearError());

        expect(store.getState().credentials.error).toBeNull();
      });
    });
  });

  describe('async thunks', () => {
    describe('fetchCredentials', () => {
      it('should handle pending state', async () => {
        const store = createTestStore();
        const promise = store.dispatch(fetchCredentials('identity-id'));

        expect(store.getState().credentials.isLoading).toBe(true);
        expect(store.getState().credentials.error).toBeNull();

        await promise;
      });

      it('should handle fulfilled state', async () => {
        const store = createTestStore();

        await store.dispatch(fetchCredentials('identity-id'));

        const state = store.getState().credentials;
        expect(state.isLoading).toBe(false);
        expect(state.credentials).toEqual(mockCredentials);
        expect(mockCredentialService.getByIdentity).toHaveBeenCalledWith('identity-id');
      });

      it('should handle rejected state', async () => {
        mockCredentialService.getByIdentity.mockRejectedValue({
          response: { data: { error: { message: 'Failed to fetch' } } },
        });

        const store = createTestStore();

        await store.dispatch(fetchCredentials('identity-id'));

        const state = store.getState().credentials;
        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('Failed to fetch');
      });
    });

    describe('fetchCredentialById', () => {
      it('should handle fulfilled state', async () => {
        const store = createTestStore();

        await store.dispatch(fetchCredentialById('cred-1'));

        const state = store.getState().credentials;
        expect(state.isLoading).toBe(false);
        expect(state.selectedCredential).toEqual(mockCredentials[0]);
        expect(state.credentials).toContainEqual(mockCredentials[0]);
      });

      it('should update existing credential in list', async () => {
        const store = createTestStore({ credentials: mockCredentials });
        const updatedCredential = { ...mockCredentials[0], revoked: true };
        mockCredentialService.getById.mockResolvedValue(updatedCredential);

        await store.dispatch(fetchCredentialById(mockCredentials[0].id));

        const state = store.getState().credentials;
        const inList = state.credentials.find((c) => c.id === mockCredentials[0].id);
        expect(inList?.revoked).toBe(true);
      });

      it('should handle rejected state', async () => {
        mockCredentialService.getById.mockRejectedValue({
          response: { data: { error: { message: 'Not found' } } },
        });

        const store = createTestStore();

        await store.dispatch(fetchCredentialById('non-existent'));

        expect(store.getState().credentials.error).toBe('Not found');
      });
    });

    describe('verifyCredential', () => {
      it('should handle pending state', async () => {
        const store = createTestStore();
        const promise = store.dispatch(verifyCredential('cred-1'));

        expect(store.getState().credentials.isVerifying).toBe(true);

        await promise;
      });

      it('should handle fulfilled state', async () => {
        const store = createTestStore();

        await store.dispatch(verifyCredential('cred-1'));

        const state = store.getState().credentials;
        expect(state.isVerifying).toBe(false);
        expect(state.verification).toEqual({
          valid: true,
          issuerVerified: true,
          signatureValid: true,
          verifiedAt: '2024-01-01T00:00:00.000Z',
        });
        expect(mockCredentialService.verify).toHaveBeenCalledWith('cred-1');
      });

      it('should handle rejected state', async () => {
        mockCredentialService.verify.mockRejectedValue({
          response: { data: { error: { message: 'Verification failed' } } },
        });

        const store = createTestStore();

        await store.dispatch(verifyCredential('cred-1'));

        const state = store.getState().credentials;
        expect(state.isVerifying).toBe(false);
        expect(state.error).toBe('Verification failed');
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle credential fetch and selection flow', async () => {
      const store = createTestStore();

      // Fetch credentials
      await store.dispatch(fetchCredentials('identity-id'));
      expect(store.getState().credentials.credentials.length).toBe(mockCredentials.length);

      // Select a credential
      store.dispatch(selectCredential(mockCredentials[0].id));
      expect(store.getState().credentials.selectedCredential).toEqual(mockCredentials[0]);

      // Verify the credential
      await store.dispatch(verifyCredential(mockCredentials[0].id));
      expect(store.getState().credentials.verification?.valid).toBe(true);
    });

    it('should handle logout cleanup', () => {
      const store = createTestStore({
        credentials: mockCredentials,
        selectedCredential: mockCredentials[0],
        verification: { valid: true },
      });

      store.dispatch(clearCredentials());

      const state = store.getState().credentials;
      expect(state.credentials).toEqual([]);
      expect(state.selectedCredential).toBeNull();
      expect(state.verification).toBeNull();
    });
  });
});
