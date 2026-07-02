import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { PremiumGate } from '../../components/ui/PremiumGate';

const RISK_OPTIONS = ['Low', 'Medium', 'High'] as const;
const HORIZON_OPTIONS = [1, 5, 10, 20] as const;
type RiskLevel = 'Low' | 'Medium' | 'High';

const ANNUAL_RETURNS: Record<RiskLevel, number> = {
  Low: 0.06,
  Medium: 0.1,
  High: 0.15,
};

function fmt(v: number) {
  return '₹' + Math.round(v).toLocaleString('en-IN');
}

export function InvestmentPlannerScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [monthlyInvestment, setMonthlyInvestment] = useState('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('Medium');
  const [horizon, setHorizon] = useState(10);
  const [result, setResult] = useState<{
    totalInvestment: number;
    estimatedReturns: number;
    totalValue: number;
    cagr: number;
  } | null>(null);

  const calculate = () => {
    const monthly = parseFloat(monthlyInvestment) || 0;
    if (monthly <= 0) {
      return;
    }
    const r = ANNUAL_RETURNS[riskLevel];
    const n = horizon;
    const annualInvestment = monthly * 12;
    const totalInvestment = annualInvestment * n;
    const totalValue = annualInvestment * ((Math.pow(1 + r, n) - 1) / r);
    const estimatedReturns = totalValue - totalInvestment;
    const cagr = n > 0 ? (Math.pow(totalValue / totalInvestment, 1 / n) - 1) * 100 : 0;
    setResult({ totalInvestment, estimatedReturns, totalValue, cagr });
  };

  return (
    <PremiumGate featureKey="investment_tracker">
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 24,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AntDesign name="left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text
          style={{ fontSize: 19, fontWeight: '700', color: colors.text.primary, marginLeft: 8 }}
        >
          Investment Planner
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
        <View
          style={{
            backgroundColor: colors.bg.card,
            borderRadius: 28,
            padding: 24,
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.text.tertiary,
              marginBottom: 6,
            }}
          >
            Monthly Investment
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.bg.tertiary,
              borderRadius: 28,
              paddingHorizontal: 24,
              paddingVertical: 18,
              fontSize: 16,
              fontWeight: '600',
              color: colors.text.primary,
              borderWidth: 1.5,
              borderColor: colors.border.default,
            }}
            value={monthlyInvestment}
            onChangeText={setMonthlyInvestment}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.text.tertiary,
              marginBottom: 6,
              marginTop: 20,
            }}
          >
            Risk Level
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {RISK_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRiskLevel(r)}
                style={{
                  flex: 1,
                  backgroundColor: riskLevel === r ? colors.accent.primary : colors.bg.tertiary,
                  paddingVertical: 10,
                  borderRadius: 24,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: riskLevel === r ? '#fff' : colors.text.primary,
                  }}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.text.tertiary,
              marginBottom: 6,
              marginTop: 20,
            }}
          >
            Investment Horizon
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {HORIZON_OPTIONS.map((h) => (
              <TouchableOpacity
                key={h}
                onPress={() => setHorizon(h)}
                style={{
                  flex: 1,
                  backgroundColor: horizon === h ? colors.accent.primary : colors.bg.tertiary,
                  paddingVertical: 10,
                  borderRadius: 24,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: horizon === h ? '#fff' : colors.text.primary,
                  }}
                >
                  {h}yr
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={calculate}
            style={{
              backgroundColor: colors.accent.primary,
              borderRadius: 28,
              paddingVertical: 18,
              alignItems: 'center',
              marginTop: 24,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Calculate</Text>
          </TouchableOpacity>
        </View>

        {result && (
          <View style={{ backgroundColor: colors.bg.card, borderRadius: 28, padding: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: colors.text.primary,
                marginBottom: 20,
              }}
            >
              Projected Returns
            </Text>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Total Investment</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text.primary }}>
                {fmt(result.totalInvestment)}
              </Text>
            </View>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Estimated Returns</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.status.success }}>
                {fmt(result.estimatedReturns)}
              </Text>
            </View>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>CAGR</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.accent.primary }}>
                {result.cagr ? result.cagr.toFixed(1) + '%' : '-'}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Total Value</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text.primary }}>
                {fmt(result.totalValue)}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={() =>
            navigation?.navigate('AddExpense', { type: 'income', category: 'Investments' })
          }
          style={{
            backgroundColor: colors.accent.primary,
            borderRadius: 28,
            paddingVertical: 18,
            alignItems: 'center',
            marginTop: 24,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Add Investment</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
    </PremiumGate>
  );
}
