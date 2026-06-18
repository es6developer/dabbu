import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

const defaultGoals = [
  { name: 'House', emoji: '🏠' },
  { name: 'Car', emoji: '🚗' },
  { name: 'Baby Fund', emoji: '👶' },
  { name: 'Vacation', emoji: '✈️' },
];

export function CoupleGoalsWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { coupleGoals } = data || {};
  const goals = Array.isArray(coupleGoals) ? coupleGoals : [];

  const display = goals.length
    ? goals.slice(0, 4).map((g: any) => ({
        name: g.name || '-',
        emoji: g.emoji || '🎯',
        progress: Math.min(100, Math.max(0, Number(g.progress ?? 0))),
      }))
    : defaultGoals.map(g => ({ ...g, progress: 0 }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AntDesign name="flag" size={18} color={colors.accent.primary}  />
        <Text style={[styles.title, { color: colors.text.primary }]}>Couple Goals</Text>
      </View>
      <View style={styles.grid}>
        {display.map((g: any, i: number) => (
          <View key={i} style={styles.goalCard}>
            <Text style={styles.emoji}>{g.emoji}</Text>
            <Text style={[styles.goalName, { color: colors.text.primary }]}>{g.name}</Text>
            <View style={[styles.progressBg, { backgroundColor: colors.bg.tertiary }]}>
              <View style={[styles.progressFill, { width: `${g.progress}%`, backgroundColor: colors.accent.primary }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalCard: { flex: 1, minWidth: '45%', gap: 4, alignItems: 'center' },
  emoji: { fontSize: 24 },
  goalName: { fontSize: 12, fontWeight: '600' },
  progressBg: { height: 4, borderRadius: 2, overflow: 'hidden', width: '100%' },
  progressFill: { height: '100%', borderRadius: 2 },
});
