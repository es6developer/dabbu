import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

function fmt(v: number) {
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#f7892c',
  Travel: '#74B9FF',
  Accommodation: '#00B894',
  Shopping: '#FDCB6E',
  Entertainment: '#FF6B6B',
  Transport: '#a29bfe',
  Other: '#636e72',
};

export function TripDashboardScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const { tripId } = route.params || {};

  const [trip, setTrip] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(
    async (refresh = false) => {
      if (!tripId) {
        return;
      }
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        const [tripRes, expRes] = await Promise.allSettled([
          api.get<any>(`/trips/${tripId}`),
          api.get<any>(`/shared-expenses?tripId=${tripId}`),
        ]);
        if (tripRes.status === 'fulfilled') {
          const d = tripRes.value?.data || tripRes.value;
          setTrip(d);
        }
        if (expRes.status === 'fulfilled') {
          const d = expRes.value?.data || expRes.value;
          setExpenses(Array.isArray(d) ? d : []);
        }
      } catch (e: any) {
        // ignore
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, tripId],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const totalSpent = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount || 0), 0),
    [expenses],
  );

  const budget = Number(trip?.budget || 0);
  const budgetUsed = budget > 0 ? (totalSpent / budget) * 100 : 0;

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) {
      const cat = e.category || 'Other';
      map[cat] = (map[cat] || 0) + Number(e.amount || 0);
    }
    return map;
  }, [expenses]);

  const members: any[] = Array.isArray(trip?.members) ? trip.members : [];

  const dailyTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) {
      const day = e.date
        ? new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : 'Unknown';
      map[day] = (map[day] || 0) + Number(e.amount || 0);
    }
    return Object.entries(map).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
  }, [expenses]);

  const balances = useMemo(() => {
    if (members.length === 0) {
      return [];
    }
    const share = totalSpent / members.length;
    return members.map((m: any) => {
      const paid = expenses
        .filter((e) => e.paidBy === m.userId)
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      return {
        id: m.id,
        name: m.user?.firstName || m.user?.email || 'Member',
        paid,
        balance: paid - share,
      };
    });
  }, [members, totalSpent, expenses]);

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={{ padding: 24, paddingTop: insets.top + 8, gap: 16 }}>
          <Skeleton width={120} height={14} />
          <Skeleton width="100%" height={180} borderRadius={24} />
          <Skeleton width="100%" height={100} borderRadius={18} />
          <Skeleton width="100%" height={120} borderRadius={18} />
        </View>
      </View>
    );
  }

  const startDate = trip?.startDate
    ? new Date(trip.startDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';
  const endDate = trip?.endDate
    ? new Date(trip.endDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.accent.primary}
          />
        }
      >
        <View
          
          style={[s.heroSection, { paddingTop: insets.top + 8 }]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtnWrap}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.heroTitle}>{trip?.destination || 'Trip'}</Text>
          <View style={s.dateRow}>
            <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={s.dateText}>
              {startDate} — {endDate}
            </Text>
          </View>
          {trip?.description && <Text style={s.heroDesc}>{trip.description}</Text>}
        </View>

        <View style={s.content}>
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Budget Progress</Text>
          <View style={[s.budgetCard, { backgroundColor: colors.bg.secondary }]}>
            <View style={s.budgetRow}>
              <Text style={[s.budgetLabel, { color: colors.text.tertiary }]}>Spent</Text>
              <Text style={[s.budgetValue, { color: colors.text.primary }]}>{fmt(totalSpent)}</Text>
            </View>
            <View style={s.budgetRow}>
              <Text style={[s.budgetLabel, { color: colors.text.tertiary }]}>Budget</Text>
              <Text style={[s.budgetValue, { color: colors.text.primary }]}>{fmt(budget)}</Text>
            </View>
            <View style={s.budgetBarOuter}>
              <View
                style={[
                  s.budgetBarFill,
                  {
                    width: `${Math.min(budgetUsed, 100)}%`,
                    backgroundColor:
                      budgetUsed > 90
                        ? colors.status.error
                        : budgetUsed > 70
                          ? colors.status.warning
                          : colors.status.success,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                s.budgetPercent,
                {
                  color: budgetUsed > 90 ? colors.status.error : colors.text.tertiary,
                },
              ]}
            >
              {budgetUsed.toFixed(0)}% used
            </Text>
          </View>

          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Expenses by Category</Text>
          {Object.keys(categoryTotals).length > 0 ? (
            <View style={[s.chartCard, { backgroundColor: colors.bg.secondary }]}>
              {Object.entries(categoryTotals)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amt]) => {
                  const pct = totalSpent > 0 ? (amt / totalSpent) * 100 : 0;
                  const barColor = CATEGORY_COLORS[cat] || colors.text.tertiary;
                  return (
                    <View key={cat} style={s.barRow}>
                      <View style={s.barLabelRow}>
                        <Text style={[s.barLabel, { color: colors.text.primary }]}>{cat}</Text>
                        <Text style={[s.barValue, { color: colors.text.tertiary }]}>
                          {fmt(amt)}
                        </Text>
                      </View>
                      <View style={s.barTrack}>
                        <View
                          style={[
                            s.barFill,
                            {
                              width: `${pct}%`,
                              backgroundColor: barColor,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
            </View>
          ) : (
            <View style={[s.emptyBox, { backgroundColor: colors.bg.secondary }]}>
              <Text style={[s.emptyText, { color: colors.text.tertiary }]}>No expenses yet</Text>
            </View>
          )}

          {dailyTotals.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Daily Spending</Text>
              <View style={[s.timelineCard, { backgroundColor: colors.bg.secondary }]}>
                {dailyTotals.map(([day, amt], i) => (
                  <View key={day} style={s.timelineRow}>
                    <View style={s.timelineLeft}>
                      <View style={[s.timelineDot, { backgroundColor: colors.accent.primary }]} />
                      {i < dailyTotals.length - 1 && (
                        <View style={[s.timelineLine, { backgroundColor: colors.border.subtle }]} />
                      )}
                    </View>
                    <Text style={[s.timelineDay, { color: colors.text.secondary }]}>{day}</Text>
                    <Text style={[s.timelineAmount, { color: colors.text.primary }]}>
                      {fmt(amt)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Member Balances</Text>
          {balances.length > 0 ? (
            balances.map((b) => (
              <View key={b.id} style={[s.balanceCard, { backgroundColor: colors.bg.secondary }]}>
                <View  style={s.balanceAvatar}>
                  <Text style={s.balanceAvatarText}>{b.name[0]?.toUpperCase() || '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.balanceName, { color: colors.text.primary }]}>{b.name}</Text>
                  <Text style={[s.balancePaid, { color: colors.text.tertiary }]}>
                    Paid {fmt(b.paid)}
                  </Text>
                </View>
                <Text
                  style={[
                    s.balanceAmt,
                    {
                      color: b.balance >= 0 ? colors.status.success : colors.status.error,
                    },
                  ]}
                >
                  {b.balance >= 0 ? 'Gets ' : 'Owes '}
                  {fmt(Math.abs(b.balance))}
                </Text>
              </View>
            ))
          ) : (
            <View style={[s.emptyBox, { backgroundColor: colors.bg.secondary }]}>
              <Text style={[s.emptyText, { color: colors.text.tertiary }]}>No members yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          s.fab,
          {
            backgroundColor: colors.accent.primary,
            bottom: insets.bottom + 24,
          },
        ]}
        onPress={() =>
          navigation.navigate('SharedExpenseForm', {
            groupId: trip?.groupId,
            prefill: { tripId },
          })
        }
      >
        <Ionicons name="add" size={26} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  heroSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  backBtnWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  heroDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  content: { padding: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
  budgetCard: { borderRadius: 18, padding: 18, marginBottom: 16 },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  budgetLabel: { fontSize: 13 },
  budgetValue: { fontSize: 15, fontWeight: '700' },
  budgetBarOuter: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(150,150,150,0.15)',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  budgetBarFill: { height: '100%', borderRadius: 4 },
  budgetPercent: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  chartCard: { borderRadius: 18, padding: 18, marginBottom: 16 },
  barRow: { marginBottom: 12 },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barLabel: { fontSize: 13, fontWeight: '500' },
  barValue: { fontSize: 12 },
  barTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(150,150,150,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  emptyBox: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: { fontSize: 13 },
  timelineCard: { borderRadius: 18, padding: 18, marginBottom: 16 },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  timelineLeft: {
    width: 20,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginTop: 4,
  },
  timelineDay: { flex: 1, fontSize: 13 },
  timelineAmount: { fontSize: 14, fontWeight: '700' },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  balanceAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceAvatarText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  balanceName: { fontSize: 14, fontWeight: '700' },
  balancePaid: { fontSize: 12, marginTop: 2 },
  balanceAmt: { fontSize: 14, fontWeight: '800' },
  fab: {
    position: 'absolute',
    right: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#f7892c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
});
