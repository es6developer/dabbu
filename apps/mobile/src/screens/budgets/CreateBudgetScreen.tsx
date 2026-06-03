import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { DatePickerField } from '../../components/ui/DatePickerField';
import {
  PremiumActionButton,
  PremiumAmountInput,
  PremiumChip,
  PremiumError,
  PremiumFormScreen,
  PremiumInput,
  premiumFormStyles,
} from '../../components/ui';

const PERIODS = ['monthly', 'yearly', 'weekly'];

export function CreateBudgetScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
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
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadCategories();
  }, [accessToken]);

  async function loadCategories() {
    try {
      const res = await api.get<any>('/accounts/categories');
      setCategories(res.data?.map((c: any) => c.name) || res.data || []);
    } catch (_e) {
      /* ignore */
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
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
      await api.post('/accounts/budgets', {
        name: name.trim(),
        amount: Number(amount),
        period,
        category: category || undefined,
        startDate,
        endDate: endDate || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Failed to create budget');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PremiumFormScreen
      title="Create budget"
      subtitle="Set a polished spending guardrail with period, category, and start/end dates."
      icon="pie-chart"
      accent={[colors.status.info, colors.status.success]}
    >
      <PremiumError message={error} />
      <PremiumInput
        label="Budget name"
        icon="bookmark-outline"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Monthly groceries"
      />
      <PremiumAmountInput
        label="Budget amount"
        value={amount}
        onChangeText={setAmount}
        placeholder="0"
      />
      <Text style={[local.label, { color: colors.text.tertiary }]}>Period</Text>
      <View style={premiumFormStyles.rowWrap}>
        {PERIODS.map((p) => (
          <PremiumChip
            key={p}
            label={p.charAt(0).toUpperCase() + p.slice(1)}
            selected={period === p}
            onPress={() => setPeriod(p)}
          />
        ))}
      </View>
      <Text style={[local.label, { color: colors.text.tertiary }]}>Category</Text>
      <View style={premiumFormStyles.rowWrap}>
        {categories.map((cat) => (
          <PremiumChip
            key={cat}
            label={cat}
            selected={category === cat}
            onPress={() => setCategory(category === cat ? '' : cat)}
          />
        ))}
      </View>
      <PremiumInput
        label="Custom category"
        icon="pricetag-outline"
        value={category}
        onChangeText={setCategory}
        placeholder="Or type custom"
      />
      <DatePickerField label="Start Date" value={startDate} onChange={setStartDate} />
      <DatePickerField label="End Date" value={endDate} onChange={setEndDate} optional />
      <PremiumActionButton title="Create budget" onPress={handleSave} loading={saving} icon="add" />
    </PremiumFormScreen>
  );
}

const local = {
  label: {
    fontSize: 12,
    fontWeight: '800' as const,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
};
