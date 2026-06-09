import React, { useState } from 'react';
import {
  StyleSheet,
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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PADDING, shadows } from '../../theme/design';

export function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);

  async function handleSendOtp() {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-otp', { email: email.trim(), purpose: 'password_reset' });
      navigation.navigate('ResetPassword', { email: email.trim() });
    } catch (e: any) {
      setError(e.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.root}>
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
              Reset password
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
              Enter your email address and we'll send you a verification code to reset your password.
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

            {/* Email Input */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: emailFocused ? '#FFFFFF' : '#F8F9FA',
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: emailFocused ? '#8B5CF6' : 'transparent',
                paddingHorizontal: 16,
                height: 56,
                marginBottom: 24,
              }}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={emailFocused ? '#8B5CF6' : '#9CA3AF'}
                style={{ marginRight: 12 }}
              />
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 16,
                  fontWeight: '500',
                  color: '#1A1A1A',
                }}
                placeholder="Email address"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (error) setError('');
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
                borderColor: '#E5E7EB',
                marginTop: 12,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#8B5CF6' }}>
                Back to sign in
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
});
