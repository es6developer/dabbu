import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { ListSkeleton } from '../../components/ui/AnimatedSkeleton';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BaseScreen } from '../../components/ui/BaseScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { FilterSection } from '../../components/ui/FilterSection';
import { spacing } from '../../theme';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

type FilterType = 'all' | 'today' | 'upcoming' | 'overdue';
const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'overdue', label: 'Overdue' },
];

export function RemindersListScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadReminders();
  }, [accessToken]);

  async function loadReminders() {
    try {
      const res = await api.get<any>('/reminders');
      const data = res;
      setReminders(Array.isArray(data) ? data : []);
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReminders();
    setRefreshing(false);
  }, []);

  function getFilteredData() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekLater = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
    switch (filter) {
      case 'today':
        return reminders.filter(
          (r) => r.dueDate?.startsWith(today) || r.startDate?.startsWith(today),
        );
      case 'upcoming':
        return reminders.filter(
          (r) =>
            r.dueDate && r.dueDate > today && r.dueDate <= weekLater && r.status !== 'completed',
        );
      case 'overdue':
        return reminders.filter((r) => r.dueDate && r.dueDate < today && r.status !== 'completed');
      default:
        return reminders;
    }
  }

  function getPriorityColor(p: string) {
    switch (p) {
      case 'urgent':
        return colors.status.error;
      case 'high':
        return colors.status.warning;
      case 'medium':
        return colors.accent.primary;
      default:
        return colors.text.tertiary;
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'payment':
        return '💳';
      case 'bill':
        return '📋';
      case 'subscription':
        return '🔄';
      case 'goal':
        return '🎯';
      default:
        return '🔔';
    }
  }

  const filteredData = getFilteredData();

  if (loading) {
    return (
      <BaseScreen>
        <ListSkeleton />
      </BaseScreen>
    );
  }

  const FILTER_OPTIONS = FILTERS.map((f) => ({ key: f.key, label: f.label }));

  return (
    <BaseScreen noPadding>
      <FlatList
        data={filteredData}
        keyExtractor={(r) => r.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ paddingHorizontal: spacing.lg }}>
            <PageHeader title="Reminders" subtitle="Family Finance" />
            <FilterSection
              options={FILTER_OPTIONS}
              selected={filter}
              onSelect={(key) => setFilter(key as FilterType)}
            />
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.bg.secondary }]}
            onPress={() => navigation.navigate('ReminderDetail', { reminderId: item.id })}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.typeIcon}>{getTypeIcon(item.type)}</Text>
              <View style={[styles.priorityDot, { backgroundColor: colors.accent.primary }]} />
            </View>
            <View style={styles.cardCenter}>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>{item.title}</Text>
              <Text style={[styles.cardDate, { color: colors.text.tertiary }]}>
                {item.dueDate
                  ? new Date(item.dueDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })
                  : 'No due date'}
              </Text>
            </View>
            <View style={styles.cardRight}>
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: `${getPriorityColor(item.priority)}22` },
                ]}
              >
                <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                  {item.priority}
                </Text>
              </View>
              {item.status === 'completed' && (
                <Text style={[styles.completedBadge, { color: colors.status.success }]}>✓</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={
          filteredData.length === 0
            ? styles.emptyContainer
            : { paddingBottom: insets.bottom + 100, paddingHorizontal: spacing.lg }
        }
        ListEmptyComponent={
          <EmptyState
            icon="bells"
            title="No reminders"
            message="Create a reminder to get started"
            actionLabel="Create Reminder"
            onAction={() => navigation.navigate('CreateReminder')}
          />
        }
        windowSize={10}
        maxToRenderPerBatch={10}
      />
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flexGrow: 1, paddingHorizontal: spacing.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: 4,
    padding: 16,
    borderRadius: 16,
  },
  cardLeft: { alignItems: 'center', marginRight: 12 },
  typeIcon: { fontSize: 20, marginBottom: 4 },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  cardCenter: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  cardDate: { fontSize: 12 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  priorityText: { fontSize: 10, fontWeight: '600' },
  completedBadge: { fontSize: 14, fontWeight: '700' },
});
