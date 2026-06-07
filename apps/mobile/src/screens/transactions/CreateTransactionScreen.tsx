import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { DatePickerField } from '../../components/ui/DatePickerField';

const PAYMENT_TYPES = [
  { key: 'Cash', icon: 'cash-outline' },
  { key: 'UPI', icon: 'phone-portrait-outline' },
  { key: 'Card', icon: 'card-outline' },
  { key: 'Bank', icon: 'business-outline' },
];

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  Food: { icon: 'fast-food', color: '#FF6B6B' },
  'Food & Dining': { icon: 'restaurant', color: '#FF6B6B' },
  Groceries: { icon: 'basket', color: '#FDCB6E' },
  Transport: { icon: 'car', color: '#74B9FF' },
  Transportation: { icon: 'car', color: '#74B9FF' },
  Shopping: { icon: 'bag', color: '#FD79A8' },
  Entertainment: { icon: 'film', color: '#A29BFE' },
  Bills: { icon: 'document', color: '#E17055' },
  'Bills & Utilities': { icon: 'flash', color: '#E17055' },
  Rent: { icon: 'home', color: '#00CEC9' },
  Healthcare: { icon: 'medkit', color: '#FF7675' },
  Health: { icon: 'fitness', color: '#FF7675' },
  Education: { icon: 'school', color: '#74B9FF' },
  Travel: { icon: 'airplane', color: '#81ECEC' },
  Salary: { icon: 'cash', color: '#00B894' },
  'Salary & Income': { icon: 'cash', color: '#00B894' },
  Investment: { icon: 'trending-up', color: '#6C5CE7' },
  Savings: { icon: 'piggy-bank', color: '#FDCB6E' },
  Gifts: { icon: 'gift', color: '#FD79A8' },
  Donations: { icon: 'heart', color: '#FF7675' },
  Subscriptions: { icon: 'refresh', color: '#A29BFE' },
  Insurance: { icon: 'shield-checkmark', color: '#00CEC9' },
  Coffee: { icon: 'cafe', color: '#E17055' },
  'Eating Out': { icon: 'pizza', color: '#FF6B6B' },
  Pets: { icon: 'paw', color: '#FDCB6E' },
  Clothing: { icon: 'shirt', color: '#FD79A8' },
  Electronics: { icon: 'laptop', color: '#74B9FF' },
  Maintenance: { icon: 'hammer', color: '#636E72' },
  Taxes: { icon: 'receipt', color: '#E17055' },
  Transfer: { icon: 'swap-horizontal', color: '#6C5CE7' },
  'Credit Card': { icon: 'card', color: '#A29BFE' },
  Loan: { icon: 'cash', color: '#FF6B6B' },
};

