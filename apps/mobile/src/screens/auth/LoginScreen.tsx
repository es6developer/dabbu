import React, { useState, useEffect } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useGoogleAuth, getGoogleIdToken } from '../../services/google-auth';

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const { googleLogin } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { request, response, promptAsync } = useGoogleAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (response) {
      const idToken = getGoogleIdToken(response);
      if (idToken) {
        handleGoogleLogin(idToken);
      } else if (response.type === 'error') {
        setError('Google sign-in was cancelled or failed');
        setLoading(false);
      }
    }
  }, [response]);

  async function handleGoogleLogin(idToken: string) {
    setLoading(true);
    setError('');
    try {
      await googleLogin(idToken);
    } catch (e: any) {
      setError(e.message || 'Google sign-in failed');
      setLoading(false);
    }
  }

  async function handleGooglePress() {
    setError('');
    setLoading(true);
    try {
      await promptAsync();
    } catch (e: any) {
      setError(e.message || 'Failed to open Google Sign-In');
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.bg.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.brandName, { color: colors.text.primary }]}>Dabbu</Text>
          <Text style={[styles.tagline, { color: colors.text.tertiary }]}>
            Smart family finance, together
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={[styles.welcome, { color: colors.text.primary }]}>Welcome</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Sign in to manage expenses, track goals, and share finances with people who matter.
          </Text>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.status.errorLight }]}>
              <Ionicons name="alert-circle" size={16} color={colors.status.error} />
              <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.googleBtn, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}
            onPress={handleGooglePress}
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
            style={styles.emailToggle}
            onPress={() => setShowEmail(!showEmail)}
          >
            <Text style={[styles.emailToggleText, { color: colors.text.tertiary }]}>
              {showEmail ? 'Hide email login' : 'Sign in with email instead'}
            </Text>
          </TouchableOpacity>

          {showEmail && (
            <View style={styles.emailSection}>
              <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={colors.text.tertiary}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <View style={[styles.inputRow, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}>
                <TextInput
                  style={[styles.inputFlex, { color: colors.text.primary }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={colors.text.tertiary}
                  secureTextEntry={!showPw}
                />
                <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.text.tertiary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.emailSubmit, { backgroundColor: colors.accent.primary }]}
                onPress={async () => {
                  if (!email.trim() || !password.trim()) {
                    setError('Please enter email and password');
                    return;
                  }
                  setLoading(true);
                  setError('');
                  try {
                    const { login } = useAuth();
                    await login(email.trim(), password);
                  } catch (e: any) {
                    setError(e.message);
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                <Text style={styles.emailSubmitText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={[styles.forgotText, { color: colors.accent.primary }]}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.signupRow} onPress={() => navigation.navigate('Signup')}>
            <Text style={[styles.signupText, { color: colors.text.tertiary }]}>
              New to Dabbu?{' '}
            </Text>
            <Text style={[styles.signupLink, { color: colors.accent.primary }]}>Create account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  brand: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 64, height: 64, marginBottom: 12 },
  brandName: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  card: { backgroundColor: 'transparent' },
  welcome: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 24 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, marginBottom: 16,
  },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12,
  },
  googleBtnText: { fontSize: 15, fontWeight: '700' },
  emailToggle: { alignItems: 'center', paddingVertical: 8, marginBottom: 8 },
  emailToggleText: { fontSize: 13, fontWeight: '600' },
  emailSection: { gap: 12, marginBottom: 8 },
  divider: { height: 1, marginVertical: 4 },
  input: { fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingRight: 8 },
  inputFlex: { flex: 1, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
  eyeBtn: { padding: 6 },
  emailSubmit: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  emailSubmitText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  forgotText: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  signupText: { fontSize: 14, fontWeight: '600' },
  signupLink: { fontSize: 14, fontWeight: '800' },
});
