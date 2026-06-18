import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function CoupleTimelineWidget({ data }: { data: any }) {
  if (!data) return null;
  const eventColors: Record<string, string> = {
    goal_created: '#4ADE80',
    expense_added: '#F87171',
    settlement: '#60A5FA',
    milestone: '#FBBF24',
    planner_created: '#A78BFA',
  };
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>Couple Timeline</Text>
        {data.level && <View style={styles.levelBadge}><Text style={styles.levelText}>Lv.{data.level}</Text></View>}
      </View>
      {(data.events || []).slice(0, 5).map((ev: any) => (
        <View key={ev.id} style={styles.eventRow}>
          <View style={[styles.eventDot, { backgroundColor: eventColors[ev.type] || '#6B7280' }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.eventDesc}>{ev.description}</Text>
            <Text style={styles.eventDate}>{new Date(ev.date).toLocaleDateString()}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  levelBadge: { backgroundColor: '#A78BFA20', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  levelText: { fontSize: 11, fontWeight: '700', color: '#A78BFA' },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#27272A' },
  eventDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  eventDesc: { fontSize: 13, color: '#F9FAFB' },
  eventDate: { fontSize: 11, color: '#6B7280', marginTop: 2 },
});
