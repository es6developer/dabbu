import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useLifeEventStore, LifeEvent, LifeEventType } from '../../store/lifeEventStore';

const EVENT_META: Record<LifeEventType, { emoji: string; color: string }> = {
  HOUSE: { emoji: '🏠', color: '#F59E0B' },
  BABY: { emoji: '👶', color: '#22C55E' },
  WEDDING: { emoji: '💍', color: '#F43F5E' },
  CAR: { emoji: '🚗', color: '#3B82F6' },
  VACATION: { emoji: '🌴', color: '#06B6D4' },
  EDUCATION: { emoji: '🎓', color: '#8B5CF6' },
  RETIREMENT: { emoji: '📈', color: '#6366F1' },
  BUSINESS: { emoji: '💼', color: '#F97316' },
  MOVING: { emoji: '📦', color: '#14B8A6' },
  JOB_CHANGE: { emoji: '💼', color: '#64748B' },
  SALARY_INCREASE: { emoji: '💰', color: '#22C55E' },
  CUSTOM: { emoji: '📌', color: '#7C3AED' },
};

export function LifeEventsListScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { events, loading, fetchEvents, confirmEvent, dismissEvent } = useLifeEventStore();

  useEffect(() => {
    fetchEvents();
  }, []);

  const renderEvent = ({ item }: { item: LifeEvent }) => {
    const meta = EVENT_META[item.eventType] || EVENT_META.CUSTOM;
    const isNew = !item.isConfirmed && !item.isDismissed;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.bg.card, borderLeftColor: meta.color }]}
        onPress={() => navigation?.navigate('LifeEventDetail', { eventId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <Text style={styles.emoji}>{meta.emoji}</Text>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>{item.title}</Text>
            {item.description && (
              <Text style={[styles.cardDesc, { color: colors.text.tertiary }]} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <Text style={[styles.cardMeta, { color: colors.text.tertiary }]}>
              {item.source === 'ai_detected' ? 'AI Detected' : 'Manual'} · {new Date(item.detectedAt).toLocaleDateString('en-IN')}
            </Text>
          </View>
          {isNew && <View style={[styles.badge, { backgroundColor: meta.color }]} />}
        </View>
        {isNew && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.status.success + '15' }]}
              onPress={() => confirmEvent(item.id)}
            >
              <Text style={[styles.actionText, { color: colors.status.success }]}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.bg.tertiary }]}
              onPress={() => dismissEvent(item.id)}
            >
              <Text style={[styles.actionText, { color: colors.text.secondary }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <AntDesign name="arrowleft" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text.primary }]}>Life Events</Text>
        <TouchableOpacity
          onPress={() => navigation?.navigate('CreateLifeEvent')}
          style={[styles.addBtn, { backgroundColor: colors.accent.primary }]}
        >
          <AntDesign name="plus" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading && events.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchEvents} tintColor={colors.accent.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <AntDesign name="calendar" size={48} color={colors.text.tertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No life events yet</Text>
              <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
                Dabbu will detect life events from your transactions. You can also add them manually.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800' },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
  },
  cardRow: { flexDirection: 'row', gap: 12 },
  emoji: { fontSize: 28 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardDesc: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  cardMeta: { fontSize: 11, marginTop: 6, fontWeight: '500' },
  badge: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12, marginLeft: 40 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  actionText: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
});
