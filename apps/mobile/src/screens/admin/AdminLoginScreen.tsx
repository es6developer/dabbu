import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Animated,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '../../config/api';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';

export function AdminLoginScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter email and password'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/admin/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json?.message || 'Login failed'); return; }
      navigation.replace('AdminDashboard', { token: json.data.accessToken });
    } catch { setError('Network error. Check your connection.'); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg.primary }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, paddingHorizontal: spacing['2xl'], justifyContent: 'center', paddingTop: insets.top }}>
        <View style={{ alignItems: 'center', marginBottom: spacing['4xl'] }}>
          <View style={{ width: 72, height: 72, borderRadius: borderRadius['3xl'], backgroundColor: `${colors.accent.primary}15`, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl }}>
            <AntDesign name="Safety" size={30} color={colors.accent.primary} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.3 }}>Admin Login</Text>
          <Text style={{ fontSize: 14, color: colors.text.secondary, marginTop: spacing.sm }}>Sign in to manage your app</Text>
        </View>

        <View style={{ gap: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.secondary, borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: spacing.lg, height: 54 }}>
            <AntDesign name="mail" size={16} color={colors.text.tertiary} style={{ marginRight: spacing.sm }} />
            <TextInput style={{ flex: 1, fontSize: 16, color: colors.text.primary }} placeholder="Admin email" placeholderTextColor={colors.text.tertiary} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.secondary, borderRadius: borderRadius['2xl'], borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: spacing.lg, height: 54 }}>
            <AntDesign name="lock" size={16} color={colors.text.tertiary} style={{ marginRight: spacing.sm }} />
            <TextInput style={{ flex: 1, fontSize: 16, color: colors.text.primary }} placeholder="Password" placeholderTextColor={colors.text.tertiary} value={password} onChangeText={setPassword} secureTextEntry />
          </View>
          {error ? <Text style={{ color: colors.status.error, fontSize: 13, textAlign: 'center' }}>{error}</Text> : null}
          <TouchableOpacity style={{ height: 54, borderRadius: borderRadius['2xl'], backgroundColor: colors.accent.primary, justifyContent: 'center', alignItems: 'center' }} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '600' }}>Sign In</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
