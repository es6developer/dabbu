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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';

export function PhoneScreen() {
  const { user, updatePhone } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');

  const validatePhone = (v: string) => {
    const digits = v.replace(/[^0-9+]/g, '');
    if (v.length > 0 && digits.length < 8) {
      setFieldError('Please enter a valid phone number (min 8 digits)');
    } else {
      setFieldError('');
    }
  };

  async function handleSave() {
    const digits = phone.replace(/[^0-9+]/g, '');
    if (digits.length < 8) {
      setError('Please enter a valid phone number');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updatePhone(digits);
    } catch (e: any) {
      const msg = e?.message || '';
      const knownErrors: Record<string, string> = {
        'phone must be a valid phone number': 'Please enter a valid phone number with country code',
        'phone already in use': 'This phone number is already linked to another account',
        'phone is required': 'Phone number is required',
      };
      const matched = Object.keys(knownErrors).find((k) => msg.toLowerCase().includes(k.toLowerCase()));
      setError(matched ? knownErrors[matched] : msg || 'Failed to save phone number');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.inner, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.center}>
            <Image
              source={require('../../../assets/logo.png')}
              style={[styles.logo, { tintColor: colors.brand.primary }]}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Verify your phone number
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
              Your friends will use this to find you on Dabbu
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
              styles.card,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
                borderColor: colors.border.subtle,
              },
            ]}
          >
            <Text style={[styles.label, { color: colors.text.secondary }]}>Phone number *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bg.tertiary,
                  color: colors.text.primary,
                  borderColor: fieldError ? colors.status.error : colors.border.subtle,
                },
              ]}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor={colors.text.tertiary}
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                setError('');
                validatePhone(t);
              }}
              keyboardType="phone-pad"
              autoFocus
            />
            {fieldError ? (
              <Text style={{ fontSize: 12, color: colors.status.error, marginTop: -12, marginBottom: 12 }}>
                {fieldError}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: colors.accent.primary },
                saving && { opacity: 0.6 },
              ]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.saveBtnText, { color: colors.text.primary }]}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24 },
  center: { alignItems: 'center', marginBottom: 24, marginTop: 40 },
  logo: { width: 72, height: 72, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
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
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { fontSize: 16, padding: 16, borderRadius: 14, marginBottom: 16, borderWidth: 1 },
  saveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
});
