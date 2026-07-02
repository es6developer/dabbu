import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

export function GoalsWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { goals } = data || {};
  const items = Array.isArray(goals) ? goals : [];

  if (!items.length) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <AntDesign name="flag" size={18} color={colors.accent.primary}  />
          <Text style={[styles.title, { color: colors.text.primary }]}>Goals</Text>
        </View>
        <Text style={[styles.empty, { color: colors.text.secondary }]}>-</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AntDesign name="flag" size={18} color={colors.accent.primary}  />
        <Text style={[styles.title, { color: colors.text.primary }]}>Goals</Text>
      </View>
      {items.slice(0, 3).map((goal: any, i: number) => {
        const progress = Math.min(100, Math.max(0, Number(goal.progress ?? 0)));
        return (
          <View key={i} style={styles.goalRow}>
            <View style={styles.goalTop}>
              <Text style={[styles.goalName, { color: colors.text.primary }]}>{goal.name || '-'}</Text>
              <Text style={[styles.goalPercent, { color: colors.text.secondary }]}>{progress}%</Text>
            </View>
            <View style={[styles.progressBg, { backgroundColor: colors.bg.tertiary }]}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.accent.primary }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700' },
  goalRow: { gap: 3 },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between' },
  goalName: { fontSize: 13, fontWeight: '500' },
  goalPercent: { fontSize: 11, fontWeight: '600' },
  progressBg: { height: 5, borderRadius: 8.5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 8.5 },
  empty: { fontSize: 14, fontWeight: '500' },
});
