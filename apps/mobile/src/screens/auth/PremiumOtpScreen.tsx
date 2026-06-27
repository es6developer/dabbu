import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
  StyleSheet,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useLastLensLogo } from '../../hooks/useLastLensLogo';
import { AuthButton } from '../../components/ui/AuthButton';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export function PremiumOtpScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const logoSource = useLastLensLogo();
  const email = route.params?.email || '';
  const purpose = route.params?.purpose || 'login';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

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

  const shakeError = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  async function requestOtp() {
    setError('');
    try {
      await api.post('/auth/send-otp', { email, purpose });
    } catch (e: any) {
      const msg = e?.message || '';
      const knownErrors: Record<string, string> = {
        'rate limit': 'Too many requests. Please wait before trying again.',
        'already verified': 'This email is already verified. Please sign in.',
        'invalid email': 'Please check your email address.',
        'user not found': 'No account found with this email.',
        network: 'Unable to reach server. Check your internet connection.',
      };
      const matched = Object.keys(knownErrors).find((k) =>
        msg.toLowerCase().includes(k.toLowerCase()),
      );
      setError(matched ? knownErrors[matched] : msg || 'Failed to send code.');
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

    const filled = newOtp.every((d) => d.length > 0);
    if (filled) {
      setTimeout(() => handleVerify(newOtp.join('')), 200);
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

  const otpErrorMap: Record<string, string> = {
    'invalid otp': 'The code is incorrect. Please try again.',
    expired: 'This code has expired. Please request a new one.',
    'rate limit': 'Too many attempts. Please wait a moment.',
    network: 'Unable to reach server. Check your internet connection.',
    'already verified': 'This email is already verified.',
    'not found': 'No OTP request found. Please go back and try again.',
  };

  function friendlyOtpError(msg: string): string {
    const lower = msg.toLowerCase();
    const matched = Object.keys(otpErrorMap).find((k) => lower.includes(k.toLowerCase()));
    return matched ? otpErrorMap[matched] : msg;
  }

  async function handleVerify(code?: string) {
    const otpCode = code || otp.join('');
    if (otpCode.length !== OTP_LENGTH) {
      setError('Please enter the complete 6-digit code');
      shakeError();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await api.post<{ verified: boolean; message: string }>('/auth/verify-otp', {
        email,
        otp: otpCode,
        purpose,
      });
      if (result.verified) {
        if (purpose === 'email_verification') {
          navigation.navigate('Login', { emailVerified: true });
        } else {
          navigation.navigate(purpose === 'password_reset' ? 'ResetPassword' : 'Login');
        }
      } else {
        setError(friendlyOtpError(result.message || 'Invalid OTP'));
        shakeError();
      }
    } catch (e: any) {
      setError(friendlyOtpError(e.message || 'Verification failed'));
      shakeError();
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View
          style={[
            styles.content,
            {
              paddingTop: insets.top + 48,
              paddingBottom: insets.bottom + 24,
              opacity: fadeAnim,
              transform: [{ translateX: shakeAnim }],
            },
          ]}
        >
          {/* Back */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <AntDesign name="arrowleft" size={20} color="#000000" />
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          </View>

          {/* Header */}
          <Text style={styles.title}>Verification code</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to <Text style={styles.emailHighlight}>{email}</Text>
          </Text>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <AntDesign name="exclamationcircle" size={14} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* OTP Boxes */}
          <View style={styles.otpContainer}>
            {otp.map((digit, i) => {
              const isFilled = digit.length > 0;
              return (
                <TextInput
                  key={i}
                  ref={(r) => {
                    inputRefs.current[i] = r;
                  }}
                  style={[
                    styles.otpBox,
                    isFilled && styles.otpBoxFilled,
                    error ? styles.otpBoxError : null,
                  ]}
                  value={digit}
                  onChangeText={(t) => handleChange(t, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              );
            })}
          </View>

          {/* Verify Button */}
          <AuthButton title="Verify & Continue" onPress={() => handleVerify()} loading={loading} />

          {/* Resend */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendLabel}>Didn't receive it? </Text>
            <TouchableOpacity onPress={handleResend} disabled={!canResend}>
              <Text style={[styles.resendLink, !canResend && styles.resendLinkDisabled]}>
                Send Again
              </Text>
            </TouchableOpacity>
          </View>
          {!canResend && (
            <Text style={styles.timerText}>Resend in 00:{timer < 10 ? `0${timer}` : timer}</Text>
          )}
        </Animated.View>
      </TouchableWithoutFeedback>
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
    paddingHorizontal: 24,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 36,
    height: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
    lineHeight: 22,
    marginBottom: 32,
  },
  emailHighlight: {
    color: '#007AFF',
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FF3B3010',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#FF3B30',
    flex: 1,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    backgroundColor: '#F2F2F7',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
  },
  otpBoxFilled: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF10',
  },
  otpBoxError: {
    borderColor: '#FF3B30',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendLabel: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '400',
  },
  resendLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: '#C7C7CC',
  },
  timerText: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 8,
  },
});
