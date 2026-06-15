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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import { useTheme } from '../../theme';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../config/categoryIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W } = Dimensions.get('window');
const PURPLE = '#8B5CF6';
const PURPLE_DARK = '#6D28D9';
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

  const date =
    (editingTransaction?.date
      ? new Date(editingTransaction.date).toISOString().split('T')[0]
      : undefined) ||
    prefill?.date ||
    new Date().toISOString().split('T')[0];

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
        date,
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

  const currentCats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                  <Ionicons
                    name={t === 'expense' ? 'cart-outline' : 'trending-up'}
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
                  <Ionicons name="alert-circle" size={14} color={colors.status.error} />
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
            <View>
              <Text style={[s.fieldLabel, { color: colors.text.secondary }]}>Description</Text>
              <TextInput
                style={[
                  s.textField,
                  {
                    backgroundColor: colors.bg.card,
                    color: colors.text.primary,
                    borderColor: colors.border.subtle,
                  },
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="What was this for?"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            {/* Category */}
            <View>
              <Text style={[s.fieldLabel, { color: colors.text.secondary }]}>Category</Text>
              <View style={s.catGrid}>
                {currentCats.map((cat, i) => {
                  const selected = category === cat.name;
                  return (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.7}
                      style={[
                        s.catCard,
                        {
                          width: (SCREEN_W - 56) / 3,
                          borderColor: selected ? cat.color : colors.border.subtle,
                          backgroundColor: selected ? `${cat.color}12` : colors.bg.card,
                        },
                      ]}
                      onPress={() => setCategory(selected ? '' : cat.name)}
                    >
                      <View
                        style={[
                          s.catIcon,
                          { backgroundColor: selected ? cat.color : `${cat.color}10` },
                        ]}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={20}
                          color={selected ? '#FFF' : cat.color}
                        />
                      </View>
                      <Text
                        style={[
                          s.catName,
                          { color: selected ? colors.text.primary : colors.text.secondary },
                        ]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
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
              <Ionicons
                name={saving ? 'hourglass-outline' : isExpense ? 'cart-outline' : 'trending-up'}
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

  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  textField: { borderRadius: 16, padding: 16, fontSize: 15, fontWeight: '500', borderWidth: 1 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catCard: { alignItems: 'center', gap: 6, borderRadius: 18, borderWidth: 1, paddingVertical: 14 },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

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
