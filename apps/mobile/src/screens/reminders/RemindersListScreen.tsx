import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
    if (accessToken) setAccessToken(accessToken);
    loadReminders();
  }, [accessToken]);

  async function loadReminders() {
    try {
      const res = await api.get<any>('/reminders');
      setReminders(Array.isArray(res.data) ? res.data : []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
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
        return reminders.filter((r) => r.dueDate?.startsWith(today) || r.startDate?.startsWith(today));
      case 'upcoming':
        return reminders.filter((r) => r.dueDate && r.dueDate > today && r.dueDate <= weekLater && r.status !== 'completed');
      case 'overdue':
        return reminders.filter((r) => r.dueDate && r.dueDate < today && r.status !== 'completed');
      default:
        return reminders;
    }
  }

  function getPriorityColor(p: string) {
    switch (p) {
      case 'urgent': return colors.status.error;
      case 'high': return colors.status.warning;
      case 'medium': return colors.accent.primary;
      default: return colors.text.tertiary;
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'payment': return '💳';
      case 'bill': return '📋';
      case 'subscription': return '🔄';
      case 'goal': return '🎯';
      default: return '🔔';
    }
  }

  const filteredData = getFilteredData();

  if (loading) return <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}><ActivityIndicator color={colors.accent.primary} size="large" /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f.key} style={[styles.filterChip, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }, filter === f.key && { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary }]} onPress={() => setFilter(f.key)}>
            <Text style={[styles.filterChipText, { color: colors.text.tertiary }, filter === f.key && { color: '#FFFFFF' }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(r) => r.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, { backgroundColor: colors.bg.secondary }]} onPress={() => navigation.navigate('ReminderDetail', { reminderId: item.id })}>
            <View style={styles.cardLeft}>
              <Text style={styles.typeIcon}>{getTypeIcon(item.type)}</Text>
              <View style={[styles.priorityDot, { backgroundColor: colors.accent.primary }]} />
            </View>
            <View style={styles.cardCenter}>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>{item.title}</Text>
              <Text style={[styles.cardDate, { color: colors.text.tertiary }]}>
                {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No due date'}
              </Text>
            </View>
            <View style={styles.cardRight}>
              <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(item.priority)}22` }]}>
                <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>{item.priority}</Text>
              </View>
              {item.status === 'completed' && <Text style={[styles.completedBadge, { color: colors.status.success }]}>✓</Text>}
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={filteredData.length === 0 ? styles.emptyContainer : { paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No reminders</Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>Create a reminder to get started</Text>
          </View>
        }
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.accent.primary, shadowColor: colors.accent.primary, bottom: insets.bottom + 100 }]} onPress={() => navigation.navigate('CreateReminder')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 22, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  card: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 4, padding: 16, borderRadius: 16 },
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
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center' },
  emptyIcon: { fontSize: 48, opacity: 0.5, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { fontSize: 14 },
  fab: { position: 'absolute', right: 24, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  fabText: { fontSize: 28, color: '#FFFFFF', lineHeight: 30 },
});
