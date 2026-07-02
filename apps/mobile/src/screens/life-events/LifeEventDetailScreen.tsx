import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useLifeEventStore, LifeEventType } from '../../store/lifeEventStore';

function getEventMeta(colors: any): Record<LifeEventType, { emoji: string; color: string }> {
  return {
    HOUSE: { emoji: '🏠', color: colors.status.warning },
    BABY: { emoji: '👶', color: colors.status.success },
    WEDDING: { emoji: '💍', color: colors.accent.primary },
    CAR: { emoji: '🚗', color: '#3B82F6' },
    VACATION: { emoji: '🌴', color: '#06B6D4' },
    EDUCATION: { emoji: '🎓', color: colors.accent.secondary },
    RETIREMENT: { emoji: '📈', color: '#6366F1' },
    BUSINESS: { emoji: '💼', color: '#F97316' },
    MOVING: { emoji: '📦', color: '#14B8A6' },
    JOB_CHANGE: { emoji: '💼', color: colors.text.tertiary },
    SALARY_INCREASE: { emoji: '💰', color: colors.status.success },
    CUSTOM: { emoji: '📌', color: colors.accent.primary },
  };
}

export function LifeEventDetailScreen({ route, navigation }: any) {
  const { eventId } = route?.params ?? {};
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { events, confirmEvent, dismissEvent } = useLifeEventStore();
  const event = events.find((e) => e.id === eventId);
  const eventMeta = getEventMeta(colors);

  if (!event) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  const meta = eventMeta[event.eventType] || eventMeta.CUSTOM;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <AntDesign name="arrowleft" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text.primary }]}>Event Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: meta.color + '15' }]}>
          <Text style={styles.heroEmoji}>{meta.emoji}</Text>
          <Text style={[styles.heroTitle, { color: colors.text.primary }]}>{event.title}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
          <InfoRow label="Type" value={event.eventType} color={colors.text.primary} />
          <InfoRow label="Source" value={event.source === 'ai_detected' ? 'AI Detected' : 'Manual'} color={colors.text.primary} />
          <InfoRow label="Detected" value={new Date(event.detectedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} color={colors.text.primary} />
          <InfoRow label="Status" value={event.isConfirmed ? 'Confirmed' : event.isDismissed ? 'Dismissed' : 'Pending'} color={colors.text.primary} />
          <InfoRow label="Confidence" value={`${Math.round(event.confidence * 100)}%`} color={colors.text.primary} />
          {event.eventDate && (
            <InfoRow label="Event Date" value={new Date(event.eventDate).toLocaleDateString('en-IN')} color={colors.text.primary} />
          )}
        </View>

        {event.description && (
          <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
            <Text style={[styles.cardLabel, { color: colors.text.secondary }]}>Description</Text>
            <Text style={[styles.desc, { color: colors.text.primary }]}>{event.description}</Text>
          </View>
        )}

        {!event.isConfirmed && !event.isDismissed && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.status.success }]}
              onPress={() => confirmEvent(event.id)}
            >
              <AntDesign name="check" size={18} color="#FFF" />
              <Text style={styles.actionText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.status.error }]}
              onPress={() => dismissEvent(event.id)}
            >
              <AntDesign name="close" size={18} color="#FFF" />
              <Text style={styles.actionText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={[infoStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  label: { fontSize: 16, color: '#6B7280', fontWeight: '500' },
  value: { fontSize: 16, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 14,
  },
  title: { fontSize: 26, fontWeight: '800' },
  content: { padding: 22, paddingBottom: 100 },
  hero: {
    alignItems: 'center',
    padding: 36,
    borderRadius: 32,
    marginBottom: 20,
  },
  heroEmoji: { fontSize: 48, marginBottom: 14 },
  heroTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  card: { padding: 22, borderRadius: 30, marginBottom: 14 },
  cardLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  desc: { fontSize: 16, lineHeight: 24 },
  actionRow: { flexDirection: 'row', gap: 14, marginTop: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 28,
  },
  actionText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
