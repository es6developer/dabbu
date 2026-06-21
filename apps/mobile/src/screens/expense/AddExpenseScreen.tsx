import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
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
  { label: 'UPI', value: 'upi', icon: 'mobile1' as const, color: '#8B5CF6' },
  { label: 'Cash', value: 'cash', icon: 'wallet' as const, color: '#22C55E' },
  { label: 'Debit Card', value: 'debit_card', icon: 'creditcard' as const, color: '#6366F1' },
  { label: 'Credit Card', value: 'credit_card', icon: 'creditcard' as const, color: '#3B82F6' },
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

function SectionLabel({ label, color }: { label: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', color: color || colors.text.tertiary, marginBottom: 10 }}>
      {label}
    </Text>
  );
}

export function AddExpenseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const initialType = route.params?.type || 'expense';
  const expenseGroupId = route.params?.expenseGroupId;
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
      if (expenseGroupId) {
        payload.expenseGroupId = expenseGroupId;
      }
      if (description) {
        payload.description = description;
      }
      if (paymentMethod) {
        payload.paymentMethod = paymentMethod;
      }
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
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <LinearGradient
        colors={isDark ? ['#1A0A2E', colors.bg.primary] : ['#F0E6FF', colors.bg.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.2]}
        style={{ flex: 1 }}
      >
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 24, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
            <AntDesign name="arrowleft" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text.primary }}>
            {type === 'expense' ? 'Add Expense' : 'Add Income'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 24, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => handleTypeChange('expense')}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5,
              backgroundColor: type === 'expense' ? colors.status.error + '15' : colors.bg.card,
              borderColor: type === 'expense' ? colors.status.error : colors.border.subtle,
            }}
          >
            <AntDesign name="arrowdown" size={14} color={type === 'expense' ? colors.status.error : colors.text.tertiary} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: type === 'expense' ? colors.status.error : colors.text.secondary }}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleTypeChange('income')}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5,
              backgroundColor: type === 'income' ? colors.status.success + '15' : colors.bg.card,
              borderColor: type === 'income' ? colors.status.success : colors.border.subtle,
            }}
          >
            <AntDesign name="arrowup" size={14} color={type === 'income' ? colors.status.success : colors.text.tertiary} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: type === 'income' ? colors.status.success : colors.text.secondary }}>Income</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 24, paddingTop: 0, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, backgroundColor: colors.status.error + '10', marginBottom: 16 }}>
              <AntDesign name="exclamationcircle" size={14} color={colors.status.error} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.status.error, flex: 1 }}>{error}</Text>
            </View>
          ) : null}

          <View style={{ borderRadius: 20, padding: 20, backgroundColor: colors.bg.card, marginBottom: 20, ...shadows.md }}>
            <SectionLabel label="Amount" />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 30, fontWeight: '700', color: colors.text.primary, marginRight: 8 }}>₹</Text>
              <TextInput
                style={{ flex: 1, fontSize: 30, fontWeight: '700', color: colors.text.primary, padding: 0 }}
                value={amount}
                onChangeText={(t) => { setAmount(t.replace(/[^0-9.]/g, '')); setError(''); }}
                placeholder="0.00"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {QUICK_AMOUNTS.map((q) => (
                <TouchableOpacity
                  key={q}
                  onPress={() => setAmount(q)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
                    backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text.secondary }}>₹{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            <View style={{ flex: 1 }}>
              <SectionLabel label="Date" />
              <TouchableOpacity
                onPress={() => setShowPicker(true)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
                  backgroundColor: colors.bg.card, borderColor: colors.border.subtle,
                }}
              >
                <AntDesign name="calendar" size={16} color={colors.accent.primary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary, flex: 1 }}>{dateStr}</Text>
                <AntDesign name="down" size={11} color={colors.text.tertiary} />
              </TouchableOpacity>
              {showPicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <SectionLabel label="Recurring" />
              <TouchableOpacity
                onPress={() => setIsRecurring(!isRecurring)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
                  backgroundColor: isRecurring ? accentColor + '12' : colors.bg.card,
                  borderColor: isRecurring ? accentColor : colors.border.subtle,
                }}
              >
                <AntDesign name={isRecurring ? 'checkcircle' : 'clockcircleo'} size={15} color={isRecurring ? accentColor : colors.text.tertiary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: isRecurring ? accentColor : colors.text.secondary }}>
                  {isRecurring ? 'Recurring' : 'One-time'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ marginBottom: 20 }}>
            <SectionLabel label="Payment Method" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PAYMENT_METHODS.map((pm) => {
                const active = paymentMethod === pm.value;
                return (
                  <TouchableOpacity
                    key={pm.value}
                    onPress={() => { setPaymentMethod(pm.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
                      backgroundColor: active ? pm.color + '15' : colors.bg.card,
                      borderColor: active ? pm.color : colors.border.subtle,
                    }}
                  >
                    <AntDesign name={pm.icon} size={14} color={active ? pm.color : colors.text.tertiary} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: active ? pm.color : colors.text.secondary }}>{pm.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ marginBottom: 20 }}>
            <SectionLabel label="Category" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {categories.map((cat) => {
                  const active = category === cat.name;
                  return (
                    <TouchableOpacity
                      key={cat.name}
                      onPress={() => { setCategory(cat.name); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
                        backgroundColor: active ? cat.color + '18' : colors.bg.card,
                        borderColor: active ? cat.color : colors.border.subtle,
                      }}
                    >
                      <AntDesign name={cat.icon} size={13} color={active ? cat.color : colors.text.tertiary} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? cat.color : colors.text.secondary }}>{cat.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View style={{ marginBottom: 20 }}>
            <SectionLabel label={type === 'expense' ? 'Description (optional)' : 'Source (optional)'} />
            <TextInput
              style={{
                fontSize: 15, fontWeight: '500',
                paddingHorizontal: 18, paddingVertical: 14,
                borderRadius: 16, borderWidth: 1,
                backgroundColor: colors.bg.card, borderColor: colors.border.subtle,
                color: colors.text.primary,
              }}
              value={description}
              onChangeText={setDescription}
              placeholder={type === 'expense' ? 'What did you spend on?' : 'Where did the money come from?'}
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {isRecurring && (
            <View style={{ marginBottom: 20 }}>
              <SectionLabel label="Frequency" />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {RECURRING_FREQUENCIES.map((f) => {
                  const active = frequency === f.value;
                  return (
                    <TouchableOpacity
                      key={f.value}
                      onPress={() => setFrequency(f.value)}
                      style={{
                        flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1,
                        backgroundColor: active ? accentColor + '15' : colors.bg.card,
                        borderColor: active ? accentColor : colors.border.subtle,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? accentColor : colors.text.secondary }}>{f.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !amount}
            activeOpacity={0.85}
            style={{ borderRadius: 16, overflow: 'hidden', marginTop: 24, opacity: saving || !amount ? 0.6 : 1 }}
          >
            <LinearGradient
              colors={[accentColor, accentColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 }}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <AntDesign name={type === 'expense' ? 'arrowdown' : 'arrowup'} size={18} color="#FFF" />
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
                    {type === 'expense' ? 'Save Expense' : 'Save Income'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}
