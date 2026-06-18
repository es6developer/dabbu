import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import {
  FormScreen,
  FormSection,
  FormField,
  FormAmountField,
  FormChipGroup,
  FormDatePicker,
  FormFooter,
  FormError,
} from '../../components/forms';

const PERIODS = [
  { label: 'Weekly', value: 'weekly', icon: 'calendar' },
  { label: 'Monthly', value: 'monthly', icon: 'calendar' },
  { label: 'Yearly', value: 'yearly', icon: 'calendar' },
];

export function CreateBudgetScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadCategories();
  }, [accessToken]);

  async function loadCategories() {
    try {
      const res = await api.get<any>('/categories');
      setCategories(res?.map((c: any) => c.name) || res || []);
    } catch {}
  }

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError('Valid amount is required'); return; }
    setError('');
    setSaving(true);
    if (accessToken) setAccessToken(accessToken);
    try {
      await api.post('/budgets', {
        name: name.trim(),
        amount: Number(amount),
        period,
        category: category || undefined,
        startDate,
        endDate: endDate || undefined,
      });
      navigation.goBack();
      showToast('Budget created');
    } catch (e: any) {
      setError(e.message || 'Failed to create budget');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormScreen
      title="Create Budget"
      subtitle="Set a polished spending guardrail"
      icon="pie-chart"
      accent={[colors.status.info, colors.status.success]}
      footer={
        <FormFooter
          title="Create Budget"
          icon='plus'
          loading={saving}
          onPress={handleSave}
        />
      }
    >
      <FormError message={error} />

      <FormSection title="Budget Details">
        <FormField
          label="Budget Name"
          icon="book"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Monthly groceries"
          required
        />
        <FormAmountField
          label="Budget Amount"
          value={amount}
          onChangeText={setAmount}
        />
      </FormSection>

      <FormSection title="Period & Category">
        <FormChipGroup
          label="Period"
          options={PERIODS}
          selected={period}
          onSelect={setPeriod}
        />
        {categories.length > 0 && (
          <FormChipGroup
            label="Category"
            options={categories.map((c) => ({ label: c, value: c }))}
            selected={category}
            onSelect={(v) => setCategory(category === v ? '' : v)}
            size="sm"
          />
        )}
        <FormField
          label="Custom Category"
          icon="tag"
          value={category}
          onChangeText={setCategory}
          placeholder="Or type custom"
        />
      </FormSection>

      <FormSection title="Dates">
        <FormDatePicker label="Start Date" value={startDate} onChange={setStartDate} />
        <FormDatePicker label="End Date" value={endDate} onChange={setEndDate} optional />
      </FormSection>
    </FormScreen>
  );
}
