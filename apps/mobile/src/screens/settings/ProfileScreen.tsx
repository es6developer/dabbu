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
import { Avatar } from '../../components/ui/Avatar';
import { PADDING, borderRadius, shadows } from '../../theme/design';

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { accessToken, user, logout } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [upiId, setUpiId] = useState('');
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
        if (data.upiId) {
          setUpiId(data.upiId);
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
        upiId: upiId.trim() || undefined,
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
      'This action is irreversible. All your data will be permanently deleted.',
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

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';
  const tabBarHeight = Platform.OS === 'ios' ? 90 : 80;

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 120 + tabBarHeight,
            paddingTop: insets.top + 16,
          }}
        >
          {/* Header */}
          <View style={{ paddingHorizontal: PADDING, marginBottom: 24 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: `${colors.accent.primary}10`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="chevron-back" size={20} color={colors.accent.primary} />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary }}>
                Edit Profile
              </Text>
              <View style={{ width: 40 }} />
            </View>
          </View>

          {loading ? (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 60,
              }}
            >
              <ActivityIndicator size="large" color={colors.accent.primary} />
            </View>
          ) : (
            <>
              {/* Avatar */}
              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <View style={{ position: 'relative', marginBottom: 12 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('AvatarPicker')}
                  >
                    <Avatar
                      uri={user?.avatarUrl}
                      name={`${user?.firstName || ''} ${user?.lastName || ''}`}
                      size={100}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: colors.accent.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...shadows.sm,
                      shadowColor: colors.accent.primary,
                    }}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('AvatarPicker')}
                  >
                    <Ionicons name="pencil" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: colors.text.primary,
                    letterSpacing: -0.3,
                  }}
                >
                  {fullName}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '500',
                    color: colors.text.tertiary,
                    marginTop: 2,
                  }}
                >
                  {email || user?.email || ''}
                </Text>
              </View>

              {/* Profile Form */}
              <View
                style={{
                  marginHorizontal: PADDING,
                  backgroundColor: colors.bg.card,
                  borderRadius: borderRadius.xl,
                  padding: 20,
                  marginBottom: 16,
                  ...shadows.md,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: colors.text.primary,
                    marginBottom: 16,
                  }}
                >
                  Personal Information
                </Text>

                {error ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: `${colors.status.error}10`,
                      marginBottom: 16,
                    }}
                  >
                    <Ionicons name="alert-circle" size={16} color={colors.status.error} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: colors.status.error,
                        flex: 1,
                      }}
                    >
                      {error}
                    </Text>
                  </View>
                ) : null}

                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: colors.text.tertiary,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                    marginTop: 4,
                  }}
                >
                  First Name
                </Text>
                <TextInput
                  style={{
                    fontSize: 16,
                    fontWeight: '500',
                    paddingHorizontal: 16,
                    paddingVertical: 15,
                    borderRadius: borderRadius.md,
                    borderWidth: 1,
                    borderColor: colors.border.subtle,
                    backgroundColor: colors.bg.tertiary,
                    color: colors.text.primary,
                  }}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Enter your first name"
                  placeholderTextColor={colors.text.tertiary}
                />

                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: colors.text.tertiary,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                    marginTop: 16,
                  }}
                >
                  Last Name
                </Text>
                <TextInput
                  style={{
                    fontSize: 16,
                    fontWeight: '500',
                    paddingHorizontal: 16,
                    paddingVertical: 15,
                    borderRadius: borderRadius.md,
                    borderWidth: 1,
                    borderColor: colors.border.subtle,
                    backgroundColor: colors.bg.tertiary,
                    color: colors.text.primary,
                  }}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Enter your last name"
                  placeholderTextColor={colors.text.tertiary}
                />

                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: colors.text.tertiary,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                    marginTop: 16,
                  }}
                >
                  Email
                </Text>
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 15,
                    borderRadius: borderRadius.md,
                    borderWidth: 1,
                    borderColor: colors.border.subtle,
                    backgroundColor: colors.bg.tertiary,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text.tertiary }}>
                    {email || user?.email || 'No email'}
                  </Text>
                </View>

                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: colors.text.tertiary,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                    marginTop: 16,
                  }}
                >
                  Phone Number
                </Text>
                <TextInput
                  style={{
                    fontSize: 16,
                    fontWeight: '500',
                    paddingHorizontal: 16,
                    paddingVertical: 15,
                    borderRadius: borderRadius.md,
                    borderWidth: 1,
                    borderColor: colors.border.subtle,
                    backgroundColor: colors.bg.tertiary,
                    color: colors.text.primary,
                  }}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Required — helps friends find you"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="phone-pad"
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '500',
                    color: colors.text.tertiary,
                    marginTop: 6,
                    lineHeight: 16,
                  }}
                >
                  Friends can find you via contact sync. Your number is never shared.
                </Text>

                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: colors.text.tertiary,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                    marginTop: 16,
                  }}
                >
                  UPI ID
                </Text>
                <TextInput
                  style={{
                    fontSize: 16,
                    fontWeight: '500',
                    paddingHorizontal: 16,
                    paddingVertical: 15,
                    borderRadius: borderRadius.md,
                    borderWidth: 1,
                    borderColor: colors.border.subtle,
                    backgroundColor: colors.bg.tertiary,
                    color: colors.text.primary,
                  }}
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="example@upi"
                  placeholderTextColor={colors.text.tertiary}
                  autoCapitalize="none"
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '500',
                    color: colors.text.tertiary,
                    marginTop: 6,
                    lineHeight: 16,
                  }}
                >
                  Set your UPI ID so group members can pay you directly.
                </Text>
              </View>

              {/* Danger Zone */}
              <View
                style={{
                  marginHorizontal: PADDING,
                  backgroundColor: colors.bg.card,
                  borderRadius: borderRadius.xl,
                  padding: 20,
                  marginBottom: 16,
                  ...shadows.sm,
                }}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}
                >
                  <Ionicons name="warning-outline" size={18} color={colors.status.error} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.status.error }}>
                    Danger Zone
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '500',
                    color: colors.text.tertiary,
                    lineHeight: 19,
                    marginBottom: 16,
                  }}
                >
                  Once you delete your account, there is no going back. Please be certain.
                </Text>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 14,
                    borderRadius: borderRadius.md,
                    borderWidth: 1,
                    borderColor: `${colors.status.error}30`,
                    backgroundColor: `${colors.status.error}08`,
                  }}
                  onPress={handleDeleteAccount}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.status.error} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.status.error }}>
                    Delete Account
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>

        {/* Save Button */}
        <View
          style={{
            position: 'absolute',
            bottom: tabBarHeight,
            left: 0,
            right: 0,
            paddingHorizontal: PADDING,
            paddingTop: 12,
            backgroundColor: colors.bg.primary,
            paddingBottom: insets.bottom + 20,
          }}
        >
          <TouchableOpacity
            style={{
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              backgroundColor: colors.accent.primary,
              ...shadows.md,
              shadowColor: colors.accent.primary,
              opacity: saving || loading ? 0.6 : 1,
            }}
            onPress={handleSaveProfile}
            disabled={saving || loading}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                  Save Changes
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
});
