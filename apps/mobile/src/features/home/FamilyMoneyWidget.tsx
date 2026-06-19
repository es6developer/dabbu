import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../theme';

function fmt(v: number) { return '₹' + Math.round(v).toLocaleString('en-IN'); }

export function FamilyMoneyWidget({ income, expense }: { income: number; expense: number }) {
  const { colors } = useTheme();
  const savings = income - expense;
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.secondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Family Money</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: colors.bg.card, padding: 14, borderRadius: 12 }}>
          <Text style={{ fontSize: 11, color: colors.status.success }}>Income</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text.primary }}>{fmt(income)}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.bg.card, padding: 14, borderRadius: 12 }}>
          <Text style={{ fontSize: 11, color: colors.status.error }}>Expense</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text.primary }}>{fmt(expense)}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.bg.card, padding: 14, borderRadius: 12 }}>
          <Text style={{ fontSize: 11, color: colors.accent.primary }}>Savings</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text.primary }}>{fmt(savings)}</Text>
        </View>
      </View>
    </View>
  );
}
