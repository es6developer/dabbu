import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';
import { useToast } from '../../store/ToastContext';
import { EXPENSE_CATEGORIES } from '../../config/categoryIcons';

const PERIODS = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
  { label: 'Custom', value: 'custom' },
];

export function CreateBudgetScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      setError('Budget name is required');
      return;
    }
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Enter a valid budget amount');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        amount: parseFloat(amount),
        period,
      };
      if (selectedCategory) {
        payload.categoryId = selectedCategory;
      }
      if (notes.trim()) {
        payload.notes = notes.trim();
      }
      await api.post('/budgets', payload);
      showToast('Budget created successfully');
      navigation.goBack();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create budget');
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
          <Text style={[s.headerTitle, { color: colors.text.primary }]}>Create Budget</Text>
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

          {/* Name */}
          <View style={[s.card, { backgroundColor: colors.bg.card }]}>
            <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Budget Name</Text>
            <TextInput
              style={[s.input, { color: colors.text.primary }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Monthly Groceries"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Amount & Period */}
          <View style={s.grid2}>
            <View style={s.gridLeft}>
              <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Amount</Text>
              <View style={[s.amountRow, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
                <Text style={[s.amountSign, { color: colors.text.tertiary }]}>₹</Text>
                <TextInput
                  style={[s.amountInput, { color: colors.text.primary }]}
                  value={amount}
                  onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={s.gridRight}>
              <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Period</Text>
              <View style={s.periodRow}>
                {PERIODS.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    onPress={() => setPeriod(p.value)}
                    style={[
                      s.periodChip,
                      {
                        backgroundColor: period === p.value ? colors.accent.primary + '15' : colors.bg.card,
                        borderColor: period === p.value ? colors.accent.primary : colors.border.subtle,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.periodChipText,
                        { color: period === p.value ? colors.accent.primary : colors.text.secondary },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Category */}
          <View>
            <Text style={[s.fieldLabel, { color: colors.text.tertiary, marginBottom: 10 }]}>Category (optional)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {EXPENSE_CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.name;
                return (
                  <TouchableOpacity
                    key={cat.name}
                    onPress={() => setSelectedCategory(active ? null : cat.name)}
                    style={[
                      s.chip,
                      {
                        backgroundColor: active ? cat.color + '15' : colors.bg.card,
                        borderColor: active ? cat.color : colors.border.subtle,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <AntDesign
                      name={cat.icon as any}
                      size={14}
                      color={active ? cat.color : colors.text.tertiary}
                    />
                    <Text
                      style={[s.chipText, { color: active ? cat.color : colors.text.secondary }]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Notes */}
          <View style={[s.card, { backgroundColor: colors.bg.card, marginTop: spacing.md }]}>
            <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Notes (optional)</Text>
            <TextInput
              style={[s.input, { color: colors.text.primary }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes..."
              placeholderTextColor={colors.text.tertiary}
              multiline
            />
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
                  <Text style={s.saveText}>Create Budget</Text>
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
  grid2: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  gridLeft: { flex: 1 },
  gridRight: { flex: 1 },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  amountSign: { fontSize: 16, fontWeight: '700', marginRight: 4 },
  amountInput: { flex: 1, fontSize: 15, fontWeight: '600', padding: 0 },
  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  periodChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  periodChipText: { fontSize: 11, fontWeight: '600' },
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
