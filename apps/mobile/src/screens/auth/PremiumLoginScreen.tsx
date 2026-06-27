import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
  StyleSheet,
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

export function PremiumLoginScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { login, googleLogin } = useAuth();
  const logoSource = useLastLensLogo();
  const { response, promptAsync } = useGoogleAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

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
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          </View>

          {/* Header */}
          <Text style={styles.title}>Sign in to Dabbu</Text>
          <Text style={styles.subtitle}>Manage your finances, effortlessly.</Text>

          {/* Form */}
          <View style={styles.form}>
            <AuthInput
              placeholder="Email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) {
                  setError('');
                }
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
                if (error) {
                  setError('');
                }
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
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <AntDesign name="exclamationcircle" size={14} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Sign In Button */}
          <AuthButton
            title="Continue"
            onPress={handleLogin}
            loading={loading}
            testID="login-button"
          />

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social */}
          <View style={styles.socialSection}>
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
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.footerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.securityBadge}>
            <AntDesign name="lock" size={12} color="#8E8E93" />
            <Text style={styles.securityText}>256-bit encrypted connection</Text>
          </View>
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
    marginBottom: 32,
  },
  form: {
    marginBottom: 20,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
  },
  socialSection: {
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  securityBadge: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  securityText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#8E8E93',
  },
});
