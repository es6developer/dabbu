import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';
import { CategoryPicker } from '../../components/ui/CategoryPicker';

const QUICK_AMOUNTS = ['50', '100', '200', '500', '1000', '2500', '5000', '10000'];

interface PrefillParams {
  prefill?: {
    groupId?: string;
    groupName?: string;
    returnTo?: string;
    type?: 'expense' | 'income';
    amount?: number;
    description?: string;
    categoryName?: string;
    date?: string;
  };
}

const SPLIT_OPTIONS = [
  { key: 'personal', icon: 'person-outline', label: 'Personal' },
  { key: 'shared', icon: 'people-outline', label: 'Shared' },
  { key: 'split', icon: 'git-branch-outline', label: 'Split' },
];

export function CoupleTransactionFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ CoupleTransactionForm: PrefillParams }, 'CoupleTransactionForm'>>();
  const { accessToken, user } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const prefill = route.params?.prefill;
  const { showToast } = useToast();

  const [type, setType] = useState<'expense' | 'income'>(prefill?.type || 'expense');
  const [amount, setAmount] = useState(prefill?.amount ? String(prefill.amount) : '');
  const [description, setDescription] = useState(prefill?.description || '');
  const [category, setCategory] = useState(prefill?.categoryName || '');
  const [dateValue, setDateValue] = useState(prefill?.date || new Date().toISOString().split('T')[0]);
  const [splitType, setSplitType] = useState<'personal' | 'shared' | 'split'>('personal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<any[]>([]);

  const inputRef = useRef<TextInput>(null);
  const isExpense = type === 'expense';

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 400);
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const res = await api.get<any[]>('/categories');
      setCategories(Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : []);
    } catch {}
  }

  const selectedCategoryId = useMemo(() => {
    if (!category || !categories.length) return null;
    const found = categories.find((c: any) => c.name === category || c.id === category);
    return found?.id || null;
  }, [category, categories]);

  async function handleSave() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!prefill?.groupId) {
      setError('No couple group found');
      return;
    }
    setError('');
    setSaving(true);
    if (accessToken) setAccessToken(accessToken);
    try {
      if (isExpense) {
        await api.post(`/shared-finance/groups/${prefill.groupId}/expenses`, {
          description: description.trim() || `${category || 'Shared'} expense`,
          amount: Number(amount),
          paidBy: user?.id || 'me',
          category: category || undefined,
          date: dateValue,
          splitType: splitType === 'personal' ? undefined : splitType,
        });
        showToast('Expense added');
      } else {
        await api.post(`/shared-finance/groups/${prefill.groupId}/couple/incomes`, {
          source: description.trim() || `${category || 'Other'} income`,
          amount: Number(amount),
          categoryId: selectedCategoryId,
          date: dateValue,
        });
        showToast('Income added');
      }
      if (prefill?.returnTo) {
        navigation.navigate(prefill.returnTo, { groupId: prefill.groupId, groupName: prefill.groupName });
      } else {
        navigation.goBack();
      }
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const accentColor = isExpense ? '#DC2626' : '#22C55E';
  const accentBg = isExpense ? `${accentColor}10` : `${accentColor}10`;

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={[s.hero, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', paddingTop: insets.top + spacing.md }]}>
            <View style={s.heroTop}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={s.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
              <Text style={[s.heroTitle, { color: colors.text.primary }]}>
                {isExpense ? 'Add Expense' : 'Add Income'}
              </Text>
              <View style={{ width: 36 }} />
            </View>

            <View style={[s.typeToggle, { backgroundColor: colors.bg.tertiary }]}>
              {(['expense', 'income'] as const).map((t) => {
                const active = type === t;
                const tColor = t === 'expense' ? '#DC2626' : '#22C55E';
                return (
                  <TouchableOpacity
                    key={t}
                    activeOpacity={0.8}
                    onPress={() => { setType(t); setError(''); }}
                    style={[s.typeBtn, active && { backgroundColor: tColor }]}
                  >
                    <Ionicons
                      name={t === 'expense' ? 'cart-outline' : 'trending-up-outline'}
                      size={16}
                      color={active ? '#FFF' : colors.text.secondary}
                    />
                    <Text style={[s.typeLabel, { color: active ? '#FFF' : colors.text.secondary }]}>
                      {t === 'expense' ? 'Expense' : 'Income'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[s.amountCard, { backgroundColor: accentBg }]}>
              <View style={s.amountRow}>
                <Text style={[s.currency, { color: colors.text.primary }]}>₹</Text>
                <TextInput
                  ref={inputRef}
                  style={[s.amountInput, { color: colors.text.primary }]}
                  value={amount}
                  onChangeText={(t) => {
                    const c = t.replace(/[^0-9.]/g, '');
                    if (c.split('.').length - 1 <= 1) { setAmount(c); setError(''); }
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                />
              </View>
              <Text style={[s.amountHint, { color: colors.text.tertiary }]}>
                {isExpense ? 'How much did you spend?' : 'How much did you receive?'}
              </Text>
              {error ? (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle" size={14} color={colors.status.error} />
                  <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
                </View>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing['2xl'] }}>
              {QUICK_AMOUNTS.map((val) => {
                const selected = amount === val;
                return (
                  <TouchableOpacity
                    key={val}
                    activeOpacity={0.7}
                    onPress={() => setAmount(val)}
                    style={[s.quickChip, { backgroundColor: selected ? accentColor : colors.bg.card, borderColor: selected ? accentColor : colors.border.subtle }]}
                  >
                    <Text style={[s.quickText, { color: selected ? '#FFF' : colors.text.secondary }]}>
                      ₹{val}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ paddingHorizontal: spacing['2xl'], paddingTop: spacing['2xl'], gap: spacing.xl }}>
            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: colors.text.secondary }]}>Description</Text>
              <View style={[s.fieldInput, { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7', borderColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                <TextInput
                  style={[s.textInput, { color: colors.text.primary }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What was this for?"
                  placeholderTextColor={colors.text.tertiary}
                />
              </View>
            </View>

            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: colors.text.secondary }]}>Category</Text>
              <CategoryPicker value={category} onChange={setCategory} type={type} showLabel />
            </View>

            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: colors.text.secondary }]}>Date</Text>
              <View style={[s.fieldInput, { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7', borderColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                <TextInput
                  style={[s.textInput, { color: colors.text.primary }]}
                  value={dateValue}
                  onChangeText={setDateValue}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.text.tertiary}
                />
              </View>
            </View>

            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: colors.text.secondary }]}>Split Type</Text>
              <View style={[s.splitRow, { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7' }]}>
                {SPLIT_OPTIONS.map((opt) => {
                  const active = splitType === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      activeOpacity={0.8}
                      onPress={() => setSplitType(opt.key as typeof splitType)}
                      style={[s.splitBtn, active && { backgroundColor: isExpense ? '#DC2626' : '#22C55E' }]}
                    >
                      <Ionicons name={opt.icon as any} size={15} color={active ? '#FFF' : colors.text.tertiary} />
                      <Text style={[s.splitLabel, { color: active ? '#FFF' : colors.text.secondary }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[s.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
            style={[s.saveBtn, { backgroundColor: accentColor, opacity: saving ? 0.6 : 1 }]}
          >
            {saving ? (
              <Text style={s.saveText}>Saving...</Text>
            ) : (
              <>
                <Ionicons name={isExpense ? 'cart-outline' : 'trending-up-outline'} size={18} color="#FFF" />
                <Text style={s.saveText}>{isExpense ? 'Add Expense' : 'Add Income'}</Text>
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
  hero: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    paddingBottom: spacing.xl,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.md,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(128,128,128,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 17, fontWeight: '700' },
  typeToggle: {
    flexDirection: 'row',
    marginHorizontal: spacing['2xl'],
    borderRadius: 14,
    padding: 3,
    marginBottom: spacing.xl,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  typeLabel: { fontSize: 13, fontWeight: '700' },
  amountCard: {
    marginHorizontal: spacing['2xl'],
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  amountRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 2 },
  currency: { fontSize: 36, fontWeight: '800' },
  amountInput: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -2,
    textAlign: 'center',
    minWidth: 120,
    paddingVertical: 0,
    height: 60,
    lineHeight: 60,
  },
  amountHint: { fontSize: 13, fontWeight: '500', marginTop: spacing.xs },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.1)',
    marginTop: spacing.sm,
    width: '100%',
  },
  errorText: { fontSize: 12, fontWeight: '600', flex: 1 },
  quickChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickText: { fontSize: 13, fontWeight: '700' },
  fieldGroup: { gap: spacing.sm },
  fieldLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  fieldInput: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 48,
    justifyContent: 'center',
  },
  textInput: { fontSize: 16, fontWeight: '500', padding: 0 },
  splitRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    gap: 3,
  },
  splitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: 12,
  },
  splitLabel: { fontSize: 12, fontWeight: '700' },
  footer: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 18,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  saveText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
