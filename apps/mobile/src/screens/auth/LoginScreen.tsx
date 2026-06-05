import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';
import { useGoogleAuth, getGoogleIdToken, getGoogleError } from '../../services/google-auth';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const { googleLogin, login, guestLogin } = useAuth();
  const { colors, isDark } = useTheme();
  const { response, promptAsync } = useGoogleAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (response) {
      const idToken = getGoogleIdToken(response);
      if (idToken) {
        handleGoogleLogin(idToken);
      } else {
        const errMsg = getGoogleError(response);
        if (errMsg) {
          setError(errMsg);
        }
        setLoading(false);
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
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  async function handleGuestLogin() {
    setLoading(true);
    setError('');
    try {
      await guestLogin();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <LinearGradient
          colors={isDark ? ['#0F0A1E', '#1A0A2E', '#0D0D1A'] : ['#f8f4f0', '#F0EAE4', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Decorative blurs */}
        {isDark && (
          <>
            <View style={styles.decoCircle1} />
            <View style={styles.decoCircle2} />
            <View style={styles.decoCircle3} />
          </>
        )}

        <Animated.View style={[styles.container, { opacity: fadeIn }]}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.back}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.backCircle,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
              ]}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
            </View>
          </TouchableOpacity>

          {/* Brand */}
          <Animated.View style={[styles.brand, { transform: [{ translateY: slideUp }] }]}>
            <View
              style={[
                styles.logoOuter,
                { backgroundColor: isDark ? 'rgba(247,137,44,0.12)' : 'rgba(247,137,44,0.08)' },
              ]}
            >
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
              Sign in to manage your finances
            </Text>
          </Animated.View>

          {/* Card */}
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              },
              { transform: [{ translateY: slideUp }] },
            ]}
          >
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: `${colors.status.error}12` }]}>
                <Ionicons name="alert-circle" size={16} color={colors.status.error} />
                <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
              </View>
            ) : null}

            {/* Google button */}
            <TouchableOpacity
              style={[
                styles.socialBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                },
              ]}
              onPress={() => {
                setError('');
                setLoading(true);
                promptAsync().catch((e: any) => {
                  setError(e.message || 'Failed to open Google Sign-In');
                  setLoading(false);
                });
              }}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading && !showEmail ? (
                <ActivityIndicator size="small" color={colors.text.secondary} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color={colors.text.secondary} />
                  <Text style={[styles.socialBtnText, { color: colors.text.secondary }]}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View
                style={[
                  styles.dividerLine,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                ]}
              />
              <Text style={[styles.dividerText, { color: colors.text.tertiary }]}>or</Text>
              <View
                style={[
                  styles.dividerLine,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                ]}
              />
            </View>

            {/* Email toggle */}
            <TouchableOpacity
              style={styles.emailToggle}
              onPress={() => setShowEmail(!showEmail)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showEmail ? 'chevron-up' : 'mail-outline'}
                size={16}
                color={colors.text.tertiary}
              />
              <Text style={[styles.emailToggleText, { color: colors.text.tertiary }]}>
                {showEmail ? 'Hide email login' : 'Sign in with email'}
              </Text>
            </TouchableOpacity>

            {/* Email form */}
            {showEmail && (
              <View style={styles.emailSection}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      color: colors.text.primary,
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                  placeholder="Email"
                  placeholderTextColor={colors.text.tertiary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                />
                <View
                  style={[
                    styles.pwRow,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.pwInput, { color: colors.text.primary }]}
                    placeholder="Password"
                    placeholderTextColor={colors.text.tertiary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPw}
                    textContentType="password"
                    autoComplete="password"
                  />
                  <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eye}>
                    <Ionicons
                      name={showPw ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.text.tertiary}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: colors.accent.primary },
                    loading && { opacity: 0.6 },
                  ]}
                  onPress={handleEmailLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Sign In</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                  style={{ alignSelf: 'center' }}
                >
                  <Text style={[styles.forgotText, { color: colors.text.tertiary }]}>
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {/* Bottom links */}
          <View style={styles.bottom}>
            <TouchableOpacity
              style={styles.guestBtn}
              onPress={handleGuestLogin}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Ionicons name="person-outline" size={16} color={colors.text.tertiary} />
              <Text style={[styles.guestText, { color: colors.text.tertiary }]}>
                Continue as Guest
              </Text>
            </TouchableOpacity>

            <View style={styles.signupRow}>
              <Text style={[styles.signupText, { color: colors.text.tertiary }]}>
                New to Dabbu?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')} activeOpacity={0.7}>
                <Text style={[styles.signupLink, { color: colors.accent.primary }]}>
                  Create account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },

  /* Decorative */
  decoCircle1: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(247,137,44,0.08)',
  },
  decoCircle2: {
    position: 'absolute',
    top: SCREEN_H * 0.2,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(116,185,255,0.06)',
  },
  decoCircle3: {
    position: 'absolute',
    bottom: SCREEN_H * 0.15,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(247,137,44,0.05)',
  },

  /* Back */
  back: { marginBottom: 20, marginTop: 8 },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Brand */
  brand: { alignItems: 'center', marginBottom: 32 },
  logoOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoImage: { width: 52, height: 52 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, fontWeight: '500', lineHeight: 20 },

  /* Card */
  card: { borderRadius: 28, borderWidth: 1, padding: 28, marginBottom: 24 },

  /* Error */
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },

  /* Social button */
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  socialBtnText: { fontSize: 15, fontWeight: '600' },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '600', marginHorizontal: 12, letterSpacing: 0.5 },

  /* Email toggle */
  emailToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  emailToggleText: { fontSize: 13, fontWeight: '500' },

  /* Email section */
  emailSection: { gap: 12, marginTop: 16 },
  input: { fontSize: 15, padding: 15, borderRadius: 14, borderWidth: 1 },
  pwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  pwInput: { flex: 1, fontSize: 15, paddingVertical: 15 },
  eye: { padding: 4 },

  /* Primary button */
  primaryBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  forgotText: { fontSize: 13, fontWeight: '600', marginTop: 14 },

  /* Bottom */
  bottom: { alignItems: 'center', marginTop: 'auto', paddingBottom: 20 },
  guestBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
  guestText: { fontSize: 14, fontWeight: '600' },
  signupRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  signupText: { fontSize: 14, fontWeight: '500' },
  signupLink: { fontSize: 14, fontWeight: '700' },
});
