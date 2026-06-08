import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { API_URL } from '../../config/api';
import { getAccessToken } from '../../services/api';

export function ProfileSetupScreen() {
  const { user, completeProfileSetup } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }
    const phoneDigits = phone.replace(/[^0-9+]/g, '');
    if (phoneDigits.length < 8) {
      setError('Please enter a valid phone number');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/users/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          phone: phoneDigits,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message?.[0] || err?.message || 'Failed to save profile');
      }

      completeProfileSetup();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <View
        
        
        
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaWrapper insets={insets}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.brand}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={[styles.title, { color: colors.text.primary }]}>
                Complete your profile
              </Text>
              <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
                Add your phone number so friends can find you on Dabbu
              </Text>
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: `${colors.status.error}12` }]}>
                <Ionicons name="alert-circle" size={16} color={colors.status.error} />
                <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
              </View>
            ) : null}

            <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)', borderColor: colors.border.subtle }]}>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.half, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
                  placeholder="First name"
                  placeholderTextColor={colors.text.tertiary}
                  value={firstName}
                  onChangeText={setFirstName}
                />
                <TextInput
                  style={[styles.input, styles.half, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
                  placeholder="Last name"
                  placeholderTextColor={colors.text.tertiary}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>

              <Text style={[styles.label, { color: colors.text.secondary }]}>Phone number *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
                placeholder="+1 (555) 123-4567"
                placeholderTextColor={colors.text.tertiary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.accent.primary }, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaWrapper>
    </View>
  );
}

function SafeAreaWrapper({ insets, children }: { insets: any; children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 72, height: 72, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { fontSize: 13, flex: 1 },
  card: { borderRadius: 24, borderWidth: 1, padding: 20, marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: { fontSize: 15, padding: 15, borderRadius: 14, marginBottom: 14, borderWidth: 1 },
  half: { width: '48%' },
  saveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
