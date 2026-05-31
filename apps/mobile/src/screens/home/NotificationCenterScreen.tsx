import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme, typography as typographyStyles } from '../../theme';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  priority: string;
  category: string;
  overdue: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

type FilterKey = 'all' | 'overdue' | 'upcoming' | 'paid' | 'bill' | 'subscription';

const FILTERS: { key: FilterKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'notifications-outline' },
  { key: 'overdue', label: 'Overdue', icon: 'alert-circle-outline' },
  { key: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
  { key: 'paid', label: 'Completed', icon: 'checkmark-circle-outline' },
  { key: 'bill', label: 'Bills', icon: 'receipt-outline' },
  { key: 'subscription', label: 'Subscriptions', icon: 'repeat-outline' },
];

export function NotificationCenterScreen() {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, []),
  );

  const loadNotifications = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      if (accessToken) {
        setAccessToken(accessToken);
      }

      let url = '/notifications?limit=100';
      if (activeFilter === 'overdue') {
        url += '&overdue=true';
      } else if (activeFilter === 'upcoming') {
        url += '&type=reminder_upcoming';
      } else if (activeFilter === 'paid') {
        url += '&type=goal_milestone,completed';
      } else if (activeFilter === 'bill' || activeFilter === 'subscription') {
        url += `&category=${activeFilter}`;
      }

      const res = await api.get<any>(url);
      const data = res?.data || res || [];
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
    Alert.alert('Delete Notification', 'Are you sure?', [
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
    if (item.data?.reminderId) {
      navigation.navigate('Reminders', {
        screen: 'ReminderDetail',
        params: { reminderId: item.data.reminderId },
      });
    } else if (item.data?.groupId) {
      navigation.navigate('Accounts', {
        screen: 'GroupExpenses',
        params: { groupId: item.data.groupId },
      });
    }
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

  const getCategoryIcon = (category?: string): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'bill':
        return 'receipt-outline';
      case 'subscription':
        return 'repeat-outline';
      case 'payment':
        return 'card-outline';
      case 'task':
        return 'checkbox-outline';
      case 'goal':
        return 'trophy-outline';
      default:
        return 'notifications-outline';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) {
      return 'Just now';
    }
    if (mins < 60) {
      return `${mins}m ago`;
    }
    const hours = Math.floor(mins / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days}d ago`;
    }
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const isUnread = !item.isRead;
    const priorityColor = getPriorityColor(item.priority);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: isUnread ? colors.accent.primary + '08' : colors.bg.card,
            borderColor: colors.border.subtle,
            borderLeftColor: isUnread ? priorityColor : 'transparent',
          },
        ]}
        onPress={() => handlePress(item)}
        onLongPress={() => handleDelete(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: item.overdue ? '#FF3B3020' : priorityColor + '20' },
            ]}
          >
            <Ionicons
              name={getCategoryIcon(item.category)}
              size={18}
              color={item.overdue ? '#FF3B30' : priorityColor}
            />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text.primary }]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.overdue && (
                <View style={[styles.badge, { backgroundColor: '#FF3B3020' }]}>
                  <Text style={[styles.badgeText, { color: '#FF3B30' }]}>OVERDUE</Text>
                </View>
              )}
            </View>
            <Text style={[styles.message, { color: colors.text.secondary }]} numberOfLines={2}>
              {item.message}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.time, { color: colors.text.tertiary }]}>
                {formatTime(item.createdAt)}
              </Text>
              {item.priority === 'urgent' && (
                <View style={[styles.priorityDot, { backgroundColor: '#FF3B30' }]} />
              )}
            </View>
          </View>
          {isUnread && <View style={[styles.unreadDot, { backgroundColor: priorityColor }]} />}
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.status.success + '15' }]}
            onPress={() => {
              handleMarkRead(item.id);
              if (item.data?.reminderId) {
                navigation.navigate('CompleteReminder', { reminderId: item.data.reminderId });
              }
            }}
          >
            <Ionicons name="checkmark-outline" size={14} color={colors.status.success} />
            <Text style={[styles.actionText, { color: colors.status.success }]}>Mark Paid</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.bg.tertiary }]}
            onPress={() => handlePress(item)}
          >
            <Ionicons name="open-outline" size={14} color={colors.accent.primary} />
            <Text style={[styles.actionText, { color: colors.accent.primary }]}>Open</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.bg.tertiary }]}
            onPress={() => handleDelete(item.id)}
          >
            <Ionicons name="trash-outline" size={14} color={colors.status.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Notifications</Text>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <>
              <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
                <Text style={[styles.markAllText, { color: colors.accent.primary }]}>
                  Mark all read
                </Text>
              </TouchableOpacity>
              <View style={[styles.countBadge, { backgroundColor: colors.accent.primary }]}>
                <Text style={styles.countText}>{unreadCount}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(f) => f.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item: f }) => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { backgroundColor: isActive ? colors.accent.primary : colors.bg.tertiary },
                ]}
                onPress={() => setActiveFilter(f.key)}
              >
                <Ionicons
                  name={f.icon}
                  size={14}
                  color={isActive ? '#FFFFFF' : colors.text.secondary}
                />
                <Text
                  style={[
                    styles.filterLabel,
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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.bg.tertiary }]}>
            <Ionicons name="notifications-off-outline" size={40} color={colors.text.tertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
            {activeFilter === 'all' ? 'No notifications yet' : 'No matching notifications'}
          </Text>
          <Text style={[styles.emptySub, { color: colors.text.tertiary }]}>
            {activeFilter === 'all' ? "You're all caught up!" : 'Try a different filter'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotifications(true)}
              tintColor={colors.accent.primary}
            />
          }
          ListFooterComponent={<View style={{ height: insets.bottom + 100 }} />}
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
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { ...typographyStyles.screenTitle, flex: 1, marginLeft: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  markAllBtn: { paddingHorizontal: 4 },
  markAllText: { ...typographyStyles.subhead, fontFamily: 'Inter-SemiBold' },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countText: { color: '#FFFFFF', ...typographyStyles.caption1, fontFamily: 'Inter-Bold' },
  filterRow: { marginBottom: 8 },
  filterList: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  filterLabel: { ...typographyStyles.subhead, fontFamily: 'Inter-SemiBold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { ...typographyStyles.sectionHeader, marginBottom: 8 },
  emptySub: { ...typographyStyles.body, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  card: { borderRadius: 16, borderWidth: 1, borderLeftWidth: 3, marginBottom: 10, padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...typographyStyles.calloutBold, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  badgeText: { fontFamily: 'Inter-Bold', fontSize: 9, letterSpacing: 0.3 },
  message: { ...typographyStyles.subhead, lineHeight: 18, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  time: { ...typographyStyles.caption1 },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginLeft: 50 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  actionText: { ...typographyStyles.caption1, fontFamily: 'Inter-SemiBold' },
});
