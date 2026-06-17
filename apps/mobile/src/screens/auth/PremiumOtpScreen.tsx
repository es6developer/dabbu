import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumAuthLayout } from '../../components/ui/PremiumAuthLayout';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';
import { typography as designTypo } from '../../theme';
import { palette } from '../../theme/colors';
import { api } from '../../services/api';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

function createStyles(colors: typeof palette.dark) {
  return StyleSheet.create({
    content: {
      flex: 1,
      paddingTop: spacing.xl,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      backgroundColor: colors.bg.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    title: {
      ...designTypo.largeTitle,
      color: colors.text.primary,
    },
    subtitle: {
      fontSize: 15,
      color: colors.text.secondary,
      marginTop: 8,
      lineHeight: 22,
      marginBottom: spacing.xl + 8,
    },
    emailHighlight: {
      color: colors.accent.primary,
    },
    otpRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
      marginBottom: spacing.xl + 8,
    },
    otpInput: {
      width: 52,
      height: 62,
      borderRadius: borderRadius.lg,
      borderWidth: 1.5,
      textAlign: 'center',
      fontSize: 24,
      fontWeight: '700',
      color: colors.text.primary,
    },
    verifyButton: {
      height: 56,
      backgroundColor: colors.accent.primary,
      borderRadius: borderRadius.xl,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.md,
    },
    verifyButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      letterSpacing: 0.3,
    },
    resendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: spacing.xl,
    },
    resendLabel: {
      color: colors.text.secondary,
      fontSize: 14,
    },
    resendText: {
      color: colors.accent.primary,
      fontSize: 14,
    },
    resendTextDisabled: {
      color: colors.text.tertiary,
    },
    resendTimer: {
      textAlign: 'center',
      color: colors.text.tertiary,
      fontSize: 13,
      marginTop: 8,
    },
  });
}

export function PremiumOtpScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
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

  const styles = useMemo(() => createStyles(colors), [colors]);

  const contentStyle = useMemo(
    () => [
      styles.content,
      {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        paddingBottom: insets.bottom + spacing.xl,
      },
    ],
    [styles.content, fadeAnim, slideAnim, insets.bottom],
  );

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
    } catch (e: any) {
      const msg = e?.message || '';
      const knownErrors: Record<string, string> = {
        'rate limit': 'Too many requests. Please wait a moment before trying again.',
        'already verified': 'This email is already verified. Please sign in.',
        'invalid email': 'Please check your email address and try again.',
        'user not found': 'No account found with this email address.',
        'network': 'Unable to reach server. Please check your internet connection.',
      };
      const matched = Object.keys(knownErrors).find((k) =>
        msg.toLowerCase().includes(k.toLowerCase()),
      );
      setError(matched ? knownErrors[matched] : msg || 'Failed to send code. Please try again.');
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

  const otpErrorMap: Record<string, string> = {
    'invalid otp': 'The code you entered is incorrect. Please try again.',
    'expired': 'This code has expired. Please request a new one.',
    'rate limit': 'Too many attempts. Please wait a moment.',
    'network': 'Unable to reach server. Please check your internet connection.',
    'already verified': 'This email is already verified.',
    'not found': 'No OTP request found. Please go back and try again.',
  };

  function friendlyOtpError(msg: string): string {
    const lower = msg.toLowerCase();
    const matched = Object.keys(otpErrorMap).find((k) => lower.includes(k.toLowerCase()));
    return matched ? otpErrorMap[matched] : msg;
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
        if (purpose === 'email_verification') {
          navigation.navigate('Login', { emailVerified: true });
        } else {
          navigation.navigate(purpose === 'password_reset' ? 'ResetPassword' : 'Login');
        }
      } else {
        setError(friendlyOtpError(result.message || 'Invalid OTP'));
      }
    } catch (e: any) {
      setError(friendlyOtpError(e.message || 'Verification failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PremiumAuthLayout>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View style={contentStyle}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { alignSelf: 'center' }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AntDesign  name="arrowleft" size={24} color={colors.text.secondary} />
          </TouchableOpacity>

          <Text style={[styles.title, { textAlign: 'center' }]}>Check your Email</Text>
          <Text style={[styles.subtitle, { textAlign: 'center' }]}>
            Enter the unique code we sent to <Text style={styles.emailHighlight}>{email}</Text>
          </Text>

          {error ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.status.errorLight,
                padding: 14,
                borderRadius: borderRadius.lg,
                marginBottom: 16,
                gap: 10,
              }}
            >
              <AntDesign  name="exclamationcircle" size={16} color={colors.status.error} />
              <Text
                style={{
                  color: colors.status.error,
                  fontSize: 13,
                  flex: 1,
                }}
              >
                {error}
              </Text>
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
                    borderColor: digit
                      ? colors.accent.primary
                      : error
                        ? colors.status.error
                        : colors.border.subtle,
                    backgroundColor: digit ? colors.brand.light : colors.bg.secondary,
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
              style={[styles.verifyButton, loading && { opacity: 0.6 }]}
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
              <Text style={styles.verifyButtonText}>
                {loading ? 'Verifying...' : 'Verify & Proceed'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive it? </Text>
            <TouchableOpacity onPress={handleResend} disabled={!canResend} activeOpacity={0.7}>
              <Text style={[styles.resendText, !canResend && styles.resendTextDisabled]}>
                Send Again
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.resendTimer, canResend && { opacity: 0 }]}>
            Resend in 00:{timer < 10 ? `0${timer}` : timer}s
          </Text>
        </Animated.View>
      </TouchableWithoutFeedback>
    </PremiumAuthLayout>
  );
}
