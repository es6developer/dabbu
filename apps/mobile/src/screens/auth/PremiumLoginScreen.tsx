import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
   Image,
 } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { PADDING, borderRadius, shadows } from '../../theme/design';
import { useGoogleAuth, getGoogleIdToken, getGoogleError } from '../../services/google-auth';

export function PremiumLoginScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { login, googleLogin } = useAuth();
  const { colors } = useTheme();
  const { response, promptAsync } = useGoogleAuth();
  const [email, setEmail] = useState('demo@dabbu.app');
  const [password, setPassword] = useState('Demo123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 10, tension: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!response) return;
    const idToken = getGoogleIdToken(response);
    if (idToken) {
      handleGoogleLogin(idToken);
    } else {
      const errMsg = getGoogleError(response);
      if (errMsg) setError(errMsg);
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

  const loginErrorMap: Record<string, string> = {
    'invalid email or password': 'Incorrect email or password. Please try again.',
    'user not found': 'No account found with this email.',
    'account disabled': 'This account has been disabled.',
    'rate limit': 'Too many login attempts. Please wait a moment.',
    'network': 'Unable to reach server. Please check your internet connection.',
  };

  function friendlyLoginError(msg: string): string {
    const lower = msg.toLowerCase();
    const matched = Object.keys(loginErrorMap).find((k) => lower.includes(k.toLowerCase()));
    return matched ? loginErrorMap[matched] : msg;
  }

  async function handleLogin() {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(friendlyLoginError(e.message || 'Login failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back + Brand */}
          <View style={{ paddingHorizontal: PADDING, marginBottom: 12 }}>
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
              }}
            >
              Welcome back
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '500',
                color: colors.text.secondary,
                marginTop: 6,
                lineHeight: 20,
              }}
            >
              Sign in to continue managing your finances
            </Text>
          </View>

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              paddingHorizontal: PADDING,
            }}
          >
            {/* Email */}
            <View style={{ marginBottom: 14 }}>
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
                  borderRadius: borderRadius.md,
                  borderWidth: 1.5,
                  borderColor: emailFocused ? colors.brand.primary : colors.border.default,
                  paddingHorizontal: 14,
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
                    fontSize: 15,
                    fontWeight: '500',
                    color: colors.text.primary,
                    paddingVertical: 14,
                    marginLeft: 10,
                  }}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={{ marginBottom: 16 }}>
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
                  borderRadius: borderRadius.md,
                  borderWidth: 1.5,
                  borderColor: passFocused ? colors.brand.primary : colors.border.default,
                  paddingHorizontal: 14,
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
                    fontSize: 15,
                    fontWeight: '500',
                    color: colors.text.primary,
                    paddingVertical: 14,
                    marginLeft: 10,
                  }}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={colors.text.tertiary}
                  secureTextEntry={!showPassword}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
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

            {/* Error */}
            {error ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: colors.status.errorLight,
                  marginBottom: 12,
                }}
              >
                <Ionicons name="alert-circle" size={16} color={colors.status.error} />
                <Text
                  style={{ fontSize: 13, fontWeight: '500', color: colors.status.error, flex: 1 }}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Forgot Password */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={{ alignSelf: 'flex-end', marginBottom: 24, marginTop: -4 }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.brand.primary }}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={loading}
              style={{
                backgroundColor: colors.brand.primary,
                paddingVertical: 16,
                borderRadius: borderRadius.md,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: loading ? 0.5 : 1,
                ...shadows.md,
                shadowColor: colors.brand.primary,
              }}
            >
              <Text style={{ color: colors.text.inverse, fontSize: 16, fontWeight: '700' }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border.default }} />
              <Text
                style={{
                  marginHorizontal: 12,
                  fontSize: 12,
                  fontWeight: '600',
                  color: colors.text.tertiary,
                }}
              >
                or continue with
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border.default }} />
            </View>

            {/* Google */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={async () => {
                try {
                  setError('');
                  await promptAsync();
                } catch (e: any) {
                  console.error('Google sign-in prompt failed:', e);
                  setError(e?.message || 'Google sign-in could not be started');
                }
              }}
              disabled={loading}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                paddingVertical: 14,
                borderRadius: borderRadius.md,
                backgroundColor: colors.bg.secondary,
                borderWidth: 1,
                borderColor: colors.border.default,
                opacity: loading ? 0.5 : 1,
              }}
            >
              <Ionicons name="logo-google" size={20} color={colors.text.primary} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary }}>
                Google
              </Text>
            </TouchableOpacity>

            {/* Footer */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.secondary }}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.brand.primary }}>
                  Create one
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 6,
                marginTop: 16,
              }}
            >
              <Ionicons name="shield-checkmark-outline" size={12} color={colors.text.tertiary} />
              <Text style={{ fontSize: 11, fontWeight: '500', color: colors.text.tertiary }}>
                256-bit encrypted connection
              </Text>
            </View>
          </Animated.View>
        </Animated.ScrollView>
      </TouchableWithoutFeedback>
    </View>
  );
}
