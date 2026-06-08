import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { PremiumAuthLayout } from '../../components/ui/PremiumAuthLayout';
import { api } from '../../services/api';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export function PremiumOtpScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const email = route.params?.email || '';
  const purpose = route.params?.purpose || 'login';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (canResend) {
      return;
    }
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [canResend]);

  useEffect(() => {
    requestOtp();
  }, []);

  async function requestOtp() {
    setError('');
    try {
      await api.post('/auth/send-otp', { email, purpose });
    } catch {
      setError('Failed to send OTP. Please try again.');
    }
  }

  function handleChange(text: string, i: number) {
    if (text.length > 1) {
      text = text[text.length - 1];
    }
    const newOtp = [...otp];
    newOtp[i] = text;
    setOtp(newOtp);

    if (text && i < OTP_LENGTH - 1) {
      inputRefs.current[i + 1]?.focus();
    }

    if (error) {
      setError('');
    }
  }

  function handleKeyPress(e: any, i: number) {
    if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  }

  function handleResend() {
    if (!canResend) {
      return;
    }
    setTimer(RESEND_COOLDOWN);
    setCanResend(false);
    setError('');
    requestOtp();
  }

  async function handleVerify() {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await api.post<{ verified: boolean; message: string }>('/auth/verify-otp', {
        email,
        otp: code,
        purpose,
      });
      if (result.verified) {
        navigation.navigate(purpose === 'password_reset' ? 'ForgotPassword' : 'Login');
      } else {
        setError(result.message || 'Invalid OTP');
      }
    } catch (e: any) {
      setError(e.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PremiumAuthLayout>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View
          style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#8E8E93" />
          </TouchableOpacity>

          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to <Text style={styles.emailHighlight}>{email}</Text>
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#FF4545" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => {
                  inputRefs.current[i] = r;
                }}
                style={[
                  styles.otpInput,
                  {
                    borderColor: otp[i] ? '#FF6B00' : error ? '#FF4545' : 'rgba(255,255,255,0.08)',
                    backgroundColor: otp[i] ? 'rgba(255,107,0,0.08)' : '#1C1C1E',
                  },
                ]}
                value={digit}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[styles.verifyButton, loading && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={loading}
              onPressIn={() =>
                Animated.spring(buttonScale, {
                  toValue: 0.97,
                  friction: 8,
                  tension: 40,
                  useNativeDriver: true,
                }).start()
              }
              onPressOut={() =>
                Animated.spring(buttonScale, {
                  toValue: 1,
                  friction: 5,
                  useNativeDriver: true,
                }).start()
              }
              activeOpacity={1}
            >
              {loading ? (
                <Text style={styles.verifyButtonText}>Verifying...</Text>
              ) : (
                <Text style={styles.verifyButtonText}>Verify Code</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            onPress={handleResend}
            disabled={!canResend}
            style={styles.resendRow}
            activeOpacity={0.7}
          >
            <Text style={[styles.resendText, !canResend && styles.resendTextDisabled]}>
              {canResend ? 'Resend code' : `Resend code in ${timer}s`}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableWithoutFeedback>
    </PremiumAuthLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 32,
  },
  emailHighlight: {
    color: '#FF6B00',
    fontFamily: 'Inter-SemiBold',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,69,69,0.12)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#FF4545',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  verifyButton: {
    height: 52,
    backgroundColor: '#FF6B00',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    color: '#FF6B00',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  resendTextDisabled: {
    color: '#636366',
  },
});
