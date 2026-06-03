import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import {
  PremiumActionButton,
  PremiumError,
  PremiumFormScreen,
  PremiumInput,
} from '../../components/ui';

export function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleReset() {
    if (!email.trim()) {
      setError('Enter your email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PremiumFormScreen
      title="Reset password"
      subtitle="We'll send a secure reset link to your inbox so you can get back in quickly."
      icon="key"
      closeIcon="arrow-back"
      accent={[colors.status.info, colors.accent.primary]}
    >
      <PremiumError message={error} />
      {sent ? (
        <View style={[styles.successCard, { backgroundColor: colors.status.successLight }]}>
          <View style={[styles.successIcon, { backgroundColor: colors.status.success }]}>
            <Ionicons name="checkmark" size={26} color="#FFFFFF" />
          </View>
          <Text style={[styles.successTitle, { color: colors.text.primary }]}>Email sent</Text>
          <Text style={[styles.successText, { color: colors.text.secondary }]}>
            If an account exists for {email.trim()}, the reset link is on its way.
          </Text>
          <TouchableOpacity
            style={[styles.backToLogin, { borderColor: colors.border.subtle }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
          >
            <Text style={[styles.backToLoginText, { color: colors.accent.primary }]}>
              Back to sign in
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <PremiumInput
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <PremiumActionButton title="Send reset link" onPress={handleReset} loading={loading} />
        </>
      )}
    </PremiumFormScreen>
  );
}

const styles = StyleSheet.create({
  successCard: {
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  successText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  backToLogin: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  backToLoginText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
