import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';

import { alertService } from '../../components/ui';
function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function PartnerScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventType, setEventType] = useState('milestone_reached');
  const [submitting, setSubmitting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (silent = false, refresh = false) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    if (refresh) {
      setRefreshing(true);
    } else if (!silent) {
      setLoading(true);
    }
    try {
      const [profileRes, timelineRes] = await Promise.allSettled([
        api.get<any>('/couple/profile', ctrl.signal),
        api.get<any>('/couple/timeline', ctrl.signal),
      ]);
      if (!ctrl.signal.aborted) {
        if (profileRes.status === 'fulfilled') {
          const data = profileRes.value?.data || profileRes.value;
          setProfile(data);
        }
        if (timelineRes.status === 'fulfilled') {
          const data = timelineRes.value?.data || timelineRes.value || [];
          setTimeline(Array.isArray(data) ? data : []);
        }
      }
    } catch {
      /* silent */
    } finally {
      if (!ctrl.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useSilentRefresh(
    useCallback(
      (isInitial) => {
        loadData(!isInitial);
      },
      [loadData],
    ),
  );

  const handleAddEvent = async () => {
    if (!eventTitle.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<any>('/couple/timeline', {
        title: eventTitle.trim(),
        description: eventDesc.trim(),
        eventType,
      });
      const data = res?.data || res;
      if (data) {
        setTimeline((prev) => [data, ...prev]);
      }
      setShowAddEvent(false);
      setEventTitle('');
      setEventDesc('');
    } catch {
      alertService.alert('Error', 'Failed to add event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    alertService.alert('Delete Event', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/couple/timeline/${eventId}`);
            setTimeline((prev) => prev.filter((e: any) => e.id !== eventId));
          } catch {
            alertService.alert('Error', 'Failed to delete event');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
        <LinearGradient
          colors={[colors.bg.gradientStart, colors.bg.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          locations={[0, 0.3]}
          style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 24 }}
        >
          <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text.tertiary }}>
            Partner
          </Text>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
          </View>
        </LinearGradient>
      </View>
    );
  }

  const partner = profile?.partner;
  const hasPartner = profile?.hasPartner;

  if (!hasPartner) {
    return (
      <View style={styles.screen}>
        <LinearGradient
          colors={[colors.bg.gradientStart, colors.bg.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          locations={[0, 0.3]}
          style={{ flex: 1 }}
        >
          <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text.tertiary }}>
              Partner
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 36,
              gap: 14,
            }}
          >
            <View style={[styles.emptyIcon, { backgroundColor: colors.accent.primary + '15' }]}>
              <AntDesign name="addusergroup" size={36} color={colors.accent.primary} />
            </View>
            <Text
              style={{
                fontSize: 26,
                fontWeight: '800',
                color: colors.text.primary,
                textAlign: 'center',
              }}
            >
              No Partner Connected
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: colors.text.tertiary,
                textAlign: 'center',
                lineHeight: 24,
              }}
            >
              Connect with your partner to manage shared finances, goals, and timeline together.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProfileTab', { screen: 'AddPartner' })}
              style={{
                marginTop: 8,
                paddingVertical: 18,
                paddingHorizontal: 36,
                borderRadius: 30,
                backgroundColor: colors.accent.primary,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFF' }}>
                Connect Partner
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const sinceDate = profile?.relationship?.sinceDate
    ? new Date(profile.relationship.sinceDate)
    : null;
  const daysTogether = sinceDate ? Math.floor((Date.now() - sinceDate.getTime()) / 86400000) : 0;

  const TIMELINE_ICONS: Record<string, string> = {
    expense_added: 'minuscircle',
    goal_contribution: 'flag',
    salary_added: 'pluscircle',
    bill_paid: 'filetext1',
    investment_added: 'linechart',
    debt_cleared: 'checkcircle',
    milestone_reached: 'star',
    planner_progress: 'barschart',
    planner_started: 'play',
    income_added: 'pluscircle',
    savings_contribution: 'wallet',
    goal_created: 'flag',
    goal_completed: 'checkcircle',
    budget_set: 'wallet',
    custom: 'clockcircleo',
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[colors.bg.gradientStart, colors.bg.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.3]}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(false, true)}
              tintColor={colors.accent.primary}
            />
          }
        >
          <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <View style={styles.headerRow}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text.tertiary }}>
                Partner
              </Text>
              <View style={[styles.lensBadge, { backgroundColor: colors.accent.primary + '20' }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accent.primary }}>
                  COUPLE
                </Text>
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <LinearGradient
              colors={[colors.accent.primary, colors.accent.hover]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileCard}
            >
              <View style={styles.partnerAvatar}>
                <AntDesign name="user" size={32} color="#FFF" />
              </View>
              <Text style={{ fontSize: 26, fontWeight: '800', color: '#FFF', marginTop: 8 }}>
                {partner?.name || 'Partner'}
              </Text>
              {partner?.email && (
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                  {partner.email}
                </Text>
              )}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{daysTogether}</Text>
                  <Text style={styles.statLabel}>Days Together</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{timeline.length}</Text>
                  <Text style={styles.statLabel}>Milestones</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {profile?.relationship?.status === 'active' ? 'Connected' : 'Pending'}
                  </Text>
                  <Text style={styles.statLabel}>Status</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                Timeline
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddEvent(true)}
                style={[styles.addBtn, { backgroundColor: colors.accent.primary }]}
              >
                <AntDesign name="plus" size={14} color="#FFF" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>Add Event</Text>
              </TouchableOpacity>
            </View>
            {timeline.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.bg.card }]}>
                <AntDesign name="clockcircleo" size={24} color={colors.text.tertiary} />
                <Text style={{ fontSize: 16, color: colors.text.tertiary, marginTop: 6 }}>
                  No timeline events yet
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {timeline.map((event: any) => (
                  <View
                    key={event.id}
                    style={[styles.eventCard, { backgroundColor: colors.bg.card }]}
                  >
                    <View
                      style={[styles.eventIcon, { backgroundColor: colors.accent.primary + '15' }]}
                    >
                      <AntDesign
                        name={(TIMELINE_ICONS[event.eventType] || 'clockcircleo') as any}
                        size={18}
                        color={colors.accent.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>
                        {event.title}
                      </Text>
                      {event.description ? (
                        <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 2 }}>
                          {event.description}
                        </Text>
                      ) : null}
                      <Text style={{ fontSize: 10, color: colors.text.tertiary, marginTop: 4 }}>
                        {event.createdAt
                          ? new Date(event.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : ''}
                        {event.amount ? ` · ${fmt(event.amount)}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteEvent(event.id)}
                      style={{ padding: 8 }}
                    >
                      <AntDesign name="close" size={14} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </LinearGradient>

      <Modal visible={showAddEvent} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bg.primary }]}>
            <View style={styles.modalHeader}>
              <Text style={{ fontSize: 19, fontWeight: '700', color: colors.text.primary }}>
                Add Timeline Event
              </Text>
              <TouchableOpacity onPress={() => setShowAddEvent(false)}>
                <AntDesign name="close" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: colors.text.secondary,
                marginBottom: 6,
                marginTop: 20,
              }}
            >
              Title
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bg.secondary,
                  color: colors.text.primary,
                  borderColor: colors.border.subtle,
                },
              ]}
              value={eventTitle}
              onChangeText={setEventTitle}
              placeholder="What happened?"
              placeholderTextColor={colors.text.tertiary}
            />
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: colors.text.secondary,
                marginBottom: 6,
                marginTop: 14,
              }}
            >
              Description (optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bg.secondary,
                  color: colors.text.primary,
                  borderColor: colors.border.subtle,
                  minHeight: 80,
                },
              ]}
              value={eventDesc}
              onChangeText={setEventDesc}
              placeholder="Add details..."
              placeholderTextColor={colors.text.tertiary}
              multiline
            />
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: colors.text.secondary,
                marginBottom: 6,
                marginTop: 14,
              }}
            >
              Type
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 24 }}
            >
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { key: 'milestone_reached', label: 'Milestone', icon: 'star' },
                  { key: 'goal_completed', label: 'Goal', icon: 'flag' },
                  { key: 'expense_added', label: 'Expense', icon: 'minuscircle' },
                  { key: 'income_added', label: 'Income', icon: 'pluscircle' },
                  { key: 'budget_set', label: 'Budget', icon: 'wallet' },
                  { key: 'custom', label: 'Custom', icon: 'clockcircleo' },
                ].map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => setEventType(t.key)}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor:
                          eventType === t.key ? colors.accent.primary : colors.bg.secondary,
                      },
                    ]}
                  >
                    <AntDesign
                      name={t.icon as any}
                      size={14}
                      color={eventType === t.key ? '#FFF' : colors.text.secondary}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: eventType === t.key ? '#FFF' : colors.text.secondary,
                      }}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity
              onPress={handleAddEvent}
              disabled={submitting || !eventTitle.trim()}
              style={[
                styles.submitBtn,
                {
                  backgroundColor: colors.accent.primary,
                  opacity: submitting || !eventTitle.trim() ? 0.5 : 1,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFF' }}>Add Event</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lensBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  profileCard: { borderRadius: 32, padding: 28, alignItems: 'center' },
  partnerAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', marginTop: 24, gap: 0 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statDivider: { width: 1, height: 32, alignSelf: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 24,
  },
  emptyCard: { borderRadius: 28, padding: 28, alignItems: 'center' },
  eventCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 28, padding: 18, gap: 14 },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: { borderRadius: 30, padding: 18, fontSize: 16, borderWidth: 1.5, fontWeight: '500' },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 24,
  },
  submitBtn: {
    paddingVertical: 20,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
});
