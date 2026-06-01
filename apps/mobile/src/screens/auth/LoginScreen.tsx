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
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
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
            <View style={[styles.backCircle, { backgroundColor: colors.bg.tertiary }]}>
              <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.brand}>
            <View style={[styles.logo, { backgroundColor: `${colors.accent.primary}18` }]}>
              <Ionicons name="wallet" size={30} color={colors.accent.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
              Sign in to manage your finances
            </Text>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: `${colors.status.error}12` }]}>
              <Ionicons name="alert-circle" size={16} color={colors.status.error} />
              <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
            </View>
          ) : null}

          <View
            style={[
              styles.formCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
                borderColor: colors.border.subtle,
              },
            ]}
          >
            <View
              style={[
                styles.inputGroup,
                { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={colors.text.tertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                placeholder="Email"
                placeholderTextColor={colors.text.tertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View
              style={[
                styles.inputGroup,
                { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={colors.text.tertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                placeholder="Password"
                placeholderTextColor={colors.text.tertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eye}>
                <Ionicons
                  name={showPw ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.text.tertiary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={[styles.forgot, { color: colors.accent.primary }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.accent.primary },
                loading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonInner}>
                  <Text style={styles.buttonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.guestButton, { borderColor: colors.border.subtle }]}
            onPress={async () => {
              setEmail('demo@dabbu.app');
              setPassword('TestPass123!');
              await new Promise((r) => setTimeout(r, 100));
              handleLogin();
            }}
          >
            <Ionicons name="person-outline" size={18} color={colors.accent.primary} />
            <Text style={[styles.guestText, { color: colors.accent.primary }]}>
              Continue as Guest (Demo)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Signup')}>
            <Text style={[styles.linkText, { color: colors.text.tertiary }]}>
              Don't have an account?{' '}
            </Text>
            <Text style={[styles.linkBold, { color: colors.accent.primary }]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  back: { marginBottom: 28 },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { alignItems: 'center', marginBottom: 36 },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, textAlign: 'center' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { fontSize: 13, flex: 1 },
  formCard: { borderRadius: 24, borderWidth: 1, padding: 20, marginBottom: 24 },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, paddingVertical: 15 },
  eye: { padding: 4 },
  forgot: { textAlign: 'right', marginBottom: 22, fontSize: 13, fontWeight: '500' },
  button: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  guestText: { fontSize: 14, fontWeight: '600' },
  linkRow: { flexDirection: 'row', justifyContent: 'center' },
  linkText: { fontSize: 14 },
  linkBold: { fontSize: 14, fontWeight: '600' },
});
