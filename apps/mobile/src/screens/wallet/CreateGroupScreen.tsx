import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';
import { api } from '../../services/api';
import { useToast } from '../../store/ToastContext';

export function CreateGroupScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();

  const GROUP_ICONS: { icon: string; label: string; color: string }[] = [
    { icon: 'users', label: 'General', color: '#6366F1' },
    { icon: 'home', label: 'Household', color: '#22C55E' },
    { icon: 'heart', label: 'Couple', color: '#EC4899' },
    { icon: 'team', label: 'Friends', color: '#3B82F6' },
    { icon: 'bank', label: 'Business', color: colors.accent.secondary },
    { icon: 'earth', label: 'Travel', color: '#06B6D4' },
    { icon: 'book', label: 'Education', color: '#3B82F6' },
    { icon: 'shoppingcart', label: 'Shopping', color: '#F97316' },
  ];
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('users');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const payload: Record<string, any> = { name: name.trim(), icon: selectedIcon };
      if (description.trim()) {
        payload.description = description.trim();
      }
      if (monthlyBudget.trim()) {
        payload.monthlyBudget = parseFloat(monthlyBudget);
      }
      await api.post('/expense-groups', payload);
      showToast('Group created successfully');
      navigation.goBack();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create group');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <LinearGradient
        colors={isDark ? ['#1A0A2E', colors.bg.primary] : ['#F0E6FF', colors.bg.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.2]}
        style={{ flex: 1 }}
      >
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <AntDesign name="arrowleft" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text.primary }]}>Create Group</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.md, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View style={[s.errorBox, { backgroundColor: colors.status.error + '10' }]}>
              <AntDesign name="exclamationcircle" size={14} color={colors.status.error} />
              <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
            </View>
          ) : null}

          {/* Name Card */}
          <View style={[s.card, { backgroundColor: colors.bg.card, ...shadows.md }]}>
            <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Group Name</Text>
            <TextInput
              style={[s.input, { color: colors.text.primary }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. House Expenses"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* 2-Column Grid */}
          <View style={s.grid2}>
            <View style={s.gridLeft}>
              <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Description</Text>
              <TextInput
                style={[s.input, { color: colors.text.primary }]}
                value={description}
                onChangeText={setDescription}
                placeholder="What's it for?"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            <View style={s.gridRight}>
              <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Monthly Budget</Text>
              <View
                style={[
                  s.budgetRow,
                  { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
                ]}
              >
                <Text style={[s.budgetSign, { color: colors.text.tertiary }]}>₹</Text>
                <TextInput
                  style={[s.budgetInput, { color: colors.text.primary }]}
                  value={monthlyBudget}
                  onChangeText={(t) => setMonthlyBudget(t.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Icon Selector */}
          <View>
            <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Icon</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {GROUP_ICONS.map((item) => {
                const active = selectedIcon === item.icon;
                return (
                  <TouchableOpacity
                    key={item.icon}
                    onPress={() => setSelectedIcon(item.icon)}
                    style={[
                      s.chip,
                      {
                        backgroundColor: active ? item.color + '15' : colors.bg.card,
                        borderColor: active ? item.color : colors.border.subtle,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <AntDesign
                      name={item.icon as any}
                      size={16}
                      color={active ? item.color : colors.text.tertiary}
                    />
                    <Text
                      style={[s.chipText, { color: active ? item.color : colors.text.secondary }]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Save */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
            style={[s.saveBtn, { opacity: saving ? 0.6 : 1 }]}
          >
            <LinearGradient
              colors={[colors.accent.primary, colors.accent.hover || colors.accent.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.saveGrad}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <AntDesign name="checkcircleo" size={18} color="#FFF" />
                  <Text style={s.saveText}>Create Group</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },
  card: { borderRadius: borderRadius['2xl'], padding: spacing.lg, marginBottom: spacing.md },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: { fontSize: 15, fontWeight: '500', padding: 0 },
  grid2: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  gridLeft: { flex: 1 },
  gridRight: { flex: 1 },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  budgetSign: { fontSize: 16, fontWeight: '700', marginRight: 4 },
  budgetInput: { flex: 1, fontSize: 15, fontWeight: '600', padding: 0 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  saveBtn: { borderRadius: borderRadius['2xl'], overflow: 'hidden', marginTop: spacing['2xl'] },
  saveGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
