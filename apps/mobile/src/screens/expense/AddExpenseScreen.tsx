import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useSpaceStore } from '../../store/spaceStore';
import {
  FormScreen,
  FormSection,
  FormAmountField,
  FormCategoryPicker,
  FormField,
  FormDatePicker,
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

export function AddExpenseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();

  const initialType = route.params?.type || 'expense';
  const initialCategory = route.params?.category || null;
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>(initialType);
  const [category, setCategory] = useState(initialCategory || (initialType === 'expense' ? 'Food & Dining' : 'Salary'));
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const activeSpace = useSpaceStore((s) => s.activeSpace);
  const spaces = useSpaceStore((s) => s.spaces);
  const spaceName = activeSpace?.name || spaces.find((s) => s.id === useSpaceStore.getState().activeSpaceId)?.name;

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

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
        date: new Date(date).toISOString(),
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
  }, [amount, type, category, description, date, paymentMethod, isRecurring, navigation]);

  return (
    <FormScreen
      title={type === 'expense' ? 'Add Expense' : 'Add Income'}
      subtitle={type === 'expense' ? 'Where did your money go?' : 'Where did the money come from?'}
      icon={type === 'expense' ? 'shoppingcart' : 'wallet'}
      accent={[colors.accent.primary, colors.accent.secondary]}
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
        type={type as any}
        onTypeChange={setType as any}
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
        <FormDatePicker label="Date" value={date} onChange={setDate} />
      </FormSection>

      <FormSection title="More">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {PAYMENT_METHODS.slice(0, 5).map((pm) => (
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

      {spaceName && (
        <View style={[styles.spaceBar, { backgroundColor: `${colors.accent.primary}08`, borderColor: `${colors.accent.primary}15` }]}>
          <AntDesign name="team" size={14} color={colors.text.tertiary} />
          <Text style={[styles.spaceText, { color: colors.text.secondary }]}>
            Recording to <Text style={{ fontWeight: '700', color: colors.text.primary }}>{spaceName}</Text>
          </Text>
        </View>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  spaceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  spaceText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
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
