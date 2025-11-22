import { api, tokenManager } from './apiClient';

export interface SendOTPResponse {
  requestId: string;
  message: string;
}

export interface VerifyOTPResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    phone: string;
  };
}

export interface User {
  id: string;
  phone?: string;
  email?: string;
  did?: string;
  solanaPublicKey?: string;
}

export const authService = {
  // Send OTP to phone number
  sendOTP: async (phone: string): Promise<SendOTPResponse> => {
    const { data } = await api.post<SendOTPResponse>('/auth/phone/send-otp', { phone });
    return data;
  },

  // Verify OTP and get tokens
  verifyOTP: async (phone: string, otp: string, requestId: string): Promise<VerifyOTPResponse> => {
    const { data } = await api.post<VerifyOTPResponse>('/auth/phone/verify', {
      phone,
      otp,
      requestId,
    });

    // Store tokens securely
    await tokenManager.setTokens(data.accessToken, data.refreshToken);

    return data;
  },

  // Get current user
  getMe: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },

  // Refresh tokens
  refresh: async (): Promise<{ accessToken: string; refreshToken: string }> => {
    const refreshToken = await tokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const { data } = await api.post('/auth/refresh', { refreshToken });
    await tokenManager.setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      const refreshToken = await tokenManager.getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Ignore logout errors
    }
    await tokenManager.clearTokens();
  },

  // Check if authenticated
  isAuthenticated: async (): Promise<boolean> => {
    const token = await tokenManager.getAccessToken();
    return !!token;
  },
};
