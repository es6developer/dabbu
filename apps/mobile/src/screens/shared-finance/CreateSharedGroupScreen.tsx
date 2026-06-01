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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';

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
  { name: 'building', icon: 'building' },
  { name: 'cart', icon: 'cart' },
  { name: 'restaurant', icon: 'restaurant' },
  { name: 'car', icon: 'car' },
  { name: 'fitness', icon: 'fitness' },
  { name: 'gift', icon: 'gift' },
  { name: 'school', icon: 'school' },
  { name: 'beer', icon: 'beer' },
  { name: 'musical-notes', icon: 'musical-notes' },
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

export function CreateSharedGroupScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();

  const [name, setName] = useState('');
  const [type, setType] = useState('Friends');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [icon, setIcon] = useState('people');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
        currency,
      };
      if (description.trim()) {
        payload.description = description.trim();
      }
      if (monthlyBudget.trim()) {
        payload.monthlyBudget = Number(monthlyBudget);
      }
      const res = await api.post<any>('/shared-groups', payload);
      const newGroupId = res?.id || res?._id;
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
    <ScrollView
      style={[s.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top + 16 }]}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
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
        <Text style={s.heroSub}>Track expenses together with friends, family, and more</Text>
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

      <Text style={[s.label, { color: colors.text.tertiary }]}>Currency</Text>
      <View style={s.currencyRow}>
        {CURRENCIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              s.currencyChip,
              { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
              currency === c && {
                backgroundColor: `${colors.accent.primary}20`,
                borderColor: colors.accent.primary,
              },
            ]}
            onPress={() => setCurrency(c)}
          >
            <Text
              style={[
                s.currencyText,
                {
                  color: currency === c ? colors.accent.primary : colors.text.secondary,
                },
              ]}
            >
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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

      <Text style={[s.label, { color: colors.text.tertiary }]}>Monthly Budget (optional)</Text>
      <View
        style={[
          s.inputRow,
          { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
        ]}
      >
        <Text style={[s.currencyPrefix, { color: colors.text.tertiary }]}>
          {currency === 'INR'
            ? '₹'
            : currency === 'USD'
              ? '$'
              : currency === 'EUR'
                ? '€'
                : currency === 'GBP'
                  ? '£'
                  : currency === 'AED'
                    ? 'د.إ'
                    : '$'}
        </Text>
        <TextInput
          style={[s.inputFlex, { color: colors.text.primary }]}
          value={monthlyBudget}
          onChangeText={setMonthlyBudget}
          placeholder="0"
          placeholderTextColor={colors.text.tertiary}
          keyboardType="decimal-pad"
        />
      </View>

      <TouchableOpacity
        style={[s.saveBtn, { backgroundColor: colors.accent.primary }, saving && { opacity: 0.6 }]}
        onPress={handleCreate}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={s.saveBtnText}>Create Group</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 24,
    paddingHorizontal: 16,
  },
  currencyPrefix: { fontSize: 18, fontWeight: '700', marginRight: 8 },
  inputFlex: { flex: 1, fontSize: 16, paddingVertical: 14 },
  typeRow: { paddingHorizontal: 24, gap: 8, paddingBottom: 4 },
  typeChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  typeChipText: { fontSize: 14, fontWeight: '600' },
  currencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 24,
  },
  currencyChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  currencyText: { fontSize: 14, fontWeight: '600' },
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
});
