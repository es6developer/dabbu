import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { Card } from '../../components/ui/Card';

export function TripDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { groupId } = route.params || {};
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadTrip();
  }, [accessToken, groupId]);

  async function loadTrip() {
    try {
      const res = await api.get<any>(`/shared-finance/groups/${groupId}/trip`);
      setTrip(res.data);
    } catch (e) {
      console.error('TripDetail load error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadTrip();
    setRefreshing(false);
  }

  function toggleDay(dayId: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) {
        next.delete(dayId);
      } else {
        next.add(dayId);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <Text style={[styles.errorText, { color: colors.text.tertiary }]}>Trip not found</Text>
      </View>
    );
  }

  const formatCurrency = (val: number) => '₹' + val.toLocaleString('en-IN');
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const dateRange = `${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const totalBudget = Number(trip.budget) || 1;
  const totalSpent = Number(trip.totalSpent) || 0;
  const budgetPct = Math.min((totalSpent / totalBudget) * 100, 100);
  const itinerary = Array.isArray(trip.itinerary) ? trip.itinerary : [];
  const members = Array.isArray(trip.members) ? trip.members : [];
  const statusColors: Record<string, string> = {
    ongoing: colors.status.success,
    upcoming: colors.status.info,
    completed: colors.text.tertiary,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        <LinearGradient
          colors={['#1a1a2e', colors.bg.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.headerSection}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: (statusColors[trip.status] || colors.text.tertiary) + '20' },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusColors[trip.status] || colors.text.tertiary },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: statusColors[trip.status] || colors.text.tertiary },
                ]}
              >
                {(trip.status || 'upcoming').charAt(0).toUpperCase() +
                  (trip.status || 'upcoming').slice(1)}
              </Text>
            </View>
          </View>
          <Text style={[styles.destination, { color: colors.text.primary }]}>
            {trip.destination || 'Trip'}
          </Text>
          <Text style={[styles.dateRange, { color: colors.text.tertiary }]}>{dateRange}</Text>
        </LinearGradient>

        <Card variant="glass" style={styles.sectionCard} padding="xl">
          <View style={styles.budgetHeader}>
            <Text style={[styles.budgetLabel, { color: colors.text.tertiary }]}>Trip Budget</Text>
            <Text style={[styles.budgetAmount, { color: colors.text.primary }]}>
              {formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}
            </Text>
          </View>
          <View style={styles.budgetTrack}>
            <View
              style={[
                styles.budgetFill,
                {
                  width: `${budgetPct}%`,
                  backgroundColor: budgetPct > 90 ? colors.status.error : colors.accent.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.budgetPctText, { color: colors.text.tertiary }]}>
            {budgetPct.toFixed(0)}% used
          </Text>
        </Card>

        <Card variant="glass" style={styles.sectionCard} padding="xl">
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Itinerary</Text>
          {itinerary.length > 0 ? (
            itinerary.map((day: any, i: number) => {
              const dayId = day.id || `day-${i}`;
              const isExpanded = expandedDays.has(dayId);
              const dayDate = new Date(day.date);
              const daySpent = Array.isArray(day.expenses)
                ? day.expenses.reduce((s: number, e: any) => s + Number(e.amount), 0)
                : 0;
              return (
                <TouchableOpacity
                  key={dayId}
                  style={[
                    styles.dayCard,
                    { backgroundColor: colors.bg.glass, borderColor: colors.border.subtle },
                  ]}
                  onPress={() => toggleDay(dayId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dayHeader}>
                    <View style={styles.dayInfo}>
                      <Text style={[styles.dayNumber, { color: colors.accent.primary }]}>
                        Day {day.dayNumber || i + 1}
                      </Text>
                      <Text style={[styles.dayDate, { color: colors.text.tertiary }]}>
                        {dayDate.toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                    </View>
                    <View style={styles.dayRight}>
                      <Text style={[styles.daySpent, { color: colors.status.error }]}>
                        {formatCurrency(daySpent)}
                      </Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.text.tertiary}
                      />
                    </View>
                  </View>
                  {isExpanded && (
                    <View style={[styles.dayBody, { borderTopColor: colors.border.subtle }]}>
                      {Array.isArray(day.activities) &&
                        day.activities.map((act: any, ai: number) => (
                          <View key={ai} style={styles.activityRow}>
                            <Ionicons
                              name="location-outline"
                              size={14}
                              color={colors.accent.primary}
                            />
                            <Text style={[styles.activityText, { color: colors.text.secondary }]}>
                              {act.name || act}
                            </Text>
                          </View>
                        ))}
                      {Array.isArray(day.expenses) && day.expenses.length > 0 && (
                        <View style={styles.dayExpenses}>
                          <Text style={[styles.dayExpensesTitle, { color: colors.text.tertiary }]}>
                            Expenses
                          </Text>
                          {day.expenses.map((exp: any, ei: number) => (
                            <View
                              key={ei}
                              style={[
                                styles.dayExpenseRow,
                                { borderBottomColor: colors.border.subtle },
                              ]}
                            >
                              <Text style={[styles.dayExpenseName, { color: colors.text.primary }]}>
                                {exp.description || 'Expense'}
                              </Text>
                              <Text
                                style={[styles.dayExpenseAmount, { color: colors.text.primary }]}
                              >
                                {formatCurrency(Number(exp.amount))}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
              No itinerary added yet
            </Text>
          )}
        </Card>

        <Card variant="glass" style={styles.sectionCard} padding="xl">
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Members</Text>
          {members.length > 0 ? (
            members.map((member: any, i: number) => (
              <View
                key={member.id || i}
                style={[styles.memberRow, { borderBottomColor: colors.border.subtle }]}
              >
                <LinearGradient
                  colors={[colors.accent.primary, colors.accent.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.memberAvatar}
                >
                  <Text style={styles.memberAvatarText}>{member.name?.[0] || '?'}</Text>
                </LinearGradient>
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.text.primary }]}>
                    {member.name || 'Member'}
                  </Text>
                  <Text style={[styles.memberRole, { color: colors.text.tertiary }]}>
                    {member.role || 'member'}
                  </Text>
                </View>
                <Text style={[styles.memberSpent, { color: colors.text.primary }]}>
                  {formatCurrency(Number(member.spent) || 0)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>No members</Text>
          )}
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.accent.primary, bottom: insets.bottom + 100 },
        ]}
        onPress={() => navigation.navigate('CreateGroupExpense', { groupId, tripContext: trip.id })}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15 },
  headerSection: { padding: 24, paddingTop: 60 },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  destination: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  dateRange: { fontSize: 13, fontWeight: '500' },
  sectionCard: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetLabel: { fontSize: 12, fontWeight: '500' },
  budgetAmount: { fontSize: 16, fontWeight: '700' },
  budgetTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  budgetFill: { height: '100%', borderRadius: 4 },
  budgetPctText: { fontSize: 11, fontWeight: '500' },
  dayCard: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  dayInfo: {},
  dayNumber: { fontSize: 14, fontWeight: '700' },
  dayDate: { fontSize: 11, marginTop: 2 },
  dayRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  daySpent: { fontSize: 14, fontWeight: '700' },
  dayBody: { padding: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  activityText: { fontSize: 13, flex: 1 },
  dayExpenses: { marginTop: 10 },
  dayExpensesTitle: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  dayExpenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayExpenseName: { fontSize: 13, fontWeight: '500' },
  dayExpenseAmount: { fontSize: 13, fontWeight: '600' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '600' },
  memberRole: { fontSize: 11, marginTop: 2 },
  memberSpent: { fontSize: 14, fontWeight: '700' },
  emptyText: { fontSize: 13, paddingVertical: 12, textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#f7892c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
});
