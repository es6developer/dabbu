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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumAuthLayout } from '../../components/ui/PremiumAuthLayout';
import { useTheme } from '../../theme';
import { PADDING, borderRadius, shadows, typography as designTypo } from '../../theme/design';
import { palette } from '../../theme/colors';
import { api } from '../../services/api';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

function createStyles(colors: typeof palette.dark) {
  return StyleSheet.create({
    content: {
      flex: 1,
      paddingTop: PADDING,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      backgroundColor: colors.bg.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: PADDING,
    },
    title: {
      ...designTypo.largeTitle,
      color: colors.text.primary,
    },
    subtitle: {
      fontSize: 15,
      color: colors.text.secondary,
      marginTop: 8,
      fontFamily: 'Inter-Regular',
      lineHeight: 22,
      marginBottom: PADDING + 8,
    },
    emailHighlight: {
      color: colors.brand.primary,
      fontFamily: 'Inter-SemiBold',
    },
    otpRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
      marginBottom: PADDING + 8,
    },
    otpInput: {
      width: 52,
      height: 62,
      borderRadius: borderRadius.lg,
      borderWidth: 1.5,
      textAlign: 'center',
      fontSize: 24,
      fontWeight: '700',
      fontFamily: 'Inter-Bold',
      color: colors.text.primary,
    },
    verifyButton: {
      height: 56,
      backgroundColor: colors.brand.primary,
      borderRadius: borderRadius.xl,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.md,
    },
    verifyButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      letterSpacing: 0.3,
    },
    resendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: PADDING,
    },
    resendLabel: {
      color: colors.text.secondary,
      fontSize: 14,
      fontFamily: 'Inter-Regular',
    },
    resendText: {
      color: colors.brand.primary,
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
    },
    resendTextDisabled: {
      color: colors.text.tertiary,
    },
    resendTimer: {
      textAlign: 'center',
      color: colors.text.tertiary,
      fontSize: 13,
      fontFamily: 'Inter-Medium',
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
        paddingBottom: insets.bottom + PADDING,
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
      setError(e?.message || 'Failed to send OTP. Please try again.');
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
        if (purpose === 'email_verification') {
          navigation.navigate('Login', { emailVerified: true });
        } else {
          navigation.navigate(purpose === 'password_reset' ? 'ForgotPassword' : 'Login');
        }
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
        <Animated.View style={contentStyle}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.secondary} />
          </TouchableOpacity>

          <Text style={styles.title}>Check your Email</Text>
          <Text style={styles.subtitle}>
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
              <Ionicons name="alert-circle" size={16} color={colors.status.error} />
              <Text
                style={{
                  color: colors.status.error,
                  fontSize: 13,
                  fontFamily: 'Inter-Medium',
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
                      ? colors.brand.primary
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
