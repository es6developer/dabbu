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

<<<<<<< Updated upstream
interface CategoryOption {
  id: string;
  name: string;
}

const PERIODS = ['monthly', 'yearly', 'weekly'];
=======
const PERIODS = [
  { label: 'Weekly', value: 'weekly', icon: 'calendar' },
  { label: 'Monthly', value: 'monthly', icon: 'calendar' },
  { label: 'Yearly', value: 'yearly', icon: 'calendar' },
];
>>>>>>> Stashed changes

export function CreateBudgetScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadCategories();
  }, [accessToken]);

  async function loadCategories() {
    try {
      const res = await api.get<any>('/categories');
<<<<<<< Updated upstream
      const list = Array.isArray(res) ? res : res?.data || [];
      setCategories(list.map((c: any) => ({ id: c.id, name: c.name })));
    } catch (_e) {
      /* ignore */
    }
=======
      setCategories(res?.map((c: any) => c.name) || res || []);
    } catch {}
>>>>>>> Stashed changes
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
        categoryId: selectedCategory?.id || undefined,
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
<<<<<<< Updated upstream
    <PremiumFormScreen
      title="Create budget"
      subtitle="Set a polished spending guardrail with period, category, and start/end dates."
      icon="piechart"
      accent={[colors.accent.primary, colors.accent.primary]}
=======
    <FormScreen
      title="Create Budget"
      subtitle="Set a polished spending guardrail"
      icon="pie-chart"
      accent={[colors.status.info, colors.status.success]}
      footer={
        <FormFooter
          title="Create Budget"
          icon="add"
          loading={saving}
          onPress={handleSave}
        />
      }
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
        ))}
      </View>
      <Text style={[local.label, { color: colors.text.tertiary }]}>Category</Text>
      <View style={premiumFormStyles.rowWrap}>
        {categories.map((cat) => (
          <PremiumChip
            key={cat.id}
            label={cat.name}
            selected={selectedCategory?.id === cat.id}
            onPress={() => setSelectedCategory(selectedCategory?.id === cat.id ? null : cat)}
          />
        ))}
      </View>
      <DatePickerField label="Start Date" value={startDate} onChange={setStartDate} />
      <DatePickerField label="End Date" value={endDate} onChange={setEndDate} optional />
      <PremiumActionButton title="Create budget" onPress={handleSave} loading={saving} icon="plus" />
    </PremiumFormScreen>
=======
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
>>>>>>> Stashed changes
  );
}
