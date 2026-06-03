import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
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

const RECURRING_FREQUENCIES = ['weekly', 'monthly', 'yearly'] as const;

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
  const [paymentType, setPaymentType] = useState(editingTransaction?.metadata?.paymentType || '');
  const [date, setDate] = useState(
    (editingTransaction?.date
      ? new Date(editingTransaction.date).toISOString().split('T')[0]
      : undefined) ||
      prefill?.date ||
      new Date().toISOString().split('T')[0],
  );
  const [tags, setTags] = useState(
    ((editingTransaction?.tags as string[]) || prefill?.tags || []).join(', '),
  );
  const [notes, setNotes] = useState(editingTransaction?.notes || '');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const recurringAnim = useRef(new Animated.Value(0)).current;
  const [categories, setCategories] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(
    editingTransaction?.expenseGroupId || prefill?.groupId || '',
  );
  const [selectedGroupName, setSelectedGroupName] = useState(prefill?.groupName || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadMeta();
  }, [accessToken]);

  async function loadMeta() {
    let catData: any[] = [];
    try {
      const [catResult, grpResult] = await Promise.allSettled([
        api.get<any[]>('/categories'),
        api.get<any>('/expense-groups'),
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
        type: 'expense',
        description: description.trim(),
        date,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        isRecurring,
        recurringFrequency: isRecurring ? recurringFrequency : undefined,
        recurringEndDate: isRecurring && recurringEndDate ? recurringEndDate : undefined,
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

  const recurringHeight = isRecurring
    ? recurringAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 220],
      })
    : recurringAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 220],
      });
  const recurringOpacity = isRecurring
    ? recurringAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      })
    : recurringAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      });

  useEffect(() => {
    Animated.timing(recurringAnim, {
      toValue: isRecurring ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isRecurring, recurringAnim]);

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
      title={isEditing ? 'Edit transaction' : 'New transaction'}
      subtitle="Capture the amount, category, group, and recurrence details in one clean flow."
      icon="receipt"
      accent={[colors.accent.primary, colors.status.warning]}
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
        {(categories || []).map((cat: any) => (
          <PremiumChip
                key={cat.id}
            label={cat.name}
            selected={categoryId === cat.id}
                onPress={() => handleCategorySelect(cat)}
          />
            ))}
          </View>

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
        label="Tags"
        icon="pricetag-outline"
            value={tags}
            onChangeText={setTags}
            placeholder="food, travel, office"
      />

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
        <Text style={[styles.label, { color: colors.text.tertiary, marginTop: 0 }]}>Recurring</Text>
            <TouchableOpacity
              style={[
                styles.recurringToggle,
                { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                isRecurring && {
                  backgroundColor: `${colors.accent.primary}20`,
                  borderColor: colors.accent.primary,
                },
              ]}
              onPress={() => setIsRecurring(!isRecurring)}
            >
              <Text
                style={[
                  styles.recurringToggleText,
                  { color: colors.text.tertiary },
                  isRecurring && { color: colors.accent.primary },
                ]}
              >
                {isRecurring ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
          <Animated.View
            style={[
              styles.recurringExpanded,
              { maxHeight: recurringHeight, opacity: recurringOpacity, overflow: 'hidden' },
            ]}
          >
            <View style={{ gap: 14 }}>
              <Text style={[styles.label, { color: colors.text.tertiary, marginBottom: 4 }]}>
                Frequency
              </Text>
          <View style={premiumFormStyles.rowWrap}>
                {RECURRING_FREQUENCIES.map((frequency) => (
              <PremiumChip
                    key={frequency}
                label={frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                selected={recurringFrequency === frequency}
                    onPress={() => setRecurringFrequency(frequency)}
              />
                ))}
              </View>
              <DatePickerField
                label="End Date"
                value={recurringEndDate}
                onChange={setRecurringEndDate}
                optional
              />
            </View>
          </Animated.View>

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
  container: { flex: 1 },
  content: { padding: 24 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 24 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { fontSize: 13, flex: 1 },
  typeToggle: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 24 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  typeBtnText: { fontSize: 15, fontWeight: '600' },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  currencySymbol: { fontSize: 26, fontWeight: '700', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 26, fontWeight: '700', paddingVertical: 14 },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  notesInput: { minHeight: 96 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    width: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: { fontSize: 13 },
  helperText: { fontSize: 12, lineHeight: 18, marginTop: -2, marginBottom: 8 },
  emptyMeta: { fontSize: 14, fontStyle: 'italic' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  recurringToggle: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  recurringToggleText: { fontSize: 13, fontWeight: '600' },
  recurringExpanded: { marginTop: 12 },
  frequencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  freqChipText: { fontSize: 13 },
  saveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
