import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

const subLabels = ['Savings', 'Debt', 'Goals', 'Insurance', 'Emergency Fund', 'Investment Ratio'];

export function FamilyHealthWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { familyHealth } = data || {};
  const score = Math.min(100, Math.max(0, Number(familyHealth?.score ?? 0)));
  const subs = familyHealth?.subScores || [];

  const getColor = (s: number) => {
    if (s >= 70) return '#16A34A';
    if (s >= 40) return '#EAB308';
    return '#DC2626';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AntDesign name="hearto" size={18} color={colors.accent.primary}  />
        <Text style={[styles.title, { color: colors.text.primary }]}>Family Health</Text>
      </View>
      <View style={styles.scoreRow}>
        <View style={[styles.scoreCircle, { borderColor: getColor(score) }]}>
          <Text style={[styles.scoreNumber, { color: getColor(score) }]}>{score}</Text>
        </View>
        <View style={styles.subsContainer}>
          {subLabels.map((label, i) => {
            const val = subs[i] ?? 0;
            return (
              <View key={label} style={styles.subRow}>
                <Text style={[styles.subLabel, { color: colors.text.secondary }]}>{label}</Text>
                <View style={[styles.subBarBg, { backgroundColor: colors.bg.tertiary }]}>
                  <View style={[styles.subBarFill, { width: `${Math.min(val, 100)}%`, backgroundColor: getColor(val) }]} />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700' },
  scoreRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  scoreCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  scoreNumber: { fontSize: 22, fontWeight: '800' },
  subsContainer: { flex: 1, gap: 4 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subLabel: { fontSize: 10, fontWeight: '500', width: 82 },
  subBarBg: { flex: 1, height: 5, borderRadius: 2.5, overflow: 'hidden' },
  subBarFill: { height: '100%', borderRadius: 2.5 },
});
