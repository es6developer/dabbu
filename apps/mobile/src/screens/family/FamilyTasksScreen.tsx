import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  RefreshControl,
  PanResponder,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

type TaskStatus = 'Pending' | 'InProgress' | 'Completed';
type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
type FilterTab = 'All' | 'My Tasks' | 'Pending' | 'Completed';

interface AssignedUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  createdById: string;
  assignedTo: AssignedUser | null;
}

interface Family {
  id: string;
  name: string;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  Low: '#22C55E',
  Medium: '#F59E0B',
  High: '#EF4444',
  Urgent: '#DC2626',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  Pending: 'Pending',
  InProgress: 'In Progress',
  Completed: 'Completed',
};

const STATUS_BG: Record<TaskStatus, string> = {
  Pending: '#6B728020',
  InProgress: '#3B82F620',
  Completed: '#22C55E20',
};

const STATUS_TEXT: Record<TaskStatus, string> = {
  Pending: '#6B7280',
  InProgress: '#3B82F6',
  Completed: '#22C55E',
};

const PROFILE_COLORS = [
  '#7C3AED', '#3B82F6', '#22C55E', '#F59E0B',
  '#EF4444', '#EC4899', '#14B8A6', '#F97316',
];

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;
const ACTION_WIDTH = 100;

function getProfileColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PROFILE_COLORS[Math.abs(hash) % PROFILE_COLORS.length];
}

function initials(first?: string, last?: string): string {
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || '?';
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function TaskSkeleton() {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
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
        <Animated.View style={[styles.skeletonAvatar, { opacity }]} />
        <View style={{ flex: 1, gap: 8 }}>
          <Animated.View style={[styles.skeletonLine, { width: '60%', opacity }]} />
          <Animated.View style={[styles.skeletonLine, { width: '40%', opacity }]} />
          <Animated.View style={[styles.skeletonLine, { width: '50%', opacity }]} />
        </View>
      </View>
    </View>
  );
}

