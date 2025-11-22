# CLAUDE.md - Mobile App (React Native)

## Overview

Production-ready React Native mobile application for AadhaarChain, supporting both iOS and Android. Features biometric authentication, Solana wallet integration, multi-language support (English/Hindi), and follows Indian government app design standards.

## Quick Commands

```bash
# Development
yarn start              # Start Metro bundler
yarn ios                # Run on iOS simulator
yarn android            # Run on Android emulator

# Building
yarn build:ios          # Build iOS release
yarn build:android      # Build Android release

# Testing
yarn test               # Run unit tests
yarn test:watch         # Watch mode
yarn lint               # Run ESLint

# Other
yarn clean              # Clean build artifacts
npx pod-install         # Install iOS CocoaPods
```

## Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | React Native | 0.72.0 |
| Language | TypeScript | 5.0+ |
| State Management | Redux Toolkit | 1.9.0 |
| Navigation | React Navigation | 6.1+ |
| Styling | React Native StyleSheet | Native |
| Biometrics | react-native-biometrics | 3.0.1 |
| Secure Storage | react-native-keychain | 8.1.0 |
| Async Storage | @react-native-async-storage | 1.19.0 |
| i18n | i18next + react-i18next | 23.7.0 |
| HTTP Client | Axios | 1.6.0 |

## Directory Structure

```
packages/mobile/
├── src/
│   ├── App.tsx                    # Root component
│   ├── screens/                   # Screen components
│   │   ├── auth/                  # Authentication screens
│   │   │   ├── WelcomeScreen.tsx
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   ├── main/                  # Main app screens
│   │   │   ├── DashboardScreen.tsx
│   │   │   ├── IdentityScreen.tsx
│   │   │   ├── CredentialsScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   └── details/               # Detail screens
│   │       ├── CredentialDetailScreen.tsx
│   │       └── VerificationScreen.tsx
│   ├── navigation/                # Navigation configuration
│   │   ├── AppNavigator.tsx       # Main navigator
│   │   ├── AuthStack.tsx          # Auth flow
│   │   └── MainStack.tsx          # Main app flow
│   ├── store/                     # Redux store
│   │   ├── index.ts               # Store configuration
│   │   └── slices/                # Redux slices
│   │       ├── authSlice.ts
│   │       ├── identitySlice.ts
│   │       └── credentialSlice.ts
│   ├── services/                  # API & external services
│   │   ├── api.ts                 # Axios instance
│   │   ├── identity.service.ts
│   │   ├── auth.service.ts
│   │   └── wallet.service.ts
│   ├── components/                # Reusable components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── QRCode.tsx
│   ├── hooks/                     # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useBiometrics.ts
│   │   └── useWallet.ts
│   ├── locales/                   # Internationalization
│   │   ├── en.json                # English translations
│   │   └── hi.json                # Hindi translations
│   ├── utils/                     # Utility functions
│   │   ├── storage.ts
│   │   ├── crypto.ts
│   │   └── validation.ts
│   ├── types/                     # TypeScript types
│   │   └── index.ts
│   └── constants/                 # App constants
│       ├── colors.ts
│       ├── config.ts
│       └── api.ts
├── ios/                           # iOS native code
├── android/                       # Android native code
├── __tests__/                     # Test files
├── metro.config.js                # Metro bundler config
├── babel.config.js                # Babel configuration
├── tsconfig.json                  # TypeScript config
└── package.json
```

## Code Conventions

### Naming
- **Files**: PascalCase for components (`DashboardScreen.tsx`)
- **Folders**: kebab-case or camelCase (`auth/`, `services/`)
- **Components**: PascalCase (`DashboardScreen`)
- **Hooks**: camelCase with `use` prefix (`useAuth`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`)

### Component Pattern
```typescript
import React, { FC } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface DashboardScreenProps {
  navigation: NavigationProp;
}

export const DashboardScreen: FC<DashboardScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('dashboard.title')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#138808', // Indian flag green
  },
});
```

### Redux Slice Pattern
```typescript
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

interface IdentityState {
  data: Identity | null;
  loading: boolean;
  error: string | null;
}

const initialState: IdentityState = {
  data: null,
  loading: false,
  error: null,
};

