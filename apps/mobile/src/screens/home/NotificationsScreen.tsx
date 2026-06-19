import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { ListSkeleton } from '../../components/ui/AnimatedSkeleton';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

export function NotificationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, []),
  );

  async function loadNotifications(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.get<any>(`/notifications?limit=50`);
      setNotifications(res || []);
    } catch (_e) {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleMarkRead(id: string) {
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.patch(`/notifications/${id}/read`, {});
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (_e) {
      // silent
    }
  }

  async function handleMarkAllRead() {
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.patch(`/notifications/read-all`, {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (_e) {
      // silent
    }
  }

  function handleNotificationPress(item: NotificationItem) {
    handleMarkRead(item.id);
    if (item.data?.groupId) {
      navigation.navigate('WalletTab', {
        screen: 'GroupExpenses',
        params: { groupId: item.data.groupId },
      });
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const keyExtractor = useCallback((item: NotificationItem) => item.id, []);

  function renderItem({ item }: { item: NotificationItem }) {
    return (
      <TouchableOpacity
        style={[
          styles.notifCard,
          {
            backgroundColor: item.isRead ? colors.bg.card : colors.accent.primary + '08',
            borderColor: colors.border.subtle,
            borderLeftColor: item.isRead ? 'transparent' : colors.accent.primary,
          },
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notifContent}>
          <Text
            style={[
              styles.notifTitle,
              { color: colors.text.primary },
              !item.isRead && { fontWeight: '700' },
            ]}
          >
            {item.title}
          </Text>
          <Text style={[styles.notifMessage, { color: colors.text.secondary }]} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={[styles.notifTime, { color: colors.text.tertiary }]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
        {!item.isRead && (
          <View style={[styles.unreadDot, { backgroundColor: colors.accent.primary }]} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign  name="left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={[styles.markAllBtn, { color: colors.accent.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ListSkeleton count={5} />
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <AntDesign  name="bells" size={48} color={colors.text.tertiary} />
          <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>No notifications</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotifications(true)}
              tintColor={colors.accent.primary}
            />
          }
          ListFooterComponent={<View style={{ height: insets.bottom + 40 }} />}
          windowSize={10}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

function formatTime(dateStr: string): string {
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
  headerTitle: { fontSize: 20, fontWeight: '700' },
  markAllBtn: { fontSize: 14, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15 },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 3,
    marginBottom: 10,
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  notifMessage: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  notifTime: { fontSize: 11 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 10 },
});
