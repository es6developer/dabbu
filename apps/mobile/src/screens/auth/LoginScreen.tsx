import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGoogleAuth, getGoogleIdToken, getGoogleError } from '../../services/google-auth';
import { spacing, borderRadius, shadows, sectionHeader, animation } from '../../theme/design';
import { useLastLensLogo } from '../../hooks/useLastLensLogo';

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const { googleLogin, guestLogin } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { response, promptAsync } = useGoogleAuth();
  const logoSource = useLastLensLogo();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();
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
      setLoading(false);
    }
  }

  async function handleEmailSignIn() {
    if (!email.trim()) {
      setError('Enter your email');
      return;
    }
    if (!password.trim()) {
      setError('Enter your password');
      return;
    }
    setLoading(true);
    setError('');
    Keyboard.dismiss();
    try {
      navigation.navigate('OtpVerification', { email: email.trim(), purpose: 'login' });
    } catch (e: any) {
      setError(e.message || 'Sign in failed');
    } finally {
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
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Animated.ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + spacing['5xl'],
            paddingBottom: insets.bottom + spacing['4xl'],
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              paddingHorizontal: spacing['2xl'],
            }}
          >
            {/* Brand */}
            <View style={{ alignItems: 'center', marginBottom: spacing['5xl'] }}>
              <View style={s.logoWrap}>
                <Image source={logoSource} style={{ width: 48, height: 48 }} resizeMode="contain" />
              </View>
              <Text style={[s.title, { color: colors.text.primary }]}>Welcome back</Text>
              <Text style={[s.subtitle, { color: colors.text.secondary }]}>
                Sign in to your account
              </Text>
            </View>

            {/* Error */}
            {error ? (
              <View style={[s.errorBox, { backgroundColor: colors.status.errorLight }]}>
                <AntDesign name="exclamationcircle" size={14} color={colors.status.error} />
                <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text
                style={[
                  s.fieldLabel,
                  { color: emailFocused ? colors.accent.primary : colors.text.secondary },
                ]}
              >
                Email
              </Text>
              <View
                style={[
                  s.field,
                  {
                    backgroundColor: colors.bg.secondary,
                    borderColor: emailFocused ? colors.accent.primary : colors.border.default,
                  },
                ]}
              >
                <AntDesign
                  name="mail"
                  size={16}
                  color={emailFocused ? colors.accent.primary : colors.text.tertiary}
                />
                <TextInput
                  style={[s.fieldInput, { color: colors.text.primary }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.text.tertiary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>
            </View>

            {/* Password */}
            <View style={{ marginBottom: spacing.md }}>
              <Text
                style={[
                  s.fieldLabel,
                  { color: passFocused ? colors.accent.primary : colors.text.secondary },
                ]}
              >
                Password
              </Text>
              <View
                style={[
                  s.field,
                  {
                    backgroundColor: colors.bg.secondary,
                    borderColor: passFocused ? colors.accent.primary : colors.border.default,
                  },
                ]}
              >
                <AntDesign
                  name="lock"
                  size={16}
                  color={passFocused ? colors.accent.primary : colors.text.tertiary}
                />
                <TextInput
                  style={[s.fieldInput, { color: colors.text.primary }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.text.tertiary}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <AntDesign
                    name={showPassword ? 'eyeo' : 'eye'}
                    size={18}
                    color={colors.text.tertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={{ alignItems: 'flex-end', marginBottom: spacing['2xl'] }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accent.primary }}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleEmailSignIn}
              disabled={loading}
              style={[
                s.primaryBtn,
                { backgroundColor: colors.accent.primary, opacity: loading ? 0.6 : 1 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={s.primaryBtnText}>Sign in</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.divider}>
              <View style={[s.dividerLine, { backgroundColor: colors.border.subtle }]} />
              <Text style={[s.dividerText, { color: colors.text.tertiary }]}>or continue with</Text>
              <View style={[s.dividerLine, { backgroundColor: colors.border.subtle }]} />
            </View>

            {/* Social */}
            <View style={s.socialRow}>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    setError('');
                    await promptAsync();
                  } catch (e: any) {
                    setError(e?.message || 'Google sign-in failed');
                  }
                }}
                activeOpacity={0.85}
                style={[s.socialBtn, { backgroundColor: colors.bg.secondary }]}
              >
                <AntDesign name="google" size={20} color={colors.text.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[s.socialBtn, { backgroundColor: colors.bg.secondary }]}
              >
                <AntDesign name="apple1" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Guest */}
            <TouchableOpacity
              onPress={handleGuestLogin}
              disabled={loading}
              style={{ alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm }}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.tertiary }}>
                Continue as Guest
              </Text>
            </TouchableOpacity>

            {/* Privacy */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Privacy')}
              style={{ alignItems: 'center', marginTop: spacing['2xl'] }}
            >
              <Text style={{ fontSize: 11, fontWeight: '500', color: colors.text.tertiary }}>
                Privacy Policy
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: borderRadius['3xl'],
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius['2xl'],
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    paddingVertical: 14,
  },
  primaryBtn: {
    height: 54,
    borderRadius: borderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    ...shadows.md,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.05,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing['2xl'],
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    marginHorizontal: spacing.lg,
    fontSize: 13,
    fontWeight: '500',
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: borderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
});
