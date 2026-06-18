import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TaskStatus = 'Pending' | 'Completed';
type Priority = 'High' | 'Medium' | 'Low';
type FilterTab = 'All' | 'Pending' | 'Completed';

interface Task {
  id: string;
  name: string;
  assignedTo: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
}

const initialTasks: Task[] = [
  { id: '1', name: 'Pay Electricity Bill', assignedTo: 'Rajesh', dueDate: '20 Jun 2026', priority: 'High', status: 'Pending' },
  { id: '2', name: 'Renew Health Insurance', assignedTo: 'Priya', dueDate: '25 Jun 2026', priority: 'High', status: 'Pending' },
  { id: '3', name: 'Submit School Forms', assignedTo: 'Priya', dueDate: '18 Jun 2026', priority: 'Medium', status: 'Pending' },
  { id: '4', name: 'Update Family Budget', assignedTo: 'Rajesh', dueDate: '30 Jun 2026', priority: 'Medium', status: 'Pending' },
  { id: '5', name: 'Review Investment Portfolio', assignedTo: 'Rajesh', dueDate: '15 Jun 2026', priority: 'Low', status: 'Completed' },
  { id: '6', name: 'Schedule Family Meeting', assignedTo: 'All', dueDate: '22 Jun 2026', priority: 'Low', status: 'Pending' },
  { id: '7', name: 'File Tax Returns', assignedTo: 'Rajesh', dueDate: '31 Jul 2026', priority: 'High', status: 'Pending' },
  { id: '8', name: 'Check Credit Score', assignedTo: 'Rajesh', dueDate: '10 Jun 2026', priority: 'Medium', status: 'Completed' },
];

const priorityColors = {
  High: '#EF4444',
  Medium: '#F59E0B',
  Low: '#10B981',
};

const TaskCard: React.FC<{
  task: Task;
  onToggle: (id: string) => void;
}> = ({ task, onToggle }) => {
  const isCompleted = task.status === 'Completed';
  const pColor = priorityColors[task.priority];

  return (
    <TouchableOpacity
      style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}
      activeOpacity={0.7}
      onPress={() => Alert.alert('Task Details', `${task.name}\nAssigned to: ${task.assignedTo}\nDue: ${task.dueDate}\nPriority: ${task.priority}`)}
    >
      <TouchableOpacity
        style={[styles.checkbox, isCompleted && styles.checkboxChecked]}
        onPress={() => onToggle(task.id)}
      >
        {isCompleted && <AntDesign name="check" size={14} color="#0A0A0A" />}
      </TouchableOpacity>

      <View style={styles.taskInfo}>
        <Text style={[styles.taskName, isCompleted && styles.taskNameCompleted]}>
          {task.name}
        </Text>
        <View style={styles.taskMeta}>
          <View style={styles.taskAssignedRow}>
            <AntDesign name="user" size={11} color="#6B7280" />
            <Text style={styles.taskAssigned}>{task.assignedTo}</Text>
          </View>
          <View style={styles.taskDateRow}>
            <AntDesign name="calendar" size={11} color="#6B7280" />
            <Text style={styles.taskDate}>{task.dueDate}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.priorityBadge, { backgroundColor: pColor + '20' }]}>
        <Text style={[styles.priorityText, { color: pColor }]}>{task.priority}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function FamilyTasksScreen() {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

  const toggleTask = (id: string) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === id ? { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' } : t
      )
    );
  };

  const filteredTasks = tasks.filter(t => {
    if (activeFilter === 'All') return true;
    return t.status === activeFilter;
  });

  const pendingCount = tasks.filter(t => t.status === 'Pending').length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => Alert.alert('Add Task', 'Create a new family task')}
        >
          <AntDesign name="plus" size={18} color="#0A0A0A" />
          <Text style={styles.addButtonText}>Add Task</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{tasks.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#10B981' }]}>{completedCount}</Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {(['All', 'Pending', 'Completed'] as FilterTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
            onPress={() => setActiveFilter(tab)}
          >
            <Text style={[styles.filterText, activeFilter === tab && styles.filterTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredTasks.map(task => (
          <TaskCard key={task.id} task={task} onToggle={toggleTask} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: -0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A0A0A',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
  },
  filterTabActive: {
    backgroundColor: '#10B981',
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#0A0A0A',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  taskCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskCardCompleted: {
    opacity: 0.6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 6,
  },
  taskNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  taskAssignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskAssigned: {
    fontSize: 12,
    color: '#6B7280',
  },
  taskDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
