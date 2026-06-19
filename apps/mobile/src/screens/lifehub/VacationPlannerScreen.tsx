import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';

const VACATION_TYPES = [
  { label: 'Weekend Getaway', cost: 25000 },
  { label: 'Domestic Trip', cost: 75000 },
  { label: 'International (Asia)', cost: 150000 },
  { label: 'International (Europe)', cost: 300000 },
  { label: 'Luxury Vacation', cost: 500000 },
];

function fmt(v: number) {
  return '₹' + Math.round(v).toLocaleString('en-IN');
}

export function VacationPlannerScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [targetCost, setTargetCost] = useState('');
  const [monthsUntil, setMonthsUntil] = useState('');
  const [savedSoFar, setSavedSoFar] = useState('0');
  const [result, setResult] = useState<{ monthlySaving: number; totalNeeded: number } | null>(null);

  const calculate = () => {
    const cost = parseFloat(targetCost) || 0;
    const months = parseFloat(monthsUntil) || 1;
    const saved = parseFloat(savedSoFar) || 0;
    if (cost <= 0) return;
    const monthly = (cost - saved) / months;
    setResult({ monthlySaving: monthly, totalNeeded: cost });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <AntDesign name="left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary, marginLeft: 8 }}>🌴 Vacation Planner</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: colors.bg.card, borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.tertiary, marginBottom: 8 }}>Trip Type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {VACATION_TYPES.map((v) => (
              <TouchableOpacity
                key={v.label}
                onPress={() => setTargetCost(String(v.cost))}
                style={{
                  paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                  backgroundColor: targetCost === String(v.cost) ? colors.accent.primary : colors.bg.tertiary,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: targetCost === String(v.cost) ? '#fff' : colors.text.secondary }}>{v.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6 }}>Estimated Cost (₹)</Text>
          <TextInput
            style={{ backgroundColor: colors.bg.tertiary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontWeight: '600', color: colors.text.primary }}
            value={targetCost}
            onChangeText={setTargetCost}
            keyboardType="decimal-pad"
            placeholder="e.g. 75000"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6, marginTop: 16 }}>Months Until Trip</Text>
          <TextInput
            style={{ backgroundColor: colors.bg.tertiary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontWeight: '600', color: colors.text.primary }}
            value={monthsUntil}
            onChangeText={setMonthsUntil}
            keyboardType="decimal-pad"
            placeholder="e.g. 6"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6, marginTop: 16 }}>Already Saved (₹)</Text>
          <TextInput
            style={{ backgroundColor: colors.bg.tertiary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontWeight: '600', color: colors.text.primary }}
            value={savedSoFar}
            onChangeText={setSavedSoFar}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
          />

          <TouchableOpacity
            onPress={calculate}
            style={{ backgroundColor: colors.accent.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20 }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Plan Trip</Text>
          </TouchableOpacity>
        </View>

        {result && (
          <View style={{ backgroundColor: colors.bg.card, borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 16 }}>Trip Plan</Text>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Trip Cost</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text.primary }}>{fmt(result.totalNeeded)}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Save Monthly</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.status.success }}>{fmt(result.monthlySaving)}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
