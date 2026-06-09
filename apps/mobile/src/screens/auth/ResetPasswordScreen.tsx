import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PADDING, shadows } from '../../theme/design';
import { api } from '../../services/api';

const OTP_LENGTH = 6;

export function ResetPasswordScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const email = route.params?.email || '';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'otp' | 'password'>('otp');

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
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

    if (error) setError('');
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
      navigation.navigate('Login', { passwordReset: true });
    } catch (e: any) {
      setError(e.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.root}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View
          style={{
            flex: 1,
            paddingTop: insets.top + 16,
            paddingHorizontal: PADDING,
            paddingBottom: insets.bottom + 16,
            opacity: fadeAnim,
          }}
        >
          {/* Back Button */}
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
              borderRadius: 12,
              backgroundColor: '#F8F9FA',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>

          {/* Header */}
          <Text
            style={{
              fontSize: 28,
              fontWeight: '800',
              color: '#1A1A1A',
              letterSpacing: -0.5,
              marginBottom: 8,
            }}
          >
            {step === 'otp' ? 'Check your Email' : 'Set new password'}
          </Text>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '500',
              color: '#6B7280',
              lineHeight: 22,
              marginBottom: 32,
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
                gap: 8,
                padding: 12,
                borderRadius: 14,
                backgroundColor: '#FF4D4F10',
                marginBottom: 16,
              }}
            >
              <Ionicons name="alert-circle" size={16} color="#FF4D4F" />
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#FF4D4F', flex: 1 }}>
                {error}
              </Text>
            </View>
          ) : null}

          {step === 'otp' ? (
            <>
              {/* OTP Input Fields */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 10,
                  marginBottom: 32,
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
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: digit
                        ? '#8B5CF6'
                        : error
                          ? '#FF4D4F'
                          : '#E5E7EB',
                      backgroundColor: digit ? '#8B5CF608' : '#F8F9FA',
                      textAlign: 'center',
                      fontSize: 24,
                      fontWeight: '700',
                      color: '#1A1A1A',
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

              {/* Continue Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleNext}
                style={{
                  backgroundColor: '#8B5CF6',
                  paddingVertical: 16,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...shadows.md,
                  shadowColor: '#8B5CF6',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>Continue</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* New Password */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F8F9FA',
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: 'transparent',
                  paddingHorizontal: 16,
                  height: 56,
                  marginBottom: 14,
                }}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#9CA3AF"
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  style={{ flex: 1, fontSize: 16, fontWeight: '500', color: '#1A1A1A' }}
                  placeholder="New password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (error) setError('');
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="next"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm Password */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F8F9FA',
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: 'transparent',
                  paddingHorizontal: 16,
                  height: 56,
                  marginBottom: 24,
                }}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#9CA3AF"
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  style={{ flex: 1, fontSize: 16, fontWeight: '500', color: '#1A1A1A' }}
                  placeholder="Confirm new password"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    if (error) setError('');
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="go"
                  onSubmitEditing={handleReset}
                />
              </View>

              {/* Reset Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleReset}
                disabled={loading}
                style={{
                  backgroundColor: '#8B5CF6',
                  paddingVertical: 16,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  opacity: loading ? 0.6 : 1,
                  ...shadows.md,
                  shadowColor: '#8B5CF6',
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>
                    Reset Password
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Back to sign in */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={{
              paddingVertical: 14,
              alignItems: 'center',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              marginTop: 12,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#8B5CF6' }}>
              Back to sign in
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
});
