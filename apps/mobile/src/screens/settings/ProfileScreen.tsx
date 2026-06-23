import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { spacing, borderRadius, shadows } from '../../theme/design';
import { useToast } from '../../store/ToastContext';
import { useLensStore, LensMode } from '../../store/lensStore';

import { alertService } from "../../components/ui";
const LENS_OPTIONS: { id: LensMode; icon: React.ComponentProps<typeof AntDesign>['name']; title: string; desc: string }[] = [
  { id: 'PERSONAL', icon: 'user', title: 'Personal Finance', desc: 'Manage your personal finances, savings, and investments.' },
  { id: 'PARTNERED', icon: 'heart', title: 'Couple Finance', desc: 'Track finances together, split expenses, and share goals.' },
  { id: 'FAMILY', icon: 'team', title: 'Family Finance', desc: 'Manage family budgets, allowances, and shared goals.' },
  { id: 'FULL', icon: 'earth', title: 'All (Recommended)', desc: 'Access all features — personal, couple, family, and group.' },
];

const UPI_PATTERN = /^[\w.-]+@[\w.-]+$/;

interface Preset {
  seed: string;
  name: string;
  url: string;
}

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { accessToken, user, logout, updateAvatarUrl, completeProfileSetup } = useAuth();

  const { showToast } = useToast();
  const { activeLens, isSwitching } = useLensStore();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [upiId, setUpiId] = useState('');
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

  function validateUpi(value: string) {
    if (value.trim() && !UPI_PATTERN.test(value.trim())) {
      setUpiError('Enter a valid UPI ID (e.g. user@bank)');
    } else {
      setUpiError('');
    }
  }

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      if (accessToken) setAccessToken(accessToken);
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
        if (data.email) setEmail(data.email);
        completeProfileSetup({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || undefined,
          upiId: data.upiId || undefined,
          email: data.email,
        });
      }
    } catch {
      if (user?.phone) setPhone(user.phone);
    } finally {
      setLoading(false);
    }
  }

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
    return () => { if (upiTimer.current) clearTimeout(upiTimer.current); };
  }, [upiId]);

  async function handleSaveProfile() {
    if (!firstName.trim()) { setError('First name is required'); return; }
    setError('');
    setSaving(true);
    if (accessToken) setAccessToken(accessToken);
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
      alertService.alert('Success', 'Profile updated successfully');
    } catch (e: any) {
      setError(e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: insets.top + 4 }}>
          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
              <ActivityIndicator size="large" color={colors.accent.primary} />
            </View>
          ) : (
            <>
              {/* Avatar Card */}
              <View style={{ marginHorizontal: spacing['2xl'], marginBottom: 20 }}>
                <View style={[s.avatarCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
                  <LinearGradient
                    colors={isDark ? [colors.accent.primary + '10', colors.accent.primary + '04'] : [colors.accent.primary + '08', colors.accent.primary + '02']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: borderRadius['2xl'] }}
                  />
                  <View style={{ alignItems: 'center' }}>
                    <TouchableOpacity
                      style={{ position: 'relative', marginBottom: 12 }}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate('AvatarPicker')}
                    >
                      <View style={[s.editAvatarOuter, { backgroundColor: colors.accent.primary + '15', borderColor: colors.border.subtle }]}>
                        <AntDesign name="camera" size={32} color={colors.accent.primary} />
                      </View>
                      <View style={[s.editAvatarBadge, { backgroundColor: colors.accent.primary }]}>
                        <AntDesign name="edit" size={12} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>
                    <Text style={[s.fullName, { color: colors.text.primary }]}>{fullName}</Text>
                    <Text style={[s.emailText, { color: colors.text.tertiary }]}>{email || user?.email || ''}</Text>
                  </View>
                </View>
              </View>

              {/* Dashboard Lens Selection */}
              <View style={{ marginHorizontal: spacing['2xl'], marginBottom: 20 }}>
                <View style={[s.sectionCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
                  <LinearGradient
                    colors={isDark ? [colors.accent.primary + '06', 'transparent'] : [colors.accent.primary + '04', 'transparent']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: borderRadius['2xl'] }}
                  />
                  <Text style={[s.sectionLabel, { color: colors.text.tertiary }]}>Dashboard View</Text>
                  <Text style={[s.sectionDesc, { color: colors.text.tertiary }]}>Choose how your dashboard looks and what data it shows</Text>
                  <View style={{ gap: 10, marginTop: 4 }}>
                    {LENS_OPTIONS.map((lens) => {
                      const isActive = activeLens === lens.id;
                      const lensColors: Record<string, { primary: string; secondary: string }> = {
                        PERSONAL: { primary: '#7C3AED', secondary: '#A78BFA' },
                        PARTNERED: { primary: '#dd2d4a', secondary: '#f26a8d' },
                        FAMILY: { primary: '#0f6b6f', secondary: '#3d7ea6' },
                        FULL: { primary: '#0077b6', secondary: '#00b4d8' },
                      };
                      const lc = lensColors[lens.id] || lensColors.PERSONAL;
                      return (
                        <TouchableOpacity
                          key={lens.id}
                          onPress={() => {
                            useLensStore.getState().updateLens(accessToken, lens.id);
                          }}
                          activeOpacity={0.8}
                          style={[s.lensCard, {
                            backgroundColor: colors.bg.card,
                            borderColor: isActive ? lc.primary : colors.border.subtle,
                            shadowColor: isActive ? lc.primary : undefined,
                            shadowOpacity: isActive ? 0.15 : undefined,
                            shadowRadius: isActive ? 10 : undefined,
                            shadowOffset: isActive ? { width: 0, height: 2 } : undefined,
                          }]}
                        >
                          {isActive && (
                            <LinearGradient
                              colors={[lc.primary + '12', lc.primary + '04']}
                              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: borderRadius['2xl'] }}
                            />
                          )}
                          <View style={[s.lensIcon, { backgroundColor: isActive ? lc.primary + '20' : colors.border.subtle + '60' }]}>
                            <AntDesign name={lens.icon} size={22} color={isActive ? lc.primary : colors.text.tertiary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[s.lensTitle, { color: isActive ? colors.text.primary : colors.text.secondary }]}>{lens.title}</Text>
                            <Text style={[s.lensDesc, { color: colors.text.tertiary }]}>{lens.desc}</Text>
                          </View>
                          {isActive ? (
                            <View style={[s.checkCircle, { backgroundColor: lc.primary }]}>
                              <AntDesign name="check" size={14} color="#FFFFFF" />
                            </View>
                          ) : (
                            <View style={[s.uncheckCircle, { borderColor: colors.border.default }]} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Privacy & Security */}
              <View style={{ marginHorizontal: spacing['2xl'], marginBottom: 20 }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('PrivacySettings')}
                  style={[s.sectionCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={isDark ? [colors.accent.primary + '06', 'transparent'] : [colors.accent.primary + '04', 'transparent']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: borderRadius['2xl'] }}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[s.lensIcon, { backgroundColor: colors.accent.primary + '12' }]}>
                      <AntDesign name="Safety" size={20} color={colors.accent.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.lensTitle, { color: colors.text.primary }]}>Privacy & Security</Text>
                      <Text style={[s.lensDesc, { color: colors.text.tertiary }]}>Manage permissions, data, and account settings</Text>
                    </View>
                    <AntDesign name="right" size={16} color={colors.text.tertiary} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Personal Info */}
              <View style={{ marginHorizontal: spacing['2xl'], marginBottom: 20 }}>
                <View style={[s.sectionCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
                  <Text style={[s.sectionLabel, { color: colors.text.tertiary }]}>Personal Information</Text>

                  {error ? (
                    <View style={[s.errorBox, { backgroundColor: colors.status.error + '10' }]}>
                      <AntDesign name="exclamationcircle" size={16} color={colors.status.error} />
                      <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
                    </View>
                  ) : null}

                  <View style={s.fieldGroup}>
                    <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>First Name</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.default, color: colors.text.primary }]}
                      value={firstName} onChangeText={setFirstName} placeholder="Enter your first name" placeholderTextColor={colors.text.tertiary}
                    />
                  </View>

                  <View style={s.fieldGroup}>
                    <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Last Name</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.default, color: colors.text.primary }]}
                      value={lastName} onChangeText={setLastName} placeholder="Enter your last name" placeholderTextColor={colors.text.tertiary}
                    />
                  </View>

                  <View style={s.fieldGroup}>
                    <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Email</Text>
                    <View style={[s.input, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.default }]}>
                      <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text.tertiary }}>
                        {email || user?.email || 'No email'}
                      </Text>
                    </View>
                  </View>

                  <View style={s.fieldGroup}>
                    <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Phone Number</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.default, color: colors.text.primary }]}
                      value={phone} onChangeText={setPhone} placeholder="Required — helps friends find you"
                      placeholderTextColor={colors.text.tertiary} keyboardType="phone-pad"
                    />
                    <Text style={[s.hintText, { color: colors.text.tertiary }]}>Friends can find you via contact sync. Your number is never shared.</Text>
                  </View>

                  <View style={s.fieldGroup}>
                    <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>UPI ID</Text>
                    <View style={{ position: 'relative' }}>
                      <TextInput
                        style={[s.input, {
                          backgroundColor: colors.bg.tertiary, color: colors.text.primary, paddingRight: 44,
                          borderColor: upiValid === false ? colors.status.error : upiValid === true ? '#34C759' : upiError ? colors.status.error : colors.border.default,
                        }]}
                        value={upiId} onChangeText={(t) => { setUpiId(t); setUpiValid(null); if (t.trim() && !UPI_PATTERN.test(t.trim())) setUpiError('Enter a valid UPI ID (e.g. user@bank)'); else setUpiError(''); }}
                        onBlur={() => validateUpi(upiId)} placeholder="example@upi" placeholderTextColor={colors.text.tertiary} autoCapitalize="none"
                      />
                      {upiValidating ? (
                        <View style={s.inputIcon}><ActivityIndicator size="small" color={colors.accent.primary} /></View>
                      ) : upiValid === true ? (
                        <View style={s.inputIcon}><AntDesign name="checkcircle" size={18} color="#34C759" /></View>
                      ) : upiValid === false && upiId.trim() ? (
                        <View style={s.inputIcon}><AntDesign name="closecircle" size={18} color={colors.status.error} /></View>
                      ) : null}
                    </View>
                    {upiError ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                        <AntDesign name="exclamationcircle" size={12} color={colors.status.error} />
                        <Text style={{ fontSize: 11, fontWeight: '500', color: colors.status.error, lineHeight: 16 }}>{upiError}</Text>
                      </View>
                    ) : (
                      <Text style={[s.hintText, { color: colors.text.tertiary, marginTop: 6 }]}>Set your UPI ID so group members can pay you directly.</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Save Button */}
              <View style={{ marginHorizontal: spacing['2xl'], marginTop: 8, marginBottom: 16 }}>
                <TouchableOpacity
                  style={[s.saveBtn, { backgroundColor: colors.accent.primary, opacity: saving || loading || !hasChanges || !!upiError ? 0.6 : 1 }]}
                  onPress={handleSaveProfile} disabled={saving || loading || !hasChanges || !!upiError} activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <AntDesign name="checkcircleo" size={18} color="#FFFFFF" />
                      <Text style={s.saveText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      {isSwitching && (
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <View style={{ backgroundColor: colors.bg.card, borderRadius: 20, padding: 32, alignItems: 'center', gap: 16, ...shadows.lg }}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.secondary }}>Switching lens...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  avatarCard: { borderRadius: borderRadius['2xl'], borderWidth: 1, padding: spacing['2xl'], alignItems: 'center', ...shadows.md, overflow: 'hidden' },
  editAvatarOuter: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, alignItems: 'center', justifyContent: 'center', ...shadows.sm },
  editAvatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: 'transparent' },
  fullName: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, marginBottom: 2 },
  emailText: { fontSize: 13, fontWeight: '500' },
  sectionCard: { borderRadius: borderRadius['2xl'], borderWidth: 1, padding: spacing.xl, ...shadows.sm, overflow: 'hidden' },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4, paddingLeft: 2 },
  sectionDesc: { fontSize: 13, fontWeight: '500', marginBottom: 14, paddingLeft: 2, lineHeight: 18 },
  lensCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: borderRadius['2xl'], borderWidth: 1.5, ...shadows.sm, overflow: 'hidden' },
  lensIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  lensTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  lensDesc: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  uncheckCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  input: { fontSize: 16, fontWeight: '500', paddingHorizontal: 16, paddingVertical: 15, borderRadius: borderRadius.md, borderWidth: 1 },
  hintText: { fontSize: 11, fontWeight: '500', lineHeight: 16, marginTop: 6 },
  inputIcon: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  saveBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, ...shadows.md },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
