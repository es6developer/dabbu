import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

export function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
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
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <LinearGradient
          colors={
            isDark ? [colors.bg.secondary, colors.bg.primary] : ['#f8f4f0', colors.bg.primary]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.container}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text.primary }]}>Reset password</Text>
          <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
            Enter your email and we'll send you a reset link
          </Text>
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.status.errorLight }]}>
              <Ionicons name="alert-circle" size={16} color={colors.status.error} />
              <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
            </View>
          ) : null}
          {sent ? (
            <View style={[styles.sentBox, { backgroundColor: colors.status.successLight }]}>
              <Ionicons name="checkmark-circle" size={40} color={colors.status.success} />
              <Text style={[styles.sentText, { color: colors.status.success }]}>
                Check your email for the reset link
              </Text>
            </View>
          ) : (
            <>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bg.tertiary,
                    color: colors.text.primary,
                    borderColor: colors.border.subtle,
                  },
                ]}
                placeholder="Email"
                placeholderTextColor={colors.text.tertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: colors.accent.primary },
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleReset}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  back: { marginBottom: 24, width: 40 },
  title: { fontSize: 32, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 40 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { fontSize: 13, flex: 1 },
  input: { fontSize: 16, padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1 },
  button: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 24 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  sentBox: { padding: 24, borderRadius: 16, alignItems: 'center', gap: 12 },
  sentText: { fontSize: 16, textAlign: 'center' },
});
