import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api } from '../../services/api';

export function HousePlannerScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [salary, setSalary] = useState('');
  const [location, setLocation] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const calculate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/life-hub/house?salary=${salary}&location=${encodeURIComponent(location)}&downPayment=${downPayment}`);
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
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary, marginLeft: 8 }}>House Planner</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: colors.bg.card, borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6 }}>Monthly Salary</Text>
          <TextInput
            style={{ backgroundColor: colors.bg.tertiary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontWeight: '600', color: colors.text.primary }}
            value={salary}
            onChangeText={setSalary}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
          />
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6, marginTop: 16 }}>Location</Text>
          <TextInput
            style={{ backgroundColor: colors.bg.tertiary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontWeight: '600', color: colors.text.primary }}
            value={location}
            onChangeText={setLocation}
            placeholder="City, State"
            placeholderTextColor={colors.text.tertiary}
          />
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6, marginTop: 16 }}>Down Payment</Text>
          <TextInput
            style={{ backgroundColor: colors.bg.tertiary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontWeight: '600', color: colors.text.primary }}
            value={downPayment}
            onChangeText={setDownPayment}
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
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Max Affordable Price</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text.primary }}>₹{Math.round(result.maxAffordablePrice || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Estimated Monthly Payment</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text.primary }}>₹{Math.round(result.estimatedMonthly || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Years to Buy</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text.primary }}>{result.yearsToBuy ?? '-'}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
