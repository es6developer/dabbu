import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { ListSkeleton } from '../../components/ui/AnimatedSkeleton';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';
import { api, setAccessToken } from '../../services/api';
import {
  getNotificationActionLabel,
  navigateToNotification,
} from '../../services/notification-routing';
import { useAuth } from '../../store/AuthContext';
import { useTheme, spacing, borderRadius as radii } from '../../theme';

import { alertService } from '../../components/ui';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  priority: string;
  category: string;
  overdue: boolean;
  actionUrl?: string;
  data?: Record<string, any>;
  createdAt: string;
}

type FilterKey = 'all' | 'overdue' | 'upcoming' | 'paid' | 'bill' | 'reload1';

const FILTER_ITEMS: { key: FilterKey; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'bells' },
  { key: 'overdue', label: 'Overdue', icon: 'exclamationcircle' },
  { key: 'upcoming', label: 'Upcoming', icon: 'calendar' },
  { key: 'paid', label: 'Completed', icon: 'checkcircleo' },
  { key: 'bill', label: 'Bills', icon: 'filetext1' },
  { key: 'reload1', label: 'Subscriptions', icon: 'retweet' },
];

const NOTIFICATION_ICONS: Record<string, string> = {
  bill: 'filetext1',
  bill_reminder: 'filetext1',
  emi_reminder: 'filetext1',
  emi_overdue: 'filetext1',
  subscription_reminder: 'retweet',
  subscription_renewal: 'retweet',
  payment: 'creditcard',
  payment_sent: 'creditcard',
  settlement_request: 'swap',
  settlement_complete: 'swap',
  goal: 'flag',
  goal_created: 'flag',
  goal_milestone: 'flag',
  goal_complete: 'flag',
  goal_behind: 'flag',
  group_expense: 'addusergroup',
  group_invite: 'team',
  member_added: 'team',
  ai_insight: 'bulb1',
  daily_digest: 'bulb1',
  weekly_digest: 'bulb1',
  monthly_report: 'barschart',
  task: 'check',
};

const NOTIFICATION_COLORS: Record<string, string> = {
  bill: '#F43F5E',
  emi: '#F43F5E',
  subscription: '#8B5CF6',
  payment: '#10B981',
  settlement: '#22C55E',
  goal: '#F59E0B',
  group: '#3B82F6',
  insight: '#7C3AED',
  system: '#6B7280',
  reminder: '#F97316',
};

