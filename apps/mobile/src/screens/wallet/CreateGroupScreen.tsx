import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';

const GROUP_TYPES = [
  'Personal', 'Household', 'Roommates', 'Couple', 'Family', 'Business', 'Travel Group', 'Shared Subscriptions',
];

const TYPE_COLORS: Record<string, string> = {
  Personal: '#6366F1',
  Household: '#22C55E',
  Roommates: '#3B82F6',
  Couple: '#EC4899',
  Family: '#F59E0B',
  Business: '#8B5CF6',
  'Travel Group': '#06B6D4',
  'Shared Subscriptions': '#14B8A6',
};

const TYPE_ICONS: Record<string, React.ComponentProps<typeof AntDesign>['name']> = {
  Personal: 'user',
  Household: 'home',
  Roommates: 'team',
  Couple: 'heart',
  Family: 'team',
  Business: 'bank',
  'Travel Group': 'earth',
  'Shared Subscriptions': 'wallet',
};

export function CreateGroupScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Personal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!name.trim()) { setError('Group name is required'); return; }
    setError('');
    setSaving(true);
    try {
      if (accessToken) setAccessToken(accessToken);
      const payload: any = { name: name.trim(), type: type.toLowerCase() };
      if (description.trim()) payload.description = description.trim();
      await api.post('/shared-finance/groups', payload);
      showToast('Group created');
      navigation.goBack();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to create group');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <LinearGradient
        colors={isDark ? ['#1A0A2E', colors.bg.primary] : ['#F0E6FF', colors.bg.primary]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} locations={[0, 0.25]}
        style={{ flex: 1 }}
      >
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <AntDesign name="arrowleft" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[s.title, { color: colors.text.primary }]}>Create Group</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing['2xl'], paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          {/* Name + Description */}
          <View style={[s.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
            <LinearGradient
              colors={isDark ? [colors.accent.primary + '06', 'transparent'] : [colors.accent.primary + '04', 'transparent']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: borderRadius['2xl'] }}
            />
            <Text style={[s.cardTitle, { color: colors.text.tertiary }]}>Group Info</Text>

            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Name *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.default, color: colors.text.primary }]}
                value={name}
                onChangeText={(t) => { setName(t); setError(''); }}
                placeholder="Enter group name"
                placeholderTextColor={colors.text.tertiary}
                autoFocus
              />
            </View>

            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Description (optional)</Text>
              <TextInput
                style={[s.input, s.textArea, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.default, color: colors.text.primary }]}
                value={description}
                onChangeText={setDescription}
                placeholder="What is this group for?"
                placeholderTextColor={colors.text.tertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Type */}
          <View style={[s.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, marginTop: spacing.md }]}>
            <LinearGradient
              colors={isDark ? [colors.accent.primary + '06', 'transparent'] : [colors.accent.primary + '04', 'transparent']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: borderRadius['2xl'] }}
            />
            <Text style={[s.cardTitle, { color: colors.text.tertiary }]}>Group Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {GROUP_TYPES.map((t) => {
                const active = type === t;
                const color = TYPE_COLORS[t] || '#6366F1';
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setType(t)}
                    style={[s.typeChip, {
                      backgroundColor: active ? color + '15' : colors.bg.tertiary,
                      borderColor: active ? color : colors.border.subtle,
                    }]}
                  >
                    <AntDesign name={TYPE_ICONS[t] || 'team'} size={14} color={active ? color : colors.text.tertiary} />
                    <Text style={[s.typeChipText, { color: active ? color : colors.text.secondary }]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {error ? (
            <View style={[s.errorBox, { backgroundColor: colors.status.error + '10' }]}>
              <AntDesign name="exclamationcircle" size={14} color={colors.status.error} />
              <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
            </View>
          ) : null}

          {/* Save */}
          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: colors.accent.primary, opacity: saving || !name.trim() ? 0.6 : 1 }]}
            onPress={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <AntDesign name="checkcircleo" size={18} color="#FFF" />
                <Text style={s.saveText}>Create Group</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing['2xl'], paddingBottom: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  card: { borderRadius: borderRadius['2xl'], borderWidth: 1, padding: spacing.xl, overflow: 'hidden' },
  cardTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.md },
  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  input: { fontSize: 15, fontWeight: '500', paddingHorizontal: 16, paddingVertical: 14, borderRadius: borderRadius.md, borderWidth: 1 },
  textArea: { minHeight: 80, paddingTop: 14 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  typeChipText: { fontSize: 13, fontWeight: '600' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginTop: spacing.md },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 16, marginTop: spacing['2xl'],
  },
  saveText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
