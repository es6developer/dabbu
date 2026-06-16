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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGoogleAuth, getGoogleIdToken, getGoogleError } from '../../services/google-auth';
import { PADDING, shadows } from '../../theme/design';

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const { googleLogin, guestLogin } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { response, promptAsync } = useGoogleAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
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
        console.error('Google auth response error:', response);
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
      navigation.navigate('Phone', { email: email.trim(), password });
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Animated.ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fadeIn,
              transform: [{ translateY: slideUp }],
              paddingHorizontal: PADDING,
            }}
          >
            {/* Brand */}
            <View style={{ alignItems: 'center', marginBottom: 36 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 20,
                  backgroundColor: colors.bg.secondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <Image
                  source={require('../../../assets/logo.png')}
                  style={{ width: 56, height: 56 }}
                  resizeMode="contain"
                />
              </View>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '800',
                  color: colors.text.primary,
                  letterSpacing: -0.5,
                  marginBottom: 6,
                }}
              >
                Welcome back
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text.secondary }}>
                Sign in to your account
              </Text>
            </View>

            {/* Error */}
            {error ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: colors.status.errorLight,
                  marginBottom: 16,
                }}
              >
                <Ionicons name="alert-circle-outline" size={16} color={colors.status.error} />
                <Text
                  style={{ fontSize: 13, fontWeight: '500', color: colors.status.error, flex: 1 }}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Email Input */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: emailFocused ? colors.brand.primary : colors.text.secondary,
                  letterSpacing: 0.5,
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                Email
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.bg.secondary,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: emailFocused ? colors.brand.primary : colors.border.default,
                  paddingHorizontal: 16,
                }}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={emailFocused ? colors.brand.primary : colors.text.tertiary}
                />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontWeight: '500',
                    color: colors.text.primary,
                    paddingVertical: 15,
                    marginLeft: 10,
                  }}
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

            {/* Password Input */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: passFocused ? colors.brand.primary : colors.text.secondary,
                  letterSpacing: 0.5,
                  marginBottom: 8,
                  textTransform: 'uppercase',
                }}
              >
                Password
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.bg.secondary,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: passFocused ? colors.brand.primary : colors.border.default,
                  paddingHorizontal: 16,
                }}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={passFocused ? colors.brand.primary : colors.text.tertiary}
                />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontWeight: '500',
                    color: colors.text.primary,
                    paddingVertical: 15,
                    marginLeft: 10,
                  }}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.text.tertiary}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.text.tertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={{ alignItems: 'flex-end', marginBottom: 24 }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.brand.primary }}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleEmailSignIn}
              disabled={loading}
              style={{
                backgroundColor: colors.brand.primary,
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                opacity: loading ? 0.6 : 1,
                ...shadows.md,
                shadowColor: colors.brand.primary,
              }}
            >
              {loading ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <Text style={{ color: colors.text.inverse, fontSize: 17, fontWeight: '700' }}>
                  Sign in
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border.default }} />
              <Text
                style={{
                  marginHorizontal: 16,
                  fontSize: 13,
                  fontWeight: '600',
                  color: colors.text.tertiary,
                }}
              >
                Or continue with
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border.default }} />
            </View>

            {/* Social Auth */}
            <View
              style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: 24 }}
            >
              <TouchableOpacity
                onPress={async () => {
                  try {
                    setError('');
                    await promptAsync();
                  } catch (e: any) {
                    console.error('Google sign-in prompt failed:', e);
                    setError(e?.message || 'Google sign-in could not be started');
                  }
                }}
                activeOpacity={0.85}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: colors.bg.secondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="logo-google" size={24} color={colors.text.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: colors.bg.secondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="logo-facebook" size={24} color={colors.text.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: colors.bg.secondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="logo-apple" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Guest */}
            <TouchableOpacity
              onPress={handleGuestLogin}
              disabled={loading}
              style={{ alignItems: 'center', paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.tertiary }}>
                Continue as Guest
              </Text>
            </TouchableOpacity>

            {/* Privacy */}
            <View style={{ alignItems: 'center', marginTop: 24 }}>
              <TouchableOpacity onPress={() => navigation.navigate('Privacy')}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text.tertiary }}>
                  Privacy Policy
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
});
