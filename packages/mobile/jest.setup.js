/**
 * Jest Setup for React Native Mobile App
 */

import '@testing-library/jest-native/extend-expect';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  // Uncomment to suppress console output
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock React Native modules
jest.mock('react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    ...ReactNative,
    NativeModules: {
      ...ReactNative.NativeModules,
      UIManager: {
        RCTView: () => ({}),
      },
      PlatformConstants: {
        forceTouchAvailable: false,
      },
    },
    Platform: {
      ...ReactNative.Platform,
      OS: 'ios',
      Version: '14.0',
      select: jest.fn((options) => options.ios),
    },
  };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock React Native Reanimated
jest.mock('react-native-reanimated', () => ({
  default: {
    call: jest.fn(),
    createAnimatedComponent: (component) => component,
    Value: jest.fn(),
    event: jest.fn(),
    add: jest.fn(),
    eq: jest.fn(),
    set: jest.fn(),
    cond: jest.fn(),
    interpolate: jest.fn(),
    View: 'Animated.View',
    ScrollView: 'Animated.ScrollView',
    Text: 'Animated.Text',
    Image: 'Animated.Image',
  },
  useSharedValue: jest.fn(() => ({ value: 0 })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((value) => value),
  withSpring: jest.fn((value) => value),
  withDelay: jest.fn((_, value) => value),
  withSequence: jest.fn((...args) => args[0]),
  withRepeat: jest.fn((value) => value),
  Easing: {
    linear: jest.fn(),
    ease: jest.fn(),
    bezier: jest.fn(),
  },
  runOnJS: jest.fn((fn) => fn),
}));

// Mock React Native Gesture Handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    GestureHandlerRootView: View,
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    PanGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    NativeViewGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    ScrollView: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    Directions: {},
  };
});

// Mock React Native Safe Area Context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
}));

// Mock React Native Screens
jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
  Screen: 'Screen',
  NativeScreen: 'NativeScreen',
  ScreenContainer: 'ScreenContainer',
  ScreenStack: 'ScreenStack',
  ScreenStackHeaderConfig: 'ScreenStackHeaderConfig',
}));

// Mock React Native Biometrics
jest.mock('react-native-biometrics', () => ({
  default: {
    isSensorAvailable: jest.fn().mockResolvedValue({ available: true, biometryType: 'FaceID' }),
    createKeys: jest.fn().mockResolvedValue({ publicKey: 'mock-public-key' }),
    simplePrompt: jest.fn().mockResolvedValue({ success: true }),
    deleteKeys: jest.fn().mockResolvedValue({ keysDeleted: true }),
  },
}));

// Mock React Native Keychain
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue({ username: 'user', password: 'pass' }),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  setInternetCredentials: jest.fn().mockResolvedValue(true),
  getInternetCredentials: jest.fn().mockResolvedValue({ username: 'user', password: 'pass' }),
  resetInternetCredentials: jest.fn().mockResolvedValue(true),
  ACCESSIBLE: {
    WHEN_UNLOCKED: 'AccessibleWhenUnlocked',
    AFTER_FIRST_UNLOCK: 'AccessibleAfterFirstUnlock',
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
  },
  SECURITY_LEVEL: {
    SECURE_SOFTWARE: 'SecureSoftware',
    SECURE_HARDWARE: 'SecureHardware',
  },
}));

// Mock @solana/web3.js
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getBalance: jest.fn().mockResolvedValue(1000000000),
    getAccountInfo: jest.fn().mockResolvedValue(null),
    confirmTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
    getLatestBlockhash: jest.fn().mockResolvedValue({
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 12345,
    }),
  })),
  PublicKey: jest.fn().mockImplementation((key) => ({
    toString: () => key,
    toBase58: () => key,
    toBytes: () => new Uint8Array(32),
  })),
  Keypair: {
    generate: jest.fn().mockReturnValue({
      publicKey: { toString: () => 'mock-public-key', toBase58: () => 'mock-public-key' },
      secretKey: new Uint8Array(64),
    }),
  },
  LAMPORTS_PER_SOL: 1000000000,
}));

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      changeLanguage: jest.fn(),
      language: 'en',
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
  Trans: ({ children }) => children,
}));

// Set timezone for consistent date testing
process.env.TZ = 'UTC';

// Global test timeout
jest.setTimeout(10000);
