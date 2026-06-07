import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

const CATEGORIES = [
  { name: 'Food', icon: 'fast-food-outline', color: '#FF6B6B' },
  { name: 'Groceries', icon: 'cart-outline', color: '#34C759' },
  { name: 'Travel', icon: 'airplane-outline', color: '#60A5FA' },
  { name: 'Gym', icon: 'fitness-outline', color: '#A78BFA' },
  { name: 'Water', icon: 'water-outline', color: '#38BDF8' },
  { name: 'Internet', icon: 'wifi-outline', color: '#38BDF8' },
  { name: 'Rent', icon: 'home-outline', color: '#FB923C' },
  { name: 'Bills', icon: 'receipt-outline', color: '#F59E0B' },
  { name: 'Shopping', icon: 'bag-outline', color: '#F472B6' },
  { name: 'Entertainment', icon: 'film-outline', color: '#8B5CF6' },
  { name: 'Medical', icon: 'medkit-outline', color: '#FF4D4F' },
  { name: 'Education', icon: 'school-outline', color: '#6366F1' },
];

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
    editingTransaction?.amount ? String(editingTransaction.amount) : prefill?.amount ? String(prefill.amount) : '',
  );
  const [type, setType] = useState<'expense' | 'income'>(prefill?.type || 'expense');
  const [category, setCategory] = useState(editingTransaction?.category?.name || prefill?.categoryName || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(editingTransaction?.expenseGroupId || prefill?.groupId || '');
  const [selectedGroupName, setSelectedGroupName] = useState(prefill?.groupName || '');
  const [description, setDescription] = useState(editingTransaction?.description || prefill?.description || '');
  const [date] = useState(
    (editingTransaction?.date ? new Date(editingTransaction.date).toISOString().split('T')[0] : undefined) ||
      prefill?.date ||
      new Date().toISOString().split('T')[0],
  );

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadCategories();
  }, [accessToken]);

  async function loadCategories() {
    try {
      const res = await api.get<any[]>('/categories');
      const data = Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : [];
      setCategories(data);
    } catch (e) {
      // fallback to static
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
    if (accessToken) setAccessToken(accessToken);
    try {
      const data: any = {
        amount: Number(amount),
        type,
        description: description.trim() || (category ? `${category} expense` : 'Expense'),
        date,
      };
      if (selectedGroupId) data.expenseGroupId = selectedGroupId;
      if (isEditing) {
        await api.patch(`/transactions/${editingTransaction.id}`, data);
      } else {
        await api.post('/transactions', data);
      }
      if (prefill?.returnTo === 'GroupExpenses' && selectedGroupId) {
        navigation.navigate('GroupExpenses', { groupId: selectedGroupId, groupName: selectedGroupName || prefill.groupName });
      } else {
        navigation.navigate(isEditing ? 'TransactionDetail' : 'ExpenseHome', isEditing ? { transactionId: editingTransaction.id } : undefined);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create transaction');
    } finally {
      setSaving(false);
    }
  }

  const allCats = [...CATEGORIES];
  const filtered = allCats.filter(c => !category || c.name === category);

  if (loadingMeta) {
    return (
      <View style={[s.loading, { backgroundColor: colors.bg.primary }]}>
        <View style={{ width: '100%', padding: 24, gap: 16 }}>
          <Skeleton width={140} height={22} />
          <Skeleton width="100%" height={120} borderRadius={24} />
          <Skeleton width="100%" height={80} borderRadius={16} />
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
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View>
              <View style={[s.amountSection, { backgroundColor: colors.bg.card }]}>
                <View style={s.amountTop}>
                  <TouchableOpacity onPress={() => {
                    Keyboard.dismiss();
                    navigation.goBack();
                  }} style={s.closeBtn}>
                    <Ionicons name="close" size={22} color={colors.text.secondary} />
                  </TouchableOpacity>
                  <Text style={[s.amtTitle, { color: colors.text.primary }]}>
                    {isEditing ? 'Edit' : type === 'income' ? 'Add Income' : 'Add Expense'}
                  </Text>
                  <TouchableOpacity onPress={() => {
                    inputRef.current?.focus();
                  }} style={s.keyboardBtn}>
                    <Ionicons name="keypad-outline" size={20} color={colors.accent.primary} />
                  </TouchableOpacity>
                </View>

                <View style={[s.segmentRow, { backgroundColor: colors.bg.tertiary }]}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { setType('expense'); setError(''); }}
                    style={[s.segmentBtn, type === 'expense' && { backgroundColor: '#5D38B5' }]}
                  >
                    <Ionicons name="cart-outline" size={14} color={type === 'expense' ? '#FFF' : colors.text.secondary} />
                    <Text style={[s.segmentText, { color: type === 'expense' ? '#FFF' : colors.text.secondary }]}>Expenses</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { setType('income'); setError(''); }}
                    style={[s.segmentBtn, type === 'income' && { backgroundColor: '#34C759' }]}
                  >
                    <Ionicons name="trending-up" size={14} color={type === 'income' ? '#FFF' : colors.text.secondary} />
                    <Text style={[s.segmentText, { color: type === 'income' ? '#FFF' : colors.text.secondary }]}>Income</Text>
                  </TouchableOpacity>
                </View>

                <View style={s.amountDisplay}>
                  <View style={s.amountInputRow}>
                    <Text style={[s.amountCurrency, { color: colors.text.primary }]}>₹</Text>
                    <TextInput
                      ref={inputRef}
                      style={[s.amountInput, { color: colors.text.primary }]}
                      value={amount}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/[^0-9.]/g, '');
                        const dotCount = cleaned.split('.').length - 1;
                        if (dotCount > 1) return;
                        setAmount(cleaned);
                        setError('');
                      }}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={colors.text.tertiary}
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </View>
                  <Text style={[s.amountHint, { color: colors.text.tertiary }]}>
                    {type === 'expense' ? 'How much did you spend?' : 'How much did you receive?'}
                  </Text>
                </View>

                {error ? (
                  <View style={[s.errorBox, { backgroundColor: `${colors.status.error}15` }]}>
                    <Ionicons name="alert-circle" size={14} color={colors.status.error} />
                    <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
                  </View>
                ) : null}
              </View>

              <View style={s.categorySection}>
                <Text style={[s.sectionLabel, { color: colors.text.primary }]}>Category</Text>
                <View style={s.categoryGrid}>
                  {CATEGORIES.map((cat, i) => {
                    const selected = category === cat.name;
                    return (
                      <TouchableOpacity
                        key={i}
                        activeOpacity={0.7}
                        style={[
                          s.categoryCard,
                          {
                            backgroundColor: selected ? `${cat.color}15` : colors.bg.card,
                            borderColor: selected ? cat.color : colors.border.subtle,
                          },
                        ]}
                        onPress={() => setCategory(selected ? '' : cat.name)}
                      >
                        <View style={[s.catIcon, { backgroundColor: selected ? cat.color : `${cat.color}12` }]}>
                          <Ionicons name={cat.icon as any} size={20} color={selected ? '#FFF' : cat.color} />
                        </View>
                        <Text
                          style={[s.catName, { color: selected ? colors.text.primary : colors.text.secondary }]}
                          numberOfLines={1}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}>
                <TouchableOpacity
                  style={[s.addBtn, { opacity: saving ? 0.7 : 1 }]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={type === 'income' ? ['#00B894', '#00A381'] : ['#5D38B5', '#7A52D1']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={s.addBtnGrad}
                  >
                    <Ionicons name="add-circle" size={18} color="#FFF" />
                    <Text style={s.addBtnText}>
                      {saving ? 'Saving...' : isEditing ? 'Update' : type === 'income' ? 'Add Income' : 'Add Expense'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  amountSection: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  amountTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  closeBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#F5F0FF', alignItems: 'center', justifyContent: 'center' },
  amtTitle: { fontSize: 17, fontWeight: '700' },

  segmentRow: { flexDirection: 'row', borderRadius: 12, padding: 3, marginBottom: 20 },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  segmentText: { fontSize: 13, fontWeight: '700' },

  amountDisplay: { alignItems: 'center', gap: 6, marginBottom: 8 },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  amountCurrency: { fontSize: 36, fontWeight: '800' },
  amountInput: { fontSize: 40, fontWeight: '800', letterSpacing: -1, textAlign: 'center', minWidth: 120, paddingVertical: 0 },
  amountHint: { fontSize: 13, fontWeight: '500' },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, marginTop: 8 },
  errorText: { fontSize: 12, fontWeight: '600', flex: 1 },

  categorySection: { paddingHorizontal: 20, paddingTop: 16 },
  sectionLabel: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryCard: {
    width: '23%', alignItems: 'center', gap: 6, borderRadius: 16, borderWidth: 1,
    paddingVertical: 14, paddingHorizontal: 4,
  },
  catIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 10, fontWeight: '600', textAlign: 'center' },

  numpad: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 34, borderTopWidth: 1,
  },
  numpadRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4 },
  numpadKey: { width: 80, height: 52, alignItems: 'center', justifyContent: 'center' },
  numpadKeyText: { fontSize: 26, fontWeight: '500' },

  addBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  addBtnGrad: { flexDirection: 'row', paddingVertical: 15, alignItems: 'center', justifyContent: 'center', gap: 8 },
  addBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
