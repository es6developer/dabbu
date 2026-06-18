import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Avatar } from '../../components/ui/Avatar';
import { spacing, borderRadius, shadows } from '../../theme/design';
import { useToast } from '../../store/ToastContext';

const UPI_PATTERN = /^[\w.-]+@[\w.-]+$/;

interface Preset {
  seed: string;
  name: string;
  url: string;
}

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { accessToken, user, logout, updateAvatarUrl, completeProfileSetup } = useAuth();

  const { showToast } = useToast();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [upiId, setUpiId] = useState('');
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(true);
  const [selectedSeed, setSelectedSeed] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [originalValues, setOriginalValues] = useState({ firstName: '', lastName: '', phone: '', upiId: '' });
  const [upiError, setUpiError] = useState('');
  const [upiValidating, setUpiValidating] = useState(false);
  const [upiValid, setUpiValid] = useState<boolean | null>(null);
  const upiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasChanges =
    firstName !== originalValues.firstName ||
    lastName !== originalValues.lastName ||
    phone !== originalValues.phone ||
    upiId !== originalValues.upiId;

  const isUpiValid = upiId.trim() === '' || UPI_PATTERN.test(upiId.trim());

  function validateUpi(value: string) {
    if (value.trim() && !UPI_PATTERN.test(value.trim())) {
      setUpiError('Enter a valid UPI ID (e.g. user@bank)');
    } else {
      setUpiError('');
    }
  }

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
        const origFirstName = data.firstName || '';
        const origLastName = data.lastName || '';
        const origPhone = data.phone || '';
        const origUpiId = data.upiId || '';
        setFirstName(origFirstName);
        setLastName(origLastName);
        setPhone(origPhone);
        setUpiId(origUpiId);
        setOriginalValues({ firstName: origFirstName, lastName: origLastName, phone: origPhone, upiId: origUpiId });
        if (data.email) {
          setEmail(data.email);
        }
        completeProfileSetup({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || undefined,
          upiId: data.upiId || undefined,
          email: data.email,
        });
      }
    } catch {
      if (user?.phone) {
        setPhone(user.phone);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPresets();
  }, []);

  useEffect(() => {
    if (presets.length > 0 && user?.avatarUrl) {
      const indexMatch = user.avatarUrl?.match(/\/avatars\/(\d+)/);
      if (indexMatch) {
        const urlIndex = parseInt(indexMatch[1], 10);
        const urls = presets.map((p) => {
          const m = p.url.match(/\/avatars\/(\d+)/);
          return m ? parseInt(m[1], 10) : -1;
        });
        const matchIdx = urls.indexOf(urlIndex);
        if (matchIdx >= 0) {
          setSelectedSeed(presets[matchIdx].seed);
        }
      }
    }
  }, [presets, user?.avatarUrl]);

  useEffect(() => {
    if (upiTimer.current) clearTimeout(upiTimer.current);
    if (!upiId.trim() || !UPI_PATTERN.test(upiId.trim())) {
      setUpiValid(null);
      setUpiValidating(false);
      return;
    }
    setUpiValidating(true);
    upiTimer.current = setTimeout(async () => {
      try {
        const res = await api.get<any>(`/users/validate-upi?upiId=${encodeURIComponent(upiId.trim())}`);
        setUpiValid(res?.valid === true);
        setUpiError(res?.valid ? '' : `UPI ID not found: ${res?.error || 'Invalid'}`);
      } catch {
        setUpiValid(null);
      } finally {
        setUpiValidating(false);
      }
    }, 600);
    return () => {
      if (upiTimer.current) clearTimeout(upiTimer.current);
    };
  }, [upiId]);

  async function loadPresets() {
    setPresetsLoading(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.get<any>('/auth/avatar/presets');
      setPresets(Array.isArray(res) ? res : res?.data || []);
    } catch {
      setPresets([]);
    } finally {
      setPresetsLoading(false);
    }
  }

  const selectPreset = useCallback(
    async (preset: Preset) => {
      setSelectedSeed(preset.seed);
      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        await api.post('/auth/avatar/select', { seed: preset.seed });
        showToast('Avatar regenerated');
        updateAvatarUrl(preset.url);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to select avatar');
      }
    },
    [accessToken, updateAvatarUrl],
  );

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
      await api.patch('/users/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: cleanedPhone,
        upiId: upiId.trim() || undefined,
      });
      completeProfileSetup({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: cleanedPhone,
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
                    showToast('Profile deleted');
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 32,
            paddingTop: insets.top + 4,
          }}
        >
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
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View style={{ position: 'relative', marginBottom: 12 }}>
                  <Avatar
                    uri={user?.avatarUrl}
                    name={`${user?.firstName || ''} ${user?.lastName || ''}`}
                    size={100}
                  />
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
                    <AntDesign  name="edit" size={14} color="#FFFFFF" />
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
              </View>

              {/* Avatar Presets */}
              <View style={{ marginHorizontal: spacing['2xl'], marginBottom: 16 }}>
                {presetsLoading ? (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <ActivityIndicator size="small" color={colors.accent.primary} />
                  </View>
                ) : presets.length > 0 ? (
                  <>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: colors.text.tertiary,
                        letterSpacing: 0.8,
                        textTransform: 'uppercase',
                        marginBottom: 10,
                        paddingLeft: 2,
                      }}
                    >
                      Choose Avatar
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -6 }}>
                      {presets.map((preset) => (
                        <View key={preset.seed} style={{ width: '16.666%', padding: 6 }}>
                          <TouchableOpacity
                            onPress={() => selectPreset(preset)}
                            activeOpacity={0.7}
                            disabled={selectedSeed === preset.seed}
                            style={{
                              borderRadius: 14,
                              borderWidth: 2,
                              borderColor:
                                selectedSeed === preset.seed
                                  ? colors.accent.primary
                                  : colors.border.subtle,
                              overflow: 'hidden',
                              alignItems: 'center',
                            }}
                          >
                            <Avatar uri={preset.url} name={preset.name} size={48} />
                            {selectedSeed === preset.seed && (
                              <View
                                style={{
                                  position: 'absolute',
                                  top: -4,
                                  right: -4,
                                  width: 22,
                                  height: 22,
                                  borderRadius: 11,
                                  backgroundColor: colors.accent.primary,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderWidth: 2,
                                  borderColor: colors.bg.primary,
                                }}
                              >
                                <AntDesign  name="check" size={12} color="#FFFFFF" />
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </>
                ) : null}
              </View>

              {/* Profile Form */}
              <View
                style={{
                  marginHorizontal: spacing['2xl'],
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
                    <AntDesign  name="exclamationcircle" size={16} color={colors.status.error} />
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
                    borderColor: colors.border.default,
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
                    borderColor: colors.border.default,
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
                    borderColor: colors.border.default,
                    backgroundColor: colors.bg.tertiary,
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
                    borderColor: colors.border.default,
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
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={{
                      fontSize: 16,
                      fontWeight: '500',
                      paddingHorizontal: 16,
                      paddingVertical: 15,
                      paddingRight: 44,
                      borderRadius: borderRadius.md,
                      borderWidth: 1,
                      borderColor: upiValid === false ? colors.status.error : upiValid === true ? '#34C759' : upiError ? colors.status.error : colors.border.default,
                      backgroundColor: colors.bg.tertiary,
                      color: colors.text.primary,
                    }}
                    value={upiId}
                    onChangeText={(t) => {
                      setUpiId(t);
                      setUpiValid(null);
                      if (t.trim() && !UPI_PATTERN.test(t.trim())) {
                        setUpiError('Enter a valid UPI ID (e.g. user@bank)');
                      } else {
                        setUpiError('');
                      }
                    }}
                    onBlur={() => validateUpi(upiId)}
                    placeholder="example@upi"
                    placeholderTextColor={colors.text.tertiary}
                    autoCapitalize="none"
                  />
                  {upiValidating ? (
                    <View style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}>
                      <ActivityIndicator size="small" color={colors.accent.primary} />
                    </View>
                  ) : upiValid === true ? (
                    <View style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}>
                      <AntDesign name="checkcircle" size={18} color="#34C759" />
                    </View>
                  ) : upiValid === false && upiId.trim() ? (
                    <View style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}>
                      <AntDesign name="closecircle" size={18} color={colors.status.error} />
                    </View>
                  ) : null}
                </View>
                {upiError ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                    <AntDesign  name="exclamationcircle" size={12} color={colors.status.error} />
                    <Text style={{ fontSize: 11, fontWeight: '500', color: colors.status.error, lineHeight: 16 }}>
                      {upiError}
                    </Text>
                  </View>
                ) : (
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
                )}
              </View>

              {/* Danger Zone */}
              <View
                style={{
                  marginHorizontal: spacing['2xl'],
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
                  <AntDesign  name="warning" size={18} color={colors.status.error} />
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
                  <AntDesign  name="delete" size={16} color={colors.status.error} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.status.error }}>
                    Delete Account
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Save Button */}
              <View style={{ marginHorizontal: spacing['2xl'], marginTop: 8, marginBottom: 16 }}>
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
                    opacity: saving || loading || !hasChanges || !!upiError ? 0.6 : 1,
                  }}
                  onPress={handleSaveProfile}
                  disabled={saving || loading || !hasChanges || !!upiError}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <AntDesign  name="checkcircleo" size={18} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                        Save Changes
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
});
