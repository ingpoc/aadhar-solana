import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as Keychain from 'react-native-keychain';

const API_URL = __DEV__
  ? 'http://localhost:3000/api/v1'
  : 'https://api.aadhaarchain.io/api/v1';

// Token keys for keychain
const ACCESS_TOKEN_KEY = 'aadhaarchain_access_token';
const REFRESH_TOKEN_KEY = 'aadhaarchain_refresh_token';

// Token management with secure storage
export const tokenManager = {
  getAccessToken: async (): Promise<string | null> => {
    try {
      const credentials = await Keychain.getGenericPassword({ service: ACCESS_TOKEN_KEY });
      return credentials ? credentials.password : null;
    } catch {
      return null;
    }
  },

  getRefreshToken: async (): Promise<string | null> => {
    try {
      const credentials = await Keychain.getGenericPassword({ service: REFRESH_TOKEN_KEY });
      return credentials ? credentials.password : null;
    } catch {
      return null;
    }
  },

  setTokens: async (accessToken: string, refreshToken: string): Promise<void> => {
    try {
      await Keychain.setGenericPassword('token', accessToken, { service: ACCESS_TOKEN_KEY });
      await Keychain.setGenericPassword('token', refreshToken, { service: REFRESH_TOKEN_KEY });
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  },

  clearTokens: async (): Promise<void> => {
    try {
      await Keychain.resetGenericPassword({ service: ACCESS_TOKEN_KEY });
      await Keychain.resetGenericPassword({ service: REFRESH_TOKEN_KEY });
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  },
};

// Create axios instance
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const token = await tokenManager.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor with token refresh
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = await tokenManager.getRefreshToken();
          if (refreshToken) {
            const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
            const { accessToken, refreshToken: newRefreshToken } = response.data;
            await tokenManager.setTokens(accessToken, newRefreshToken);

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }
            return client(originalRequest);
          }
        } catch {
          await tokenManager.clearTokens();
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

export const api = createApiClient();

// API Error extraction
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export const extractApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error: ApiError }>;
    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error;
    }
    return {
      code: 'NETWORK_ERROR',
      message: axiosError.message || 'Network error occurred',
    };
  }
  return {
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'An unknown error occurred',
  };
};
