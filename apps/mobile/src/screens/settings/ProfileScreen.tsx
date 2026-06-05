import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme, typography as typographyStyles } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

export function ProfileScreen() {
  const { colors, typography } = useTheme();
  const { accessToken, user, logout } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSaveProfile() {
    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }
    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }
    setError('');
    setSaving(true);
    if (accessToken) {
      setAccessToken(accessToken);
    }
    try {
      await api.patch('/users/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });
      Alert.alert('Success', 'Profile updated successfully');
    } catch (e: any) {
      setError(e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This action is irreversible. All your data will be permanently deleted. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Confirm Deletion', 'Type DELETE to confirm', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'DELETE',
                style: 'destructive',
                onPress: async () => {
                  try {
                    if (accessToken) {
                      setAccessToken(accessToken);
                    }
                    await api.delete('/auth/profile');
                    await logout();
                  } catch (e: any) {
                    Alert.alert('Error', e.message || 'Failed to delete account');
                  }
                },
              },
            ]);
          },
        },
      ],
    );
  }

  return (
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <View style={styles.container}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Profile</Text>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Personal Information
            </Text>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: `${colors.status.error}18` }]}>
                <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
              </View>
            ) : null}

            <Text style={[styles.label, { color: colors.text.secondary }]}>First Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bg.tertiary,
                  color: colors.text.primary,
                  borderColor: colors.border.subtle,
                },
              ]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={colors.text.tertiary}
            />

            <Text style={[styles.label, { color: colors.text.secondary }]}>Last Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bg.tertiary,
                  color: colors.text.primary,
                  borderColor: colors.border.subtle,
                },
              ]}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={colors.text.tertiary}
            />

            <Text style={[styles.label, { color: colors.text.secondary }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bg.tertiary,
                  color: colors.text.tertiary,
                  borderColor: colors.border.subtle,
                },
                { opacity: 0.5 },
              ]}
              value={user?.email || ''}
              editable={false}
            />

            <Text style={[styles.label, { color: colors.text.secondary }]}>Phone number</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bg.tertiary,
                  color: colors.text.primary,
                  borderColor: colors.border.subtle,
                },
              ]}
              value={phone}
              onChangeText={setPhone}
              placeholder="Required - helps friends find you"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="phone-pad"
            />
            <Text style={[styles.helper, { color: colors.text.tertiary }]}>
              Friends can find you via contact sync. Your number is never shared.
            </Text>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: colors.accent.primary },
                saving && { opacity: 0.6 },
              ]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.dangerSection,
              {
                backgroundColor: `${colors.status.error}10`,
                borderColor: `${colors.status.error}30`,
              },
            ]}
          >
            <Text style={[styles.dangerTitle, { color: colors.status.error }]}>Danger Zone</Text>
            <Text style={[styles.dangerDesc, { color: colors.text.tertiary }]}>
              Once you delete your account, there is no going back.
            </Text>
            <TouchableOpacity
              style={[
                styles.deleteBtn,
                { backgroundColor: `${colors.status.error}30`, borderColor: colors.status.error },
              ]}
              onPress={handleDeleteAccount}
            >
              <Text style={[styles.deleteBtnText, { color: colors.status.error }]}>
                Delete Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  title: { ...typographyStyles.appTitle, marginBottom: 24 },
  card: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 20 },
  sectionTitle: { ...typographyStyles.cardTitle, marginBottom: 16, paddingBottom: 12 },
  errorBox: { padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { ...typographyStyles.body },
  label: {
    ...typographyStyles.subhead,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  saveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: {
    color: '#FFFFFF',
    ...typographyStyles.body,
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
  },
  helper: { fontSize: 11, fontWeight: '500', marginTop: 4, marginBottom: 4, lineHeight: 16 },
  dangerSection: { padding: 20, borderRadius: 16, borderWidth: 1 },
  dangerTitle: { ...typographyStyles.cardTitle, fontFamily: 'Inter-Bold', marginBottom: 8 },
  dangerDesc: { ...typographyStyles.subhead, marginBottom: 16 },
  deleteBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  deleteBtnText: { ...typographyStyles.body, fontFamily: 'Inter-SemiBold' },
});
