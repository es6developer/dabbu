import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { ListSkeleton } from '../../components/ui/AnimatedSkeleton';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { BaseScreen } from '../../components/ui/BaseScreen';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTheme, spacing } from '../../theme';
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

  useSilentRefresh(
    useCallback((isInitial) => {
      loadReminders(!isInitial);
    }, []),
  );

  const loadReminders = async (silent = false, refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (!silent) {
        setLoading(true);
      }
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const [res, unreadRes] = await Promise.all([
        api.get<any>('/reminders?status=pending'),
        api.get<any>('/notifications/unread-count').catch(() => ({ count: 0 })),
      ]);
      const data = res;
      setReminders(Array.isArray(data) ? data : []);
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

  const getTypeIcon = (t: string): string => {
    switch (t) {
      case 'payment':
        return 'creditcard';
      case 'bill':
        return 'filetext1';
      case 'reload1':
        return 'retweet';
      case 'goal':
        return 'Trophy';
      default:
        return 'clockcircleo';
    }
  };

  const formatDate = (d?: string) => {
    if (!d) {
      return '';
    }
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const renderItem = ({ item }: { item: Reminder }) => (
    <Card
      variant="elevated"
      padding="lg"
      style={styles.card}
      onPress={() =>
        navigation.navigate('ReminderDetail' as never, { reminderId: item.id } as never)
      }
    >
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
          <AntDesign
            name={getTypeIcon(item.type) as any}
            size={20}
            color={getPriorityColor(item.priority)}
          />
        </View>
        <View style={styles.info}>
          <Text style={[typography.bodyBold, { color: colors.text.primary }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 2 }]}>
            {item.dueDate ? `Due ${formatDate(item.dueDate)}` : formatDate(item.remindAt)}
          </Text>
        </View>
        <View
          style={[
            styles.priorityBadge,
            { backgroundColor: getPriorityColor(item.priority) + '15' },
          ]}
        >
          <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
            {item.priority}
          </Text>
        </View>
      </View>
    </Card>
  );

  return (
    <BaseScreen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.text.tertiary }]}>Family Finance</Text>
          <Text style={[styles.title, { color: colors.text.primary }]}>Reminders</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: colors.bg.tertiary }]}
            onPress={() => navigation.navigate('NotificationCenter' as never)}
          >
            <AntDesign  name="bells" size={20} color={colors.accent.primary} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.accent.primary }]}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ListSkeleton count={3} />
      ) : reminders.length === 0 ? (
        <View style={{ paddingTop: spacing['4xl'] }}>
          <EmptyState
            icon="clockcircleo"
            title="No reminders yet"
            message="Create your first reminder to get started"
            actionLabel="Create Reminder"
            onAction={() => navigation.navigate('CreateReminder' as never)}
          />
        </View>
      ) : (
        <FlatList
          data={reminders}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadReminders(false, true)}
              tintColor={colors.accent.primary}
            />
          }
          ListFooterComponent={<View style={{ height: 100 }} />}
          windowSize={10}
          maxToRenderPerBatch={10}
        />
      )}
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingBottom: 100 },
  card: { marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  info: { flex: 1 },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: { fontSize: 10, fontWeight: '700' },
});
