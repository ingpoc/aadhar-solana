import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

export default function PhoneVerificationScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOTP = () => {
    console.log('Sending OTP to:', phone);
    setOtpSent(true);
  };

  const handleVerifyOTP = () => {
    console.log('Verifying OTP:', otp);
    navigation.navigate('AadhaarVerification');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('phoneVerification.title')}</Text>
      <Text style={styles.subtitle}>{t('phoneVerification.subtitle')}</Text>

      <TextInput
        style={styles.input}
        placeholder={t('phoneVerification.phonePlaceholder')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        accessible={true}
        accessibilityLabel={t('phoneVerification.phonePlaceholder')}
      />

      {!otpSent ? (
        <TouchableOpacity style={styles.button} onPress={handleSendOTP}>
          <Text style={styles.buttonText}>{t('phoneVerification.sendOTP')}</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder={t('phoneVerification.otpPlaceholder')}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            accessible={true}
            accessibilityLabel={t('phoneVerification.otpPlaceholder')}
          />
          <TouchableOpacity style={styles.button} onPress={handleVerifyOTP}>
            <Text style={styles.buttonText}>{t('phoneVerification.verify')}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
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
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    minHeight: 56,
  },
  button: {
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
