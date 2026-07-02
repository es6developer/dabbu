import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../store/AuthContext';
import { useGoogleAuth, getGoogleIdToken, getGoogleError } from '../../services/google-auth';
import { useLastLensLogo } from '../../hooks/useLastLensLogo';
import { AuthInput } from '../../components/ui/AuthInput';
import { AuthButton } from '../../components/ui/AuthButton';
import { SocialButton } from '../../components/ui/SocialButton';
import { useTheme } from '../../theme';
import { palette } from '../../theme/colors';

const { height: SCREEN_H } = Dimensions.get('window');

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
      paddingTop: 40,
      paddingBottom: 32,
      paddingHorizontal: 24,
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
    interactionArea: {
      flex: 1,
      paddingHorizontal: 24,
    },
    formCard: {
      backgroundColor: colors.bg.secondary,
      borderRadius: 24,
      padding: 24,
      marginBottom: 16,
    },
    forgotButton: {
      alignSelf: 'flex-end',
      marginTop: 4,
      marginBottom: 16,
    },
    forgotText: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.text.link,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.status.errorLight,
      marginBottom: 16,
    },
    errorText: {
      fontSize: 14,
      fontWeight: '400',
      color: colors.status.error,
      flex: 1,
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border.subtle,
    },
    dividerText: {
      marginHorizontal: 16,
      fontSize: 14,
      fontWeight: '400',
      color: colors.text.tertiary,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 24,
    },
    footerText: {
      fontSize: 15,
      fontWeight: '400',
      color: colors.text.secondary,
    },
    footerLink: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.link,
    },
    securityBadge: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 16,
    },
    securityText: {
      fontSize: 12,
      fontWeight: '400',
      color: colors.text.tertiary,
    },
  });
}

export function PremiumLoginScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { login, googleLogin } = useAuth();
  const logoSource = useLastLensLogo();
  const { response, promptAsync } = useGoogleAuth();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('demo@dabbu.app');

  const [password, setPassword] = useState('TestPass123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!response) {
      return;
    }
    const idToken = getGoogleIdToken(response);
    if (idToken) {
      handleGoogleLogin(idToken);
    } else {
      const errMsg = getGoogleError(response);
      if (errMsg) {
        setError(errMsg);
      }
    }
  }, [response]);

  async function handleGoogleLogin(idToken: string) {
    setLoading(true);
    setError('');
    try {
      await googleLogin(idToken);
    } catch (e: any) {
      setError(e.message || 'Google sign-in failed');
      setLoading(false);
    }
  }

  const shakeError = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const loginErrorMap: Record<string, string> = {
    'invalid email or password': 'Incorrect email or password. Please try again.',
    'user not found': 'No account found with this email.',
    'account disabled': 'This account has been disabled.',
    'rate limit': 'Too many login attempts. Please wait a moment.',
    network: 'Unable to reach server. Please check your internet connection.',
  };

  function friendlyLoginError(msg: string): string {
    const lower = msg.toLowerCase();
    const matched = Object.keys(loginErrorMap).find((k) => lower.includes(k.toLowerCase()));
    return matched ? loginErrorMap[matched] : msg;
  }

  async function handleLogin() {
    if (!email.trim()) {
      setError('Please enter your email address');
      shakeError();
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      shakeError();
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(friendlyLoginError(e.message || 'Login failed'));
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
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: shakeAnim }] }}>
            <View
              style={[
                styles.viewingArea,
                { paddingTop: insets.top + 40 },
              ]}
            >
              <View style={styles.logoContainer}>
                <Image source={logoSource} style={styles.logo} resizeMode="contain" />
              </View>
              <Text style={styles.title}>Sign in to Dabbu</Text>
              <Text style={styles.subtitle}>Manage your finances, effortlessly.</Text>
            </View>

            <View style={styles.interactionArea}>
              <View style={styles.formCard}>
                <AuthInput
                  placeholder="Email"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (error) setError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  testID="login-email"
                />

                <AuthInput
                  placeholder="Password"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (error) setError('');
                  }}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  testID="login-password"
                />

                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                  style={styles.forgotButton}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>

                {error ? (
                  <View style={styles.errorBox}>
                    <AntDesign name="exclamationcircle" size={14} color={colors.status.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <AuthButton
                  title="Continue"
                  onPress={handleLogin}
                  loading={loading}
                  testID="login-button"
                />
              </View>

              <TouchableOpacity
                onPress={() => {
                  setEmail('demo@dabbu.app');
                  setPassword('TestPass123!');
                  setError('');
                }}
                style={{ paddingVertical: 12 }}
                activeOpacity={0.6}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    fontSize: 15,
                    fontWeight: '500',
                    color: colors.text.secondary,
                  }}
                >
                  Try with Demo Account
                </Text>
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <SocialButton
                provider="google"
                onPress={async () => {
                  try {
                    setError('');
                    await promptAsync();
                  } catch (e: any) {
                    setError(e?.message || 'Google sign-in could not be started');
                  }
                }}
                disabled={loading}
              />

              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                  <Text style={styles.footerLink}>Sign up</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.securityBadge}>
                <AntDesign name="lock" size={12} color={colors.text.tertiary} />
                <Text style={styles.securityText}>256-bit encrypted connection</Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </View>
  );
}