function catMeta(name: string): { icon: string; color: string } {
  return CATEGORY_META[name] || { icon: 'grid-outline', color: '#B2BEC3' };
}

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
  const { colors, isDark } = useTheme();
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
    if (accessToken) setAccessToken(accessToken);
    loadMeta();
  }, [accessToken]);

  useEffect(() => {
    if (!route.params?.transaction) return;
    const t = route.params.transaction;
    setAmount(t.amount ? String(t.amount) : '');
    setDescription(t.description || '');
    setCategory(t.category?.name || '');
    setCategoryId(t.categoryId || t.category?.id || '');
    setPaymentType(t.metadata?.paymentType || 'UPI');
    const d = t.date ? new Date(t.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    setDate(d);
    setNotes(t.notes || '');
    setSelectedGroupId(t.expenseGroupId || '');
    setSelectedGroupName('');
    setIsRecurring(t.isRecurring || t.recurringFrequency === 'monthly');
  }, [route.params?.transaction?.id]);

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
      catData = Array.isArray(catRes) ? catRes : Array.isArray((catRes as any)?.data) ? (catRes as any).data : [];
      setCategories(catData);
      const g = Array.isArray(grpRes) ? grpRes : Array.isArray((grpRes as any)?.data) ? (grpRes as any).data : [];
      setGroups(g);
      if (subResult.status === 'fulfilled') {
        const sub = subResult.value as any;
        setIsPremium(sub?.status === 'active');
      }
      if (catResult.status === 'rejected' && grpResult.status === 'rejected') {
        throw catResult.reason || grpResult.reason;
      }
    } catch (e: any) {
      if (catData.length === 0) setError('Could not load categories: ' + (e.message || 'network error'));
    } finally {
      if (prefill?.categoryName && catData.length > 0) {
        const match = catData.find((c: any) => c.name?.toLowerCase() === prefill.categoryName?.toLowerCase());
        if (match) { setCategory(match.name); setCategoryId(match.id); }
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
    if (accessToken) setAccessToken(accessToken);
    try {
      const data: any = {
        amount: Number(amount), type,
        description: description.trim(), date,
        isRecurring, recurringFrequency: isRecurring ? 'monthly' : undefined,
      };
      if (categoryId) data.categoryId = categoryId;
      if (selectedGroupId) data.expenseGroupId = selectedGroupId;
      if (paymentType) data.paymentMethod = paymentType;
      if (notes.trim()) data.notes = notes.trim();
      data.metadata = { ...(editingTransaction?.metadata || {}), paymentType };
      if (isEditing) {
        await api.patch(`/transactions/${editingTransaction.id}`, data);
      } else {
        await api.post('/transactions', data);
      }
      if (prefill?.returnTo === 'GroupExpenses' && selectedGroupId) {
        navigation.navigate('GroupExpenses', { groupId: selectedGroupId, groupName: selectedGroupName || prefill.groupName });
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
      <View style={[st.loading, { backgroundColor: colors.bg.primary }]}>
        <View style={{ width: '100%', padding: 24, gap: 16 }}>
          <Skeleton width={140} height={22} />
          <Skeleton width="100%" height={100} borderRadius={20} />
          <Skeleton width="100%" height={56} borderRadius={16} />
          <Skeleton width="80%" height={56} borderRadius={16} />
          <Skeleton width="100%" height={200} borderRadius={16} />
        </View>
      </View>
    );
  }

  const accentStart = type === 'income' ? colors.status.success : colors.accent.primary;
  const accentEnd = type === 'income' ? colors.accent.primary : colors.status.warning;

  return (
    <View style={[st.screen, { backgroundColor: colors.bg.primary }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={[st.header, { paddingTop: Platform.OS === 'ios' ? 60 : 20 }]}>
          <View style={st.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[st.backBtn, { backgroundColor: colors.bg.tertiary }]}>
              <Ionicons name="close" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[st.headerTitle, { color: colors.text.primary }]}>
              {isEditing ? 'Edit' : type === 'income' ? 'Add Income' : 'Add Expense'}
            </Text>
            <View style={{ width: 38 }} />
          </View>
        </View>

        <View style={st.typeToggle}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => { setType('expense'); setError(''); }}
            style={[st.typeBtn, type === 'expense' && { backgroundColor: colors.accent.primary }]}
          >
            <Ionicons name="cart-outline" size={16} color={type === 'expense' ? '#FFF' : colors.text.tertiary} />
            <Text style={[st.typeLabel, { color: type === 'expense' ? '#FFF' : colors.text.tertiary }]}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => { setType('income'); setError(''); }}
            style={[st.typeBtn, type === 'income' && { backgroundColor: colors.status.success }]}
          >
            <Ionicons name="trending-up" size={16} color={type === 'income' ? '#FFF' : colors.text.tertiary} />
            <Text style={[st.typeLabel, { color: type === 'income' ? '#FFF' : colors.text.tertiary }]}>Income</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={[st.errorBox, { backgroundColor: `${colors.status.error}15` }]}>
            <Ionicons name="alert-circle" size={16} color={colors.status.error} />
            <Text style={[st.errorText, { color: colors.status.error }]}>{error}</Text>
          </View>
        ) : null}

        <View style={[st.amountCard, { backgroundColor: colors.bg.secondary }]}>
          <Text style={[st.currencySymbol, { color: colors.text.secondary }]}>₹</Text>
          <TextInput
            style={[st.amountInput, { color: colors.text.primary }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="decimal-pad"
            autoFocus={!amount}
          />
        </View>

        <View style={st.sectionCard}>
          <View style={[st.inputRow, { borderBottomColor: colors.border.subtle }]}>
            <Ionicons name="create-outline" size={18} color={colors.text.tertiary} />
            <TextInput
              style={[st.textInput, { color: colors.text.primary }]}
              value={description}
              onChangeText={setDescription}
              placeholder="What was this for?"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
          <View style={[st.inputRow, { borderBottomColor: colors.border.subtle }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.text.tertiary} />
            <DatePickerField label="" value={date} onChange={setDate} inline />
          </View>
          <View style={st.inputRow}>
            <Ionicons name="document-text-outline" size={18} color={colors.text.tertiary} />
            <TextInput
              style={[st.textInput, { color: colors.text.primary }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes..."
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
        </View>

        <Text style={[st.secLabel, { color: colors.text.tertiary }]}>Category</Text>
        <View style={st.catGrid}>
          {categories
            .filter((cat: any) => !cat.transactionType || cat.transactionType === type)
            .map((cat: any) => {
              const { icon, color } = catMeta(cat.name);
              const sel = categoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.7}
                  onPress={() => handleCategorySelect(cat)}
                  style={[st.catItem, sel && { backgroundColor: `${color}15`, borderColor: color }]}
                >
                  <View style={[st.catIcon, { backgroundColor: sel ? color : `${color}18` }]}>
                    <Ionicons name={icon as any} size={20} color={sel ? '#FFF' : color} />
                  </View>
                  <Text style={[st.catName, { color: sel ? color : colors.text.secondary }]} numberOfLines={1}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          {isPremium && !customCatMode && (
            <TouchableOpacity activeOpacity={0.7} onPress={() => setCustomCatMode(true)} style={[st.catItem, { borderColor: colors.border.subtle, borderStyle: 'dashed' }]}>
              <View style={[st.catIcon, { backgroundColor: colors.bg.tertiary }]}>
                <Ionicons name="add-circle-outline" size={20} color={colors.text.tertiary} />
              </View>
              <Text style={[st.catName, { color: colors.text.tertiary }]}>Custom</Text>
            </TouchableOpacity>
          )}
        </View>
        {customCatMode && (
          <View style={[st.customCatRow, { borderColor: colors.border.subtle }]}>
            <TextInput
              style={[st.customCatInput, { color: colors.text.primary }]}
              value={customCatName} onChangeText={setCustomCatName}
              placeholder="Category name" placeholderTextColor={colors.text.tertiary} autoFocus
            />
            <TouchableOpacity onPress={handleCreateCustomCategory} style={[st.customCatBtn, { backgroundColor: colors.accent.primary }]}>
              <Ionicons name="checkmark" size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setCustomCatMode(false); setCustomCatName(''); }} style={st.customCatCancel}>
              <Ionicons name="close" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        )}

        <Text style={[st.secLabel, { color: colors.text.tertiary }]}>Payment</Text>
        <View style={st.payRow}>
          {PAYMENT_TYPES.map((pt) => (
            <TouchableOpacity
              key={pt.key}
              activeOpacity={0.7}
              onPress={() => setPaymentType(paymentType === pt.key ? '' : pt.key)}
              style={[
                st.payChip,
                { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                paymentType === pt.key && { backgroundColor: `${accentStart}18`, borderColor: accentStart },
              ]}
            >
              <Ionicons name={pt.icon as any} size={18} color={paymentType === pt.key ? accentStart : colors.text.tertiary} />
              <Text style={[st.payLabel, { color: paymentType === pt.key ? accentStart : colors.text.secondary }]}>{pt.key}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[st.secLabel, { color: colors.text.tertiary }]}>Group</Text>
        <View style={st.payRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => { setSelectedGroupId(''); setSelectedGroupName(''); }}
            style={[
              st.payChip,
              { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
              !selectedGroupId && { backgroundColor: `${accentStart}18`, borderColor: accentStart },
            ]}
          >
            <Ionicons name="close-outline" size={18} color={!selectedGroupId ? accentStart : colors.text.tertiary} />
            <Text style={[st.payLabel, { color: !selectedGroupId ? accentStart : colors.text.secondary }]}>None</Text>
          </TouchableOpacity>
          {groups.map((g: any) => (
            <TouchableOpacity
              key={g.id}
              activeOpacity={0.7}
              onPress={() => { setSelectedGroupId(g.id); setSelectedGroupName(g.name); }}
              style={[
                st.payChip,
                { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                selectedGroupId === g.id && { backgroundColor: `${accentStart}18`, borderColor: accentStart },
              ]}
            >
              <Ionicons name="people-outline" size={18} color={selectedGroupId === g.id ? accentStart : colors.text.tertiary} />
              <Text style={[st.payLabel, { color: selectedGroupId === g.id ? accentStart : colors.text.secondary }]} numberOfLines={1}>{g.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[st.switchCard, { backgroundColor: colors.bg.secondary }]}>
          <View style={{ flex: 1 }}>
            <Text style={[st.switchLabel, { color: colors.text.primary }]}>Recurring every month?</Text>
            <Text style={[st.switchSub, { color: colors.text.tertiary }]}>This will repeat automatically</Text>
          </View>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: colors.border.subtle, true: `${accentStart}60` }}
            thumbColor={isRecurring ? accentStart : colors.text.tertiary}
          />
        </View>

        <View style={st.footer}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={saving}
            style={[st.submitBtn, { backgroundColor: accentStart, opacity: saving ? 0.6 : 1 }]}
          >
            {saving ? (
              <Text style={st.submitText}>Saving...</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={st.submitText}>{isEditing ? 'Save Changes' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  typeToggle: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 4, marginBottom: 14,
    borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(128,128,128,0.15)',
  },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, borderRadius: 12, margin: 2 },
  typeLabel: { fontSize: 14, fontWeight: '700' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, padding: 12, borderRadius: 12, marginBottom: 12 },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },
  amountCard: {
    marginHorizontal: 20, borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  currencySymbol: { fontSize: 32, fontWeight: '300' },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '700', paddingVertical: 0 },
  sectionCard: { marginHorizontal: 20, marginTop: 16, borderRadius: 16, overflow: 'hidden' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  secLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginHorizontal: 20, marginTop: 20, marginBottom: 10 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  catItem: {
    width: '30.5%', alignItems: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: 'transparent',
  },
  catIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  customCatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 8,
    borderWidth: 1, borderRadius: 12, padding: 4, paddingLeft: 12,
  },
  customCatInput: { flex: 1, fontSize: 14, paddingVertical: 8 },
  customCatBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  customCatCancel: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  payRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  payChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  payLabel: { fontSize: 13, fontWeight: '600' },
  switchCard: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 20,
    padding: 16, borderRadius: 16, gap: 12,
  },
  switchLabel: { fontSize: 15, fontWeight: '600' },
  switchSub: { fontSize: 12, marginTop: 2 },
  footer: { paddingHorizontal: 20, marginTop: 24 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 16,
  },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
