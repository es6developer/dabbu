import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';
import { api } from '../../services/api';

const EXPENSE_CATEGORIES = [
  { name: 'Food & Dining', icon: 'rest' as const, color: '#F97316' },
  { name: 'Groceries', icon: 'shoppingcart' as const, color: '#22C55E' },
  { name: 'Transport', icon: 'car' as const, color: '#3B82F6' },
  { name: 'Shopping', icon: 'tags' as const, color: '#EC4899' },
  { name: 'Bills & Utilities', icon: 'filetext1' as const, color: '#14B8A6' },
  { name: 'Entertainment', icon: 'playcircleo' as const, color: '#8B5CF6' },
  { name: 'Health & Fitness', icon: 'hearto' as const, color: '#EF4444' },
  { name: 'Education', icon: 'book' as const, color: '#6366F1' },
  { name: 'Travel', icon: 'earth' as const, color: '#06B6D4' },
  { name: 'Rent', icon: 'home' as const, color: '#F59E0B' },
  { name: 'Insurance', icon: 'Safety' as const, color: '#10B981' },
  { name: 'Other', icon: 'ellipsis1' as const, color: '#6B7280' },
];

const INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'wallet' as const, color: '#22C55E' },
  { name: 'Freelance', icon: 'laptop' as const, color: '#3B82F6' },
  { name: 'Business', icon: 'bank' as const, color: '#6366F1' },
  { name: 'Investments', icon: 'linechart' as const, color: '#8B5CF6' },
  { name: 'Rental Income', icon: 'home' as const, color: '#F59E0B' },
  { name: 'Refund', icon: 'retweet' as const, color: '#14B8A6' },
  { name: 'Gift', icon: 'gift' as const, color: '#EC4899' },
  { name: 'Other Income', icon: 'pluscircleo' as const, color: '#6B7280' },
];

const PAYMENT_METHODS = [
  { label: 'Cash', value: 'cash', icon: 'wallet' as const, color: '#22C55E' },
  { label: 'Credit Card', value: 'credit_card', icon: 'creditcard' as const, color: '#3B82F6' },
  { label: 'Debit Card', value: 'debit_card', icon: 'creditcard' as const, color: '#6366F1' },
  { label: 'UPI', value: 'upi', icon: 'mobile1' as const, color: '#8B5CF6' },
  { label: 'Net Banking', value: 'net_banking', icon: 'bank' as const, color: '#F59E0B' },
  { label: 'Bank Transfer', value: 'bank_transfer', icon: 'swap' as const, color: '#14B8A6' },
  { label: 'Other', value: 'other', icon: 'ellipsis1' as const, color: '#6B7280' },
];

const RECURRING_FREQUENCIES = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

const QUICK_AMOUNTS = ['100', '200', '500', '1000', '2000', '5000'];

