import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

export function CoupleTimelineWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { coupleTimeline } = data || {};
  const events = Array.isArray(coupleTimeline) ? coupleTimeline : [];

  if (!events.length) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="time-outline" size={18} color={colors.accent.primary} />
          <Text style={[styles.title, { color: colors.text.primary }]}>Couple Timeline</Text>
        </View>
        <Text style={[styles.empty, { color: colors.text.secondary }]}>-</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="time-outline" size={18} color={colors.accent.primary} />
        <Text style={[styles.title, { color: colors.text.primary }]}>Couple Timeline</Text>
      </View>
      {events.slice(0, 5).map((ev: any, i: number) => (
        <View key={i} style={styles.eventRow}>
          <View style={[styles.dot, { backgroundColor: colors.accent.primary }]} />
          {i < 4 && <View style={[styles.line, { backgroundColor: colors.border.subtle }]} />}
          <View style={styles.eventContent}>
            <Text style={[styles.eventText, { color: colors.text.primary }]}>{ev.text || ev.title || '-'}</Text>
            <Text style={[styles.eventDate, { color: colors.text.secondary }]}>{ev.date || ''}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700' },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, minHeight: 28 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  line: { width: 1, position: 'absolute', left: 3.5, top: 14, bottom: 0 },
  eventContent: { flex: 1, gap: 1 },
  eventText: { fontSize: 12, fontWeight: '500' },
  eventDate: { fontSize: 10, fontWeight: '500' },
  empty: { fontSize: 14, fontWeight: '500' },
});
