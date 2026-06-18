import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  route: string;
  color: string;
}

export function QuickActionsWidget({ data, onAction }: { data: QuickAction[]; onAction?: (route: string) => void }) {
  if (!data || data.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Quick Actions</Text>
      <View style={styles.grid}>
        {data.map((action) => (
          <TouchableOpacity key={action.id} style={styles.actionBtn} onPress={() => onAction?.(action.route)}>
            <View style={[styles.iconWrap, { backgroundColor: action.color + '20' }]}>
              <Ionicons name={action.icon as any} size={22} color={action.color} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { width: '30%', alignItems: 'center', padding: 8, gap: 6 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
});
