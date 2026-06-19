import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';

const EDUCATION_TYPES = [
  { label: 'School (Grade 11-12)', cost: 200000 },
  { label: 'Undergrad (India)', cost: 800000 },
  { label: 'Postgrad (India)', cost: 1500000 },
  { label: 'MBA (India)', cost: 2500000 },
  { label: 'Study Abroad (UG)', cost: 4000000 },
  { label: 'Study Abroad (PG)', cost: 5000000 },
];

function fmt(v: number) {
  return '₹' + Math.round(v).toLocaleString('en-IN');
}

export function EducationPlannerScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [targetCost, setTargetCost] = useState('');
  const [yearsUntil, setYearsUntil] = useState('');
  const [savedSoFar, setSavedSoFar] = useState('0');
  const [result, setResult] = useState<{
    monthlySaving: number;
    totalNeeded: number;
    gap: number;
  } | null>(null);

  const calculate = () => {
    const cost = parseFloat(targetCost) || 0;
    const years = parseFloat(yearsUntil) || 1;
    const saved = parseFloat(savedSoFar) || 0;
    if (cost <= 0) return;
    const gap = cost - saved;
    const monthly = gap / (years * 12);
    setResult({ monthlySaving: monthly, totalNeeded: cost, gap });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <AntDesign name="left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary, marginLeft: 8 }}>🎓 Education Planner</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: colors.bg.card, borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.tertiary, marginBottom: 8 }}>Education Type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {EDUCATION_TYPES.map((e) => (
              <TouchableOpacity
                key={e.label}
                onPress={() => setTargetCost(String(e.cost))}
                style={{
                  paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                  backgroundColor: targetCost === String(e.cost) ? colors.accent.primary : colors.bg.tertiary,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: targetCost === String(e.cost) ? '#fff' : colors.text.secondary }}>{e.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6 }}>Target Cost (₹)</Text>
          <TextInput
            style={{ backgroundColor: colors.bg.tertiary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontWeight: '600', color: colors.text.primary }}
            value={targetCost}
            onChangeText={setTargetCost}
            keyboardType="decimal-pad"
            placeholder="e.g. 800000"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6, marginTop: 16 }}>Years Until</Text>
          <TextInput
            style={{ backgroundColor: colors.bg.tertiary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontWeight: '600', color: colors.text.primary }}
            value={yearsUntil}
            onChangeText={setYearsUntil}
            keyboardType="decimal-pad"
            placeholder="e.g. 5"
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
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Calculate</Text>
          </TouchableOpacity>
        </View>

        {result && (
          <View style={{ backgroundColor: colors.bg.card, borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 16 }}>Education Plan</Text>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Total Needed</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text.primary }}>{fmt(result.totalNeeded)}</Text>
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Monthly Saving Required</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.status.success }}>{fmt(result.monthlySaving)}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Gap to Fill</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: result.gap > 0 ? colors.status.warning : colors.status.success }}>
                {fmt(result.gap)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
