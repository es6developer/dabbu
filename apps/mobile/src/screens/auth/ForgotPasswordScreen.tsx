import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';
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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  async function handleSendOtp() {
    if (!email.trim()) { setError('Please enter your email address'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/send-otp', { email: email.trim(), purpose: 'password_reset' });
      showToast('OTP sent successfully');
      navigation.navigate('ResetPassword', { email: email.trim() });
    } catch (e: any) { setError(e.message || 'Failed to send reset code'); }
    finally { setLoading(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Animated.View style={{
          flex: 1, paddingTop: insets.top + spacing.xl,
          paddingHorizontal: spacing['2xl'], paddingBottom: insets.bottom + spacing.xl,
          opacity: fadeAnim, transform: [{ translateY: slideAnim }],
        }}>
          {/* Back */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={{
            width: 40, height: 40, borderRadius: borderRadius['2xl'],
            backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center',
            marginBottom: spacing['3xl'], alignSelf: 'center',
          }}>
            <AntDesign name="arrowleft" size={20} color={colors.text.primary} />
          </TouchableOpacity>

          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.3, marginBottom: spacing.sm, textAlign: 'center' }}>
            Reset password
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '400', color: colors.text.secondary, lineHeight: 22, marginBottom: spacing['4xl'], textAlign: 'center' }}>
            Enter your email address and we'll send you a verification code.
          </Text>

          {/* Error */}
          {error ? (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md,
              borderRadius: borderRadius['2xl'], backgroundColor: colors.status.errorLight, marginBottom: spacing.lg,
            }}>
              <AntDesign name="exclamationcircle" size={14} color={colors.status.error} />
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.status.error, flex: 1 }}>{error}</Text>
            </View>
          ) : null}

          {/* Email Input */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: colors.bg.secondary, borderRadius: borderRadius['2xl'],
            borderWidth: 1.5, borderColor: emailFocused ? colors.accent.primary : colors.border.default,
            paddingHorizontal: spacing.lg, height: 54, marginBottom: spacing['2xl'],
          }}>
            <AntDesign name="mail" size={16} color={emailFocused ? colors.accent.primary : colors.text.tertiary} style={{ marginRight: spacing.sm }} />
            <TextInput
              style={{ flex: 1, fontSize: 16, fontWeight: '400', color: colors.text.primary }}
              placeholder="Email address" placeholderTextColor={colors.text.tertiary}
              value={email} onChangeText={(t) => { setEmail(t); if (error) setError(''); }}
              onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              returnKeyType="go" onSubmitEditing={handleSendOtp}
            />
          </View>

          {/* Send Code */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSendOtp}
            disabled={loading}
            style={{
              height: 54, borderRadius: borderRadius['2xl'], backgroundColor: colors.accent.primary,
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm,
              opacity: loading ? 0.6 : 1, ...shadows.md,
            }}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '600' }}>Send Verification Code</Text>}
          </TouchableOpacity>

          {/* Back to sign in */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={{ paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md }}
          >
            <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text.secondary }}>Back to sign in</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
