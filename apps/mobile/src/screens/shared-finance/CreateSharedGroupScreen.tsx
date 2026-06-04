import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';


const GROUP_TYPES = [
  'Friends',
  'Trip',
  'Family',
  'Couple',
  'Roommates',
  'Office',
  'Event',
  'Apartment',
] as const;

const ICON_OPTIONS = [
  { name: 'people', icon: 'people' },
  { name: 'airplane', icon: 'airplane' },
  { name: 'home', icon: 'home' },
  { name: 'heart', icon: 'heart' },
  { name: 'business', icon: 'business' },
  { name: 'briefcase', icon: 'briefcase' },
  { name: 'calendar', icon: 'calendar' },
  { name: 'building', icon: 'business' },
  { name: 'cart', icon: 'cart' },
  { name: 'restaurant', icon: 'restaurant' },
  { name: 'car', icon: 'car' },
  { name: 'fitness', icon: 'fitness' },
  { name: 'gift', icon: 'gift' },
  { name: 'school', icon: 'school' },
  { name: 'beer', icon: 'beer' },
  { name: 'musical-notes', icon: 'musical-notes' },
];

export function CreateSharedGroupScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();

  const [name, setName] = useState('');
  const [type, setType] = useState('Friends');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('people');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [upiId, setUpiId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const upiTypes = ['Friends', 'Trip', 'Roommates', 'Event'];
  const showUpiInput = upiTypes.includes(type);
  const showPartnerInput = type === 'Couple';

  async function handleCreate() {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    setError('');
    setSaving(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const payload: any = {
        name: name.trim(),
        type: type.toLowerCase(),
        icon,
        currency: 'INR',
      };
      if (description.trim()) {
        payload.description = description.trim();
      }
      const res = await api.post<any>('/shared-finance/groups', payload);
      const newGroupId = res?.id || res?._id;
      if (type === 'Couple' && partnerEmail.trim() && newGroupId) {
        await api.post(`/shared-finance/groups/${newGroupId}/members`, { email: partnerEmail.trim() }).catch(() => {});
      }
      if (newGroupId) {
        navigation.replace('SharedGroupDetail', {
          groupId: newGroupId,
          groupName: name.trim(),
        });
      } else {
        navigation.goBack();
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create group');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <View style={[s.container, s.content]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              s.backBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              },
            ]}
          >
            <Ionicons name="close" size={22} color={colors.text.primary} />
          </TouchableOpacity>

          <LinearGradient
            colors={[...colors.accent.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.heroSection}
          >
            <Text style={s.heroTitle}>New Shared Group</Text>
            <Text style={s.heroSub}>Split expenses with friends, family, and more</Text>
          </LinearGradient>

          {error ? (
            <View style={[s.errorBox, { backgroundColor: colors.status.errorLight }]}>
              <Ionicons name="alert-circle" size={16} color={colors.status.error} />
              <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
            </View>
          ) : null}

          <Text style={[s.label, { color: colors.text.tertiary }]}>Group Name</Text>
          <TextInput
            style={[
              s.input,
              {
                backgroundColor: colors.bg.tertiary,
                color: colors.text.primary,
                borderColor: colors.border.subtle,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Goa Trip 2025"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={[s.label, { color: colors.text.tertiary }]}>Group Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.typeRow}
          >
            {GROUP_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  s.typeChip,
                  { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                  type === t && {
                    backgroundColor: `${colors.accent.primary}20`,
                    borderColor: colors.accent.primary,
                  },
                ]}
                onPress={() => setType(t)}
              >
                <Text
                  style={[
                    s.typeChipText,
                    {
                      color: type === t ? colors.accent.primary : colors.text.secondary,
                    },
                  ]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[s.label, { color: colors.text.tertiary }]}>Description (optional)</Text>
          <TextInput
            style={[
              s.input,
              {
                backgroundColor: colors.bg.tertiary,
                color: colors.text.primary,
                borderColor: colors.border.subtle,
              },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="What's this group for?"
            placeholderTextColor={colors.text.tertiary}
            multiline
          />

          {showPartnerInput && (
            <>
              <Text style={[s.label, { color: colors.text.tertiary }]}>Partner Email</Text>
              <TextInput
                style={[
                  s.input,
                  {
                    backgroundColor: colors.bg.tertiary,
                    color: colors.text.primary,
                    borderColor: colors.border.subtle,
                  },
                ]}
                value={partnerEmail}
                onChangeText={setPartnerEmail}
                placeholder="partner@email.com"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </>
          )}

          <Text style={[s.label, { color: colors.text.tertiary }]}>Icon</Text>
          <View style={s.iconGrid}>
            {ICON_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.name}
                style={[
                  s.iconBtn,
                  { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                  icon === opt.name && {
                    backgroundColor: `${colors.accent.primary}20`,
                    borderColor: colors.accent.primary,
                  },
                ]}
                onPress={() => setIcon(opt.name)}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={22}
                  color={icon === opt.name ? colors.accent.primary : colors.text.tertiary}
                />
              </TouchableOpacity>
            ))}
          </View>

          {showUpiInput && (
            <>
              <Text style={[s.label, { color: colors.text.tertiary, marginTop: 24 }]}>
                Your UPI ID {type === 'Trip' || type === 'Event' ? '(Recommended)' : ''}
              </Text>
              <View style={[s.infoBanner, { backgroundColor: `${colors.accent.primary}12` }]}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={colors.accent.primary}
                />
                <Text style={[s.infoBannerText, { color: colors.accent.primary }]}>
                  Add your UPI ID for faster settlements
                </Text>
              </View>
              <TextInput
                style={[
                  s.input,
                  {
                    backgroundColor: colors.bg.tertiary,
                    color: colors.text.primary,
                    borderColor: colors.border.subtle,
                  },
                ]}
                value={upiId}
                onChangeText={setUpiId}
                placeholder="e.g. name@okaxis"
                placeholderTextColor={colors.text.tertiary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </>
          )}

          <TouchableOpacity
            style={[
              s.saveBtn,
              { backgroundColor: colors.accent.primary },
              saving && { opacity: 0.6 },
            ]}
            onPress={handleCreate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={s.saveBtnText}>Create Group</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 60 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 24,
    marginTop: 16,
    marginBottom: 16,
  },
  heroSection: {
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 24,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { fontSize: 13, flex: 1 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 24,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 24,
  },
  typeRow: { paddingHorizontal: 24, gap: 8, paddingBottom: 4 },
  typeChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  typeChipText: { fontSize: 14, fontWeight: '600' },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 24,
  },
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 28,
    marginHorizontal: 24,
  },
  saveBtnText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 24,
    padding: 10,
    borderRadius: 10,
  },
  infoBannerText: { fontSize: 12, fontWeight: '600', flex: 1 },
});
