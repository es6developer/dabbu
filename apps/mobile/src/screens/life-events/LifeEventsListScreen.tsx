import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useLifeEventStore, LifeEvent, LifeEventType } from '../../store/lifeEventStore';

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

export function LifeEventsListScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { events, loading, fetchEvents, confirmEvent, dismissEvent } = useLifeEventStore();
  const eventMeta = getEventMeta(colors);

  useEffect(() => {
    fetchEvents();
  }, []);

  const renderEvent = ({ item }: { item: LifeEvent }) => {
    const meta = eventMeta[item.eventType] || eventMeta.CUSTOM;
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
    paddingHorizontal: 24,
    paddingBottom: 14,
  },
  backBtn: { width: 40, height: 40, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800' },
  addBtn: { width: 36, height: 36, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 24, paddingBottom: 100 },
  card: {
    padding: 22,
    borderRadius: 30,
    marginBottom: 14,
    borderLeftWidth: 3,
  },
  cardRow: { flexDirection: 'row', gap: 14 },
  emoji: { fontSize: 28 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardDesc: { fontSize: 16, marginTop: 4, lineHeight: 18 },
  cardMeta: { fontSize: 12, marginTop: 6, fontWeight: '500' },
  badge: { width: 10, height: 10, borderRadius: 10, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14, marginLeft: 44 },
  actionBtn: { paddingHorizontal: 24, paddingVertical: 8, borderRadius: 24 },
  actionText: { fontSize: 16, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 19, fontWeight: '700' },
  emptyDesc: { fontSize: 16, textAlign: 'center', paddingHorizontal: 44, lineHeight: 24 },
});
