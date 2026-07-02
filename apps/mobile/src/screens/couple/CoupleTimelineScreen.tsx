import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Animated, ActivityIndicator } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { spacing, borderRadius } from '../../theme/design';

function getEventConfig(eventType: string, colors: any) {
  const config: Record<string, { icon: string; color: string }> = {
    expense_added: { icon: 'shoppingcart', color: colors.status.error },
    goal_contribution: { icon: 'flag', color: colors.status.success },
    salary_added: { icon: 'caretdown', color: colors.status.success },
    bill_paid: { icon: 'check', color: '#3B82F6' },
    planner_progress: { icon: 'calendar', color: colors.accent.tertiary },
    achievement: { icon: 'star', color: colors.status.warning },
    savings_milestone: { icon: 'save', color: '#14B8A6' },
  };
  return config[eventType] || { icon: 'clockcircleo', color: colors.text.tertiary };
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - date) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatAmount(amount: number): string {
  return '\u20B9' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function UserAvatar({ name }: { name?: string }) {
  const { colors } = useTheme();
  const initials = useMemo(() => {
    if (!name) return '?';
    return name.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2);
  }, [name]);

  return (
    <View style={[styles.avatar, { backgroundColor: colors.accent.primary + '18' }]}>
      <Text style={[styles.avatarText, { color: colors.accent.primary }]}>{initials}</Text>
    </View>
  );
}

function EventCard({ event }: { event: any }) {
  const { colors } = useTheme();
  const cfg = getEventConfig(event.eventType, colors);
  const time = formatRelativeTime(event.createdAt);
  const userName = event.user?.name || 'Someone';
  const amount = event.amount ? formatAmount(event.amount) : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardUser}>
          <UserAvatar name={userName} />
          <Text style={[styles.userName, { color: colors.text.primary }]} numberOfLines={1}>{userName}</Text>
        </View>
        <View style={[styles.eventIcon, { backgroundColor: cfg.color + '14' }]}>
          <AntDesign name={cfg.icon as any} size={16} color={cfg.color} />
        </View>
      </View>

      <Text style={[styles.eventTitle, { color: colors.text.primary }]}>{event.title}</Text>

      {event.description ? (
        <Text style={[styles.eventDesc, { color: colors.text.secondary }]} numberOfLines={3}>{event.description}</Text>
      ) : null}

      {amount ? (
        <Text style={[styles.eventAmount, { color: cfg.color }]}>{amount}</Text>
      ) : null}

      <Text style={[styles.eventTime, { color: colors.text.tertiary }]}>{time}</Text>
    </View>
  );
}

function SkeletonCard() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
      <View style={styles.skeleRow}>
        <View style={[styles.skeleAvatar, { backgroundColor: colors.skeleton.base }]} />
        <View style={[styles.skeleLine, { width: 110, height: 12, backgroundColor: colors.skeleton.base }]} />
      </View>
      <View style={[styles.skeleLine, { width: '75%', height: 14, marginTop: 16, backgroundColor: colors.skeleton.base }]} />
      <View style={[styles.skeleLine, { width: '55%', height: 12, marginTop: 8, backgroundColor: colors.skeleton.base }]} />
      <View style={[styles.skeleLine, { width: 70, height: 10, marginTop: 16, backgroundColor: colors.skeleton.base }]} />
    </View>
  );
}

function EmptyState({ colors }: { colors: any }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIconBox, { backgroundColor: colors.bg.secondary }]}>
        <AntDesign name="clockcircleo" size={40} color={colors.text.tertiary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No activity yet</Text>
      <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
        Your timeline will show expenses, goals, bills, and milestones as you use Couple Mode together.
      </Text>
    </View>
  );
}

export function CoupleTimelineScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchTimeline = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1 && !append) setLoading(true);
    try {
      const res = await api.get<any>(`/couple/timeline?page=${pageNum}&limit=20`);
      const newEvents = res?.events || [];
      setEvents(prev => append ? [...prev, ...newEvents] : newEvents);
      setHasMore(newEvents.length === 20);
      setPage(pageNum);
      if (pageNum === 1) {
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      }
    } catch {
      // handled by empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [fadeAnim]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTimeline(1);
  }, [fetchTimeline]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchTimeline(page + 1, true);
  }, [hasMore, loadingMore, page, fetchTimeline]);

  const renderItem = useCallback(({ item }: { item: any }) => <EventCard event={item} />, []);
  const keyExtractor = useCallback((item: any) => item.id, []);

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Timeline</Text>
        <View style={styles.skeleList}>
          {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Timeline</Text>
      </View>
      <Animated.View style={[styles.listWrap, { opacity: fadeAnim }]}>
        <FlatList
          data={events}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<EmptyState colors={colors} />}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={colors.accent.primary} style={styles.footer} />
            ) : null
          }
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  listWrap: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['5xl'],
    paddingTop: spacing.xs,
  },
  footer: {
    paddingVertical: spacing.lg,
  },

  // Card
  card: {
    borderRadius: borderRadius['3xl'],
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: spacing.xs,
  },
  eventDesc: {
    fontSize: 16,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  eventAmount: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  eventTime: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Skeleton
  skeleList: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  skeleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  skeleAvatar: {
    width: 34,
    height: 34,
    borderRadius: 26,
  },
  skeleLine: {
    borderRadius: 8,
  },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing['4xl'],
    gap: spacing.md,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  emptyDesc: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 18,
  },
});
