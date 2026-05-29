import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { Card } from '../../components/ui/Card';

interface Reminder {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  dueDate?: string;
  startDate?: string;
  remindAt: string;
}

export function RemindersScreen() {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => { loadReminders(); }, []),
  );

  const loadReminders = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      if (accessToken) setAccessToken(accessToken);
      const res = await api.get<any>('/reminders?status=pending');
      const data = res?.data || [];
      setReminders(Array.isArray(data) ? data : []);
      const unreadRes = await api.get<any>('/notifications/unread-count').catch(() => ({ count: 0 }));
      setUnreadCount(unreadRes?.count || 0);
    } catch (_e) {
      setReminders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return '#FF3B30';
      case 'high': return '#FF9500';
      case 'medium': return '#f7892c';
      default: return colors.text.tertiary;
    }
  };

  const getTypeIcon = (t: string): keyof typeof Ionicons.glyphMap => {
    switch (t) {
      case 'payment': return 'card-outline';
      case 'bill': return 'receipt-outline';
      case 'subscription': return 'repeat-outline';
      case 'goal': return 'trophy-outline';
      default: return 'alarm-outline';
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const renderItem = ({ item }: { item: Reminder }) => (
    <Card
      variant="elevated"
      padding="lg"
      style={styles.card}
      onPress={() => navigation.navigate('ReminderDetail' as never, { reminderId: item.id } as never)}
    >
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
          <Ionicons name={getTypeIcon(item.type)} size={20} color={getPriorityColor(item.priority)} />
        </View>
        <View style={styles.info}>
          <Text style={[typography.bodyBold, { color: colors.text.primary }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 2 }]}>
            {item.dueDate ? `Due ${formatDate(item.dueDate)}` : formatDate(item.remindAt)}
          </Text>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '15' }]}>
          <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
            {item.priority}
          </Text>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Reminders</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: colors.bg.tertiary }]}
            onPress={() => navigation.navigate('NotificationCenter' as never)}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.accent.primary} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.accent.primary }]}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      ) : reminders.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.bg.tertiary }]}>
            <Ionicons name="alarm-outline" size={40} color={colors.text.tertiary} />
          </View>
          <Text style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.md }]}>
            No reminders yet
          </Text>
          <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 4 }]}>
            Create your first reminder to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={reminders}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadReminders(true)} tintColor={colors.accent.primary} />
          }
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent.primary, bottom: insets.bottom + 100 }]}
        onPress={() => navigation.navigate('CreateReminder' as never)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>
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
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: 12 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  priorityText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  fab: {
    position: 'absolute', right: 20, width: 56, height: 56,
    borderRadius: 16, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#f7892c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
});
