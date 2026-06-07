import React, { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
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
          contentContainerStyle={{ paddingBottom: 120, paddingTop: insets.top + 16 }}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#6C3EF4" />
            </TouchableOpacity>
            <Text style={[styles.pageTitle, { color: colors.text.primary }]}>Edit Profile</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.avatarSection}>
            <View style={styles.avatarOuter}>
              <LinearGradient
                colors={['#6C3EF4', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>
              <TouchableOpacity style={styles.editAvatarBtn} activeOpacity={0.8}>
                <View style={styles.editAvatarInner}>
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </View>
            <Text style={[styles.avatarName, { color: colors.text.primary }]}>{fullName}</Text>
            <Text style={[styles.avatarEmail, { color: colors.text.tertiary }]}>
              {user?.email || ''}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>
              Personal Information
            </Text>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: '#FF4D4F10' }]}>
                <Ionicons name="alert-circle" size={16} color="#FF4D4F" />
                <Text style={[styles.errorText, { color: '#FF4D4F' }]}>{error}</Text>
              </View>
            ) : null}

            <Text style={[styles.label, { color: colors.text.secondary }]}>First Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F5F0FF', color: colors.text.primary }]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter your first name"
              placeholderTextColor={colors.text.tertiary}
            />

            <Text style={[styles.label, { color: colors.text.secondary }]}>Last Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F5F0FF', color: colors.text.primary }]}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter your last name"
              placeholderTextColor={colors.text.tertiary}
            />

            <Text style={[styles.label, { color: colors.text.secondary }]}>Email</Text>
            <View style={[styles.input, styles.inputDisabled, { backgroundColor: '#F0F0F0' }]}>
              <Text style={[styles.inputText, { color: colors.text.tertiary }]}>
                {user?.email || 'No email'}
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.text.secondary }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#F5F0FF', color: colors.text.primary }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="Required - helps friends find you"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="phone-pad"
            />
            <Text style={[styles.helper, { color: colors.text.tertiary }]}>
              Friends can find you via contact sync. Your number is never shared.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
            <View style={styles.dangerHeader}>
              <Ionicons name="warning-outline" size={18} color="#FF4D4F" />
              <Text style={[styles.dangerTitle, { color: '#FF4D4F' }]}>Danger Zone</Text>
            </View>
            <Text style={[styles.dangerDesc, { color: colors.text.tertiary }]}>
              Once you delete your account, there is no going back. Please be certain.
            </Text>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color="#FF4D4F" />
              <Text style={styles.deleteBtnText}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={[styles.saveContainer, { backgroundColor: colors.bg.primary }]}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSaveProfile}
            disabled={saving}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#6C3EF4', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.saveBtnGrad}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
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
    backgroundColor: '#F5F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: { fontSize: 20, fontWeight: '700' },

  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarOuter: { position: 'relative', marginBottom: 12 },
  avatarGradient: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C3EF4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarText: { color: '#FFFFFF', fontSize: 36, fontWeight: '800' },
  editAvatarBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6C3EF4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C3EF4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  editAvatarInner: {
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
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
    borderColor: '#FF4D4F30',
    backgroundColor: '#FF4D4F08',
  },
  deleteBtnText: { fontSize: 14, fontWeight: '700', color: '#FF4D4F' },

  saveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
  },
  saveBtn: { borderRadius: 16, overflow: 'hidden' },
  saveBtnGrad: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
