import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import {
  PremiumActionButton,
  PremiumError,
  PremiumFormScreen,
  PremiumInput,
} from '../../components/ui';

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  async function handleLogin(nextEmail = email, nextPassword = password) {
    if (!nextEmail.trim() || !nextPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(nextEmail.trim(), nextPassword);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    const demoEmail = 'demo@dabbu.app';
    const demoPassword = 'TestPass123!';
    setEmail(demoEmail);
    setPassword(demoPassword);
    await handleLogin(demoEmail, demoPassword);
  }

  return (
    <PremiumFormScreen
      title="Welcome back"
      subtitle="Sign in to manage money, groups, reminders, and shared expenses with confidence."
      icon="wallet"
      closeIcon="arrow-back"
      accent={[colors.accent.primary, isDark ? '#B45309' : '#F97316']}
      footer={
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.demoButton, { borderColor: colors.border.subtle }]}
            onPress={handleDemoLogin}
            activeOpacity={0.75}
          >
            <Ionicons name="sparkles-outline" size={17} color={colors.accent.primary} />
            <Text style={[styles.demoText, { color: colors.accent.primary }]}>
              Continue with demo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Signup')}>
            <Text style={[styles.linkText, { color: colors.text.tertiary }]}>
              New to Dabbu?{' '}
            </Text>
            <Text style={[styles.linkBold, { color: colors.accent.primary }]}>Create account</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.brandMark}>
        <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      </View>
      <PremiumError message={error} />
      <PremiumInput
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <PremiumInput
        label="Password"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        placeholder="Enter password"
        secureTextEntry={!showPw}
        right={
          <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeButton}>
            <Ionicons
              name={showPw ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.text.tertiary}
            />
          </TouchableOpacity>
        }
      />
      <TouchableOpacity
        onPress={() => navigation.navigate('ForgotPassword')}
        style={styles.forgotButton}
      >
        <Text style={[styles.forgotText, { color: colors.accent.primary }]}>Forgot password?</Text>
      </TouchableOpacity>
      <PremiumActionButton title="Sign in" onPress={() => handleLogin()} loading={loading} />
    </PremiumFormScreen>
  );
}

const styles = StyleSheet.create({
  brandMark: {
    alignItems: 'center',
    marginTop: -4,
    marginBottom: 4,
  },
  logo: {
    width: 74,
    height: 74,
  },
  eyeButton: {
    padding: 6,
  },
  forgotButton: {
    alignItems: 'flex-end',
    marginTop: -4,
    marginBottom: 12,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '800',
  },
  footer: {
    marginTop: 16,
  },
  demoButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18,
  },
  demoText: {
    fontSize: 14,
    fontWeight: '800',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  linkBold: {
    fontSize: 14,
    fontWeight: '800',
  },
});
