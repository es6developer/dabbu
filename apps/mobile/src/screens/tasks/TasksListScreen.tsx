import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

export function TasksListScreen() {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const [families, setFamilies] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadData();
  }, [accessToken]);

  async function loadData() {
    try {
      const [familiesRes, tasksRes] = await Promise.all([
        api.get<any>('/family'),
        api.get<any>('/family/tasks'),
      ]);
      setFamilies(Array.isArray(familiesRes.data) ? familiesRes.data : []);
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  async function handleToggleComplete(taskId: string, completed: boolean) {
    try {
      if (accessToken) setAccessToken(accessToken);
      await api.patch(`/family/tasks/${taskId}`, { completed: !completed });
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, completed: !completed } : t));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update task');
    }
  }

  function getPriorityColor(p: string) {
    switch (p?.toLowerCase()) {
      case 'urgent': return colors.status.error;
      case 'high': return colors.status.warning;
      case 'medium': return colors.accent.primary;
      default: return colors.text.tertiary;
    }
  }

  function groupTasksByFamily(): { family: string; tasks: any[] }[] {
    if (families.length > 0) {
      return families.map((f) => ({
        family: f.name,
        tasks: tasks.filter((t) => t.familyId === f.id || t.taskListId === f.id),
      })).filter((g) => g.tasks.length > 0);
    }
    return [{ family: 'Tasks', tasks }];
  }

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary, paddingHorizontal: 24, gap: 14 }]}>
        <Skeleton width={140} height={18} />
        <Skeleton width="100%" height={80} borderRadius={14} />
        <Skeleton width="100%" height={80} borderRadius={14} />
        <Skeleton width="100%" height={80} borderRadius={14} />
        <Skeleton width="70%" height={80} borderRadius={14} />
      </View>
    );
  }

  const grouped = groupTasksByFamily();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={grouped}
        keyExtractor={(g) => g.family}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
        renderItem={({ item: group }) => (
          <View style={styles.groupSection}>
            <Text style={[styles.groupTitle, { color: colors.text.primary }]}>{group.family}</Text>
            {group.tasks.map((task) => (
              <TouchableOpacity key={task.id} style={[styles.card, { backgroundColor: colors.bg.secondary }, task.completed && { opacity: 0.6 }]}>
                <TouchableOpacity style={styles.checkbox} onPress={() => handleToggleComplete(task.id, task.completed)}>
                  <View style={[styles.checkboxOuter, { borderColor: colors.border.subtle }, task.completed && { backgroundColor: colors.status.success, borderColor: colors.status.success }]}>
                    {task.completed && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
                <View style={styles.cardContent}>
                  <Text style={[styles.taskTitle, { color: colors.text.primary }, task.completed && { textDecorationLine: 'line-through', color: colors.text.tertiary }]}>{task.title}</Text>
                  <View style={styles.taskMeta}>
                    {task.assignedTo && (
                      <Text style={[styles.assignedTo, { color: colors.text.tertiary }]}>👤 {task.assignedTo.firstName || task.assignedTo.name || 'Assigned'}</Text>
                    )}
                    {task.dueDate && (
                      <Text style={[styles.dueDate, { color: colors.text.tertiary }]}>📅 {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                    )}
                  </View>
                </View>
                <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(task.priority)}22` }]}>
                  <Text style={[styles.priorityText, { color: getPriorityColor(task.priority) }]}>{task.priority || 'medium'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        contentContainerStyle={grouped.length === 0 ? styles.emptyContainer : { paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No tasks</Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>Create a task for your family</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  groupSection: { marginBottom: 24 },
  groupTitle: { fontSize: 18, fontWeight: '600', paddingHorizontal: 16, marginBottom: 12, marginTop: 16 },
  card: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 3, padding: 14, borderRadius: 16 },
  checkbox: { marginRight: 12 },
  checkboxOuter: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  checkmark: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  cardContent: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  taskMeta: { flexDirection: 'row', gap: 12 },
  assignedTo: { fontSize: 11 },
  dueDate: { fontSize: 11 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 8 },
  priorityText: { fontSize: 10, fontWeight: '600' },
  emptyContainer: { flexGrow: 1 },
  empty: { alignItems: 'center' },
  emptyIcon: { fontSize: 48, opacity: 0.5, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { fontSize: 14 },
});
