import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { DatePickerField } from '../../components/ui/DatePickerField';

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
    if (accessToken) setAccessToken(accessToken);
    loadCategories();
  }, [accessToken]);

  async function loadCategories() {
    try {
      const res = await api.get<any>('/accounts/categories');
      setCategories(res.data?.map((c: any) => c.name) || res.data || []);
    } catch (e) { /* ignore */ }
  }

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError('Valid amount is required'); return; }
    setError('');
    setSaving(true);
    if (accessToken) setAccessToken(accessToken);
    try {
      const data = {
        name: name.trim(),
        amount: Number(amount),
        period,
        category: category || undefined,
        startDate,
        endDate: endDate || undefined,
      };
      await api.post('/accounts/budgets', data);
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Failed to create budget');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg.primary }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: colors.text.primary }]}>Create Budget</Text>
      {error ? <View style={[styles.errorBox, { backgroundColor: `${colors.status.error}18` }]}><Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text></View> : null}

      <Text style={[styles.label, { color: colors.text.secondary }]}>Name</Text>
      <TextInput style={[styles.input, { backgroundColor: colors.bg.secondary, color: colors.text.primary, borderColor: colors.border.subtle }]} value={name} onChangeText={setName} placeholder="e.g. Monthly Groceries" placeholderTextColor={colors.text.tertiary} />

      <Text style={[styles.label, { color: colors.text.secondary }]}>Budget Amount</Text>
      <View style={[styles.amountRow, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
        <Text style={[styles.currencySymbol, { color: colors.text.primary }]}>₹</Text>
        <TextInput style={[styles.amountInput, { color: colors.text.primary }]} value={amount} onChangeText={setAmount} placeholder="0" placeholderTextColor={colors.text.tertiary} keyboardType="decimal-pad" />
      </View>

      <Text style={[styles.label, { color: colors.text.secondary }]}>Period</Text>
      <View style={styles.chipRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity key={p} style={[styles.chip, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }, period === p && { backgroundColor: `${colors.accent.primary}18`, borderColor: colors.accent.primary }]} onPress={() => setPeriod(p)}>
            <Text style={[styles.chipText, { color: colors.text.tertiary }, period === p && { color: colors.accent.primary, fontWeight: '600' }]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text.secondary }]}>Category (optional)</Text>
      <View style={styles.chipRow}>
        {categories.map((cat) => (
          <TouchableOpacity key={cat} style={[styles.chip, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }, category === cat && { backgroundColor: `${colors.accent.primary}18`, borderColor: colors.accent.primary }]} onPress={() => setCategory(category === cat ? '' : cat)}>
            <Text style={[styles.chipText, { color: colors.text.tertiary }, category === cat && { color: colors.accent.primary, fontWeight: '600' }]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={[styles.input, { backgroundColor: colors.bg.secondary, color: colors.text.primary, borderColor: colors.border.subtle }]} value={category} onChangeText={setCategory} placeholder="Or type custom" placeholderTextColor={colors.text.tertiary} />

      <DatePickerField label="Start Date" value={startDate} onChange={setStartDate} />

      <DatePickerField label="End Date" value={endDate} onChange={setEndDate} optional />

      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent.primary }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Create Budget</Text>}
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 18 },
  errorBox: { padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { fontSize: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { fontSize: 16, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 16 },
  currencySymbol: { fontSize: 28, fontWeight: '700', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '700', paddingVertical: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, borderWidth: 1 },
  chipText: { fontSize: 13 },
  saveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
