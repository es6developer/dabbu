import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { API_URL } from '../../config/api';
import { getAccessToken } from '../../services/api';
import {
  FormField,
  FormAvatar,
  FormFooter,
  FormError,
} from '../../components/forms';

export function ProfileSetupScreen() {
  const { user, completeProfileSetup } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const token = getAccessToken();
      const body: Record<string, any> = {};
      if (firstName.trim()) body.firstName = firstName.trim();
      if (lastName.trim()) body.lastName = lastName.trim();
      if (phone.trim()) body.phone = phone.replace(/[^0-9]/g, '');
      const res = await fetch(`${API_URL}/users/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(Array.isArray(err?.message) ? err?.message[0] : err?.message || 'Failed to save profile');
      }
      const profileResult = await res.json().catch(() => ({}));
      const updatedUser = profileResult?.data || profileResult;
      completeProfileSetup(updatedUser);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <View style={{ paddingTop: insets.top, flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }} keyboardShouldPersistTaps="handled">
            <View style={styles.brand}>
              <FormAvatar name={`${firstName} ${lastName}`} size={80} editable />
              <Text style={[styles.title, { color: colors.text.primary }]}>Complete your profile</Text>
              <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
                Add your phone number so friends can find you on Dabbu
              </Text>
            </View>

            <FormError message={error} />

            <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="First Name"
                    icon="user"
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="First name"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Last Name"
                    icon="user"
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Last name"
                  />
                </View>
              </View>
              <FormField
                label="Phone Number"
                icon="phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="9876543210"
                keyboardType="phone-pad"
              />
            </View>
          </ScrollView>

          <View style={{ paddingBottom: insets.bottom + 16, paddingHorizontal: 20, paddingTop: 12 }}>
            <FormFooter title="Continue" icon="arrow-forward" loading={saving} onPress={handleSave} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  brand: { alignItems: 'center', marginBottom: 32, gap: 12 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 24, gap: 4 },
});
