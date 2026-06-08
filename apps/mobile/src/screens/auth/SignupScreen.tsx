import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';
import { useGoogleAuth, getGoogleIdToken } from '../../services/google-auth';

export function SignupScreen() {
  const navigation = useNavigation<any>();
  const { register, googleLogin } = useAuth();
  const { colors, isDark } = useTheme();
  const { response, promptAsync } = useGoogleAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('referralCode').then((code) => {
      if (code) {
        setReferralCode(code);
        AsyncStorage.removeItem('referralCode');
      }
    });
  }, []);

  useEffect(() => {
    if (response) {
      const idToken = getGoogleIdToken(response);
      if (idToken) {
        handleGoogleSignup(idToken);
      } else if (response.type === 'error') {
        setError('Google sign-in was cancelled or failed');
        setLoading(false);
      }
    }
  }, [response]);

  async function handleGoogleSignup(idToken: string) {
    setLoading(true);
    setError('');
    try {
      await googleLogin(idToken);
    } catch (e: any) {
      setError(e.message || 'Google sign-in failed');
      setLoading(false);
    }
  }

  async function handleSignup() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(
        email.trim(),
        password,
        firstName.trim(),
        lastName.trim(),
        referralCode || undefined,
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <View style={StyleSheet.absoluteFill} />
        <View style={styles.container}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <View style={[styles.backCircle, { backgroundColor: colors.bg.tertiary }]}>
              <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.brand}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: colors.text.primary }]}>Create account</Text>
            <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
              Start managing money together with your family and friends
            </Text>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: `${colors.status.error}12` }]}>
              <Ionicons name="alert-circle" size={16} color={colors.status.error} />
              <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.googleBtn,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
            onPress={() => promptAsync()}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={colors.text.primary} />
                <Text style={[styles.googleBtnText, { color: colors.text.primary }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setShowEmailForm(!showEmailForm)}
          >
            <Text style={[styles.toggleText, { color: colors.text.tertiary }]}>
              {showEmailForm ? 'Hide email sign-up' : 'Sign up with email instead'}
            </Text>
          </TouchableOpacity>

          {referralCode && (
            <View style={[styles.referralBadge, { backgroundColor: `${colors.accent.primary}12` }]}>
              <Ionicons name="gift" size={14} color={colors.accent.primary} />
              <Text style={[styles.referralBadgeText, { color: colors.accent.primary }]}>
                Referral code applied: {referralCode}
              </Text>
            </View>
          )}

          {showEmailForm && (
            <View
              style={[
                styles.formCard,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
                  borderColor: colors.border.subtle,
                },
              ]}
            >
              <View style={styles.row}>
                <TextInput
                  style={[
                    styles.input,
                    styles.half,
                    {
                      backgroundColor: colors.bg.tertiary,
                      color: colors.text.primary,
                      borderColor: colors.border.subtle,
                    },
                  ]}
                  placeholder="First name"
                  placeholderTextColor={colors.text.tertiary}
                  value={firstName}
                  onChangeText={setFirstName}
                />
                <TextInput
                  style={[
                    styles.input,
                    styles.half,
                    {
                      backgroundColor: colors.bg.tertiary,
                      color: colors.text.primary,
                      borderColor: colors.border.subtle,
                    },
                  ]}
                  placeholder="Last name"
                  placeholderTextColor={colors.text.tertiary}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
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

              <View
                style={[
                  styles.inputGroup,
                  { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                ]}
              >
                <TextInput
                  style={[styles.pwInput, { color: colors.text.primary }]}
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

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: colors.accent.primary },
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleSignup}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.linkText, { color: colors.text.tertiary }]}>
              Already have an account?{' '}
            </Text>
            <Text style={[styles.linkBold, { color: colors.accent.primary }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  back: { marginBottom: 20 },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { alignItems: 'center', marginBottom: 24 },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 28 },
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
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  input: { fontSize: 15, padding: 15, borderRadius: 14, marginBottom: 14, borderWidth: 1 },
  half: { width: '48%' },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  pwInput: { flex: 1, fontSize: 15, paddingVertical: 15 },
  eye: { padding: 4 },
  button: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  linkText: { fontSize: 14 },
  linkBold: { fontSize: 14, fontWeight: '600' },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  googleBtnText: { fontSize: 16, fontWeight: '600' },
  toggleRow: { alignItems: 'center', marginBottom: 24 },
  toggleText: { fontSize: 13, fontWeight: '500' },
  referralBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  referralBadgeText: { fontSize: 13, fontWeight: '600' },
});
