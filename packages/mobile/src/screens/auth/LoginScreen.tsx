import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store';
import { sendOTP, verifyOTP, clearError, resetOTP } from '../../store/slices/authSlice';
import { Button, Input, OTPInput, Spinner } from '../../components';

type AuthStep = 'phone' | 'otp';

interface LoginScreenProps {
  navigation: any;
}

export function LoginScreen({ navigation }: LoginScreenProps) {
  const dispatch = useAppDispatch();
  const { isLoading, error, otpRequestId, otpSent } = useAppSelector((state) => state.auth);

  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Handle OTP sent
  useEffect(() => {
    if (otpSent && otpRequestId) {
      setStep('otp');
      setCountdown(60);
    }
  }, [otpSent, otpRequestId]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Validate phone number
  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setPhoneError('Please enter a valid 10-digit phone number');
      return false;
    }
    setPhoneError('');
    return true;
  };

  // Handle send OTP
  const handleSendOTP = async () => {
    if (!validatePhone(phoneNumber)) return;

    dispatch(clearError());
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    dispatch(sendOTP(cleanPhone));
  };

  // Handle verify OTP
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return;
    if (!otpRequestId) return;

    dispatch(clearError());
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    dispatch(verifyOTP({ phone: cleanPhone, otp, requestId: otpRequestId }));
  };

  // Handle resend OTP
  const handleResendOTP = () => {
    if (countdown > 0) return;
    dispatch(resetOTP());
    setOtp('');
    handleSendOTP();
  };

  // Handle back to phone
  const handleBack = () => {
    dispatch(resetOTP());
    setOtp('');
    setStep('phone');
  };

  // Format phone number for display
  const formatPhoneDisplay = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>🇮🇳</Text>
            </View>
            <Text style={styles.title}>AadhaarChain</Text>
            <Text style={styles.subtitle}>
              {step === 'phone'
                ? 'Enter your phone number to continue'
                : 'Enter the OTP sent to your phone'}
            </Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {step === 'phone' ? (
              <PhoneStep
                phoneNumber={phoneNumber}
                setPhoneNumber={setPhoneNumber}
                error={phoneError || error || undefined}
                onSubmit={handleSendOTP}
                isLoading={isLoading}
                formatPhoneDisplay={formatPhoneDisplay}
              />
            ) : (
              <OTPStep
                phoneNumber={phoneNumber}
                otp={otp}
                setOtp={setOtp}
                error={error || undefined}
                onVerify={handleVerifyOTP}
                onResend={handleResendOTP}
                onBack={handleBack}
                isLoading={isLoading}
                countdown={countdown}
              />
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our{' '}
              <Text style={styles.footerLink}>Terms of Service</Text> and{' '}
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Phone Step Component
interface PhoneStepProps {
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  error?: string;
  onSubmit: () => void;
  isLoading: boolean;
  formatPhoneDisplay: (phone: string) => string;
}

function PhoneStep({
  phoneNumber,
  setPhoneNumber,
  error,
  onSubmit,
  isLoading,
  formatPhoneDisplay,
}: PhoneStepProps) {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.phoneInputContainer}>
        <View style={styles.countryCode}>
          <Text style={styles.countryFlag}>🇮🇳</Text>
          <Text style={styles.countryCodeText}>+91</Text>
        </View>
        <View style={styles.phoneInputWrapper}>
          <Input
            placeholder="Phone Number"
            value={formatPhoneDisplay(phoneNumber)}
            onChangeText={(text) => setPhoneNumber(text.replace(/\D/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            maxLength={11} // including space
            error={error}
            containerStyle={styles.phoneInput}
          />
        </View>
      </View>

      <Button
        title="Send OTP"
        onPress={onSubmit}
        loading={isLoading}
        disabled={phoneNumber.replace(/\D/g, '').length !== 10}
        fullWidth
        size="lg"
      />
    </View>
  );
}

// OTP Step Component
interface OTPStepProps {
  phoneNumber: string;
  otp: string;
  setOtp: (value: string) => void;
  error?: string;
  onVerify: () => void;
  onResend: () => void;
  onBack: () => void;
  isLoading: boolean;
  countdown: number;
}

function OTPStep({
  phoneNumber,
  otp,
  setOtp,
  error,
  onVerify,
  onResend,
  onBack,
  isLoading,
  countdown,
}: OTPStepProps) {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.otpInfo}>
        <Text style={styles.otpInfoText}>
          OTP sent to{' '}
          <Text style={styles.otpPhoneNumber}>+91 {phoneNumber.slice(0, 5)} {phoneNumber.slice(5)}</Text>
        </Text>
        <Button title="Change" variant="ghost" size="sm" onPress={onBack} />
      </View>

      <View style={styles.otpInputContainer}>
        <OTPInput value={otp} onChange={setOtp} error={error} length={6} />
      </View>

      <Button
        title="Verify OTP"
        onPress={onVerify}
        loading={isLoading}
        disabled={otp.length !== 6}
        fullWidth
        size="lg"
      />

      <View style={styles.resendContainer}>
        {countdown > 0 ? (
          <Text style={styles.resendText}>
            Resend OTP in <Text style={styles.resendCountdown}>{countdown}s</Text>
          </Text>
        ) : (
          <Button title="Resend OTP" variant="ghost" onPress={onResend} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    gap: 24,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 8,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  phoneInputWrapper: {
    flex: 1,
  },
  phoneInput: {
    marginBottom: 0,
  },
  otpInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  otpInfoText: {
    fontSize: 14,
    color: '#6B7280',
  },
  otpPhoneNumber: {
    fontWeight: '600',
    color: '#1F2937',
  },
  otpInputContainer: {
    alignItems: 'center',
  },
  resendContainer: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#6B7280',
  },
  resendCountdown: {
    fontWeight: '600',
    color: '#FF6B00',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: '#FF6B00',
    fontWeight: '500',
  },
});
