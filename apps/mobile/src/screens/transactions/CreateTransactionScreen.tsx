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
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../config/categoryIcons';
import { PADDING, borderRadius, shadows, fabShadow } from '../../theme/design';
import { KEYWORD_CATEGORIES } from '../../constants/smartEntryKeywords';

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
  const [type, setType] = useState<'expense' | 'income'>(prefill?.type || 'expense');
  const [category, setCategory] = useState(
    editingTransaction?.category?.name || prefill?.categoryName || '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(
    editingTransaction?.expenseGroupId || prefill?.groupId || '',
  );
  const [selectedGroupName, setSelectedGroupName] = useState(prefill?.groupName || '');
  const [description, setDescription] = useState(
    editingTransaction?.description || prefill?.description || '',
  );
  const [smartEntry, setSmartEntry] = useState('');

  function smartParse(text: string) {
    const match = text.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
    if (match) {
      const desc = match[1].trim();
      const amt = match[2];
      setAmount(amt);
      setDescription(desc);
      const lower = desc.toLowerCase();
      for (const [keyword, cat] of Object.entries(KEYWORD_CATEGORIES)) {
        if (lower.includes(keyword)) {
          setCategory(cat);
          return;
        }
      }
    }
  }
  const [date] = useState(
    (editingTransaction?.date
      ? new Date(editingTransaction.date).toISOString().split('T')[0]
      : undefined) ||
      prefill?.date ||
      new Date().toISOString().split('T')[0],
  );

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadCategories();
  }, [accessToken]);

  async function loadCategories() {
    try {
      const res = await api.get<any[]>('/categories');
      const data = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.data)
          ? (res as any).data
          : [];
      setCategories(data);
    } catch (e) {
      /* empty */
    } finally {
      setLoadingMeta(false);
    }
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
        description: description.trim() || (category ? `${category} expense` : 'Expense'),
        date,
      };
      if (selectedGroupId) {
        data.expenseGroupId = selectedGroupId;
      }
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

  const currentCats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  if (loadingMeta) {
    return (
      <View style={[s.loading, { backgroundColor: colors.bg.primary }]}>
        <View style={{ width: '100%', padding: PADDING, gap: 16 }}>
          <Skeleton width={140} height={22} />
          <Skeleton width="100%" height={180} borderRadius={borderRadius.xl} />
          <Skeleton width="100%" height={120} borderRadius={borderRadius.lg} />
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(40, insets.bottom + 40) }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Header */}
          <View
            style={{ paddingTop: insets.top + 8, paddingHorizontal: PADDING, paddingBottom: 8 }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: `${colors.accent.primary}10`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={20} color={colors.accent.primary} />
              </TouchableOpacity>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text.primary }}>
                {isEditing ? 'Edit' : type === 'income' ? 'Add Income' : 'Add Expense'}
              </Text>
              <View style={{ width: 40 }} />
            </View>
          </View>

          {/* Type Toggle */}
          <View style={{ paddingHorizontal: PADDING, marginBottom: 20 }}>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.bg.tertiary,
                borderRadius: 14,
                padding: 3,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setType('expense');
                  setError('');
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: type === 'expense' ? colors.accent.primary : 'transparent',
                }}
              >
                <Ionicons
                  name="cart-outline"
                  size={14}
                  color={type === 'expense' ? '#FFF' : colors.text.secondary}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: type === 'expense' ? '#FFF' : colors.text.secondary,
                  }}
                >
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setType('income');
                  setError('');
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: type === 'income' ? '#34C759' : 'transparent',
                }}
              >
                <Ionicons
                  name="trending-up"
                  size={14}
                  color={type === 'income' ? '#FFF' : colors.text.secondary}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: type === 'income' ? '#FFF' : colors.text.secondary,
                  }}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Smart Entry */}
          <View style={{ paddingHorizontal: PADDING, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Ionicons name="flash" size={14} color={colors.accent.primary} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: colors.text.secondary,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                Smart Entry
              </Text>
            </View>
            <TextInput
              style={{
                backgroundColor: colors.bg.card,
                borderRadius: borderRadius.lg,
                padding: 16,
                fontSize: 15,
                fontWeight: '500',
                color: colors.text.primary,
                borderWidth: 1,
                borderColor: colors.accent.primary,
              }}
              value={smartEntry}
              onChangeText={(text) => {
                setSmartEntry(text);
                smartParse(text);
              }}
              placeholder='e.g. "Tea 20" or "Petrol 1000"'
              placeholderTextColor={colors.text.tertiary}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            {smartEntry.length > 0 &&
              (() => {
                const m = smartEntry.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
                if (!m) {
                  return null;
                }
                const lower = m[1].trim().toLowerCase();
                let cat = 'Other';
                for (const [kw, c] of Object.entries(KEYWORD_CATEGORIES)) {
                  if (lower.includes(kw)) {
                    cat = c;
                    break;
                  }
                }
                return (
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}
                  >
                    <Ionicons name="checkmark-circle" size={14} color={colors.status.success} />
                    <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                      {m[1].trim()} → {cat} · ₹{m[2]}
                    </Text>
                  </View>
                );
              })()}
          </View>

          {/* Amount Card */}
          <View
            style={{
              marginHorizontal: PADDING,
              borderRadius: borderRadius.xl,
              padding: 24,
              backgroundColor:
                type === 'income' ? `${colors.status.success}10` : `${colors.status.error}08`,
              alignItems: 'center',
              marginBottom: 12,
              ...shadows.md,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'center',
                gap: 2,
                marginBottom: 4,
                marginTop: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: '800',
                  color: colors.text.primary,
                  letterSpacing: -1,
                }}
              >
                ₹
              </Text>
              <TextInput
                ref={inputRef}
                style={{
                  fontSize: 48,
                  fontWeight: '800',
                  color: colors.text.primary,
                  letterSpacing: -2,
                  textAlign: 'center',
                  minWidth: 120,
                  paddingVertical: 0,
                  height: 60,
                  lineHeight: 60,
                }}
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
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}>
              {type === 'expense' ? 'How much did you spend?' : 'How much did you receive?'}
            </Text>
            {error ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: `${colors.status.error}15`,
                  marginTop: 12,
                  width: '100%',
                }}
              >
                <Ionicons name="alert-circle" size={14} color={colors.status.error} />
                <Text
                  style={{ fontSize: 12, fontWeight: '600', color: colors.status.error, flex: 1 }}
                >
                  {error}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Quick Amount Chips */}
          <View style={{ paddingHorizontal: PADDING, marginBottom: 20 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              {['20', '50', '100', '200', '500', '1000', '2000', '5000'].map((val) => (
                <TouchableOpacity
                  key={val}
                  activeOpacity={0.7}
                  onPress={() => setAmount(val)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 12,
                    backgroundColor: amount === val ? `${colors.accent.primary}15` : colors.bg.card,
                    borderWidth: 1,
                    borderColor: amount === val ? colors.accent.primary : colors.border.subtle,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: amount === val ? colors.accent.primary : colors.text.secondary,
                    }}
                  >
                    ₹{val}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Description */}
          <View style={{ paddingHorizontal: PADDING, marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.text.secondary,
                letterSpacing: 0.5,
                marginBottom: 8,
                textTransform: 'uppercase',
              }}
            >
              Description
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.bg.card,
                borderRadius: borderRadius.lg,
                padding: 16,
                fontSize: 15,
                fontWeight: '500',
                color: colors.text.primary,
                borderWidth: 1,
                borderColor: colors.border.subtle,
                ...shadows.sm,
              }}
              value={description}
              onChangeText={setDescription}
              placeholder="What was this for?"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Category Grid */}
          <View style={{ paddingHorizontal: PADDING, marginBottom: 28 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.text.secondary,
                letterSpacing: 0.5,
                marginBottom: 14,
                textTransform: 'uppercase',
              }}
            >
              Category
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {currentCats.map((cat, i) => {
                const selected = category === cat.name;
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.7}
                    style={{
                      width: '30%',
                      alignItems: 'center',
                      gap: 8,
                      borderRadius: borderRadius.lg,
                      borderWidth: 1.5,
                      borderColor: selected ? cat.color : colors.border.subtle,
                      backgroundColor: selected ? `${cat.color}12` : colors.bg.card,
                      paddingVertical: 16,
                      paddingHorizontal: 4,
                      ...(selected ? shadows.sm : {}),
                    }}
                    onPress={() => setCategory(selected ? '' : cat.name)}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: selected ? cat.color : `${cat.color}10`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons
                        name={cat.icon as any}
                        size={20}
                        color={selected ? '#FFF' : cat.color}
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '600',
                        color: selected ? colors.text.primary : colors.text.secondary,
                        textAlign: 'center',
                      }}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action Button */}
          <View style={{ paddingHorizontal: PADDING, paddingTop: 8, paddingBottom: 20 }}>
            <TouchableOpacity
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                opacity: saving ? 0.7 : 1,
                ...shadows.md,
                shadowColor: type === 'income' ? colors.status.success : colors.accent.primary,
              }}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              <View
                style={{
                  flexDirection: 'row',
                  paddingVertical: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: type === 'income' ? '#34C759' : colors.accent.primary,
                }}
              >
                <Ionicons
                  name={saving ? 'hourglass-outline' : 'wallet-outline'}
                  size={18}
                  color="#FFF"
                />
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
                  {saving
                    ? 'Saving...'
                    : isEditing
                      ? 'Update'
                      : type === 'income'
                        ? 'Add Income'
                        : 'Add Expense'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
