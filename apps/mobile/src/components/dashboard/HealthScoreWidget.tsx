import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function scoreColor(score: number): string {
  if (score >= 80) return '#4ADE80';
  if (score >= 60) return '#FBBF24';
  if (score >= 40) return '#FB923C';
  return '#F87171';
}

export function HealthScoreWidget({ data }: { data: any }) {
  if (!data) return null;
  const score = data.overallScore || 0;
  const cats = data.categories || {};
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>Health Score</Text>
        <Text style={[styles.score, { color: scoreColor(score) }]}>{score}</Text>
      </View>
      {!data.combined && Object.keys(cats).length > 0 && (
        <View style={styles.categories}>
          {Object.entries(cats).map(([key, val]) => (
            <View key={key} style={styles.catRow}>
              <Text style={styles.catLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
              <View style={styles.catBar}>
                <View style={[styles.catFill, { width: `${Math.min(val as number, 100)}%`, backgroundColor: scoreColor(val as number) }]} />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  score: { fontSize: 32, fontWeight: '800' },
  categories: { gap: 8 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catLabel: { fontSize: 11, color: '#9CA3AF', width: 80, textTransform: 'capitalize' },
  catBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#27272A' },
  catFill: { height: 6, borderRadius: 3 },
});
