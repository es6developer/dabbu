import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function FamilyInsightsWidget({ data }: { data: any }) {
  if (!data) return null;
  if (data.type === 'info' && data.message) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>Family Insights</Text>
        <Text style={styles.message}>{data.message}</Text>
      </View>
    );
  }
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Family Insights</Text>
      <View style={styles.grid}>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: '#4ADE80' }]}>{data.healthScore || 0}</Text>
          <Text style={styles.metricLabel}>Health</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: '#60A5FA' }]}>{data.savingsRate || 0}%</Text>
          <Text style={styles.metricLabel}>Savings Rate</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: '#FBBF24' }]}>{data.sharedBillScore || 0}%</Text>
          <Text style={styles.metricLabel}>Bill Score</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: '#A78BFA' }]}>{data.emergencyFundMonths || 0}m</Text>
          <Text style={styles.metricLabel}>Emergency</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 },
  message: { fontSize: 14, color: '#9CA3AF', lineHeight: 20 },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { alignItems: 'center' },
  metricValue: { fontSize: 22, fontWeight: '800' },
  metricLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
});
