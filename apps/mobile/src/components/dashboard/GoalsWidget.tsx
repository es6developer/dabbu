import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function getProgressColor(pct: number): string {
  if (pct >= 80) return '#4ADE80';
  if (pct >= 50) return '#FBBF24';
  return '#FB923C';
}

export function GoalsWidget({ data }: { data: any }) {
  if (!data || data.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Goals</Text>
      {data.slice(0, 4).map((goal: any) => (
        <View key={goal.id} style={styles.goalRow}>
          <View style={styles.goalInfo}>
            <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
            <Text style={styles.goalAmount}>
              ₹{(goal.currentAmount || 0).toLocaleString()} / ₹{(goal.targetAmount || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.progressWrap}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(goal.progress, 100)}%`, backgroundColor: getProgressColor(goal.progress) }]} />
            </View>
            <Text style={[styles.progressText, { color: getProgressColor(goal.progress) }]}>{goal.progress}%</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 },
  goalRow: { marginBottom: 14 },
  goalInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  goalName: { fontSize: 14, color: '#F9FAFB', fontWeight: '600', flex: 1 },
  goalAmount: { fontSize: 12, color: '#6B7280' },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#27272A' },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },
});
