import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import { useTheme } from '../../theme';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import {
  FormAmountField,
  FormField,
  FormCategoryPicker,
  FormDatePicker,
  FormFooter,
  FormError,
  FormSection,
} from '../../components/forms';

const QUICK_AMOUNTS_EXPENSE = ['20', '50', '100', '200', '500', '1000', '2000', '5000'];
const QUICK_AMOUNTS_INCOME = ['500', '1000', '5000', '10000', '25000', '50000'];

const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: 'fast-food', color: '#F97316' },
  { name: 'Travel', icon: 'airplane', color: '#3B82F6' },
  { name: 'Bills', icon: 'receipt', color: '#14B8A6' },
  { name: 'Shopping', icon: 'cart', color: '#EC4899' },
  { name: 'Groceries', icon: 'basket', color: '#22C55E' },
  { name: 'Entertainment', icon: 'film', color: '#8B5CF6' },
  { name: 'Salary', icon: 'wallet', color: '#10B981' },
  { name: 'Other', icon: 'ellipsis-horizontal', color: '#6B7280' },
];

type PrefillParams = {
  prefill?: {
    amount?: number;
    description?: string;
    categoryName?: string;
    date?: string;
    groupId?: string;
    returnTo?: string;
    type?: 'expense' | 'income';
  };
  transaction?: any;
};

export function CreateTransactionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ CreateTransaction: PrefillParams }, 'CreateTransaction'>>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const prefill = route.params?.prefill;
  const editingTransaction = route.params?.transaction;
  const isEditing = Boolean(editingTransaction?.id);

  const transactionDate =
    (editingTransaction?.date
      ? new Date(editingTransaction.date).toISOString().split('T')[0]
      : undefined) ||
    prefill?.date ||
    new Date().toISOString().split('T')[0];

  const [amount, setAmount] = useState(
    editingTransaction?.amount ? String(editingTransaction.amount) : prefill?.amount ? String(prefill.amount) : '',
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
  const [dateValue, setDateValue] = useState(transactionDate);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = description.trim();
    if (trimmed.length < 4) { setSuggestedCategory(null); return; }
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
      } catch {} finally {
        setSuggesting(false);
      }
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [description]);

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadCategories();
  }, [accessToken]);

  async function loadCategories() {
    try {
      const res = await api.get<any[]>('/categories');
      setCategories(
        Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : [],
      );
    } catch {} finally {
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
    if (accessToken) setAccessToken(accessToken);
    try {
      const data: any = {
        amount: Number(amount),
        type,
        description: description.trim() || `${category} expense`,
        date: dateValue || transactionDate,
      };
      if (isEditing) {
        await api.patch(`/transactions/${editingTransaction.id}`, data);
        showToast('Transaction updated');
      } else {
        await api.post('/transactions', data);
        showToast('Transaction created');
      }
      navigation.navigate(
        isEditing ? 'TransactionDetail' : 'ExpenseHome',
        isEditing ? { transactionId: editingTransaction.id } : undefined,
      );
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const quickAmounts = type === 'income' ? QUICK_AMOUNTS_INCOME : QUICK_AMOUNTS_EXPENSE;
  const catList = categories.length > 0
    ? categories.map((c: any) => ({ name: c.name || c, icon: c.icon || 'tag', color: c.color || colors.accent.primary }))
    : DEFAULT_CATEGORIES;

  if (loadingMeta) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.primary, padding: 20, gap: 16 }}>
        <Skeleton width={140} height={22} />
        <Skeleton width="100%" height={180} borderRadius={24} />
        <Skeleton width="100%" height={120} borderRadius={16} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary, paddingTop: insets.top }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ paddingTop: 12, paddingBottom: 24 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text.primary, marginBottom: 4 }}>
              {isEditing ? 'Edit Transaction' : 'Add Transaction'}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.secondary }}>
              {isEditing ? 'Update your transaction details' : 'Record your transaction'}
            </Text>
          </View>

          <FormAmountField
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            type={type}
            onTypeChange={setType}
            quickAmounts={quickAmounts}
            error={error}
            autoFocus
          />

          <FormSection title="Details">
            <FormField
              label="Description"
              icon="edit"
              value={description}
              onChangeText={setDescription}
              placeholder="What was this for?"
            />
            {(suggestedCategory || suggesting) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <AntDesign name="star" size={12} color={colors.status.info} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: suggesting ? colors.text.tertiary : colors.status.info }}>
                  {suggesting ? 'Suggesting...' : `AI: ${suggestedCategory}`}
                </Text>
              </View>
            )}
            <FormCategoryPicker
              label="Category"
              selected={category}
              categories={catList}
              onChange={setCategory}
            />
            <FormDatePicker label="Date" value={dateValue} onChange={setDateValue} />
          </FormSection>

          <View style={{ paddingTop: 8 }}>
            <FormFooter
              title={isEditing ? 'Update Transaction' : type === 'expense' ? 'Add Expense' : 'Add Income'}
              icon={saving ? 'hourglass' : 'checkcircleo'}
              loading={saving}
              onPress={handleSave}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
