import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
} from 'react-native';
import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api } from '../../services/api';

const EVENT_TYPE_CONFIG: Record<
  string,
  { icon: string; iconSet: 'AntDesign' | 'MaterialCommunityIcons'; color: string }
> = {
  Birthday: { icon: 'gift', iconSet: 'AntDesign', color: '#EC4899' },
  EMI: { icon: 'creditcard', iconSet: 'AntDesign', color: '#EF4444' },
  'Bill Due': { icon: 'filetext1', iconSet: 'AntDesign', color: '#F97316' },
  'Insurance Renewal': { icon: 'shield-check', iconSet: 'MaterialCommunityIcons', color: '#3B82F6' },
  'School Fee': { icon: 'book', iconSet: 'AntDesign', color: '#22C55E' },
  'Goal Milestone': { icon: 'flag', iconSet: 'AntDesign', color: '#A855F7' },
  Reminder: { icon: 'bell', iconSet: 'AntDesign', color: '#14B8A6' },
  Custom: { icon: 'calendar', iconSet: 'AntDesign', color: '#6B7280' },
};

interface FamilyCalendarEvent {
  id: string;
  title: string;
  description?: string;
  eventType: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  color?: string;
  assignedTo?: string;
  createdBy?: string;
  familyId: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function EventTypeIcon({ type, size = 14 }: { type: string; size?: number }) {
  const config = EVENT_TYPE_CONFIG[type] || EVENT_TYPE_CONFIG.Custom;
  const color = config.color;
  if (config.iconSet === 'MaterialCommunityIcons') {
    return <MaterialCommunityIcons name={config.icon as any} size={size} color={color} />;
  }
  return <AntDesign name={config.icon as any} size={size} color={color} />;
}

function EventTypeBadge({ type }: { type: string }) {
  const config = EVENT_TYPE_CONFIG[type] || EVENT_TYPE_CONFIG.Custom;
  return (
    <View style={[styles.typeBadge, { backgroundColor: config.color + '20' }]}>
      <EventTypeIcon type={type} size={11} />
      <Text style={[styles.typeBadgeText, { color: config.color }]}>{type}</Text>
    </View>
  );
}

function EventCardSkeleton() {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonRow}>
        <Animated.View style={[styles.skeletonIcon, { opacity }]} />
        <View style={{ flex: 1, gap: 8 }}>
          <Animated.View style={[styles.skeletonLine, { width: '55%', opacity }]} />
          <Animated.View style={[styles.skeletonLine, { width: '35%', opacity }]} />
          <Animated.View style={[styles.skeletonLine, { width: '70%', opacity }]} />
        </View>
      </View>
    </View>
  );
}

function EventCard({ event }: { event: FamilyCalendarEvent }) {
  const { colors } = useTheme();
  const config = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG.Custom;

  return (
    <View style={[styles.eventCard, { backgroundColor: colors.bg.card }]}>
      <View style={styles.eventCardTop}>
        <View style={[styles.eventTypeIconWrap, { backgroundColor: config.color + '15' }]}>
          <EventTypeIcon type={event.eventType} size={18} />
        </View>
        <View style={styles.eventCardInfo}>
          <View style={styles.eventTitleRow}>
            <Text style={[styles.eventTitle, { color: colors.text.primary }]} numberOfLines={1}>
              {event.title}
            </Text>
            <EventTypeBadge type={event.eventType} />
          </View>
          <View style={styles.eventMetaRow}>
            <AntDesign name="calendar" size={12} color={colors.text.tertiary} />
            <Text style={[styles.eventMetaText, { color: colors.text.secondary }]}>
              {formatDate(event.startDate)}
            </Text>
          </View>
        </View>
      </View>

      {event.description ? (
        <Text
          style={[styles.eventDescription, { color: colors.text.secondary }]}
          numberOfLines={2}
        >
          {event.description}
        </Text>
      ) : null}

      {event.assignedTo ? (
        <View style={styles.assignedRow}>
          <AntDesign name="user" size={12} color={colors.text.tertiary} />
          <Text style={[styles.assignedText, { color: colors.text.tertiary }]}>
            {event.assignedTo}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function FamilyCalendarScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [events, setEvents] = useState<FamilyCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const fetchEvents = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const families: any[] = await api.get('/family');
      if (!families || families.length === 0) {
        setEvents([]);
        return;
      }
      const familyId = families[0].id;
      const data: FamilyCalendarEvent[] = await api.get(
        `/family/calendar?familyId=${familyId}`,
      );
      setEvents(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = useCallback(() => {
    fetchEvents(true);
  }, [fetchEvents]);

  const monthEvents = events
    .filter((e) => {
      const d = new Date(e.startDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: 20 }]}>
        <Text style={[styles.largeTitle, { color: colors.text.primary }]}>Calendar</Text>
      </View>

      {loading ? (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <EventCardSkeleton key={i} />
          ))}
        </ScrollView>
      ) : error ? (
        <View style={styles.centerState}>
          <AntDesign name="exclamationcircleo" size={48} color={colors.text.tertiary} />
          <Text style={[styles.stateText, { color: colors.text.secondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => fetchEvents()}
          >
            <Text style={[styles.retryText, { color: colors.text.inverse }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : monthEvents.length === 0 ? (
        <View style={styles.centerState}>
          <AntDesign name="calendar" size={48} color={colors.text.tertiary} />
          <Text style={[styles.stateText, { color: colors.text.secondary }]}>
            No events this month
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => navigation.navigate('CreateCalendarEvent')}
          >
            <AntDesign name="plus" size={16} color={colors.text.inverse} />
            <Text style={[styles.retryText, { color: colors.text.inverse }]}>Create Event</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent.primary}
              colors={[colors.accent.primary]}
            />
          }
        >
          <View style={[styles.sectionHeader, { paddingHorizontal: 20 }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              This Month's Events
            </Text>
            <Text style={[styles.eventCount, { color: colors.text.tertiary }]}>
              {monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {monthEvents.map((event) => (
            <View key={event.id} style={{ paddingHorizontal: 20 }}>
              <EventCard event={event} />
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent.primary }]}
        onPress={() => navigation.navigate('CreateCalendarEvent')}
        activeOpacity={0.8}
      >
        <AntDesign name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 120,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  stateText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  eventCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  skeletonCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
    backgroundColor: '#1C1C1E',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  skeletonIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#27272A',
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#27272A',
  },
  eventCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  eventCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventTypeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventCardInfo: {
    flex: 1,
    gap: 4,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  eventMetaText: {
    fontSize: 13,
    fontWeight: '500',
  },
  eventDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  assignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  assignedText: {
    fontSize: 12,
    fontWeight: '500',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
