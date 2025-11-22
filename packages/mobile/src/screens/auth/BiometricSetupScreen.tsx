import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Button, Card, Spinner } from '../../components';

type BiometricType = 'fingerprint' | 'face' | 'iris' | 'none';

export default function BiometricSetupScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const [isSupported, setIsSupported] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      setIsLoading(true);

      // Check if hardware supports biometrics
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsSupported(compatible);

      if (!compatible) {
        setIsLoading(false);
        return;
      }

      // Check enrolled biometrics
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsEnrolled(enrolled);

      // Get available biometric types
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('face');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('fingerprint');
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        setBiometricType('iris');
      }
    } catch (error) {
      console.error('Biometric check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupBiometric = async () => {
    if (!isEnrolled) {
      Alert.alert(
        t('biometricSetup.notSetupTitle', 'Biometrics Not Set Up'),
        t(
          'biometricSetup.notSetupMessage',
          'Please set up biometric authentication in your device settings first.'
        ),
        [{ text: t('common.ok', 'OK') }]
      );
      return;
    }

    try {
      setIsAuthenticating(true);

      // Prompt for biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('biometricSetup.authPrompt', 'Authenticate to enable biometric login'),
        fallbackLabel: t('biometricSetup.usePasscode', 'Use passcode'),
        cancelLabel: t('common.cancel', 'Cancel'),
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Store biometric preference
        await SecureStore.setItemAsync('biometric_enabled', 'true');
        setSetupComplete(true);

        // Navigate after showing success
        setTimeout(() => {
          handleContinue();
        }, 1500);
      } else if (result.error === 'user_cancel') {
        // User cancelled, do nothing
      } else {
        Alert.alert(
          t('biometricSetup.failedTitle', 'Authentication Failed'),
          t('biometricSetup.failedMessage', 'Please try again.')
        );
      }
    } catch (error) {
      console.error('Biometric setup error:', error);
      Alert.alert(
        t('common.error', 'Error'),
        t('biometricSetup.setupError', 'Failed to set up biometric authentication.')
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSkip = async () => {
    await SecureStore.setItemAsync('biometric_enabled', 'false');
    handleContinue();
  };

  const handleContinue = () => {
    // Navigate to main app
    // This would typically dispatch an action or navigate
    console.log('Continuing to main app...');
  };

  const getBiometricIcon = (): string => {
    switch (biometricType) {
      case 'face':
        return '👤';
      case 'fingerprint':
        return '👆';
      case 'iris':
        return '👁️';
      default:
        return '🔐';
    }
  };

  const getBiometricName = (): string => {
    switch (biometricType) {
      case 'face':
        return Platform.OS === 'ios' ? 'Face ID' : t('biometricSetup.faceRecognition', 'Face Recognition');
      case 'fingerprint':
        return Platform.OS === 'ios' ? 'Touch ID' : t('biometricSetup.fingerprint', 'Fingerprint');
      case 'iris':
        return t('biometricSetup.iris', 'Iris Recognition');
      default:
        return t('biometricSetup.biometric', 'Biometric');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Spinner size="lg" />
          <Text style={styles.loadingText}>
            {t('biometricSetup.checking', 'Checking biometric capabilities...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (setupComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>
            {t('biometricSetup.enabledTitle', 'Biometrics Enabled!')}
          </Text>
          <Text style={styles.successSubtitle}>
            {t(
              'biometricSetup.enabledMessage',
              `You can now use ${getBiometricName()} to securely access your account.`
            )}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{getBiometricIcon()}</Text>
          </View>
          <Text style={styles.title}>
            {t('biometricSetup.title', `Enable ${getBiometricName()}`)}
          </Text>
          <Text style={styles.subtitle}>
            {t(
              'biometricSetup.subtitle',
              'Quickly and securely access your account using biometric authentication.'
            )}
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefits}>
          <BenefitItem
            icon="⚡"
            title={t('biometricSetup.quickAccessTitle', 'Quick Access')}
            description={t('biometricSetup.quickAccessDesc', 'Log in instantly without typing passwords')}
          />
          <BenefitItem
            icon="🔒"
            title={t('biometricSetup.securityTitle', 'Enhanced Security')}
            description={t('biometricSetup.securityDesc', 'Your biometrics never leave your device')}
          />
          <BenefitItem
            icon="🛡️"
            title={t('biometricSetup.transactionsTitle', 'Secure Transactions')}
            description={t('biometricSetup.transactionsDesc', 'Approve sensitive actions with a touch')}
          />
        </View>

        {/* Status Card */}
        {!isSupported ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              {t('biometricSetup.notSupported', 'Your device does not support biometric authentication.')}
            </Text>
          </View>
        ) : !isEnrolled ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningIcon}>📱</Text>
            <Text style={styles.warningText}>
              {t(
                'biometricSetup.notEnrolled',
                `Please set up ${getBiometricName()} in your device settings to use this feature.`
              )}
            </Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          {isSupported && isEnrolled && (
            <Button
              title={t('biometricSetup.enable', `Enable ${getBiometricName()}`)}
              onPress={handleSetupBiometric}
              loading={isAuthenticating}
              size="lg"
              fullWidth
            />
          )}
          <Button
            title={t('biometricSetup.skip', 'Skip for now')}
            variant="ghost"
            onPress={handleSkip}
            fullWidth
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

interface BenefitItemProps {
  icon: string;
  title: string;
  description: string;
}

function BenefitItem({ icon, title, description }: BenefitItemProps) {
  return (
    <View style={styles.benefitItem}>
      <View style={styles.benefitIcon}>
        <Text style={styles.benefitIconText}>{icon}</Text>
      </View>
      <View style={styles.benefitContent}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconText: {
    fontSize: 40,
    color: '#10B981',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  benefits: {
    marginBottom: 24,
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitIconText: {
    fontSize: 24,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
  },
  actions: {
    marginTop: 'auto',
    gap: 12,
  },
});
