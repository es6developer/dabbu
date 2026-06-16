import React, { useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { PADDING, shadows } from '../../theme/design';
import { useToast } from '../../store/ToastContext';

export function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const { showToast } = useToast();

  async function handleSendOtp() {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-otp', { email: email.trim(), purpose: 'password_reset' });
      showToast('OTP sent successfully');
      navigation.navigate('ResetPassword', { email: email.trim() });
    } catch (e: any) {
      setError(e.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View
            style={{
              flex: 1,
              paddingTop: insets.top + 16,
              paddingHorizontal: PADDING,
              paddingBottom: insets.bottom + 16,
            }}
          >
            {/* Back Button */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: colors.bg.secondary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              <AntDesign  name="left" size={22} color={colors.text.primary} />
            </TouchableOpacity>

            {/* Header */}
            <Text
              style={{
                fontSize: 28,
                fontWeight: '800',
                color: colors.text.primary,
                letterSpacing: -0.5,
                marginBottom: 8,
              }}
            >
              Reset password
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '500',
                color: colors.text.secondary,
                lineHeight: 22,
                marginBottom: 32,
              }}
            >
              Enter your email address and we'll send you a verification code to reset your
              password.
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
                  backgroundColor: colors.status.errorLight,
                  marginBottom: 16,
                }}
              >
                <AntDesign  name="exclamationcircle" size={16} color={colors.status.error} />
                <Text
                  style={{ fontSize: 13, fontWeight: '500', color: colors.status.error, flex: 1 }}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Email Input */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: emailFocused ? colors.bg.primary : colors.bg.secondary,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: emailFocused ? colors.brand.primary : colors.border.default,
                paddingHorizontal: 16,
                height: 56,
                marginBottom: 24,
              }}
            >
              <AntDesign
                 name="mail"
                size={20}
                color={emailFocused ? colors.brand.primary : colors.text.tertiary}
                style={{ marginRight: 12 }}
              />
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 16,
                  fontWeight: '500',
                  color: colors.text.primary,
                }}
                placeholder="Email address"
                placeholderTextColor={colors.text.tertiary}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (error) {
                    setError('');
                  }
                }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleSendOtp}
              />
            </View>

            {/* Send Code Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSendOtp}
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
                  Send Verification Code
                </Text>
              )}
            </TouchableOpacity>

            {/* Back to sign in */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={{
                paddingVertical: 14,
                alignItems: 'center',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border.default,
                marginTop: 12,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.brand.primary }}>
                Back to sign in
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
}
