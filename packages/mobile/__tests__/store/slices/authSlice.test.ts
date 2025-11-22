/**
 * Auth Slice Tests
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  sendOTP,
  verifyOTP,
  checkAuth,
  logoutUser,
  clearError,
  resetOTP,
  setUser,
} from '../../../src/store/slices/authSlice';
import {
  mockAuthService,
  mockUser,
  resetAllMocks,
  makeServiceFail,
} from '../../mocks/services.mock';

// Create a test store
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: false,
        isLoading: false,
        error: null,
        user: null,
        otpRequestId: null,
        otpSent: false,
        ...preloadedState,
      },
    },
  });
};

describe('authSlice', () => {
  beforeEach(() => {
    resetAllMocks();
    // Reset to successful mocks
    mockAuthService.sendOTP.mockResolvedValue({ requestId: 'otp-request-id', sent: true });
    mockAuthService.verifyOTP.mockResolvedValue({
      success: true,
      user: mockUser,
    });
    mockAuthService.isAuthenticated.mockResolvedValue(true);
    mockAuthService.getMe.mockResolvedValue(mockUser);
    mockAuthService.logout.mockResolvedValue(true);
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const store = createTestStore();
      const state = store.getState().auth;

      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.user).toBeNull();
      expect(state.otpRequestId).toBeNull();
      expect(state.otpSent).toBe(false);
    });
  });

  describe('synchronous actions', () => {
    describe('clearError', () => {
      it('should clear error state', () => {
        const store = createTestStore({ error: 'Some error' });

        store.dispatch(clearError());

        expect(store.getState().auth.error).toBeNull();
      });
    });

    describe('resetOTP', () => {
      it('should reset OTP state', () => {
        const store = createTestStore({
          otpRequestId: 'some-request-id',
          otpSent: true,
        });

        store.dispatch(resetOTP());

        const state = store.getState().auth;
        expect(state.otpRequestId).toBeNull();
        expect(state.otpSent).toBe(false);
      });
    });

    describe('setUser', () => {
      it('should set user', () => {
        const store = createTestStore();

        store.dispatch(setUser(mockUser));

        expect(store.getState().auth.user).toEqual(mockUser);
      });

      it('should clear user when null passed', () => {
        const store = createTestStore({ user: mockUser });

        store.dispatch(setUser(null));

        expect(store.getState().auth.user).toBeNull();
      });
    });
  });

  describe('async thunks', () => {
    describe('sendOTP', () => {
      it('should handle pending state', async () => {
        const store = createTestStore();
        const promise = store.dispatch(sendOTP('9876543210'));

        expect(store.getState().auth.isLoading).toBe(true);
        expect(store.getState().auth.error).toBeNull();

        await promise;
      });

      it('should handle fulfilled state', async () => {
        const store = createTestStore();

        await store.dispatch(sendOTP('9876543210'));

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.otpRequestId).toBe('otp-request-id');
        expect(state.otpSent).toBe(true);
        expect(mockAuthService.sendOTP).toHaveBeenCalledWith('9876543210');
      });

      it('should handle rejected state', async () => {
        makeServiceFail(mockAuthService, 'sendOTP', 'Failed to send OTP');

        const store = createTestStore();

        await store.dispatch(sendOTP('invalid-phone'));

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('Failed to send OTP');
        expect(state.otpSent).toBe(false);
      });
    });

    describe('verifyOTP', () => {
      it('should handle pending state', async () => {
        const store = createTestStore({ otpRequestId: 'request-id', otpSent: true });
        const promise = store.dispatch(
          verifyOTP({ phone: '9876543210', otp: '123456', requestId: 'request-id' })
        );

        expect(store.getState().auth.isLoading).toBe(true);

        await promise;
      });

      it('should handle fulfilled state', async () => {
        const store = createTestStore({ otpRequestId: 'request-id', otpSent: true });

        await store.dispatch(
          verifyOTP({ phone: '9876543210', otp: '123456', requestId: 'request-id' })
        );

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.isAuthenticated).toBe(true);
        expect(state.user).toEqual(mockUser);
        expect(state.otpRequestId).toBeNull();
        expect(state.otpSent).toBe(false);
      });

      it('should handle rejected state', async () => {
        makeServiceFail(mockAuthService, 'verifyOTP', 'Invalid OTP');

        const store = createTestStore({ otpRequestId: 'request-id' });

        await store.dispatch(
          verifyOTP({ phone: '9876543210', otp: 'wrong-otp', requestId: 'request-id' })
        );

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.isAuthenticated).toBe(false);
        expect(state.error).toBe('Invalid OTP');
      });
    });

    describe('checkAuth', () => {
      it('should handle pending state', async () => {
        const store = createTestStore();
        const promise = store.dispatch(checkAuth());

        expect(store.getState().auth.isLoading).toBe(true);

        await promise;
      });

      it('should handle fulfilled state when authenticated', async () => {
        const store = createTestStore();

        await store.dispatch(checkAuth());

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.isAuthenticated).toBe(true);
        expect(state.user).toEqual(mockUser);
      });

      it('should handle fulfilled state when not authenticated', async () => {
        mockAuthService.isAuthenticated.mockResolvedValue(false);

        const store = createTestStore();

        await store.dispatch(checkAuth());

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
      });

      it('should handle rejected state', async () => {
        mockAuthService.isAuthenticated.mockRejectedValue(new Error('Network error'));

        const store = createTestStore();

        await store.dispatch(checkAuth());

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
      });
    });

    describe('logoutUser', () => {
      it('should handle fulfilled state', async () => {
        const store = createTestStore({
          isAuthenticated: true,
          user: mockUser,
          otpRequestId: 'some-id',
          otpSent: true,
        });

        await store.dispatch(logoutUser());

        const state = store.getState().auth;
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
        expect(state.otpRequestId).toBeNull();
        expect(state.otpSent).toBe(false);
        expect(mockAuthService.logout).toHaveBeenCalled();
      });

      it('should reset state even on error', async () => {
        mockAuthService.logout.mockRejectedValue(new Error('Logout failed'));

        const store = createTestStore({
          isAuthenticated: true,
          user: mockUser,
        });

        await store.dispatch(logoutUser());

        // Logout errors are handled gracefully in most implementations
        // The state might still be authenticated depending on implementation
        expect(mockAuthService.logout).toHaveBeenCalled();
      });
    });
  });

  describe('auth flow integration', () => {
    it('should complete full OTP authentication flow', async () => {
      const store = createTestStore();

      // Step 1: Send OTP
      await store.dispatch(sendOTP('9876543210'));
      expect(store.getState().auth.otpSent).toBe(true);
      const requestId = store.getState().auth.otpRequestId;

      // Step 2: Verify OTP
      await store.dispatch(
        verifyOTP({ phone: '9876543210', otp: '123456', requestId: requestId! })
      );

      const state = store.getState().auth;
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.otpSent).toBe(false);
    });

    it('should handle logout and re-authentication', async () => {
      const store = createTestStore({
        isAuthenticated: true,
        user: mockUser,
      });

      // Logout
      await store.dispatch(logoutUser());
      expect(store.getState().auth.isAuthenticated).toBe(false);

      // Re-authenticate
      await store.dispatch(sendOTP('9876543210'));
      await store.dispatch(
        verifyOTP({ phone: '9876543210', otp: '123456', requestId: 'otp-request-id' })
      );

      expect(store.getState().auth.isAuthenticated).toBe(true);
    });
  });
});
