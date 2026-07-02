import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import { useTheme } from '../../theme';
import { spacing } from '../../theme/design';
import { CategoryPicker } from '../../components/ui/CategoryPicker';

const PADDING = 20;

const QUICK_AMOUNTS = ['50', '100', '200', '500', '1000', '2500', '5000', '10000'];

const SPLIT_OPTIONS = [
  { key: 'personal', icon: 'user', label: 'Personal' },
  { key: 'shared', icon: 'team', label: 'Shared' },
  { key: 'split', icon: 'git-branch-outline', label: 'Split' },
];

export function CoupleTransactionFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const p = route.params?.prefill ?? route.params;
  const expenseId = p?.expenseId;
  const rawType = p?.type || 'expense';
  const groupId = p?.groupId;
  const returnTo = p?.returnTo;
  const prefilledAmount = p?.amount as string | undefined;
  const prefilledDescription = p?.description as string | undefined;
  const prefilledCategory = p?.category as string | undefined;
  const prefilledDate = p?.date as string | undefined;

  const [type, setType] = useState<'expense' | 'income'>(rawType === 'income' ? 'income' : 'expense');
  const [amount, setAmount] = useState(prefilledAmount || '');
  const [description, setDescription] = useState(prefilledDescription || '');
  const [category, setCategory] = useState(prefilledCategory || '');
  const [dateValue, setDateValue] = useState(prefilledDate || new Date().toISOString().split('T')[0]);
  const [splitType, setSplitType] = useState<'personal' | 'shared' | 'split'>('personal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingGroup, setLoadingGroup] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const isExpense = type === 'expense';
  const [resolvedGroupId, setResolvedGroupId] = useState(groupId || '');
  const [loadingEdit, setLoadingEdit] = useState(!!expenseId);

  useEffect(() => {
    if (expenseId) {
      (async () => {
        try {
          const res = await api.get<any>(`/shared-finance/expenses/${expenseId}`);
          const e = res?.data ?? res;
          if (e) {
            setAmount(String(Number(e.amount)));
            setType('expense');
            setDescription(e.description || '');
            setCategory(e.category || '');
            setDateValue(e.date ? new Date(e.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
            setSplitType(e.splitType === 'split' ? 'split' : e.splitType === 'shared' ? 'shared' : 'personal');
            if (e.expenseGroupId) setResolvedGroupId(e.expenseGroupId);
            if (e.groupId) setResolvedGroupId(e.groupId);
          }
        } catch { /* silent */
        } finally { setLoadingEdit(false); }
      })();
    }
    setTimeout(() => inputRef.current?.focus(), 400);
    loadCategories();
    if (!groupId && !expenseId) {
      discoverGroupId();
    }
  }, []);

  async function discoverGroupId() {
    setLoadingGroup(true);
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const coupleGroup = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (coupleGroup?.id) {
        setResolvedGroupId(coupleGroup.id);
        setError('');
      } else {
        setError('No couple space found. Create one first.');
      }
    } catch {
      setError('Failed to load couple space');
    } finally {
      setLoadingGroup(false);
    }
  }

  async function loadCategories() {
    try {
      const res = await api.get<any[]>('/categories');
      setCategories(Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : []);
    } catch { /* ignore */ }
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
    if (dateValue && new Date(dateValue) > new Date()) {
      setError('Date cannot be in the future');
      return;
    }
    const gId = groupId || resolvedGroupId;
    if (!gId) {
      setError('No couple group found');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const expensePayload = {
        description: description.trim() || `${category || 'Shared'} expense`,
        amount: Number(amount),
        paidBy: user?.id || '',
        category: category || undefined,
        date: dateValue,
        splitType: splitType === 'personal' ? undefined : splitType,
      };
      if (expenseId) {
        await api.patch(`/shared-finance/expenses/${expenseId}`, expensePayload);
        showToast('Expense updated');
      } else if (isExpense) {
        await api.post(`/shared-finance/groups/${gId}/expenses`, expensePayload);
        showToast('Expense added');
      } else {
        await api.post(`/shared-finance/groups/${gId}/couple/incomes`, {
          source: description.trim() || `${category || 'Other'} income`,
          amount: Number(amount),
          categoryId: selectedCategoryId,
          date: dateValue,
        });
        showToast('Income added');
      }
      if (returnTo) {
        navigation.navigate(returnTo, { groupId: gId });
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

  if (loadingEdit) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={{ paddingTop: insets.top + 6, paddingHorizontal: PADDING }}>
            <View style={s.heroTop}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(10,10,15,0.05)' }]}
                activeOpacity={0.7}
              >
                <AntDesign name="close" size={20} color={colors.text.primary} />
              </TouchableOpacity>
              <Text style={[s.heroTitle, { color: colors.text.primary }]}>
                {isExpense ? 'Add Expense' : 'Add Income'}
              </Text>
              <View style={{ width: 36 }} />
            </View>
          </View>

          <View style={{ paddingHorizontal: PADDING, paddingTop: 14 }}>
            <View style={[s.typeToggle, { backgroundColor: colors.bg.tertiary }]}>
              {(['expense', 'income'] as const).map((t) => {
                const active = type === t;
                const tColor = t === 'expense' ? colors.status.error : colors.status.success;
                return (
                  <TouchableOpacity
                    key={t}
                    activeOpacity={0.8}
                    onPress={() => { setType(t); setError(''); }}
                    style={[s.typeBtn, active && { backgroundColor: tColor }]}
                  >
                    <AntDesign
                      name={t === 'expense' ? 'shoppingcart' : 'caretup'}
                      size={14}
                      color={active ? '#FFF' : colors.text.secondary}
                    />
                    <Text style={[s.typeLabel, { color: active ? '#FFF' : colors.text.secondary }]}>
                      {t === 'expense' ? 'Expense' : 'Income'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[s.amountCard, { backgroundColor: accentBg, borderColor: colors.border.subtle }]}>
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
                <View style={[s.errorBox, { backgroundColor: `${colors.status.error}10` }]}>
                  <AntDesign name="exclamationcircle" size={14} color={colors.status.error}  />
                  <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
                </View>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {QUICK_AMOUNTS.map((val) => {
                const selected = amount === val;
                return (
                  <TouchableOpacity
                    key={val}
                    activeOpacity={0.7}
                    onPress={() => setAmount(val)}
                    style={[s.quickChip, { backgroundColor: selected ? accentColor : colors.bg.tertiary }]}
                  >
                    <Text style={[s.quickText, { color: selected ? '#FFF' : colors.text.secondary }]}>
                      ₹{val}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ paddingHorizontal: PADDING, paddingTop: 16, gap: 16 }}>
            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Description</Text>
              <View style={[s.fieldInput, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
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
              <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Category</Text>
              <CategoryPicker value={category} onChange={setCategory} type={type} showLabel />
            </View>

            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Date</Text>
              <View style={[s.fieldInput, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
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
              <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Split Type</Text>
              <View style={[s.splitRow, { backgroundColor: colors.bg.tertiary }]}>
                {SPLIT_OPTIONS.map((opt) => {
                  const active = splitType === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      activeOpacity={0.8}
                      onPress={() => setSplitType(opt.key as typeof splitType)}
                      style={[s.splitBtn, active && { backgroundColor: accentColor }]}
                    >
                      <AntDesign name={opt.icon as any} size={14} color={active ? '#FFF' : colors.text.tertiary} />
                      <Text style={[s.splitLabel, { color: active ? '#FFF' : colors.text.secondary }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[s.footer, { paddingBottom: insets.bottom + 12, paddingHorizontal: PADDING }]}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
            style={[s.saveBtn, { backgroundColor: accentColor, opacity: saving ? 0.6 : 1 }]}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <AntDesign name={isExpense ? 'shoppingcart' : 'caretup'} size={18} color="#FFF" />
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
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center', marginRight: 36 },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: 28,
    padding: 3,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 26,
  },
  typeLabel: { fontSize: 15, fontWeight: '700' },
  amountCard: {
    borderRadius: 28,
    padding: 18,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  amountRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 4 },
  currency: { fontSize: 30, fontWeight: '800' },
  amountInput: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    textAlign: 'center',
    minWidth: 100,
    paddingVertical: 0,
    height: 44,
    lineHeight: 44,
  },
  amountHint: { fontSize: 14, fontWeight: '500' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 28,
    marginTop: 6,
    width: '100%',
  },
  errorText: { fontSize: 14, fontWeight: '600', flex: 1 },
  quickChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 28,
  },
  quickText: { fontSize: 14, fontWeight: '700' },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  fieldInput: {
    borderRadius: 28,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 50,
    justifyContent: 'center',
  },
  textInput: { fontSize: 16, fontWeight: '500', padding: 0 },
  splitRow: {
    flexDirection: 'row',
    borderRadius: 28,
    padding: 3,
    gap: 4,
  },
  splitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 28,
  },
  splitLabel: { fontSize: 15, fontWeight: '700' },
  footer: {
    paddingTop: 12,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 28,
  },
  saveText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
});
