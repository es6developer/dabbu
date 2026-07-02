import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  ScrollView,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useLastLensLogo } from '../../hooks/useLastLensLogo';
import { AuthButton } from '../../components/ui/AuthButton';
import { useTheme } from '../../theme';
import { palette } from '../../theme/colors';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

function createStyles(colors: typeof palette.dark, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg.primary,
    },
    scrollContent: {
      flexGrow: 1,
    },
    viewingArea: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingBottom: 32,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.bg.tertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      alignSelf: 'flex-start',
    },
    logoContainer: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: colors.bg.tertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    logo: {
      width: 36,
      height: 36,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
      letterSpacing: -0.5,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: '400',
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    emailHighlight: {
      color: colors.text.link,
      fontWeight: '500',
    },
    interactionArea: {
      flex: 1,
      paddingHorizontal: 24,
    },
    formCard: {
      backgroundColor: colors.bg.secondary,
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
      marginBottom: 8,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.status.errorLight,
      marginBottom: 20,
      width: '100%',
    },
    errorText: {
      fontSize: 14,
      fontWeight: '400',
      color: colors.status.error,
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
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border.default,
      backgroundColor: colors.bg.tertiary,
      textAlign: 'center',
      fontSize: 24,
      fontWeight: '600',
      color: colors.text.primary,
    },
    otpBoxFilled: {
      borderColor: colors.accent.primary,
      backgroundColor: colors.bg.highlight,
    },
    otpBoxError: {
      borderColor: colors.status.error,
    },
    resendContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingTop: 20,
    },
    resendLabel: {
      color: colors.text.secondary,
      fontSize: 15,
      fontWeight: '400',
    },
    resendLink: {
      color: colors.text.link,
      fontSize: 15,
      fontWeight: '600',
    },
    resendLinkDisabled: {
      color: colors.text.tertiary,
    },
    timerText: {
      textAlign: 'center',
      color: colors.text.tertiary,
      fontSize: 14,
      marginTop: 8,
      paddingBottom: 8,
    },
  });
}

export function PremiumOtpScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const logoSource = useLastLensLogo();
  const { colors, isDark } = useTheme();
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

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateX: shakeAnim }],
            }}
          >
            <View style={[styles.viewingArea, { paddingTop: insets.top + 40 }]}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <AntDesign name="arrowleft" size={20} color={colors.text.primary} />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <Image source={logoSource} style={styles.logo} resizeMode="contain" />
              </View>
              <Text style={styles.title}>Verification code</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code sent to{' '}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>
            </View>

            <View style={styles.interactionArea}>
              <View style={styles.formCard}>
                {error ? (
                  <View style={styles.errorBox}>
                    <AntDesign name="exclamationcircle" size={14} color={colors.status.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

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

                <AuthButton
                  title="Verify & Continue"
                  onPress={() => handleVerify()}
                  loading={loading}
                />
              </View>

              <View style={styles.resendContainer}>
                <Text style={styles.resendLabel}>Didn't receive it? </Text>
                <TouchableOpacity onPress={handleResend} disabled={!canResend}>
                  <Text style={[styles.resendLink, !canResend && styles.resendLinkDisabled]}>
                    Send Again
                  </Text>
                </TouchableOpacity>
              </View>
              {!canResend && (
                <Text style={styles.timerText}>
                  Resend in 00:{timer < 10 ? `0${timer}` : timer}
                </Text>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </View>
  );
}
