import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function UpcomingBillsWidget({ data }: { data: any }) {
  if (!data || data.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Upcoming Bills</Text>
      {data.slice(0, 5).map((bill: any) => {
        const due = new Date(bill.dueDate);
        const daysLeft = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const isUrgent = daysLeft <= 3;
        return (
          <View key={bill.id} style={[styles.billRow, isUrgent && { borderLeftWidth: 3, borderLeftColor: '#F87171', paddingLeft: 10 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.billName}>{bill.name}</Text>
              <Text style={styles.billDate}>{daysLeft > 0 ? `${daysLeft} days left` : 'Due today'}</Text>
            </View>
            <Text style={[styles.billAmount, { color: isUrgent ? '#F87171' : '#F9FAFB' }]}>
              ₹{(bill.amount || 0).toLocaleString()}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  billRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#27272A' },
  billName: { fontSize: 14, color: '#F9FAFB', fontWeight: '500' },
  billDate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  billAmount: { fontSize: 16, fontWeight: '700' },
});