function SwipeableTaskCard({
  task,
  onStatusChange,
  updating,
}: {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  updating: boolean;
}) {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const [snapped, setSnapped] = useState(false);
  const taskRef = useRef(task);
  const onChangeRef = useRef(onStatusChange);
  taskRef.current = task;
  onChangeRef.current = onStatusChange;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) {
          translateX.setValue(Math.max(gs.dx, -ACTION_WIDTH));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -ACTION_WIDTH,
            damping: 20,
            stiffness: 300,
            useNativeDriver: true,
          }).start();
          setSnapped(true);
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            damping: 20,
            stiffness: 300,
            useNativeDriver: true,
          }).start();
          setSnapped(false);
        }
      },
    }),
  ).current;

  const snapBack = () => {
    Animated.spring(translateX, {
      toValue: 0,
      damping: 20,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
    setSnapped(false);
  };

  const handleAction = (newStatus: TaskStatus) => {
    onChangeRef.current(taskRef.current.id, newStatus);
    snapBack();
  };

  const profileColor = task.assignedTo ? getProfileColor(task.assignedTo.id) : '#6B7280';
  const fullName = task.assignedTo
    ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`.trim()
    : 'Unassigned';
  const pColor = PRIORITY_COLORS[task.priority];

  const nextAction =
    task.status === 'Completed'
      ? { label: 'Reopen', status: 'Pending' as TaskStatus, color: '#F59E0B' }
      : task.status === 'InProgress'
        ? { label: 'Complete', status: 'Completed' as TaskStatus, color: '#22C55E' }
        : { label: 'In Progress', status: 'InProgress' as TaskStatus, color: '#3B82F6' };

  const secondaryAction =
    task.status === 'Pending'
      ? { label: 'Complete', status: 'Completed' as TaskStatus, color: '#22C55E' }
      : null;

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.actionsContainer}>
        {secondaryAction && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: secondaryAction.color }]}
            onPress={() => handleAction(secondaryAction.status)}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <AntDesign name="check" size={16} color="#FFFFFF" />
                <Text style={styles.actionText}>Done</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary, { backgroundColor: nextAction.color }]}
          onPress={() => handleAction(nextAction.status)}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <AntDesign name={task.status === 'Completed' ? 'reload1' : 'checkcircleo'} size={16} color="#FFFFFF" />
              <Text style={styles.actionText}>{nextAction.label}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[styles.taskCard, { transform: [{ translateX }], backgroundColor: colors.bg.secondary }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.taskCardContent}>
          <View style={styles.taskLeft}>
            <View style={[styles.taskAvatar, { backgroundColor: profileColor + '20' }]}>
              <Text style={[styles.taskAvatarText, { color: profileColor }]}>
                {initials(task.assignedTo?.firstName, task.assignedTo?.lastName)}
              </Text>
            </View>

            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, { color: colors.text.primary }]} numberOfLines={1}>
                {task.title}
              </Text>
              <View style={styles.taskMeta}>
                <View style={styles.taskAssignedRow}>
                  <AntDesign name="user" size={10} color={colors.text.tertiary} />
                  <Text style={[styles.taskAssigned, { color: colors.text.tertiary }]} numberOfLines={1}>
                    {fullName}
                  </Text>
                </View>
                <View style={styles.dot} />
                <View style={styles.taskDateRow}>
                  <AntDesign name="calendar" size={10} color={colors.text.tertiary} />
                  <Text style={[styles.taskDate, { color: colors.text.tertiary }]}>
                    {formatDate(task.dueDate)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.taskBadges}>
            <View style={[styles.priorityBadge, { backgroundColor: pColor + '20' }]}>
              <Text style={[styles.priorityText, { color: pColor }]}>{task.priority}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[task.status] }]}>
              <Text style={[styles.statusText, { color: STATUS_TEXT[task.status] }]}>
                {STATUS_LABELS[task.status]}
              </Text>
            </View>
          </View>
        </View>

        {!snapped && (
          <View style={styles.swipeHint}>
            <AntDesign name="left" size={10} color={colors.text.tertiary} />
            <Text style={[styles.swipeHintText, { color: colors.text.tertiary }]}>Swipe</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

export default function FamilyTasksScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const nav = useNavigation<any>();
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const families: Family[] = await api.get('/family');
      if (!families || families.length === 0) {
        setTasks([]);
        return;
      }
      const activeFamily = families[0];
      const data: Task[] = await api.get(`/family/tasks?familyId=${activeFamily.id}`);
      setTasks(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onRefresh = useCallback(() => {
    fetchTasks(true);
  }, [fetchTasks]);

  const handleStatusChange = async (id: string, newStatus: TaskStatus) => {
    setUpdatingIds(prev => new Set(prev).add(id));
    try {
      await api.patch(`/family/tasks/${id}`, { status: newStatus });
      setTasks(prev =>
        prev.map(t => (t.id === id ? { ...t, status: newStatus } : t)),
      );
    } catch {
      setTasks(prev => [...prev]);
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'My Tasks') return t.assignedTo?.id === user?.id;
    return t.status === activeFilter;
  });

  const pendingCount = tasks.filter(t => t.status === 'Pending' || t.status === 'InProgress').length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  const myCount = tasks.filter(t => t.assignedTo?.id === user?.id).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: 20 }]}>
        <Text style={[styles.largeTitle, { color: colors.text.primary }]}>Tasks</Text>
        <Text style={[styles.headerSubtitle, { color: colors.text.tertiary }]}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.filterRow}>
        {(['All', 'My Tasks', 'Pending', 'Completed'] as FilterTab[]).map(tab => {
          const count =
            tab === 'All' ? tasks.length
              : tab === 'My Tasks' ? myCount
                : tab === 'Pending' ? pendingCount
                  : completedCount;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.filterTab,
                { backgroundColor: colors.bg.tertiary },
                activeFilter === tab && { backgroundColor: colors.accent.primary },
              ]}
              onPress={() => setActiveFilter(tab)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: colors.text.secondary },
                  activeFilter === tab && { color: colors.text.inverse },
                ]}
              >
                {tab}
              </Text>
              <View
                style={[
                  styles.filterCount,
                  { backgroundColor: colors.bg.secondary },
                  activeFilter === tab && { backgroundColor: 'rgba(255,255,255,0.2)' },
                ]}
              >
                <Text
                  style={[
                    styles.filterCountText,
                    { color: colors.text.tertiary },
                    activeFilter === tab && { color: colors.text.inverse },
                  ]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {[1, 2, 3, 4, 5].map(i => (
            <TaskSkeleton key={i} />
          ))}
        </ScrollView>
      ) : error ? (
        <View style={styles.centerState}>
          <AntDesign name="exclamationcircleo" size={48} color={colors.text.tertiary} />
          <Text style={[styles.stateText, { color: colors.text.secondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => fetchTasks()}
          >
            <Text style={[styles.retryText, { color: colors.text.inverse }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredTasks.length === 0 ? (
        <View style={styles.centerState}>
          <AntDesign name="checkcircleo" size={48} color={colors.text.tertiary} />
          <Text style={[styles.stateText, { color: colors.text.secondary }]}>
            {activeFilter === 'All'
              ? 'No tasks yet. Create your first one!'
              : activeFilter === 'My Tasks'
                ? 'You have no assigned tasks'
                : activeFilter === 'Pending'
                  ? 'No pending tasks'
                  : 'No completed tasks'}
          </Text>
          {activeFilter === 'All' && (
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
              onPress={() => nav.navigate('CreateTask')}
            >
              <AntDesign name="plus" size={16} color={colors.text.inverse} />
              <Text style={[styles.retryText, { color: colors.text.inverse }]}>New Task</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
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
          {filteredTasks.map(task => (
            <SwipeableTaskCard
              key={task.id}
              task={task}
              onStatusChange={handleStatusChange}
              updating={updatingIds.has(task.id)}
            />
          ))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent.primary, bottom: insets.bottom + 24 }]}
        activeOpacity={0.8}
        onPress={() => nav.navigate('CreateTask')}
      >
        <AntDesign name="plus" size={22} color={colors.text.inverse} />
        <Text style={[styles.fabText, { color: colors.text.inverse }]}>New Task</Text>
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
    paddingBottom: 4,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    paddingVertical: 14,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
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
  skeletonCard: {
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
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#27272A',
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#27272A',
  },
  swipeContainer: {
    marginBottom: 10,
    position: 'relative',
  },
  actionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    width: ACTION_WIDTH * 2,
  },
  actionBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  actionBtnPrimary: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  taskCard: {
    borderRadius: 16,
    padding: 14,
  },
  taskCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  taskAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskAvatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  taskInfo: {
    flex: 1,
    gap: 4,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskAssignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: 100,
  },
  taskAssigned: {
    fontSize: 11,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#6B7280',
    marginHorizontal: 2,
  },
  taskDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  taskDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  taskBadges: {
    gap: 6,
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    marginTop: 8,
    paddingRight: 2,
  },
  swipeHintText: {
    fontSize: 10,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
