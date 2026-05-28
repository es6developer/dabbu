import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function SignupScreen() {
  const navigation = useNavigation<any>();
  const { register } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  async function handleSignup() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields'); return;
    }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      await register(email.trim(), password, firstName.trim(), lastName.trim());
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top + 16 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient
        colors={isDark ? [colors.bg.secondary, colors.bg.primary] : ['#f8f4f0', colors.bg.primary]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <View style={[styles.backCircle, { backgroundColor: colors.bg.tertiary }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
        </View>
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.text.primary }]}>Create account</Text>
      <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>Start managing your finances</Text>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: `${colors.status.error}12` }]}>
          <Ionicons name="alert-circle" size={16} color={colors.status.error} />
          <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
        </View>
      ) : null}

      <View style={[styles.formCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)', borderColor: colors.border.subtle }]}>
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.half, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]} placeholder="First name" placeholderTextColor={colors.text.tertiary} value={firstName} onChangeText={setFirstName} />
          <TextInput style={[styles.input, styles.half, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]} placeholder="Last name" placeholderTextColor={colors.text.tertiary} value={lastName} onChangeText={setLastName} />
        </View>
        <TextInput style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]} placeholder="Email" placeholderTextColor={colors.text.tertiary} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

        <View style={[styles.inputGroup, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}>
          <TextInput style={[styles.pwInput, { color: colors.text.primary }]} placeholder="Password" placeholderTextColor={colors.text.tertiary} value={password} onChangeText={setPassword} secureTextEntry={!showPw} />
          <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eye}>
            <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent.primary }, loading && styles.buttonDisabled]} onPress={handleSignup} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Login')}>
        <Text style={[styles.linkText, { color: colors.text.tertiary }]}>Already have an account? </Text>
        <Text style={[styles.linkBold, { color: colors.accent.primary }]}>Sign In</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 60 },
  back: { marginBottom: 20 },
  backCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 28 },
  errorBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 16, gap: 8 },
  errorText: { fontSize: 13, flex: 1 },
  formCard: { borderRadius: 24, borderWidth: 1, padding: 20, marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  input: { fontSize: 15, padding: 15, borderRadius: 14, marginBottom: 14, borderWidth: 1 },
  half: { width: '48%' },
  inputGroup: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, marginBottom: 14, borderWidth: 1, paddingHorizontal: 14 },
  pwInput: { flex: 1, fontSize: 15, paddingVertical: 15 },
  eye: { padding: 4 },
  button: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  linkRow: { flexDirection: 'row', justifyContent: 'center' },
  linkText: { fontSize: 14 },
  linkBold: { fontSize: 14, fontWeight: '600' },
});
