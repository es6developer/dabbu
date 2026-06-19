import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api } from '../../services/api';

export function BabyPlannerScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const calculate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/life-hub/baby?monthlyIncome=${monthlyIncome}&currentSavings=${currentSavings}`);
      setResult(res);
    } catch (e: any) {
      setError(e.message || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
          <AntDesign name="left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary, marginLeft: 8 }}>Baby Planner</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: colors.bg.card, borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6 }}>Monthly Income</Text>
          <TextInput
            style={{ backgroundColor: colors.bg.tertiary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontWeight: '600', color: colors.text.primary }}
            value={monthlyIncome}
            onChangeText={setMonthlyIncome}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
          />
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6, marginTop: 16 }}>Current Savings</Text>
          <TextInput
            style={{ backgroundColor: colors.bg.tertiary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontWeight: '600', color: colors.text.primary }}
            value={currentSavings}
            onChangeText={setCurrentSavings}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
          />
          <TouchableOpacity
            onPress={calculate}
            disabled={loading}
            style={{ backgroundColor: colors.accent.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20 }}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Calculate</Text>}
          </TouchableOpacity>
        </View>
        {error ? (
          <View style={{ backgroundColor: colors.status.errorLight, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: colors.status.error }}>{error}</Text>
          </View>
        ) : null}
        {result ? (
          <View style={{ backgroundColor: colors.bg.card, borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 16 }}>Results</Text>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Estimated Monthly Cost</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text.primary }}>₹{Math.round(result.estimatedMonthlyCost || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Recommended Savings Target</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text.primary }}>₹{Math.round(result.recommendedSavingsTarget || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Timeline</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text.primary }}>{result.timeline ?? '-'}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
