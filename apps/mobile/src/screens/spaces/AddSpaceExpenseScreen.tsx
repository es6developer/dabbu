import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import {
  FormScreen,
  FormSection,
  FormAmountField,
  FormCategoryPicker,
  FormField,
  FormFooter,
  FormError,
  FormToggle,
} from '../../components/forms';

const EXPENSE_CATEGORIES = [
  { name: 'Food & Dining', icon: 'rest', color: '#F97316' },
  { name: 'Groceries', icon: 'shoppingcart', color: '#22C55E' },
  { name: 'Transport', icon: 'car', color: '#3B82F6' },
  { name: 'Shopping', icon: 'tags', color: '#EC4899' },
  { name: 'Bills & Utilities', icon: 'filetext1', color: '#14B8A6' },
  { name: 'Entertainment', icon: 'playcircleo', color: '#8B5CF6' },
  { name: 'Health & Fitness', icon: 'hearto', color: '#EF4444' },
  { name: 'Education', icon: 'book', color: '#6366F1' },
  { name: 'Travel', icon: 'earth', color: '#06B6D4' },
  { name: 'Rent', icon: 'home', color: '#F59E0B' },
  { name: 'Insurance', icon: 'Safety', color: '#10B981' },
  { name: 'Other', icon: 'ellipsis1', color: '#6B7280' },
];

const INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'wallet', color: '#22C55E' },
  { name: 'Freelance', icon: 'laptop', color: '#3B82F6' },
  { name: 'Business', icon: 'bank', color: '#6366F1' },
  { name: 'Investments', icon: 'linechart', color: '#8B5CF6' },
  { name: 'Rental Income', icon: 'home', color: '#F59E0B' },
  { name: 'Refund', icon: 'retweet', color: '#14B8A6' },
  { name: 'Gift', icon: 'gift', color: '#EC4899' },
  { name: 'Other Income', icon: 'pluscircleo', color: '#6B7280' },
];

const PAYMENT_METHODS = [
  { label: 'Cash', value: 'cash', icon: 'wallet', color: '#22C55E' },
  { label: 'Credit Card', value: 'credit_card', icon: 'creditcard', color: '#3B82F6' },
  { label: 'Debit Card', value: 'debit_card', icon: 'creditcard', color: '#6366F1' },
  { label: 'UPI', value: 'upi', icon: 'mobile1', color: '#8B5CF6' },
  { label: 'Net Banking', value: 'net_banking', icon: 'bank', color: '#F59E0B' },
  { label: 'Bank Transfer', value: 'bank_transfer', icon: 'swap', color: '#14B8A6' },
  { label: 'Other', value: 'other', icon: 'ellipsis1', color: '#6B7280' },
];

const QUICK_AMOUNTS = ['100', '200', '500', '1000', '2000', '5000'];

function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function AddSpaceExpenseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();

  const spaceId: string = route.params?.spaceId;
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
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

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
    if (!spaceId) {
      setError('Space not found');
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
        spaceId,
      };

      if (description) payload.description = description;
      if (paymentMethod) payload.paymentMethod = paymentMethod;
      if (isRecurring) payload.isRecurring = true;

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
  }, [amount, type, category, date, description, paymentMethod, isRecurring, spaceId, navigation]);

  return (
    <FormScreen
      title={type === 'expense' ? 'Add Expense' : 'Add Income'}
      hideHero
      footer={
        <FormFooter
          title={saving ? 'Saving...' : type === 'expense' ? 'Save Expense' : 'Save Income'}
          icon={saving ? undefined : 'checkcircleo'}
          onPress={handleSave}
          disabled={saving}
          loading={saving}
        />
      }
    >
      <FormError message={error} />

      <FormAmountField
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        type={type === 'expense' ? 'wallet' : 'arrowdown'}
        onTypeChange={(t) => handleTypeChange(t === 'wallet' ? 'expense' : 'income')}
        quickAmounts={QUICK_AMOUNTS}
        autoFocus
      />

      <FormSection title="Details">
        <FormCategoryPicker
          label="Category"
          selected={category}
          categories={categories}
          onChange={(c) => {
            setCategory(c);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }}
        />
        <FormField
          label="Description"
          icon="edit"
          value={description}
          onChangeText={setDescription}
          placeholder={type === 'expense' ? 'What did you spend on?' : 'What is this income for?'}
        />

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setShowPicker(true)}
          style={[styles.dateShell, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}
        >
          <AntDesign name="calendar" size={18} color={colors.text.tertiary} style={{ marginRight: 10 }} />
          <Text style={[styles.dateText, { color: colors.text.primary }]}>{dateStr}</Text>
          {date.toDateString() === new Date().toDateString() && (
            <View style={[styles.todayBadge, { backgroundColor: `${colors.status.info}18` }]}>
              <Text style={[styles.todayBadgeText, { color: colors.status.info }]}>Today</Text>
            </View>
          )}
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}
      </FormSection>

      <FormSection title="More">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {PAYMENT_METHODS.map((pm) => (
            <TouchableOpacity
              key={pm.value}
              onPress={() => setPaymentMethod(paymentMethod === pm.value ? '' : pm.value)}
              style={[styles.pmChip, {
                backgroundColor: paymentMethod === pm.value ? `${pm.color}18` : colors.bg.card,
                borderColor: paymentMethod === pm.value ? pm.color : colors.border.subtle,
              }]}
            >
              <AntDesign name={pm.icon as any} size={13} color={paymentMethod === pm.value ? pm.color : colors.text.tertiary} />
              <Text style={[styles.pmChipText, { color: paymentMethod === pm.value ? pm.color : colors.text.secondary }]}>
                {pm.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ marginTop: 12 }}>
          <FormToggle
            label="Recurring Transaction"
            value={isRecurring}
            onValueChange={setIsRecurring}
            description="Mark this as a recurring bill or income"
          />
        </View>
      </FormSection>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  dateShell: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: { fontSize: 15, fontWeight: '600', flex: 1 },
  todayBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  todayBadgeText: { fontSize: 10, fontWeight: '700' },
  pmChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  pmChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
