import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

const SNOOZE_OPTIONS = [
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: 'Tomorrow', value: 1440 },
];

export function ReminderDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { reminderId } = route.params || {};
  const [reminder, setReminder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [snoozeVisible, setSnoozeVisible] = useState(false);

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadReminder();
  }, [reminderId]);

  async function loadReminder() {
    try {
      const res = await api.get<any>(`/reminders/${reminderId}`);
      setReminder(res);
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    setActionLoading(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.post(`/reminders/${reminderId}/complete`);
      Alert.alert('Completed', 'Reminder marked as complete');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to complete reminder');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSnooze(minutes: number) {
    setSnoozeVisible(false);
    setActionLoading(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const until = new Date(Date.now() + minutes * 60000).toISOString();
      await api.post(`/reminders/${reminderId}/snooze`, { until });
      Alert.alert('Snoozed', `Reminder snoozed for ${minutes} minutes`);
      loadReminder();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to snooze reminder');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    Alert.alert('Delete Reminder', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            if (accessToken) {
              setAccessToken(accessToken);
            }
            await api.delete(`/reminders/${reminderId}`);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete reminder');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
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

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }
  if (!reminder) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <Text style={[styles.errorText, { color: colors.status.error }]}>Reminder not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { backgroundColor: colors.bg.secondary }]}>
        <View style={styles.badgeRow}>
          <View
            style={[styles.badge, { backgroundColor: `${getPriorityColor(reminder.priority)}22` }]}
          >
            <Text style={[styles.badgeText, { color: getPriorityColor(reminder.priority) }]}>
              {reminder.priority?.toUpperCase()}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: `${colors.accent.primary}18` }]}>
            <Text style={[styles.badgeText, { color: colors.accent.primary }]}>
              {reminder.type?.toUpperCase()}
            </Text>
          </View>
          {reminder.status && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    reminder.status === 'completed'
                      ? `${colors.status.success}18`
                      : `${colors.status.warning}18`,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      reminder.status === 'completed'
                        ? colors.status.success
                        : colors.status.warning,
                  },
                ]}
              >
                {reminder.status.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.title, { color: colors.text.primary }]}>{reminder.title}</Text>
      </View>

      <View style={styles.section}>
        {reminder.description ? (
          <Text style={[styles.description, { color: colors.text.secondary }]}>
            {reminder.description}
          </Text>
        ) : null}

        <View style={[styles.detailRow, { borderBottomColor: colors.border.subtle }]}>
          <Text style={[styles.detailLabel, { color: colors.text.tertiary }]}>Start Date</Text>
          <Text style={[styles.detailValue, { color: colors.text.primary }]}>
            {new Date(reminder.startDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        {reminder.dueDate && (
          <View style={[styles.detailRow, { borderBottomColor: colors.border.subtle }]}>
            <Text style={[styles.detailLabel, { color: colors.text.tertiary }]}>Due Date</Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]}>
              {new Date(reminder.dueDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
        )}
        {reminder.category && (
          <View style={[styles.detailRow, { borderBottomColor: colors.border.subtle }]}>
            <Text style={[styles.detailLabel, { color: colors.text.tertiary }]}>Category</Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]}>
              {reminder.category}
            </Text>
          </View>
        )}
        {reminder.isRecurring && (
          <View style={[styles.detailRow, { borderBottomColor: colors.border.subtle }]}>
            <Text style={[styles.detailLabel, { color: colors.text.tertiary }]}>Recurring</Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]}>
              {reminder.frequency} (every {reminder.interval || 1})
            </Text>
          </View>
        )}
        <View style={[styles.detailRow, { borderBottomColor: colors.border.subtle }]}>
          <Text style={[styles.detailLabel, { color: colors.text.tertiary }]}>Created</Text>
          <Text style={[styles.detailValue, { color: colors.text.primary }]}>
            {new Date(reminder.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.status.success }]}
          onPress={handleComplete}
          disabled={actionLoading}
        >
          <Text style={styles.actionBtnText}>✓ Complete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.accent.primary }]}
          onPress={() => setSnoozeVisible(true)}
          disabled={actionLoading}
        >
          <Text style={styles.actionBtnText}>⏰ Snooze</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
          ]}
          onPress={() => navigation.navigate('CreateReminder', { reminder })}
          disabled={actionLoading}
        >
          <Text style={[styles.actionBtnText, { color: colors.text.primary }]}>✎ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            {
              backgroundColor: `${colors.status.error}18`,
              borderColor: `${colors.status.error}40`,
            },
          ]}
          onPress={handleDelete}
          disabled={actionLoading}
        >
          <Text style={[styles.deleteBtnText, { color: colors.status.error }]}>🗑 Delete</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={snoozeVisible} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg.secondary }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Snooze Reminder</Text>
            {SNOOZE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.snoozeOption, { borderBottomColor: colors.border.subtle }]}
                onPress={() => handleSnooze(opt.value)}
              >
                <Text style={[styles.snoozeOptionText, { color: colors.text.primary }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSnoozeVisible(false)}>
              <Text style={[styles.cancelBtnText, { color: colors.text.tertiary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16 },
  header: { margin: 16, padding: 24, borderRadius: 18 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: '700' },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  description: { fontSize: 15, lineHeight: 22, marginBottom: 20 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: '500' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 },
  actionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  deleteBtnText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 40 },
  modalContent: { borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  snoozeOption: { paddingVertical: 14, borderBottomWidth: 1 },
  snoozeOptionText: { fontSize: 16, textAlign: 'center' },
  cancelBtn: { paddingVertical: 14, marginTop: 8 },
  cancelBtnText: { fontSize: 15, textAlign: 'center' },
});
