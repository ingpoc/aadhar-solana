import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { setAuthenticated } from '../../store/slices/authSlice';

export default function BiometricSetupScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const handleSetupBiometric = () => {
    console.log('Setting up biometric authentication');
    dispatch(setAuthenticated(true));
  };

  const handleSkip = () => {
    dispatch(setAuthenticated(true));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('biometricSetup.title')}</Text>
      <Text style={styles.subtitle}>{t('biometricSetup.subtitle')}</Text>

      <TouchableOpacity style={styles.button} onPress={handleSetupBiometric}>
        <Text style={styles.buttonText}>{t('biometricSetup.enable')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
        <Text style={styles.secondaryButtonText}>{t('biometricSetup.skip')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 48,
  },
  button: {
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 56,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    padding: 16,
    alignItems: 'center',
    minHeight: 56,
  },
  secondaryButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
});
