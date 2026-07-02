import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { PremiumGate } from '../../components/ui/PremiumGate';

function fmt(v: number) {
  return '₹' + Math.round(v).toLocaleString('en-IN');
}

const CAR_PRICE_RANGES = [
  { label: 'Hatchback (e.g. Swift)', value: 800000 },
  { label: 'Sedan (e.g. City)', value: 1500000 },
  { label: 'SUV (e.g. Creta)', value: 2500000 },
  { label: 'Luxury (e.g. BMW)', value: 5000000 },
];

const LOAN_TENURES = [3, 5, 7];

export function CarPlannerScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [carPrice, setCarPrice] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [tenure, setTenure] = useState(5);
  const [rate, setRate] = useState('9');
  const [result, setResult] = useState<{
    monthlyEmi: number;
    totalInterest: number;
    totalCost: number;
    downPaymentPct: number;
  } | null>(null);

  const calculate = () => {
    const p = parseFloat(carPrice) || 0;
    const d = parseFloat(downPayment) || 0;
    const r = parseFloat(rate) || 9;
    if (p <= 0) return;
    const loanAmount = p - d;
    if (loanAmount <= 0) {
      setResult({
        monthlyEmi: 0,
        totalInterest: 0,
        totalCost: p,
        downPaymentPct: (d / p) * 100,
      });
      return;
    }
    const monthlyRate = r / 100 / 12;
    const months = tenure * 12;
    const emi = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1);
    const totalPayment = emi * months;
    setResult({
      monthlyEmi: emi,
      totalInterest: totalPayment - loanAmount,
      totalCost: totalPayment + d,
      downPaymentPct: (d / p) * 100,
    });
  };

  return (
    <PremiumGate featureKey="investment_tracker">
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={{ width: 40, height: 40, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}>
          <AntDesign name="left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 19, fontWeight: '700', color: colors.text.primary, marginLeft: 8 }}>🚗 Car Planner</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: colors.bg.card, borderRadius: 28, padding: 24, marginBottom: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.tertiary, marginBottom: 8 }}>Car Price Range</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {CAR_PRICE_RANGES.map((r) => (
              <TouchableOpacity
                key={r.value}
                onPress={() => setCarPrice(String(r.value))}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 8,
                  borderRadius: 24,
                  backgroundColor: carPrice === String(r.value) ? colors.accent.primary : colors.bg.tertiary,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: carPrice === String(r.value) ? '#fff' : colors.text.secondary }}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6 }}>Car Price (₹)</Text>
          <TextInput
            style={{ backgroundColor: colors.bg.tertiary, borderRadius: 28, paddingHorizontal: 24, paddingVertical: 18, fontSize: 16, fontWeight: '600', color: colors.text.primary, borderWidth: 1.5, borderColor: colors.border.default }}
            value={carPrice}
            onChangeText={setCarPrice}
            keyboardType="decimal-pad"
            placeholder="e.g. 1500000"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6, marginTop: 20 }}>Down Payment (₹)</Text>
          <TextInput
            style={{ backgroundColor: colors.bg.tertiary, borderRadius: 28, paddingHorizontal: 24, paddingVertical: 18, fontSize: 16, fontWeight: '600', color: colors.text.primary, borderWidth: 1.5, borderColor: colors.border.default }}
            value={downPayment}
            onChangeText={setDownPayment}
            keyboardType="decimal-pad"
            placeholder="e.g. 300000"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6, marginTop: 20 }}>Loan Tenure</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {LOAN_TENURES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setTenure(t)}
                style={{ flex: 1, backgroundColor: tenure === t ? colors.accent.primary : colors.bg.tertiary, paddingVertical: 10, borderRadius: 24, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: tenure === t ? '#fff' : colors.text.primary }}>{t} yr</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6, marginTop: 20 }}>Interest Rate (%)</Text>
          <TextInput
            style={{ backgroundColor: colors.bg.tertiary, borderRadius: 28, paddingHorizontal: 24, paddingVertical: 18, fontSize: 16, fontWeight: '600', color: colors.text.primary, borderWidth: 1.5, borderColor: colors.border.default }}
            value={rate}
            onChangeText={setRate}
            keyboardType="decimal-pad"
            placeholder="9"
            placeholderTextColor={colors.text.tertiary}
          />

          <TouchableOpacity
            onPress={calculate}
            style={{ backgroundColor: colors.accent.primary, borderRadius: 28, paddingVertical: 18, alignItems: 'center', marginTop: 24 }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Calculate</Text>
          </TouchableOpacity>
        </View>

        {result && (
          <View style={{ backgroundColor: colors.bg.card, borderRadius: 28, padding: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 20 }}>Loan Summary</Text>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Monthly EMI</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text.primary }}>{fmt(result.monthlyEmi)}</Text>
            </View>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Total Interest</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.status.warning }}>{fmt(result.totalInterest)}</Text>
            </View>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Down Payment</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text.primary }}>{fmt(parseFloat(downPayment) || 0)} ({Math.round(result.downPaymentPct)}%)</Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Total Cost</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.status.success }}>{fmt(result.totalCost)}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
    </PremiumGate>
  );
}
