import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import { useTheme } from '../../theme';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { FormField } from '../../components/ui/FormField';
import { DatePickerField } from '../../components/ui/DatePickerField';
import { CategoryPicker } from '../../components/ui/CategoryPicker';
import { LinearGradient } from 'expo-linear-gradient';

import { palette } from '../../theme/colors';
const PURPLE = palette.brand.primary;
const PURPLE_DARK = palette.brand.hover;
const GREEN = '#10B981';

type PrefillParams = {
  prefill?: {
    amount?: number;
    description?: string;
    categoryName?: string;
    date?: string;
    tags?: string[];
    groupId?: string;
    groupName?: string;
    returnTo?: string;
    type?: 'expense' | 'income';
  };
  transaction?: any;
};

const QUICK_AMOUNTS_EXPENSE = ['20', '50', '100', '200', '500', '1000', '2000', '5000'];
const QUICK_AMOUNTS_INCOME = ['500', '1000', '5000', '10000', '25000', '50000'];

export function CreateTransactionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ CreateTransaction: PrefillParams }, 'CreateTransaction'>>();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const prefill = route.params?.prefill;
  const editingTransaction = route.params?.transaction;
  const isEditing = Boolean(editingTransaction?.id);
  const inputRef = useRef<TextInput>(null);
  const { showToast } = useToast();

  const date =
    (editingTransaction?.date
      ? new Date(editingTransaction.date).toISOString().split('T')[0]
      : undefined) ||
    prefill?.date ||
    new Date().toISOString().split('T')[0];

  const [amount, setAmount] = useState(
    editingTransaction?.amount
      ? String(editingTransaction.amount)
      : prefill?.amount
        ? String(prefill.amount)
        : '',
  );
  const [type, setType] = useState<'expense' | 'income'>(prefill?.type || 'expense');
  const [category, setCategory] = useState(
    editingTransaction?.category?.name || prefill?.categoryName || '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [description, setDescription] = useState(
    editingTransaction?.description || prefill?.description || '',
  );
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dateValue, setDateValue] = useState(date);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = description.trim();
    if (trimmed.length < 4) {
      setSuggestedCategory(null);
      return;
    }
    setSuggesting(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.post<{ data?: { suggestion?: string; category?: string } }>(
          '/ai/categories/suggest',
          { description: trimmed },
        );
        const cat = (res as any)?.data?.suggestion || (res as any)?.data?.category || '';
        setSuggestedCategory(cat || null);
        if (cat && !category) setCategory(cat);
      } catch {
        /* silent */
      } finally {
        setSuggesting(false);
      }
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [description]);

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadCategories();
  }, [accessToken]);

  async function loadCategories() {
    try {
      const res = await api.get<any[]>('/categories');
      setCategories(
        Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : [],
      );
    } catch {
      /* empty */
    } finally {
      setLoadingMeta(false);
    }
  }

  async function handleSave() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setError('');
    setSaving(true);
    if (accessToken) {
      setAccessToken(accessToken);
    }
    try {
      const data: any = {
        amount: Number(amount),
        type,
        description: description.trim() || `${category} expense`,
        date: dateValue || date,
      };
      if (prefill?.groupId) {
        data.expenseGroupId = prefill.groupId;
      }
      if (isEditing) {
        await api.patch(`/transactions/${editingTransaction.id}`, data);
        showToast('Transaction updated');
      } else {
        await api.post('/transactions', data);
        showToast('Transaction created');
      }
      if (!isEditing && prefill?.returnTo) {
        navigation.navigate(prefill.returnTo, { groupId: prefill.groupId, groupName: prefill.groupName });
      } else {
        navigation.navigate(
          isEditing ? 'TransactionDetail' : 'ExpenseHome',
          isEditing ? { transactionId: editingTransaction.id } : undefined,
        );
      }
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const quickAmounts = type === 'income' ? QUICK_AMOUNTS_INCOME : QUICK_AMOUNTS_EXPENSE;

  if (loadingMeta) {
    return (
      <View style={[s.loading, { backgroundColor: colors.bg.primary }]}>
        <View style={{ width: '100%', padding: 20, gap: 16 }}>
          <Skeleton width={140} height={22} />
          <Skeleton width="100%" height={180} borderRadius={24} />
          <Skeleton width="100%" height={120} borderRadius={16} />
        </View>
      </View>
    );
  }

  const isExpense = type === 'expense';

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={{ gap: 20 }}>
            {/* Type Toggle */}
            <View style={[s.toggle, { backgroundColor: colors.bg.tertiary }]}>
              {(['expense', 'income'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  activeOpacity={0.8}
                  onPress={() => {
                    setType(t);
                    setError('');
                  }}
                  style={[
                    s.toggleBtn,
                    {
                      backgroundColor:
                        type === t ? (t === 'income' ? GREEN : PURPLE) : 'transparent',
                    },
                  ]}
                >
                  <AntDesign
                    name={(t === 'expense' ? 'shoppingcart' : 'arrowup') as any}
                    size={14}
                    color={type === t ? '#FFF' : colors.text.secondary}
                  />
                  <Text
                    style={[s.toggleText, { color: type === t ? '#FFF' : colors.text.secondary }]}
                  >
                    {t === 'expense' ? 'Expense' : 'Income'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount */}
            <View style={[s.amountCard, { backgroundColor: `${isExpense ? PURPLE : GREEN}08` }]}>
              <View style={s.amountRow}>
                <Text style={[s.amountCurrency, { color: colors.text.primary }]}>₹</Text>
                <TextInput
                  ref={inputRef}
                  style={[s.amountInput, { color: colors.text.primary }]}
                  value={amount}
                  onChangeText={(text) => {
                    const c = text.replace(/[^0-9.]/g, '');
                    if (c.split('.').length - 1 <= 1) {
                      setAmount(c);
                      setError('');
                    }
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  returnKeyType="done"
                  onSubmitEditing={() => (inputRef.current as any)?.blur?.()}
                />
              </View>
              <Text style={[s.amountHint, { color: colors.text.tertiary }]}>
                {isExpense ? 'How much did you spend?' : 'How much did you receive?'}
              </Text>
              {error ? (
                <View style={s.errorRow}>
                  <AntDesign  name="exclamationcircle" size={14} color={colors.status.error} />
                  <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
                </View>
              ) : null}
            </View>

            {/* Quick Amounts */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              {quickAmounts.map((val) => (
                <TouchableOpacity
                  key={val}
                  activeOpacity={0.7}
                  onPress={() => setAmount(val)}
                  style={[
                    s.quickChip,
                    {
                      backgroundColor:
                        amount === val ? `${isExpense ? PURPLE : GREEN}15` : colors.bg.card,
                      borderColor:
                        amount === val ? (isExpense ? PURPLE : GREEN) : colors.border.subtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.quickChipText,
                      {
                        color:
                          amount === val ? (isExpense ? PURPLE : GREEN) : colors.text.secondary,
                      },
                    ]}
                  >
                    ₹{val}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Description */}
            <FormField
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="What was this for?"
            />

            {/* Category */}
            {(suggestedCategory || suggesting) && (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: -12, marginTop: -8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <AntDesign  name="star" size={12} color={PURPLE} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: suggesting ? colors.text.tertiary : PURPLE }}>
                    {suggesting ? 'Suggesting...' : `AI: ${suggestedCategory}`}
                  </Text>
                </View>
              </View>
            )}
            <CategoryPicker
              value={category}
              onChange={setCategory}
              type={type}
              showLabel
            />
            <DatePickerField
              label="Date"
              value={dateValue}
              onChange={setDateValue}
            />
          </View>
        </ScrollView>
        {/* Save */}
        <View style={{ paddingHorizontal: 20, paddingBottom: tabBarHeight + 12 }}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
            style={[s.saveBtnWrap, saving && { opacity: 0.6 }]}
          >
            <LinearGradient
              colors={isExpense ? [PURPLE, PURPLE_DARK] : [GREEN, '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.saveGrad}
            >
              <AntDesign
                name={(saving ? 'hourglass' : isExpense ? 'shoppingcart' : 'arrowup') as any}
                size={18}
                color="#FFF"
              />
              <Text style={s.saveText}>
                {saving
                  ? 'Saving...'
                  : isEditing
                    ? 'Update'
                    : isExpense
                      ? 'Add Expense'
                      : 'Add Income'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },


  toggle: { flexDirection: 'row', borderRadius: 14, padding: 3 },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  toggleText: { fontSize: 13, fontWeight: '700' },

  amountCard: { borderRadius: 24, padding: 24, alignItems: 'center', gap: 4 },
  amountRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 2 },
  amountCurrency: { fontSize: 36, fontWeight: '800' },
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
  amountHint: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.1)',
    marginTop: 12,
    width: '100%',
  },
  errorText: { fontSize: 12, fontWeight: '600', flex: 1 },

  quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  quickChipText: { fontSize: 13, fontWeight: '700' },

  saveBtnWrap: { borderRadius: 18, overflow: 'hidden', marginTop: 4 },
  saveGrad: {
    flexDirection: 'row',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
