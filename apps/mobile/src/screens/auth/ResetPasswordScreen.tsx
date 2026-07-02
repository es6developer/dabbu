import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';
import { api } from '../../services/api';
import { useToast } from '../../store/ToastContext';

const OTP_LENGTH = 6;

export function ResetPasswordScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const email = route.params?.email || '';
  const { showToast } = useToast();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'otp' | 'password'>('otp');

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 200,
        useNativeDriver: false,
      }),
    ]).start();
    const fallback = setTimeout(() => {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
    }, 2000);
    return () => clearTimeout(fallback);
  }, []);

  function handleOtpChange(text: string, i: number) {
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

  function handleNext() {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    setStep('password');
    setError('');
  }

  async function handleReset() {
    if (!password.trim()) {
      setError('Please enter a new password');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-with-otp', {
        email,
        otp: otp.join(''),
        password,
        purpose: 'password_reset',
      });
      showToast('Password reset successfully');
      navigation.navigate('Login', { passwordReset: true });
    } catch (e: any) {
      setError(e.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Animated.View
          style={{
            flex: 1,
            paddingTop: insets.top + spacing.xl,
            paddingHorizontal: spacing['2xl'],
            paddingBottom: insets.bottom + spacing.xl,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Back */}
          <TouchableOpacity
            onPress={() => {
              if (step === 'password') {
                setStep('otp');
                setError('');
              } else {
                navigation.goBack();
              }
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: borderRadius['2xl'],
              backgroundColor: colors.bg.secondary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing['3xl'],
            }}
          >
            <AntDesign name="arrowleft" size={20} color={colors.text.primary} />
          </TouchableOpacity>

          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: colors.text.primary,
              letterSpacing: -0.3,
              marginBottom: spacing.sm,
            }}
          >
            {step === 'otp' ? 'Check your Email' : 'Set new password'}
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '400',
              color: colors.text.secondary,
              lineHeight: 24,
              marginBottom: spacing['4xl'],
            }}
          >
            {step === 'otp'
              ? `Enter the verification code sent to ${email}`
              : 'Create a strong password for your account'}
          </Text>

          {/* Error */}
          {error ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.md,
                borderRadius: borderRadius['2xl'],
                backgroundColor: colors.status.errorLight,
                marginBottom: spacing.lg,
              }}
            >
              <AntDesign name="exclamationcircle" size={14} color={colors.status.error} />
              <Text
                style={{ fontSize: 16, fontWeight: '500', color: colors.status.error, flex: 1 }}
              >
                {error}
              </Text>
            </View>
          ) : null}

          {step === 'otp' ? (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: spacing.md,
                  marginBottom: spacing['4xl'],
                }}
              >
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(r) => {
                      inputRefs.current[i] = r;
                    }}
                    style={{
                      width: 52,
                      height: 62,
                      borderRadius: borderRadius['2xl'],
                      borderWidth: 1.5,
                      borderColor: digit
                        ? colors.accent.primary
                        : error
                          ? colors.status.error
                          : colors.border.default,
                      backgroundColor: digit ? `${colors.accent.primary}08` : colors.bg.secondary,
                      textAlign: 'center',
                      fontSize: 26,
                      fontWeight: '700',
                      color: colors.text.primary,
                    }}
                    value={digit}
                    onChangeText={(t) => handleOtpChange(t, i)}
                    onKeyPress={(e) => handleKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleNext}
                style={{
                  height: 54,
                  borderRadius: borderRadius['2xl'],
                  backgroundColor: colors.accent.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...shadows.md,
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 19, fontWeight: '600' }}>Continue</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.bg.secondary,
                  borderRadius: borderRadius['2xl'],
                  borderWidth: 1.5,
                  borderColor: colors.border.default,
                  paddingHorizontal: spacing.lg,
                  height: 54,
                  marginBottom: spacing.md,
                }}
              >
                <AntDesign
                  name="lock"
                  size={16}
                  color={colors.text.tertiary}
                  style={{ marginRight: spacing.sm }}
                />
                <TextInput
                  style={{ flex: 1, fontSize: 16, fontWeight: '400', color: colors.text.primary }}
                  placeholder="New password"
                  placeholderTextColor={colors.text.tertiary}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (error) {
                      setError('');
                    }
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="next"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <AntDesign
                    name={showPassword ? 'eyeo' : 'eye'}
                    size={18}
                    color={colors.text.tertiary}
                  />
                </TouchableOpacity>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.bg.secondary,
                  borderRadius: borderRadius['2xl'],
                  borderWidth: 1.5,
                  borderColor: colors.border.default,
                  paddingHorizontal: spacing.lg,
                  height: 54,
                  marginBottom: spacing['3xl'],
                }}
              >
                <AntDesign
                  name="lock"
                  size={16}
                  color={colors.text.tertiary}
                  style={{ marginRight: spacing.sm }}
                />
                <TextInput
                  style={{ flex: 1, fontSize: 16, fontWeight: '400', color: colors.text.primary }}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.text.tertiary}
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    if (error) {
                      setError('');
                    }
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="go"
                  onSubmitEditing={handleReset}
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleReset}
                disabled={loading}
                style={{
                  height: 54,
                  borderRadius: borderRadius['2xl'],
                  backgroundColor: colors.accent.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: spacing.sm,
                  opacity: loading ? 0.6 : 1,
                  ...shadows.md,
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: '#FFF', fontSize: 19, fontWeight: '600' }}>
                    Reset Password
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={{ paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md }}
          >
            <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text.secondary }}>
              Back to sign in
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
