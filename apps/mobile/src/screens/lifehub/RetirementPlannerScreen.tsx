import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { PremiumGate } from '../../components/ui/PremiumGate';

export function RetirementPlannerScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [age, setAge] = useState('');
  const [monthlyExpense, setMonthlyExpense] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const calculate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/life-hub/retirement?age=${age}&monthlyExpense=${monthlyExpense}&currentSavings=${currentSavings}`);
      setResult(res);
    } catch (e: any) {
      setError(e.message || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PremiumGate featureKey="investment_tracker">
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={{ width: 40, height: 40, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}>
          <AntDesign name="left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 19, fontWeight: '700', color: colors.text.primary, marginLeft: 8 }}>Retirement Planner</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: colors.bg.card, borderRadius: 28, padding: 24, marginBottom: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6 }}>Age</Text>
          <TextInput
            style={{ backgroundColor: colors.bg.tertiary, borderRadius: 28, paddingHorizontal: 24, paddingVertical: 18, fontSize: 16, fontWeight: '600', color: colors.text.primary, borderWidth: 1.5, borderColor: colors.border.default }}
            value={age}
            onChangeText={setAge}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
          />
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6, marginTop: 20 }}>Monthly Expense</Text>
          <TextInput
            style={{ backgroundColor: colors.bg.tertiary, borderRadius: 28, paddingHorizontal: 24, paddingVertical: 18, fontSize: 16, fontWeight: '600', color: colors.text.primary, borderWidth: 1.5, borderColor: colors.border.default }}
            value={monthlyExpense}
            onChangeText={setMonthlyExpense}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
          />
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6, marginTop: 20 }}>Current Savings</Text>
          <TextInput
            style={{ backgroundColor: colors.bg.tertiary, borderRadius: 28, paddingHorizontal: 24, paddingVertical: 18, fontSize: 16, fontWeight: '600', color: colors.text.primary, borderWidth: 1.5, borderColor: colors.border.default }}
            value={currentSavings}
            onChangeText={setCurrentSavings}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
          />
          <TouchableOpacity
            onPress={calculate}
            disabled={loading}
            style={{ backgroundColor: colors.accent.primary, borderRadius: 28, paddingVertical: 18, alignItems: 'center', marginTop: 24 }}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Calculate</Text>}
          </TouchableOpacity>
        </View>
        {error ? (
          <View style={{ backgroundColor: colors.status.errorLight, borderRadius: 28, padding: 22, marginBottom: 20 }}>
            <Text style={{ fontSize: 16, color: colors.status.error }}>{error}</Text>
          </View>
        ) : null}
        {result ? (
          <View style={{ backgroundColor: colors.bg.card, borderRadius: 28, padding: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 20 }}>Results</Text>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Retirement Target</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text.primary }}>₹{Math.round(result.retirementTarget || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Monthly Investment Needed</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text.primary }}>₹{Math.round(result.monthlyInvestmentNeeded || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Projection</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text.primary }}>{result.projection ?? '-'}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
    </PremiumGate>
  );
}
