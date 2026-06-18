import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../theme';
import {
  FormScreen,
  FormSection,
  FormAmountField,
  FormCategoryPicker,
  FormField,
  FormDatePicker,
  FormFooter,
  FormError,
} from '../../components/forms';

const CATEGORIES = [
  { name: 'Food', icon: 'fast-food', color: '#F97316' },
  { name: 'Travel', icon: 'planner', color: '#3B82F6' },
  { name: 'Bills', icon: 'receipt', color: '#14B8A6' },
  { name: 'Shopping', icon: 'shoppingcart', color: '#EC4899' },
  { name: 'Groceries', icon: 'basket', color: '#22C55E' },
  { name: 'Entertainment', icon: 'film', color: '#8B5CF6' },
  { name: 'Sports', icon: 'football', color: '#F59E0B' },
  { name: 'Other', icon: 'ellipsis1', color: '#6B7280' },
];

const QUICK_AMOUNTS = ['50', '100', '200', '500', '1000', '2000'];

export function AddExpenseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();

  const initialCategory = route.params?.category || 'Food';
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [error, setError] = useState('');

  function handleSave() {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter an amount');
      return;
    }
    setError('');
    Alert.alert('Success', 'Expense added successfully!');
    navigation.goBack();
  }

  return (
    <FormScreen
      title="Add Expense"
      subtitle="Track spending effortlessly"
      icon="shoppingcart"
      accent={[colors.accent.primary, colors.accent.secondary]}
      footer={
        <FormFooter
          title={type === 'expense' ? 'Save Expense' : 'Save Income'}
          icon="checkcircleo"
          onPress={handleSave}
        />
      }
    >
      <FormError message={error} />

      <FormAmountField
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        type={type}
        onTypeChange={setType}
        quickAmounts={QUICK_AMOUNTS}
        autoFocus
      />

      <FormSection title="Details">
        <FormCategoryPicker
          label="Category"
          selected={category}
          categories={CATEGORIES}
          onChange={setCategory}
        />
        <FormField
          label="Notes"
          icon="edit"
          value={notes}
          onChangeText={setNotes}
          placeholder="Add a note..."
          multiline
        />
        <FormDatePicker label="Date" value={date} onChange={setDate} />
      </FormSection>
    </FormScreen>
  );
}