export const fetchIdentity = createAsyncThunk(
  'identity/fetch',
  async (walletAddress: string, { rejectWithValue }) => {
    try {
      const response = await identityService.get(walletAddress);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const identitySlice = createSlice({
  name: 'identity',
  initialState,
  reducers: {
    clearIdentity: (state) => {
      state.data = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIdentity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIdentity.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchIdentity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});
```

### Hook Pattern
```typescript
import { useState, useCallback } from 'react';
import ReactNativeBiometrics from 'react-native-biometrics';

export const useBiometrics = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const rnBiometrics = new ReactNativeBiometrics();

  const checkAvailability = useCallback(async () => {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    setIsAvailable(available);
    return { available, biometryType };
  }, []);

  const authenticate = useCallback(async (promptMessage: string) => {
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage,
      cancelButtonText: 'Cancel',
    });
    return success;
  }, []);

  return { isAvailable, checkAvailability, authenticate };
};
```

## Navigation Structure

```
AppNavigator
├── AuthStack (not authenticated)
│   ├── Welcome
│   ├── Login
│   └── Register
└── MainStack (authenticated)
    ├── TabNavigator
    │   ├── Home (Dashboard)
    │   ├── Identity
    │   ├── Credentials
    │   └── Settings
    ├── CredentialDetail
    └── Verification
```

### Navigation Setup
```typescript
// AppNavigator.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainStack} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

## Design System

### Color Palette (Indian Government Standards)
```typescript
// constants/colors.ts
export const Colors = {
  // Primary (Indian flag colors)
  saffron: '#FF9933',
  white: '#FFFFFF',
  green: '#138808',
  blue: '#000080',   // Ashoka Chakra blue

  // Semantic
  primary: '#138808',
  secondary: '#FF9933',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  error: '#D32F2F',
  success: '#388E3C',
  warning: '#F57C00',

  // Text
  textPrimary: '#212121',
  textSecondary: '#757575',
  textDisabled: '#BDBDBD',
};
```

### Typography
```typescript
export const Typography = {
  h1: { fontSize: 32, fontWeight: 'bold' },
  h2: { fontSize: 24, fontWeight: 'bold' },
  h3: { fontSize: 20, fontWeight: '600' },
  body1: { fontSize: 16, fontWeight: 'normal' },
  body2: { fontSize: 14, fontWeight: 'normal' },
  caption: { fontSize: 12, fontWeight: 'normal' },
};
```

### Accessibility Requirements
- Minimum touch target: 44x44 points
- Color contrast ratio: 4.5:1 minimum
- Screen reader support (accessibilityLabel)
- Large text support

## Internationalization (i18n)

### Setup
```typescript
// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
```

### Translation Files
```json
// locales/en.json
{
  "common": {
    "continue": "Continue",
    "cancel": "Cancel",
    "save": "Save"
  },
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome, {{name}}"
  },
  "identity": {
    "verified": "Identity Verified",
    "pending": "Verification Pending"
  }
}

// locales/hi.json
{
  "common": {
    "continue": "जारी रखें",
    "cancel": "रद्द करें",
    "save": "सहेजें"
  },
  "dashboard": {
    "title": "डैशबोर्ड",
    "welcome": "स्वागत है, {{name}}"
  },
  "identity": {
    "verified": "पहचान सत्यापित",
    "pending": "सत्यापन लंबित"
  }
}
```

## Secure Storage

### Keychain (Sensitive Data)
```typescript
import * as Keychain from 'react-native-keychain';

// Store sensitive data
export const storeSecureData = async (key: string, value: string) => {
  await Keychain.setGenericPassword(key, value, {
    service: `aadhaarchain.${key}`,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
};

// Retrieve sensitive data
export const getSecureData = async (key: string) => {
  const credentials = await Keychain.getGenericPassword({
    service: `aadhaarchain.${key}`,
  });
  return credentials ? credentials.password : null;
};

// Clear sensitive data
export const clearSecureData = async (key: string) => {
  await Keychain.resetGenericPassword({ service: `aadhaarchain.${key}` });
};
```

### AsyncStorage (Non-sensitive Data)
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  get: async (key: string) => {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  },
  set: async (key: string, value: any) => {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  remove: async (key: string) => {
    await AsyncStorage.removeItem(key);
  },
};
```

## Biometric Authentication

```typescript
// hooks/useBiometrics.ts
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';

export const useBiometrics = () => {
  const rnBiometrics = new ReactNativeBiometrics();

  const getBiometricType = async () => {
    const { biometryType } = await rnBiometrics.isSensorAvailable();

    switch (biometryType) {
      case BiometryTypes.TouchID:
        return 'Touch ID';
      case BiometryTypes.FaceID:
        return 'Face ID';
      case BiometryTypes.Biometrics:
        return 'Biometrics';
      default:
        return null;
    }
  };

  const promptBiometric = async () => {
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: 'Confirm your identity',
      cancelButtonText: 'Use PIN instead',
    });
    return success;
  };

  return { getBiometricType, promptBiometric };
};
```

## API Integration

### API Client Setup
```typescript
// services/api.ts
import axios from 'axios';
import { API_BASE_URL } from '../constants/config';
import { getSecureData } from '../utils/storage';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await getSecureData('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - logout user
    }
    return Promise.reject(error);
  }
);

export default api;
```

## Testing

### Component Test Pattern
```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DashboardScreen } from '../src/screens/main/DashboardScreen';

describe('DashboardScreen', () => {
  it('renders correctly', () => {
    const { getByText } = render(<DashboardScreen />);
    expect(getByText('Dashboard')).toBeTruthy();
  });

  it('handles button press', () => {
    const mockNavigate = jest.fn();
    const { getByTestId } = render(
      <DashboardScreen navigation={{ navigate: mockNavigate }} />
    );

    fireEvent.press(getByTestId('verify-button'));
    expect(mockNavigate).toHaveBeenCalledWith('Verification');
  });
});
```

## Security Checklist

- [ ] Store sensitive data (tokens, keys) in Keychain only
- [ ] Implement biometric authentication for sensitive operations
- [ ] Certificate pinning for API calls (production)
- [ ] No sensitive data in logs or crash reports
- [ ] Obfuscate release builds (ProGuard for Android)
- [ ] Disable screenshots for sensitive screens
- [ ] Implement session timeout
- [ ] Validate all user inputs

## Platform-Specific Notes

### iOS
- Requires `NSFaceIDUsageDescription` in Info.plist for Face ID
- Minimum deployment target: iOS 13.0
- Run `npx pod-install` after adding native dependencies

### Android
- Minimum SDK: 21 (Android 5.0)
- Target SDK: 33 (Android 13)
- Requires biometric permission in AndroidManifest.xml
- ProGuard rules configured for release builds
