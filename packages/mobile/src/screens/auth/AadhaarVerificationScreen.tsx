import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

export default function AadhaarVerificationScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [consent, setConsent] = useState(false);

  const handleVerify = () => {
    console.log('Verifying Aadhaar:', aadhaarNumber);
    navigation.navigate('BiometricSetup');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('aadhaarVerification.title')}</Text>
      <Text style={styles.subtitle}>{t('aadhaarVerification.subtitle')}</Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>{t('aadhaarVerification.secureInfo')}</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder={t('aadhaarVerification.aadhaarPlaceholder')}
        value={aadhaarNumber}
        onChangeText={setAadhaarNumber}
        keyboardType="number-pad"
        maxLength={12}
        accessible={true}
        accessibilityLabel={t('aadhaarVerification.aadhaarPlaceholder')}
      />

      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setConsent(!consent)}
        accessible={true}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: consent }}>
        <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
          {consent && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>{t('aadhaarVerification.consentText')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, !consent && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={!consent}>
        <Text style={styles.buttonText}>{t('aadhaarVerification.verify')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    minHeight: 56,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    minHeight: 44,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FF6B35',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#000000',
  },
  button: {
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
