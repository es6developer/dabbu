import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

export function ProfileScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { accessToken, user, logout } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  async function handleSaveProfile() {
    if (!firstName.trim()) { setError('First name is required'); return; }
    setError('');
    setSaving(true);
    if (accessToken) setAccessToken(accessToken);
    try {
      await api.patch('/auth/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
      });
      Alert.alert('Success', 'Profile updated successfully');
    } catch (e: any) {
      setError(e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword) { setPasswordError('Current password is required'); return; }
    if (!newPassword || newPassword.length < 6) { setPasswordError('New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return; }
    setPasswordError('');
    setChangingPassword(true);
    if (accessToken) setAccessToken(accessToken);
    try {
      await api.patch('/auth/profile', {
        currentPassword,
        newPassword,
      });
      Alert.alert('Success', 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setPasswordError(e.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This action is irreversible. All your data will be permanently deleted. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          Alert.alert(
            'Confirm Deletion',
            'Type DELETE to confirm',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'DELETE', style: 'destructive', onPress: async () => {
                try {
                  if (accessToken) setAccessToken(accessToken);
                  await api.delete('/auth/profile');
                  await logout();
                } catch (e: any) {
                  Alert.alert('Error', e.message || 'Failed to delete account');
                }
              }},
            ]
          );
        }},
      ]
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]} contentContainerStyle={{ ...styles.content, paddingTop: insets.top + 20 }} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: colors.text.primary }]}>Profile</Text>

      <View style={[styles.card, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Personal Information</Text>
        {error ? <View style={[styles.errorBox, { backgroundColor: `${colors.status.error}18` }]}><Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text></View> : null}

        <Text style={[styles.label, { color: colors.text.secondary }]}>First Name</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor={colors.text.tertiary} />

        <Text style={[styles.label, { color: colors.text.secondary }]}>Last Name</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor={colors.text.tertiary} />

        <Text style={[styles.label, { color: colors.text.secondary }]}>Email</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.tertiary, borderColor: colors.border.subtle }, { opacity: 0.5 }]} value={user?.email || ''} editable={false} />

        <Text style={[styles.label, { color: colors.text.secondary }]}>Phone</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]} value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor={colors.text.tertiary} keyboardType="phone-pad" />

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent.primary }, saving && { opacity: 0.6 }]} onPress={handleSaveProfile} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Change Password</Text>
        {passwordError ? <View style={[styles.errorBox, { backgroundColor: `${colors.status.error}18` }]}><Text style={[styles.errorText, { color: colors.status.error }]}>{passwordError}</Text></View> : null}

        <Text style={[styles.label, { color: colors.text.secondary }]}>Current Password</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" placeholderTextColor={colors.text.tertiary} secureTextEntry />

        <Text style={[styles.label, { color: colors.text.secondary }]}>New Password</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]} value={newPassword} onChangeText={setNewPassword} placeholder="New password (min 6 chars)" placeholderTextColor={colors.text.tertiary} secureTextEntry />

        <Text style={[styles.label, { color: colors.text.secondary }]}>Confirm New Password</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" placeholderTextColor={colors.text.tertiary} secureTextEntry />

        <TouchableOpacity style={[styles.passwordBtn, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }, changingPassword && { opacity: 0.6 }]} onPress={handleChangePassword} disabled={changingPassword}>
          {changingPassword ? <ActivityIndicator color={colors.text.primary} /> : <Text style={[styles.passwordBtnText, { color: colors.text.primary }]}>Update Password</Text>}
        </TouchableOpacity>
      </View>

      <View style={[styles.dangerSection, { backgroundColor: `${colors.status.error}10`, borderColor: `${colors.status.error}30` }]}>
        <Text style={[styles.dangerTitle, { color: colors.status.error }]}>Danger Zone</Text>
        <Text style={[styles.dangerDesc, { color: colors.text.tertiary }]}>Once you delete your account, there is no going back.</Text>
        <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: `${colors.status.error}30`, borderColor: colors.status.error }]} onPress={handleDeleteAccount}>
          <Text style={[styles.deleteBtnText, { color: colors.status.error }]}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  card: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16, paddingBottom: 12 },
  errorBox: { padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { fontSize: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { fontSize: 16, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  saveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  passwordBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 24, borderWidth: 1 },
  passwordBtnText: { fontSize: 16, fontWeight: '600' },
  dangerSection: { padding: 20, borderRadius: 16, borderWidth: 1 },
  dangerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  dangerDesc: { fontSize: 13, marginBottom: 16 },
  deleteBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  deleteBtnText: { fontSize: 15, fontWeight: '600' },
});
