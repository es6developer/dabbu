import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { accessToken, user, logout } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.get<any>('/users/profile');
      const data = res?.data || res;
      if (data) {
        if (data.firstName) {
          setFirstName(data.firstName);
        }
        if (data.lastName !== undefined) {
          setLastName(data.lastName || '');
        }
        if (data.phone) {
          setPhone(data.phone.replace(/^\+91/, ''));
        }
        if (data.email) {
          setEmail(data.email);
        }
      }
    } catch {
      if (user?.phone) {
        setPhone(user.phone.replace(/^\+91/, ''));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }
    setError('');
    setSaving(true);
    if (accessToken) {
      setAccessToken(accessToken);
    }
    try {
      const cleanedPhone = phone.trim().replace(/[^0-9]/g, '');
      const fullPhone = cleanedPhone.startsWith('91') ? `+${cleanedPhone}` : `+91${cleanedPhone}`;
      await api.patch('/users/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: fullPhone,
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

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('') || 'U';
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 120,
            paddingTop: insets.top + 16,
          }}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.backBtn, { backgroundColor: colors.bg.tertiary }]}
            >
              <Ionicons name="arrow-back" size={22} color={colors.accent.primary} />
            </TouchableOpacity>
            <Text style={[styles.pageTitle, { color: colors.text.primary }]}>Edit Profile</Text>
            <View style={{ width: 36 }} />
          </View>

          {loading ? (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="large" color={colors.accent.primary} />
            </View>
          ) : (
            <>
              <View style={styles.avatarSection}>
                <View style={styles.avatarOuter}>
                  <View
                    style={[styles.avatarBg, { backgroundColor: `${colors.accent.primary}18` }]}
                  >
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.editAvatarBtn, { backgroundColor: colors.accent.primary }]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.avatarName, { color: colors.text.primary }]}>{fullName}</Text>
                <Text style={[styles.avatarEmail, { color: colors.text.tertiary }]}>
                  {email || user?.email || ''}
                </Text>
              </View>

              <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
                <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
                  Personal Information
                </Text>

                {error ? (
                  <View style={[styles.errorBox, { backgroundColor: colors.status.errorLight }]}>
                    <Ionicons name="alert-circle" size={16} color={colors.status.error} />
                    <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
                  </View>
                ) : null}

                <Text style={[styles.label, { color: colors.text.tertiary }]}>First Name</Text>
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
                  placeholder="Enter your first name"
                  placeholderTextColor={colors.text.tertiary}
                />

                <Text style={[styles.label, { color: colors.text.tertiary }]}>Last Name</Text>
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
                  placeholder="Enter your last name"
                  placeholderTextColor={colors.text.tertiary}
                />

                <Text style={[styles.label, { color: colors.text.tertiary }]}>Email</Text>
                <View
                  style={[
                    styles.input,
                    styles.inputDisabled,
                    { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                  ]}
                >
                  <Text style={[styles.inputText, { color: colors.text.tertiary }]}>
                    {email || user?.email || 'No email'}
                  </Text>
                </View>

                <Text style={[styles.label, { color: colors.text.tertiary }]}>Phone Number</Text>
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
                  placeholder="Required — helps friends find you"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="phone-pad"
                />
                <Text style={[styles.helper, { color: colors.text.tertiary }]}>
                  Friends can find you via contact sync. Your number is never shared.
                </Text>
              </View>

              <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
                <View style={styles.dangerHeader}>
                  <Ionicons name="warning-outline" size={18} color={colors.status.error} />
                  <Text style={[styles.dangerTitle, { color: colors.status.error }]}>
                    Danger Zone
                  </Text>
                </View>
                <Text style={[styles.dangerDesc, { color: colors.text.tertiary }]}>
                  Once you delete your account, there is no going back. Please be certain.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.deleteBtn,
                    {
                      borderColor: `${colors.status.error}30`,
                      backgroundColor: `${colors.status.error}08`,
                    },
                  ]}
                  onPress={handleDeleteAccount}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.status.error} />
                  <Text style={styles.deleteBtnText}>Delete Account</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>

        <View
          style={[
            styles.saveContainer,
            { backgroundColor: colors.bg.primary, paddingBottom: insets.bottom + 20 },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: colors.accent.primary },
              (saving || loading) && { opacity: 0.6 },
            ]}
            onPress={handleSaveProfile}
            disabled={saving || loading}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: { fontSize: 20, fontWeight: '700' },
  loadingSection: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarOuter: { position: 'relative', marginBottom: 12 },
  avatarBg: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 36, fontWeight: '800' },
  editAvatarBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarName: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  avatarEmail: { fontSize: 13, fontWeight: '500' },
  card: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
  },
  inputDisabled: {
    justifyContent: 'center',
  },
  inputText: { fontSize: 16, fontWeight: '500' },
  helper: { fontSize: 11, fontWeight: '500', marginTop: 6, lineHeight: 16 },
  dangerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dangerTitle: { fontSize: 15, fontWeight: '700' },
  dangerDesc: { fontSize: 13, fontWeight: '500', lineHeight: 19, marginBottom: 16 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '700', color: '#FF4545' },
  saveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  saveBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
