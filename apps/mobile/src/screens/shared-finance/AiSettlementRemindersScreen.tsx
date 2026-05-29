import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';

interface ReminderMember {
  id: string;
  name: string;
  avatar?: string;
}

interface SettlementReminder {
  id: string;
  groupId: string;
  groupName: string;
  from: ReminderMember;
  to: ReminderMember;
  amount: number;
  currency: string;
  priority: 'overdue' | 'aging' | 'pending' | 'nudge';
  dueDate: string;
  daysOverdue?: number;
  note?: string;
}

const PRIORITY_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bgColor: string }> = {
  overdue: { label: 'Overdue', icon: 'alert-circle', color: '#FF6B6B', bgColor: 'rgba(255, 107, 107, 0.15)' },
  aging: { label: 'Aging', icon: 'timer', color: '#FDCB6E', bgColor: 'rgba(253, 203, 110, 0.15)' },
  pending: { label: 'Pending', icon: 'time-outline', color: '#74B9FF', bgColor: 'rgba(116, 185, 255, 0.15)' },
  nudge: { label: 'Nudge', icon: 'notifications-outline', color: '#A29BFE', bgColor: 'rgba(162, 155, 254, 0.15)' },
};

const formatAmount = (amount: number, currency: string = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
};

export function AiSettlementRemindersScreen() {
  const { colors, spacing, borderRadius: br, typography } = useTheme();
  const navigation = useNavigation<any>();

  const [reminders, setReminders] = useState<SettlementReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);

  const fetchReminders = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await api.get<SettlementReminder[]>('/ai-insights/settlement-reminders');
      setReminders(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load reminders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReminders();
    }, [fetchReminders])
  );

  async function handleSettle(reminder: SettlementReminder) {
    setSettlingId(reminder.id);
    try {
      Alert.alert(
        'Settle Up',
        `You're about to settle ${formatAmount(reminder.amount, reminder.currency)} from ${reminder.from.name} to ${reminder.to.name}`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setSettlingId(null) },
          {
            text: 'Settle',
            onPress: async () => {
              try {
                setReminders(prev => prev.filter(r => r.id !== reminder.id));
              } catch (_e) {
                // ignore
              } finally {
                setSettlingId(null);
              }
            },
          },
        ]
      );
    } finally {
      setSettlingId(null);
    }
  }

  const groupedReminders = PRIORITY_CONFIG
    ? Object.keys(PRIORITY_CONFIG).reduce((acc, priority) => {
        acc[priority] = reminders.filter(r => r.priority === priority);
        return acc;
      }, {} as Record<string, SettlementReminder[]>)
    : {};

  if (loading && !reminders.length) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !reminders.length) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.status.error} />
          <Text style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.md }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => fetchReminders()}
          >
            <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const hasReminders = reminders.length > 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchReminders(true)}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: colors.text.primary }]}>Settlement Reminders</Text>
          <TouchableOpacity onPress={() => fetchReminders()}>
            <Ionicons name="refresh" size={24} color={colors.accent.primary} />
          </TouchableOpacity>
        </View>

        {!hasReminders ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.status.success} />
            <Text style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.md }]}>
              All caught up!
            </Text>
            <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 4, textAlign: 'center' }]}>
              No pending settlement reminders
            </Text>
          </View>
        ) : (
          <>
            {Object.entries(groupedReminders).map(([priority, items]) => {
              if (items.length === 0) return null;
              const config = PRIORITY_CONFIG[priority];
              return (
                <View key={priority} style={styles.prioritySection}>
                  <View style={styles.priorityHeader}>
                    <View style={[styles.priorityBadge, { backgroundColor: config.bgColor }]}>
                      <Ionicons name={config.icon} size={16} color={config.color} />
                    </View>
                    <Text style={[typography.h4, { color: colors.text.primary, marginLeft: 10 }]}>
                      {config.label}
                    </Text>
                    <View style={[styles.priorityCount, { backgroundColor: config.color + '20' }]}>
                      <Text style={[typography.caption1, { color: config.color, fontWeight: '700' }]}>
                        {items.length}
                      </Text>
                    </View>
                  </View>

                  {items.map(reminder => {
                    const priorityConfig = PRIORITY_CONFIG[reminder.priority];
                    return (
                      <Card key={reminder.id} variant="elevated" padding="lg" style={{ marginBottom: 10 }}>
                        <View style={styles.reminderHeader}>
                          <View style={[styles.reminderPriorityDot, { backgroundColor: priorityConfig.color }]} />
                          <View style={[styles.reminderFromTo, { backgroundColor: colors.bg.tertiary }]}>
                            <View style={[styles.reminderAvatar, { backgroundColor: priorityConfig.color + '25' }]}>
                              <Text style={[styles.reminderAvatarText, { color: priorityConfig.color }]}>
                                {reminder.from.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <Ionicons name="arrow-forward" size={14} color={colors.text.tertiary} />
                            <View style={[styles.reminderAvatar, { backgroundColor: colors.status.success + '25' }]}>
                              <Text style={[styles.reminderAvatarText, { color: colors.status.success }]}>
                                {reminder.to.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          </View>
                          <View style={{ flex: 1 }} />
                          <TouchableOpacity
                            style={[styles.settleBtn, { backgroundColor: colors.accent.primary }]}
                            onPress={() => handleSettle(reminder)}
                            disabled={settlingId === reminder.id}
                          >
                            {settlingId === reminder.id ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Settle</Text>
                            )}
                          </TouchableOpacity>
                        </View>

                        <View style={styles.reminderDetails}>
                          <View style={styles.reminderNames}>
                            <Text style={[typography.calloutBold, { color: colors.text.primary }]}>
                              {reminder.from.name}
                            </Text>
                            <Text style={[typography.subhead, { color: colors.text.tertiary, marginHorizontal: 6 }]}>
                              owes
                            </Text>
                            <Text style={[typography.calloutBold, { color: colors.text.primary }]}>
                              {reminder.to.name}
                            </Text>
                          </View>
                          <Text style={[typography.amountSmall, { color: colors.text.primary, marginTop: 8 }]}>
                            {formatAmount(reminder.amount, reminder.currency)}
                          </Text>
                        </View>

                        <View style={styles.reminderMeta}>
                          <View style={[styles.groupBadge, { backgroundColor: colors.bg.tertiary }]}>
                            <Ionicons name="people-outline" size={12} color={colors.text.tertiary} />
                            <Text style={[typography.caption1, { color: colors.text.tertiary, marginLeft: 4 }]}>
                              {reminder.groupName}
                            </Text>
                          </View>
                          {reminder.daysOverdue && reminder.daysOverdue > 0 ? (
                            <View style={[styles.dueBadge, { backgroundColor: colors.status.errorLight }]}>
                              <Ionicons name="alert-circle" size={12} color={colors.status.error} />
                              <Text style={[typography.caption1, { color: colors.status.error, marginLeft: 4 }]}>
                                {reminder.daysOverdue}d overdue
                              </Text>
                            </View>
                          ) : reminder.dueDate ? (
                            <View style={[styles.dueBadge, { backgroundColor: colors.bg.glass }]}>
                              <Ionicons name="calendar-outline" size={12} color={colors.text.tertiary} />
                              <Text style={[typography.caption1, { color: colors.text.tertiary, marginLeft: 4 }]}>
                                Due {new Date(reminder.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {reminder.note && (
                          <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 8, lineHeight: 18 }]}>
                            "{reminder.note}"
                          </Text>
                        )}
                      </Card>
                    );
                  })}
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  retryButton: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: 40 },
  prioritySection: { marginTop: 20, paddingHorizontal: 20 },
  priorityHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  priorityBadge: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  priorityCount: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, marginLeft: 10 },
  reminderHeader: { flexDirection: 'row', alignItems: 'center' },
  reminderPriorityDot: { width: 4, height: 40, borderRadius: 2, marginRight: 12 },
  reminderFromTo: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 12, gap: 8 },
  reminderAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  reminderAvatarText: { fontSize: 13, fontWeight: '700' },
  settleBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  reminderDetails: { marginTop: 14, paddingLeft: 16 },
  reminderNames: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  reminderMeta: { flexDirection: 'row', marginTop: 12, gap: 8, paddingLeft: 16 },
  groupBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  dueBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
});
