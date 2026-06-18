import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function FamilyWealthWidget({ data }: { data: any }) {
  if (!data) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{data.familyName || 'Family'} Wealth</Text>
      <Text style={[styles.value, { color: (data.combined?.netWorth || 0) >= 0 ? '#4ADE80' : '#F87171' }]}>
        ₹{(data.combined?.netWorth || 0).toLocaleString()}
      </Text>
      <View style={styles.memberList}>
        {(data.members || []).slice(0, 4).map((m: any, i: number) => (
          <View key={m.userId || i} style={styles.memberRow}>
            <View style={styles.memberDot} />
            <Text style={styles.memberValue}>₹{(m.totalAssets || 0).toLocaleString()}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 32, fontWeight: '800', marginTop: 4, marginBottom: 16 },
  memberList: { gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#27272A' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#A78BFA' },
  memberValue: { fontSize: 14, color: '#F9FAFB', fontWeight: '600' },
});
