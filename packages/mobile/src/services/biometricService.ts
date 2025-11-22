import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_TOKEN_KEY = 'biometric_auth_token';

export interface BiometricCapabilities {
  isSupported: boolean;
  isEnrolled: boolean;
  biometricType: 'fingerprint' | 'face' | 'iris' | 'none';
}

export interface AuthenticationResult {
  success: boolean;
  error?: string;
  errorCode?: string;
}

export const biometricService = {
  /**
   * Check device biometric capabilities
   */
  checkCapabilities: async (): Promise<BiometricCapabilities> => {
    try {
      const isSupported = await LocalAuthentication.hasHardwareAsync();

      if (!isSupported) {
        return { isSupported: false, isEnrolled: false, biometricType: 'none' };
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      let biometricType: BiometricCapabilities['biometricType'] = 'none';

      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'face';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'fingerprint';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = 'iris';
      }

      return { isSupported, isEnrolled, biometricType };
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      return { isSupported: false, isEnrolled: false, biometricType: 'none' };
    }
  },

  /**
   * Check if biometric authentication is enabled for this app
   */
  isBiometricEnabled: async (): Promise<boolean> => {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric status:', error);
      return false;
    }
  },

  /**
   * Enable biometric authentication for this app
   */
  enableBiometric: async (): Promise<boolean> => {
    try {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      return true;
    } catch (error) {
      console.error('Error enabling biometric:', error);
      return false;
    }
  },

  /**
   * Disable biometric authentication for this app
   */
  disableBiometric: async (): Promise<boolean> => {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
      return true;
    } catch (error) {
      console.error('Error disabling biometric:', error);
      return false;
    }
  },

  /**
   * Authenticate user using biometrics
   */
  authenticate: async (
    promptMessage = 'Authenticate to continue',
    options?: {
      fallbackLabel?: string;
      cancelLabel?: string;
      disableDeviceFallback?: boolean;
    }
  ): Promise<AuthenticationResult> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: options?.fallbackLabel || 'Use passcode',
        cancelLabel: options?.cancelLabel || 'Cancel',
        disableDeviceFallback: options?.disableDeviceFallback || false,
      });

      if (result.success) {
        return { success: true };
      }

      return {
        success: false,
        error: result.error || 'Authentication failed',
        errorCode: result.error,
      };
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error.message || 'Authentication failed',
      };
    }
  },

  /**
   * Store auth token securely for biometric-based re-authentication
   */
  storeAuthToken: async (token: string): Promise<boolean> => {
    try {
      await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, token);
      return true;
    } catch (error) {
      console.error('Error storing auth token:', error);
      return false;
    }
  },

  /**
   * Retrieve auth token after biometric authentication
   */
  getAuthToken: async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  },

  /**
   * Perform biometric authentication and retrieve stored token
   * Combines authenticate and getAuthToken for convenience
   */
  authenticateAndGetToken: async (
    promptMessage = 'Authenticate to sign in'
  ): Promise<{ success: boolean; token?: string; error?: string }> => {
    const authResult = await biometricService.authenticate(promptMessage);

    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    const token = await biometricService.getAuthToken();

    if (!token) {
      return { success: false, error: 'No stored credentials found' };
    }

    return { success: true, token };
  },

  /**
   * Get biometric type name for display
   */
  getBiometricTypeName: (type: BiometricCapabilities['biometricType']): string => {
    switch (type) {
      case 'face':
        return 'Face ID';
      case 'fingerprint':
        return 'Touch ID';
      case 'iris':
        return 'Iris Scan';
      default:
        return 'Biometric';
    }
  },

  /**
   * Clear all biometric data
   */
  clearAll: async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing biometric data:', error);
    }
  },
};