export function NotificationCenterScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useSilentRefresh(
    useCallback((isInitial) => {
      loadNotifications(!isInitial);
    }, []),
  );

  const loadNotifications = async (silent = false, refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (!silent) {
        setLoading(true);
      }
      if (accessToken) {
        setAccessToken(accessToken);
      }

      let url = '/notifications?limit=100';
      if (activeFilter === 'overdue') {
        url = '/notifications/filter?limit=100&overdue=true';
      } else if (activeFilter === 'upcoming') {
        url = '/notifications/filter?limit=100&type=reminder_upcoming';
      } else if (activeFilter === 'paid') {
        url = '/notifications/filter?limit=100&isRead=true';
      } else if (activeFilter === 'bill' || activeFilter === 'reload1') {
        url = `/notifications/filter?limit=100&category=${activeFilter === 'reload1' ? 'subscription' : 'bill'}`;
      }

      const res = await api.get<any>(url);
      const data = Array.isArray(res) ? res : res?.data || [];
      setNotifications(Array.isArray(data) ? data : []);

      const unreadRes = await api
        .get<any>('/notifications/unread-count')
        .catch(() => ({ count: 0 }));
      setUnreadCount(unreadRes?.count || 0);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [activeFilter]);

  const handleMarkRead = async (id: string) => {
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.patch(`/notifications/${id}/read`, {});
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.patch('/notifications/read-all', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      // silent
    }
  };

  const handleDelete = (id: string) => {
    alertService.alert('Delete Notification', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (accessToken) {
              setAccessToken(accessToken);
            }
            await api.delete(`/notifications/${id}`);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
          } catch (e) {
            // silent
          }
        },
      },
    ]);
  };

  const handlePress = (item: NotificationItem) => {
    if (!item.isRead) {
      handleMarkRead(item.id);
    }
    navigateToNotification(navigation, {
      ...(item.data || {}),
      type: item.type,
      actionUrl: item.actionUrl || item.data?.actionUrl,
      reminderId: item.data?.reminderId,
    });
  };

  const getIcon = (item: NotificationItem): string => {
    const key = item.category || item.type || '';
    return NOTIFICATION_ICONS[key] || 'bells';
  };

  const getAccentColor = (item: NotificationItem): string => {
    const key = item.category || item.type || '';
    return NOTIFICATION_COLORS[key] || colors.text.tertiary;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#FF3B30';
      case 'high':
        return '#FF9500';
      case 'medium':
        return '#f7892c';
      default:
        return colors.text.tertiary;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const isUnread = !item.isRead;
    const priorityColor = getPriorityColor(item.priority);
    const icon = getIcon(item);
    const accent = getAccentColor(item);

    return (
      <TouchableOpacity
        style={[
          s.card,
          {
            backgroundColor: isUnread ? colors.accent.primary + '06' : colors.bg.card,
            borderColor: isUnread ? accent + '25' : colors.border.subtle,
          },
        ]}
        onPress={() => handlePress(item)}
        onLongPress={() => handleDelete(item.id)}
        activeOpacity={0.7}
      >
        <View style={s.cardRow}>
          <View style={[s.iconWrap, { backgroundColor: accent + '16' }]}>
            <AntDesign name={icon as any} size={20} color={accent} />
          </View>

          <View style={s.cardContent}>
            <View style={s.titleRow}>
              <Text style={[s.title, { color: colors.text.primary }]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.overdue && (
                <View style={[s.overdueBadge, { backgroundColor: '#FF3B3018' }]}>
                  <Text style={[s.overdueText, { color: '#FF3B30' }]}>OVERDUE</Text>
                </View>
              )}
              {isUnread && (
                <View style={[s.unreadBadge, { backgroundColor: accent }]} />
              )}
            </View>

            <Text style={[s.message, { color: colors.text.secondary }]} numberOfLines={2}>
              {item.message}
            </Text>

            <View style={s.metaRow}>
              <Text style={[s.time, { color: colors.text.tertiary }]}>
                {formatTime(item.createdAt)}
              </Text>
              {item.priority === 'urgent' && (
                <View style={[s.priorityDot, { backgroundColor: '#FF3B30' }]} />
              )}
            </View>

            <View style={s.actionsRow}>
              <TouchableOpacity
                style={[s.primaryAction, { backgroundColor: accent }]}
                onPress={() => handlePress(item)}
              >
                <Text style={s.primaryActionText}>
                  {getNotificationActionLabel({
                    ...(item.data || {}),
                    type: item.type,
                    actionUrl: item.actionUrl,
                  })}
                </Text>
                <AntDesign name="arrowright" size={13} color="#FFFFFF" />
              </TouchableOpacity>

              {!item.isRead && (
                <TouchableOpacity
                  style={[s.secondaryAction, { backgroundColor: colors.bg.tertiary }]}
                  onPress={() => handleMarkRead(item.id)}
                >
                  <AntDesign name="check" size={13} color={colors.status.success} />
                  <Text style={[s.actionLabel, { color: colors.status.success }]}>Read</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[s.secondaryAction, { backgroundColor: colors.bg.tertiary }]}
                onPress={() => handleDelete(item.id)}
              >
                <AntDesign name="delete" size={13} color={colors.status.error} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <AntDesign name="left" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text.primary }]}>Notifications</Text>
        <View style={s.headerRight}>
          {unreadCount > 0 && (
            <>
              <TouchableOpacity onPress={handleMarkAllRead} style={s.markAllBtn}>
                <Text style={[s.markAllText, { color: colors.accent.primary }]}>
                  Mark all read
                </Text>
              </TouchableOpacity>
              <View style={[s.countBadge, { backgroundColor: colors.accent.primary }]}>
                <Text style={s.countText}>{unreadCount}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Filter chips row */}
      <View style={s.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_ITEMS}
          keyExtractor={(f) => f.key}
          contentContainerStyle={s.filterList}
          renderItem={({ item: f }) => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                style={[
                  s.filterChip,
                  { backgroundColor: isActive ? colors.accent.primary : colors.bg.tertiary },
                ]}
                onPress={() => setActiveFilter(f.key)}
              >
                <AntDesign
                  name={f.icon as any}
                  size={14}
                  color={isActive ? '#FFFFFF' : colors.text.secondary}
                />
                <Text
                  style={[
                    s.filterLabel,
                    { color: isActive ? '#FFFFFF' : colors.text.secondary },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      {loading ? (
        <ListSkeleton count={5} />
      ) : notifications.length === 0 ? (
        <View style={s.emptyState}>
          <View style={[s.emptyIconBg, { backgroundColor: colors.bg.tertiary }]}>
            <AntDesign name="bells" size={36} color={colors.text.tertiary} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text.primary }]}>
            {activeFilter === 'all' ? 'No notifications yet' : 'No matching notifications'}
          </Text>
          <Text style={[s.emptySub, { color: colors.text.tertiary }]}>
            {activeFilter === 'all' ? "You're all caught up!" : 'Try a different filter'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotifications(false, true)}
              tintColor={colors.accent.primary}
            />
          }
          ListFooterComponent={<View style={{ height: insets.bottom + 120 }} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    flex: 1,
    marginLeft: 10,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  markAllBtn: { paddingHorizontal: 4 },
  markAllText: { fontSize: 16, fontWeight: '600' },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 7,
  },
  countText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  filterRow: { marginBottom: 12 },
  filterList: { paddingHorizontal: 24, gap: 10 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 28,
    gap: 7,
  },
  filterLabel: { fontSize: 16, fontWeight: '600' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 44 },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 19, fontWeight: '600', marginBottom: 6 },
  emptySub: { fontSize: 16, fontWeight: '400', textAlign: 'center' },

  list: { paddingHorizontal: 24, paddingTop: 4 },

  card: {
    borderRadius: 28,
    borderWidth: 1.5,
    marginBottom: 12,
    padding: 18,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconWrap: {
    width: 44,
    height: 52,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '600', flex: 1 },
  overdueBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 100,
  },
  overdueText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  unreadBadge: { width: 8, height: 8, borderRadius: 4 },
  message: { fontSize: 16, fontWeight: '400', lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  time: { fontSize: 12, fontWeight: '400' },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 28,
    gap: 6,
  },
  primaryActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 28,
    gap: 5,
  },
  actionLabel: { fontSize: 12, fontWeight: '500' },
});
