import React, { useState } from 'react';
import { Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
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
  { name: 'Food', icon: 'rest', color: '#F97316' },
  { name: 'Travel', icon: 'earth', color: '#3B82F6' },
  { name: 'Bills', icon: 'filetext1', color: '#14B8A6' },
  { name: 'Shopping', icon: 'shoppingcart', color: '#EC4899' },
  { name: 'Groceries', icon: 'shoppingcart', color: '#22C55E' },
  { name: 'Entertainment', icon: 'playcircleo', color: '#8B5CF6' },
  { name: 'Sports', icon: 'football', color: '#F59E0B' },
  { name: 'Other', icon: 'ellipsis1', color: '#6B7280' },
];

const QUICK_AMOUNTS = ['50', '100', '200', '500', '1000', '2000'];

export function AddExpenseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();

  const initialType = route.params?.type || 'expense';
  const initialCategory = route.params?.category || 'Food';
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'expense' | 'income'>(initialType);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter an amount');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await api.post('/transactions', {
        amount: parseFloat(amount),
        type: type === 'expense' ? 'expense' : 'income',
        category,
        description: notes || undefined,
        notes: notes || undefined,
        date: new Date(date).toISOString(),
      });
      Alert.alert('Success', 'Transaction saved successfully!');
      navigation.goBack();
    } catch (err: any) {
      setError(err?.message || 'Failed to save transaction. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormScreen
      title={type === 'expense' ? 'Add Expense' : 'Add Income'}
      subtitle={type === 'expense' ? 'Track spending effortlessly' : 'Record your earnings'}
      icon={type === 'expense' ? 'shoppingcart' : 'bank'}
      accent={[colors.accent.primary, colors.accent.secondary]}
      footer={
        <FormFooter
          title={saving ? 'Saving...' : type === 'expense' ? 'Save Expense' : 'Save Income'}
          icon={saving ? undefined : 'checkcircleo'}
          onPress={handleSave}
          disabled={saving}
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
