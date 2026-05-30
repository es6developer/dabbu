import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
};

export function CreateTransactionScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const route = useRoute<RouteProp<{ CreateTransaction: PrefillParams }, 'CreateTransaction'>>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const prefill = route.params?.prefill;

  const [amount, setAmount] = useState(prefill?.amount ? String(prefill.amount) : '');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState(prefill?.description || '');
  const [category, setCategory] = useState(prefill?.categoryName || '');
  const [categoryId, setCategoryId] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [date, setDate] = useState(prefill?.date || new Date().toISOString().split('T')[0]);
  const [tags, setTags] = useState((prefill?.tags || []).join(', '));
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');
  const [categories, setCategories] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(prefill?.groupId || '');
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

      catData = Array.isArray(catRes) ? catRes : Array.isArray((catRes as any)?.data) ? (catRes as any).data : [];
      setCategories(catData);
      const g = Array.isArray(grpRes) ? grpRes : Array.isArray((grpRes as any)?.data) ? (grpRes as any).data : [];
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
        type: type === 'income' ? 'income' : 'expense',
        description: description.trim(),
        date,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        isRecurring,
        recurringFrequency: isRecurring ? recurringFrequency : undefined,
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
      await api.post('/transactions', data);
      if (prefill?.returnTo === 'GroupExpenses' && selectedGroupId) {
        navigation.navigate('GroupExpenses', {
          groupId: selectedGroupId,
          groupName: selectedGroupName || prefill.groupName,
        });
      } else {
        navigation.navigate('ExpenseHome');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create transaction');
    } finally {
      setSaving(false);
    }
  }

  if (loadingMeta) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg.primary, bottom: 20 }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text.primary }]}>New Transaction</Text>
      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.status.errorLight }]}>
          <Ionicons name="alert-circle" size={16} color={colors.status.error} />
          <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
        </View>
      ) : null}

      <View style={[styles.typeToggle, { backgroundColor: colors.bg.tertiary }]}>
        <TouchableOpacity
          style={[styles.typeBtn, type === 'expense' && { backgroundColor: colors.status.error }]}
          onPress={() => setType('expense')}
        >
          <Text
            style={[
              styles.typeBtnText,
              { color: type === 'expense' ? '#fff' : colors.text.tertiary },
            ]}
          >
            Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeBtn, type === 'income' && { backgroundColor: colors.status.success }]}
          onPress={() => setType('income')}
        >
          <Text
            style={[
              styles.typeBtnText,
              { color: type === 'income' ? '#fff' : colors.text.tertiary },
            ]}
          >
            Income
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { color: colors.text.tertiary }]}>Amount</Text>
      <View
        style={[
          styles.amountRow,
          { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
        ]}
      >
        <Text style={[styles.currencySymbol, { color: colors.text.primary }]}>₹</Text>
        <TextInput
          style={[styles.amountInput, { color: colors.text.primary }]}
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          placeholderTextColor={colors.text.tertiary}
          keyboardType="decimal-pad"
        />
      </View>

      <Text style={[styles.label, { color: colors.text.tertiary }]}>Description</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.bg.tertiary,
            color: colors.text.primary,
            borderColor: colors.border.subtle,
          },
        ]}
        value={description}
        onChangeText={setDescription}
        placeholder="What was this for?"
        placeholderTextColor={colors.text.tertiary}
      />

      <Text style={[styles.label, { color: colors.text.tertiary }]}>Category</Text>
      <View style={styles.chipRow}>
        {(categories || []).map((cat: any) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.chip,
              { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
              categoryId === cat.id && {
                backgroundColor: `${colors.accent.primary}20`,
                borderColor: colors.accent.primary,
              },
            ]}
            onPress={() => handleCategorySelect(cat)}
          >
            <Text
              style={[
                styles.chipText,
                { color: colors.text.tertiary },
                categoryId === cat.id && { color: colors.accent.primary, fontWeight: '600' },
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text.tertiary }]}>Payment Type</Text>
      <View style={styles.chipRow}>
        {PAYMENT_TYPES.map((pt) => (
          <TouchableOpacity
            key={pt}
            style={[
              styles.chip,
              { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
              paymentType === pt && {
                backgroundColor: `${colors.accent.primary}20`,
                borderColor: colors.accent.primary,
              },
            ]}
            onPress={() => setPaymentType(paymentType === pt ? '' : pt)}
          >
            <Ionicons
              name={
                pt === 'Cash'
                  ? 'cash-outline'
                  : pt === 'UPI'
                    ? 'phone-portrait-outline'
                    : pt === 'Card'
                      ? 'card-outline'
                      : 'business-outline'
              }
              size={14}
              color={paymentType === pt ? colors.accent.primary : colors.text.tertiary}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.chipText,
                { color: colors.text.tertiary },
                paymentType === pt && { color: colors.accent.primary, fontWeight: '600' },
              ]}
            >
              {pt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text.tertiary }]}>
        Group (optional — tag this expense to a group)
      </Text>
      <View style={styles.chipRow}>
        <TouchableOpacity
          style={[
            styles.chip,
            { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
            !selectedGroupId && {
              backgroundColor: `${colors.accent.primary}20`,
              borderColor: colors.accent.primary,
            },
          ]}
          onPress={() => {
            setSelectedGroupId('');
            setSelectedGroupName('');
          }}
        >
          <Text
            style={[
              styles.chipText,
              { color: colors.text.tertiary },
              !selectedGroupId && { color: colors.accent.primary, fontWeight: '600' },
            ]}
          >
            None
          </Text>
        </TouchableOpacity>
        {(groups || []).map((g: any) => (
          <TouchableOpacity
            key={g.id}
            style={[
              styles.chip,
              { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
              selectedGroupId === g.id && {
                backgroundColor: `${colors.accent.primary}20`,
                borderColor: colors.accent.primary,
              },
            ]}
            onPress={() => {
              setSelectedGroupId(g.id);
              setSelectedGroupName(g.name);
            }}
          >
            <Ionicons
              name="people-outline"
              size={14}
              color={selectedGroupId === g.id ? colors.accent.primary : colors.text.tertiary}
            />
            <Text
              style={[
                styles.chipText,
                { color: colors.text.tertiary, marginLeft: 4 },
                selectedGroupId === g.id && { color: colors.accent.primary, fontWeight: '600' },
              ]}
            >
              {g.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text.tertiary }]}>Date</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.bg.tertiary,
            color: colors.text.primary,
            borderColor: colors.border.subtle,
          },
        ]}
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.text.tertiary}
      />

      <Text style={[styles.label, { color: colors.text.tertiary }]}>Tags (comma separated)</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.bg.tertiary,
            color: colors.text.primary,
            borderColor: colors.border.subtle,
          },
        ]}
        value={tags}
        onChangeText={setTags}
        placeholder="e.g. food, grocery"
        placeholderTextColor={colors.text.tertiary}
      />

      <Text style={[styles.label, { color: colors.text.tertiary }]}>Notes (optional)</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.bg.tertiary,
            color: colors.text.primary,
            borderColor: colors.border.subtle,
          },
        ]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Add notes..."
        placeholderTextColor={colors.text.tertiary}
        multiline
        numberOfLines={2}
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
      {isRecurring && (
        <View style={styles.frequencyRow}>
          {['daily', 'weekly', 'monthly', 'yearly'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.freqChip,
                { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                recurringFrequency === f && {
                  backgroundColor: `${colors.accent.primary}20`,
                  borderColor: colors.accent.primary,
                },
              ]}
              onPress={() => setRecurringFrequency(f)}
            >
              <Text
                style={[
                  styles.freqChipText,
                  { color: colors.text.tertiary },
                  recurringFrequency === f && { color: colors.accent.primary, fontWeight: '600' },
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.saveBtn,
          { backgroundColor: colors.accent.primary, bottom: insets.bottom + 20 },
          saving && { opacity: 0.6 },
        ]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Create Transaction</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 60 },
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
  emptyMeta: { fontSize: 14, fontStyle: 'italic' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  recurringToggle: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  recurringToggleText: { fontSize: 13, fontWeight: '600' },
  frequencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  freqChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  freqChipText: { fontSize: 13 },
  saveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
