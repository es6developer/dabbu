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
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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
  const [paymentType, setPaymentType] = useState(
    editingTransaction?.metadata?.paymentType || 'UPI',
  );
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

  useEffect(() => {
    if (!route.params?.transaction) {
      return;
    }
    const t = route.params.transaction;
    setAmount(t.amount ? String(t.amount) : '');
    setDescription(t.description || '');
    setCategory(t.category?.name || '');
    setCategoryId(t.categoryId || t.category?.id || '');
    setPaymentType(t.metadata?.paymentType || 'UPI');
    setDate(
      t.date
        ? new Date(t.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    );
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
    if (!name) {
      return;
    }
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
      <View style={[s.loading, { backgroundColor: colors.bg.primary }]}>
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

  const accent = type === 'income' ? ['#00B894', '#00A381'] : ['#6C3EF4', '#8B5CF6'];
  const accentColor = type === 'income' ? colors.status.success : '#6C3EF4';

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: colors.bg.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={['#1A1A3E', '#12121A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.heroGradient, { paddingTop: insets.top + 8 }]}
      >
        <View style={s.heroTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.heroBack}>
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.heroTitle}>
            {isEditing ? 'Edit' : type === 'income' ? 'Add Income' : 'Add Expense'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.heroSwitch}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setType('expense');
              setError('');
            }}
            style={[s.heroSwitchBtn, type === 'expense' && s.heroSwitchActive]}
          >
            <Ionicons
              name="cart-outline"
              size={15}
              color={type === 'expense' ? '#FFF' : 'rgba(255,255,255,0.5)'}
            />
            <Text style={[s.heroSwitchLabel, type === 'expense' && { color: '#FFF' }]}>
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setType('income');
              setError('');
            }}
            style={[s.heroSwitchBtn, type === 'income' && s.heroSwitchActiveIncome]}
          >
            <Ionicons
              name="trending-up"
              size={15}
              color={type === 'income' ? '#FFF' : 'rgba(255,255,255,0.5)'}
            />
            <Text style={[s.heroSwitchLabel, type === 'income' && { color: '#FFF' }]}>Income</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={[s.scroll]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <View style={[s.errorBox, { backgroundColor: `${colors.status.error}15` }]}>
            <Ionicons name="alert-circle" size={16} color={colors.status.error} />
            <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
          </View>
        ) : null}

        <View style={[s.amountCard, { backgroundColor: colors.bg.secondary }]}>
          <Text style={s.amountLabel}>Amount</Text>
          <View style={s.amountRow}>
            <Text style={[s.currency, { color: colors.text.secondary }]}>₹</Text>
            <TextInput
              style={[s.amountInput, { color: colors.text.primary }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="decimal-pad"
              autoFocus={!amount}
            />
          </View>
          <View style={[s.amountUnderline, { backgroundColor: accentColor }]} />
        </View>

        <View style={[s.card, { backgroundColor: colors.bg.secondary }]}>
          <View style={[s.inputRow, { borderBottomColor: colors.border.subtle }]}>
            <Ionicons name="create-outline" size={18} color={colors.text.tertiary} />
            <TextInput
              style={[s.textInput, { color: colors.text.primary }]}
              value={description}
              onChangeText={setDescription}
              placeholder="What was this for?"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
          <View style={[s.inputRow, { borderBottomColor: colors.border.subtle }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.text.tertiary} />
            <DatePickerField label="" value={date} onChange={setDate} />
          </View>
          <View style={s.inputRow}>
            <Ionicons name="document-text-outline" size={18} color={colors.text.tertiary} />
            <TextInput
              style={[s.textInput, { color: colors.text.primary }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes..."
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
        </View>

        <Text style={[s.secLabel, { color: colors.text.tertiary }]}>Category</Text>
        <View style={s.catGrid}>
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
                  style={[s.catItem, sel && { backgroundColor: `${color}20`, borderColor: color }]}
                >
                  <LinearGradient
                    colors={sel ? [color, `${color}88`] : [`${color}20`, `${color}08`]}
                    style={s.catIconWrap}
                  >
                    <Ionicons name={icon as any} size={20} color={sel ? '#FFF' : color} />
                  </LinearGradient>
                  <Text
                    style={[s.catName, { color: sel ? color : colors.text.secondary }]}
                    numberOfLines={1}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          {isPremium && !customCatMode && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setCustomCatMode(true)}
              style={[s.catItem, { borderColor: colors.border.subtle, borderStyle: 'dashed' }]}
            >
              <View style={[s.catIconWrap, { backgroundColor: colors.bg.tertiary }]}>
                <Ionicons name="add-outline" size={20} color={colors.text.tertiary} />
              </View>
              <Text style={[s.catName, { color: colors.text.tertiary }]}>Custom</Text>
            </TouchableOpacity>
          )}
        </View>
        {customCatMode && (
          <View
            style={[
              s.customCatRow,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
          >
            <TextInput
              style={[s.customCatInput, { color: colors.text.primary }]}
              value={customCatName}
              onChangeText={setCustomCatName}
              placeholder="New category name"
              placeholderTextColor={colors.text.tertiary}
              autoFocus
            />
            <TouchableOpacity onPress={handleCreateCustomCategory}>
              <Ionicons name="checkmark-circle" size={28} color={accentColor} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setCustomCatMode(false);
                setCustomCatName('');
              }}
            >
              <Ionicons name="close-circle" size={28} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        )}

        <Text style={[s.secLabel, { color: colors.text.tertiary }]}>Payment Method</Text>
        <View style={s.chipRow}>
          {PAYMENT_TYPES.map((pt) => {
            const sel = paymentType === pt.key;
            return (
              <TouchableOpacity
                key={pt.key}
                activeOpacity={0.7}
                onPress={() => setPaymentType(sel ? '' : pt.key)}
                style={[
                  s.chip,
                  sel && { backgroundColor: `${accentColor}20`, borderColor: accentColor },
                ]}
              >
                <Ionicons
                  name={pt.icon as any}
                  size={18}
                  color={sel ? accentColor : colors.text.tertiary}
                />
                <Text style={[s.chipLabel, { color: sel ? accentColor : colors.text.secondary }]}>
                  {pt.key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[s.secLabel, { color: colors.text.tertiary }]}>Group</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ paddingLeft: 20 }}
          contentContainerStyle={{ gap: 8, paddingRight: 20 }}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setSelectedGroupId('');
              setSelectedGroupName('');
            }}
            style={[
              s.chip,
              !selectedGroupId && { backgroundColor: `${accentColor}20`, borderColor: accentColor },
            ]}
          >
            <Ionicons
              name="close-outline"
              size={18}
              color={!selectedGroupId ? accentColor : colors.text.tertiary}
            />
            <Text
              style={[
                s.chipLabel,
                { color: !selectedGroupId ? accentColor : colors.text.secondary },
              ]}
            >
              None
            </Text>
          </TouchableOpacity>
          {groups.map((g: any) => {
            const sel = selectedGroupId === g.id;
            return (
              <TouchableOpacity
                key={g.id}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedGroupId(g.id);
                  setSelectedGroupName(g.name);
                }}
                style={[
                  s.chip,
                  sel && { backgroundColor: `${accentColor}20`, borderColor: accentColor },
                ]}
              >
                <Ionicons
                  name="people-outline"
                  size={18}
                  color={sel ? accentColor : colors.text.tertiary}
                />
                <Text style={[s.chipLabel, { color: sel ? accentColor : colors.text.secondary }]}>
                  {g.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View
          style={[
            s.card,
            {
              backgroundColor: colors.bg.secondary,
              marginTop: 20,
              flexDirection: 'row',
              alignItems: 'center',
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[s.switchLabel, { color: colors.text.primary }]}>
              Recurring every month?
            </Text>
            <Text style={[s.switchSub, { color: colors.text.tertiary }]}>
              This will repeat automatically
            </Text>
          </View>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: colors.border.subtle, true: `${accentColor}60` }}
            thumbColor={isRecurring ? accentColor : colors.text.tertiary}
          />
        </View>
      </ScrollView>

      <View
        style={[
          s.footer,
          { backgroundColor: colors.bg.primary, borderTopColor: colors.border.subtle },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={saving}
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          <LinearGradient
            colors={accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.submitBtn}
          >
            {saving ? (
              <Text style={s.submitText}>Saving...</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={s.submitText}>
                  {isEditing ? 'Save Changes' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },

  heroGradient: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroBack: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  heroSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 3,
  },
  heroSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 12,
  },
  heroSwitchActive: { backgroundColor: '#6C3EF4' },
  heroSwitchActiveIncome: { backgroundColor: '#00B894' },
  heroSwitchLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },

  amountCard: { marginHorizontal: 20, marginTop: 20, borderRadius: 24, padding: 20 },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(128,128,128,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  currency: { fontSize: 28, fontWeight: '300' },
  amountInput: { flex: 1, fontSize: 40, fontWeight: '800', paddingVertical: 0, letterSpacing: -1 },
  amountUnderline: { height: 3, borderRadius: 2, marginTop: 8, opacity: 0.3 },

  card: { marginHorizontal: 20, marginTop: 16, borderRadius: 20, overflow: 'hidden' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textInput: { flex: 1, fontSize: 15, paddingVertical: 0 },

  secLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  catItem: {
    width: '30.5%',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  customCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 16,
    padding: 6,
    paddingLeft: 16,
  },
  customCatInput: { flex: 1, fontSize: 14, paddingVertical: 8 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipLabel: { fontSize: 13, fontWeight: '600' },

  switchLabel: { fontSize: 15, fontWeight: '600' },
  switchSub: { fontSize: 12, marginTop: 2 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 18,
  },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