function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function AddExpenseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const initialType = route.params?.type || 'expense';
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>(initialType);
  const [category, setCategory] = useState(initialType === 'expense' ? 'Food & Dining' : 'Salary');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [dateStr, setDateStr] = useState(fmtDate(new Date()));
  const [showPicker, setShowPicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const accentColor = type === 'expense' ? colors.status.error : colors.status.success;

  const handleTypeChange = useCallback((t: 'expense' | 'income') => {
    setType(t);
    setCategory(t === 'expense' ? 'Food & Dining' : 'Salary');
  }, []);

  const handleDateChange = useCallback((_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
      setDateStr(fmtDate(selectedDate));
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter an amount');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    setError('');
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      const payload: Record<string, any> = {
        amount: parseFloat(amount),
        type,
        category,
        date: date.toISOString(),
      };
      if (description) payload.description = description;
      if (paymentMethod) payload.paymentMethod = paymentMethod;
      if (isRecurring) {
        payload.isRecurring = true;
        payload.recurringFrequency = frequency;
      }
      await api.post('/transactions', payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      navigation.goBack();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save transaction';
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSaving(false);
    }
  }, [amount, type, category, date, description, paymentMethod, isRecurring, frequency, navigation]);

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <LinearGradient
        colors={isDark ? ['#1A0A2E', colors.bg.primary] : ['#F0E6FF', colors.bg.primary]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} locations={[0, 0.2]}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <AntDesign name="arrowleft" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text.primary }]}>
            {type === 'expense' ? 'Add Expense' : 'Add Income'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Type Toggle Pills */}
        <View style={s.typeRow}>
          <TouchableOpacity
            onPress={() => handleTypeChange('expense')}
            style={[s.typePill, { backgroundColor: type === 'expense' ? colors.status.error + '15' : colors.bg.card, borderColor: type === 'expense' ? colors.status.error : colors.border.subtle }]}
          >
            <AntDesign name="arrowdown" size={14} color={type === 'expense' ? colors.status.error : colors.text.tertiary} />
            <Text style={[s.typePillText, { color: type === 'expense' ? colors.status.error : colors.text.secondary }]}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleTypeChange('income')}
            style={[s.typePill, { backgroundColor: type === 'income' ? colors.status.success + '15' : colors.bg.card, borderColor: type === 'income' ? colors.status.success : colors.border.subtle }]}
          >
            <AntDesign name="arrowup" size={14} color={type === 'income' ? colors.status.success : colors.text.tertiary} />
            <Text style={[s.typePillText, { color: type === 'income' ? colors.status.success : colors.text.secondary }]}>Income</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing['2xl'], paddingTop: 0, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          {error ? (
            <View style={[s.errorBox, { backgroundColor: colors.status.error + '10' }]}>
              <AntDesign name="exclamationcircle" size={14} color={colors.status.error} />
              <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
            </View>
          ) : null}

          {/* 2-Column Grid */}
          <View style={s.grid}>
            {/* Amount - Full Width */}
            <View style={s.fullWidth}>
              <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Amount</Text>
              <View style={[s.amountShell, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.default }]}>
                <Text style={[s.currencySign, { color: colors.text.tertiary }]}>₹</Text>
                <TextInput
                  style={[s.amountInput, { color: colors.text.primary }]}
                  value={amount}
                  onChangeText={(t) => { setAmount(t.replace(/[^0-9.]/g, '')); setError(''); }}
                  placeholder="0.00"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>
              {/* Quick amounts */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {QUICK_AMOUNTS.map((q) => (
                  <TouchableOpacity
                    key={q}
                    onPress={() => setAmount(q)}
                    style={[s.qChip, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}
                  >
                    <Text style={[s.qChipText, { color: colors.text.secondary }]}>₹{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Row 1: Date + Payment Method */}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Date</Text>
                <TouchableOpacity
                  onPress={() => setShowPicker(true)}
                  style={[s.fieldShell, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.default }]}
                >
                  <AntDesign name="calendar" size={16} color={colors.text.tertiary} />
                  <Text style={[s.fieldValue, { color: colors.text.primary }]}>{dateStr}</Text>
                </TouchableOpacity>
                {showPicker && (
                  <DateTimePicker value={date} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleDateChange} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Payment</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('PaymentMethods')}
                  style={[s.fieldShell, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.default }]}
                >
                  <AntDesign name={PAYMENT_METHODS.find(p => p.value === paymentMethod)?.icon || 'mobile1'} size={16} color={colors.text.tertiary} />
                  <Text style={[s.fieldValue, { color: colors.text.primary }]}>{PAYMENT_METHODS.find(p => p.value === paymentMethod)?.label || paymentMethod}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Row 2: Category + Description */}
            <View style={s.fullWidth}>
              <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {categories.map((cat) => {
                    const active = category === cat.name;
                    return (
                      <TouchableOpacity
                        key={cat.name}
                        onPress={() => { setCategory(cat.name); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
                        style={[s.catChip, {
                          backgroundColor: active ? cat.color + '18' : colors.bg.tertiary,
                          borderColor: active ? cat.color : colors.border.subtle,
                        }]}
                      >
                        <AntDesign name={cat.icon} size={14} color={active ? cat.color : colors.text.tertiary} />
                        <Text style={[s.catChipText, { color: active ? cat.color : colors.text.secondary }]}>{cat.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            <View style={s.fullWidth}>
              <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Description (optional)</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.default, color: colors.text.primary }]}
                value={description}
                onChangeText={setDescription}
                placeholder={type === 'expense' ? 'What did you spend on?' : 'Source of income'}
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            {/* Row 3: Recurring toggle + Frequency */}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Recurring</Text>
                <TouchableOpacity
                  onPress={() => setIsRecurring(!isRecurring)}
                  style={[s.toggleShell, {
                    backgroundColor: isRecurring ? accentColor + '15' : colors.bg.tertiary,
                    borderColor: isRecurring ? accentColor : colors.border.default,
                  }]}
                >
                  <AntDesign name={isRecurring ? 'checkcircle' : 'clockcircleo'} size={16} color={isRecurring ? accentColor : colors.text.tertiary} />
                  <Text style={[s.toggleLabel, { color: isRecurring ? accentColor : colors.text.secondary }]}>
                    {isRecurring ? 'Recurring' : 'One-time'}
                  </Text>
                </TouchableOpacity>
              </View>
              {isRecurring && (
                <View style={{ flex: 1 }}>
                  <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Frequency</Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {RECURRING_FREQUENCIES.map((f) => {
                      const active = frequency === f.value;
                      return (
                        <TouchableOpacity
                          key={f.value}
                          onPress={() => setFrequency(f.value)}
                          style={[s.freqChip, {
                            backgroundColor: active ? accentColor + '15' : colors.bg.tertiary,
                            borderColor: active ? accentColor : colors.border.subtle,
                          }]}
                        >
                          <Text style={[s.freqChipText, { color: active ? accentColor : colors.text.secondary }]}>{f.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: accentColor, opacity: saving || !amount ? 0.6 : 1 }]}
            onPress={handleSave}
            disabled={saving || !amount}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <AntDesign name={type === 'expense' ? 'arrowdown' : 'arrowup'} size={18} color="#FFF" />
                <Text style={s.saveText}>
                  {type === 'expense' ? 'Save Expense' : 'Save Income'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing['2xl'], paddingBottom: spacing.sm },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  typeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing['2xl'], marginBottom: spacing['2xl'] },
  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5,
  },
  typePillText: { fontSize: 14, fontWeight: '700' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginBottom: spacing.md },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },
  grid: { gap: spacing.md },
  fullWidth: {},
  halfLeft: { flex: 1 },
  halfRight: { flex: 1 },
  fieldLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  amountShell: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: borderRadius.md, borderWidth: 1,
  },
  currencySign: { fontSize: 22, fontWeight: '700', marginRight: 6 },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '700', padding: 0 },
  qChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  qChipText: { fontSize: 12, fontWeight: '600' },
  fieldShell: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 13, borderRadius: borderRadius.md, borderWidth: 1,
  },
  fieldValue: { fontSize: 14, fontWeight: '600', flex: 1 },
  input: { fontSize: 15, fontWeight: '500', paddingHorizontal: 16, paddingVertical: 14, borderRadius: borderRadius.md, borderWidth: 1 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  catChipText: { fontSize: 13, fontWeight: '600' },
  toggleShell: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 13, borderRadius: borderRadius.md, borderWidth: 1,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  freqChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  freqChipText: { fontSize: 12, fontWeight: '700' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 16, marginTop: spacing['2xl'],
  },
  saveText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
