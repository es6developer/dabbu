import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function FamilyContributionsWidget({ data }: { data: any }) {
  if (!data) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Contributions</Text>
      <Text style={styles.totalContributed}>₹{(data.totalContributed || 0).toLocaleString()} total</Text>
      {(data.contributions || []).slice(0, 5).map((c: any) => (
        <View key={c.id} style={styles.contributionRow}>
          <View style={styles.contributionDot} />
          <Text style={styles.contributionAmount}>₹{(c.amount || 0).toLocaleString()}</Text>
          <Text style={[styles.contributionStatus, { color: c.status === 'paid' ? '#4ADE80' : '#FBBF24' }]}>
            {c.status}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalContributed: { fontSize: 24, fontWeight: '700', color: '#F9FAFB', marginTop: 4, marginBottom: 16 },
  contributionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#27272A' },
  contributionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  contributionAmount: { fontSize: 14, color: '#F9FAFB', fontWeight: '600', flex: 1 },
  contributionStatus: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});
