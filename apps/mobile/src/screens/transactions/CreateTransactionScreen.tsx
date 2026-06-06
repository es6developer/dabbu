import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { DatePickerField } from '../../components/ui/DatePickerField';
import { PageContainer } from '../../components/ui/PageContainer';
import {
  PremiumActionButton,
  PremiumAmountInput,
  PremiumChip,
  PremiumError,
  PremiumFormScreen,
  PremiumInput,
  premiumFormStyles,
} from '../../components/ui';

const PAYMENT_TYPES = ['Cash', 'UPI', 'Card', 'Bank'];
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

export function CreateTransactionScreen() {
  const navigation = useNavigation<any>();

  const route = useRoute<RouteProp<{ CreateTransaction: PrefillParams }, 'CreateTransaction'>>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const prefill = route.params?.prefill;
  const editingTransaction = route.params?.transaction;
  const isEditing = Boolean(editingTransaction?.id);

  const [amount, setAmount] = useState(
    editingTransaction?.amount
      ? String(editingTransaction.amount)
      : prefill?.amount
        ? String(prefill.amount)
        : '',
  );
  const [description, setDescription] = useState(
    editingTransaction?.description || prefill?.description || '',
  );
  const [category, setCategory] = useState(
    editingTransaction?.category?.name || prefill?.categoryName || '',
  );
  const [categoryId, setCategoryId] = useState(
    editingTransaction?.categoryId || editingTransaction?.category?.id || '',
  );
  const [paymentType, setPaymentType] = useState(editingTransaction?.metadata?.paymentType || 'UPI');
  const [date, setDate] = useState(
    (editingTransaction?.date
      ? new Date(editingTransaction.date).toISOString().split('T')[0]
      : undefined) ||
      prefill?.date ||
      new Date().toISOString().split('T')[0],
  );
  const [notes, setNotes] = useState(editingTransaction?.notes || '');
  const [type, setType] = useState<'expense' | 'income'>(prefill?.type || 'expense');
  const [isRecurring, setIsRecurring] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(
    editingTransaction?.expenseGroupId || prefill?.groupId || '',
  );
  const [selectedGroupName, setSelectedGroupName] = useState(prefill?.groupName || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [customCatMode, setCustomCatMode] = useState(false);
  const [customCatName, setCustomCatName] = useState('');
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadMeta();
  }, [accessToken]);

  async function loadMeta() {
    let catData: any[] = [];
    try {
      const [catResult, grpResult, subResult] = await Promise.allSettled([
        api.get<any[]>('/categories'),
        api.get<any>('/expense-groups'),
        api.get<any>('/subscription'),
      ]);

      const catRes = catResult.status === 'fulfilled' ? catResult.value : [];
      const grpRes = grpResult.status === 'fulfilled' ? grpResult.value : [];

      catData = Array.isArray(catRes)
        ? catRes
        : Array.isArray((catRes as any)?.data)
          ? (catRes as any).data
          : [];
      setCategories(catData);
      const g = Array.isArray(grpRes)
        ? grpRes
        : Array.isArray((grpRes as any)?.data)
          ? (grpRes as any).data
          : [];
      setGroups(g);

      if (subResult.status === 'fulfilled') {
        const sub = subResult.value as any;
        setIsPremium(sub?.status === 'active');
      }

      if (catResult.status === 'rejected' && grpResult.status === 'rejected') {
        throw catResult.reason || grpResult.reason;
      }
    } catch (e: any) {
      if (catData.length === 0) {
        setError('Could not load categories: ' + (e.message || 'network error'));
      }
    } finally {
      if (prefill?.categoryName && catData.length > 0) {
        const match = catData.find(
          (c: any) => c.name?.toLowerCase() === prefill.categoryName?.toLowerCase(),
        );
        if (match) {
          setCategory(match.name);
          setCategoryId(match.id);
        }
      }
      setLoadingMeta(false);
    }
  }

  async function handleCreateCustomCategory() {
    const name = customCatName.trim();
    if (!name) return;
    try {
      const res = await api.post<any>('/categories', { name, transactionType: type });
      const newCat = res?.data || res;
      setCategories((prev) => [...prev, newCat]);
      setCategory(newCat.name);
      setCategoryId(newCat.id);
      setCustomCatMode(false);
      setCustomCatName('');
    } catch (e: any) {
      setError(e.message || 'Failed to create category');
    }
  }

  function handleCategorySelect(cat: any) {
    setCategory(categoryId === cat.id ? '' : cat.name);
    setCategoryId(categoryId === cat.id ? '' : cat.id);
  }

  async function handleSave() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Valid amount is required');
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
        description: description.trim(),
        date,
        isRecurring,
        recurringFrequency: isRecurring ? 'monthly' : undefined,
      };
      if (categoryId) {
        data.categoryId = categoryId;
      }
      if (selectedGroupId) {
        data.expenseGroupId = selectedGroupId;
      }
      if (paymentType) {
        data.paymentMethod = paymentType;
      }
      if (notes.trim()) {
        data.notes = notes.trim();
      }
      data.metadata = { ...(editingTransaction?.metadata || {}), paymentType };
      if (isEditing) {
        await api.patch(`/transactions/${editingTransaction.id}`, data);
      } else {
        await api.post('/transactions', data);
      }
      if (prefill?.returnTo === 'GroupExpenses' && selectedGroupId) {
        navigation.navigate('GroupExpenses', {
          groupId: selectedGroupId,
          groupName: selectedGroupName || prefill.groupName,
        });
      } else {
        navigation.navigate(
          isEditing ? 'TransactionDetail' : 'ExpenseHome',
          isEditing ? { transactionId: editingTransaction.id } : undefined,
        );
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create transaction');
    } finally {
      setSaving(false);
    }
  }

  if (loadingMeta) {
    return (
      <PageContainer>
        <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
          <View style={{ paddingHorizontal: 24, gap: 16, width: '100%' }}>
            <Skeleton width={120} height={16} />
            <Skeleton width="100%" height={60} borderRadius={16} />
            <Skeleton width="100%" height={60} borderRadius={16} />
            <Skeleton width="80%" height={60} borderRadius={16} />
            <Skeleton width="100%" height={120} borderRadius={16} />
          </View>
        </View>
      </PageContainer>
    );
  }

  return (
    <PremiumFormScreen
      title={isEditing ? 'Edit transaction' : type === 'income' ? 'New income' : 'New transaction'}
      subtitle={type === 'income' ? 'Record your income in one clean flow.' : 'Capture the amount, category, group, and recurrence details in one clean flow.'}
      icon={type === 'income' ? 'trending-up' : 'receipt'}
      accent={type === 'income' ? [colors.status.success, colors.accent.primary] : [colors.accent.primary, colors.status.warning]}
      hideClose
    >
      <PremiumError message={error} />
      <PremiumAmountInput label="Amount" value={amount} onChangeText={setAmount} placeholder="0" />

      <PremiumInput
        label="Description"
        icon="create-outline"
            value={description}
            onChangeText={setDescription}
            placeholder="What was this for?"
      />

      <Text style={[styles.label, { color: colors.text.tertiary }]}>Category</Text>
      <View style={premiumFormStyles.rowWrap}>
        {(categories || [])
          .filter((cat: any) => !cat.transactionType || cat.transactionType === type)
          .map((cat: any) => (
            <PremiumChip
              key={cat.id}
              label={cat.name}
              selected={categoryId === cat.id}
              icon={cat.icon as any || undefined}
              onPress={() => handleCategorySelect(cat)}
            />
          ))}
        {isPremium && !customCatMode && (
          <PremiumChip
            label="+ Custom"
            selected={false}
            icon="add-circle-outline"
            onPress={() => setCustomCatMode(true)}
          />
        )}
      </View>
      {customCatMode && (
        <View style={[styles.customCatRow, { borderColor: colors.border.subtle }]}>
          <TextInput
            style={[styles.customCatInput, { color: colors.text.primary }]}
            value={customCatName}
            onChangeText={setCustomCatName}
            placeholder="Category name"
            placeholderTextColor={colors.text.tertiary}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.customCatBtn, { backgroundColor: colors.accent.primary }]}
            onPress={handleCreateCustomCategory}
          >
            <Ionicons name="checkmark" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.customCatCancel}
            onPress={() => { setCustomCatMode(false); setCustomCatName(''); }}
          >
            <Ionicons name="close" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      )}

      <Text style={[styles.label, { color: colors.text.tertiary }]}>Payment Type</Text>
      <View style={premiumFormStyles.rowWrap}>
            {PAYMENT_TYPES.map((pt) => (
          <PremiumChip
                key={pt}
            label={pt}
            selected={paymentType === pt}
            icon={
              pt === 'Cash'
                ? 'cash-outline'
                : pt === 'UPI'
                  ? 'phone-portrait-outline'
                  : pt === 'Card'
                    ? 'card-outline'
                    : 'business-outline'
            }
                onPress={() => setPaymentType(paymentType === pt ? '' : pt)}
          />
            ))}
          </View>

      <Text style={[styles.label, { color: colors.text.tertiary }]}>
            Group (optional - tag this expense to a group)
          </Text>
      <View style={premiumFormStyles.rowWrap}>
        <PremiumChip
          label="None"
          selected={!selectedGroupId}
              onPress={() => {
                setSelectedGroupId('');
                setSelectedGroupName('');
              }}
        />
            {(groups || []).map((g: any) => (
          <PremiumChip
                key={g.id}
            label={g.name}
            icon="people-outline"
            selected={selectedGroupId === g.id}
                onPress={() => {
                  setSelectedGroupId(g.id);
                  setSelectedGroupName(g.name);
                }}
          />
            ))}
          </View>

          <DatePickerField label="Date" value={date} onChange={setDate} />

      <PremiumInput
        label="Notes"
        icon="document-text-outline"
            value={notes}
            onChangeText={setNotes}
            placeholder="Add context, receipt details, or member notes..."
            multiline
            numberOfLines={4}
      />

          <View style={styles.switchRow}>
        <Text style={[styles.label, { color: colors.text.tertiary, marginTop: 0 }]}>Recurring every month?</Text>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          trackColor={{ false: colors.border.subtle, true: `${colors.accent.primary}60` }}
          thumbColor={isRecurring ? colors.accent.primary : colors.text.tertiary}
        />
          </View>

      <PremiumActionButton
        title={isEditing ? 'Save changes' : 'Create transaction'}
        onPress={handleSave}
        loading={saving}
        icon="checkmark"
      />
    </PremiumFormScreen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  customCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    paddingLeft: 12,
  },
  customCatInput: { flex: 1, fontSize: 14, paddingVertical: 8 },
  customCatBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  customCatCancel: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
