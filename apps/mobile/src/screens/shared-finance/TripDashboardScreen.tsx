import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { PremiumLoaderScreen } from '../../components/ui/PremiumLoaderScreen';
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
  const { accessToken, user: currentUser } = useAuth();
  const { colors } = useTheme();
  const { tripId, groupId: routeGroupId } = route.params || {};
  const [groupId, setGroupId] = useState(routeGroupId);
  const [trip, setTrip] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(
    async (refresh = false) => {
      if (!groupId) return;

      if (refresh) setRefreshing(true);
      else { setLoading(true); setLoadingProgress(0); }
      const totalCalls = 2;
      let completed = 0;
      const tick = () => {
        completed++;
        setLoadingProgress(Math.min(Math.round((completed / totalCalls) * 100), 95));
      };
      try {
        if (accessToken) setAccessToken(accessToken);
        const tripP = api.get<any>(`/shared-finance/groups/${groupId}/trip/dashboard`).finally(tick);
        const expP = api.get<any>(`/shared-finance/groups/${groupId}/expenses`).finally(tick);
        const [tripRes, expRes] = await Promise.allSettled([tripP, expP]);
        if (tripRes.status === 'fulfilled') setTrip(tripRes.value?.data || tripRes.value);
        if (expRes.status === 'fulfilled') {
          const d = expRes.value?.data || expRes.value;
          setExpenses(Array.isArray(d) ? d.sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()) : []);
        }
        if (tripRes.status === 'fulfilled') {
          const td = tripRes.value?.data || tripRes.value;
          setGroupId(td?.groupId || groupId);
        }
      } catch {
        // ignore
      } finally {
        setLoadingProgress(100);
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, groupId],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount || 0), 0), [expenses]);
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

  const balances = useMemo(() => {
    if (members.length === 0) return [];
    const share = totalSpent / members.length;
    return members.map((m: any) => {
      const paid = expenses.filter((e) => e.paidBy === m.userId).reduce((s, e) => s + Number(e.amount || 0), 0);
      return { id: m.id, userId: m.userId, name: m.user?.firstName || m.user?.email || 'Member', paid, balance: paid - share, upiId: m.user?.upiId || m.user?.email };
    });
  }, [members, totalSpent, expenses]);

  const recentExpenses = useMemo(() => expenses.slice(0, 5), [expenses]);

  if (loading) {
    return (
      <PremiumLoaderScreen progress={loadingProgress} title="Loading Trip Dashboard" icon="airplane-outline" />
    );
  }

  const startDate = trip?.startDate ? new Date(trip.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
  const endDate = trip?.endDate ? new Date(trip.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.accent.primary} />}
      >
        <View style={[s.heroSection, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtnWrap}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.heroTitle}>{trip?.destination || 'Trip'}</Text>
          <View style={s.dateRow}>
            <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={s.dateText}>{startDate} — {endDate}</Text>
          </View>
          {trip?.description && <Text style={s.heroDesc}>{trip.description}</Text>}
        </View>

        <View style={s.content}>
          {budget > 0 && (
            <>
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
                  <View style={[s.budgetBarFill, { width: `${Math.min(budgetUsed, 100)}%`, backgroundColor: budgetUsed > 90 ? colors.status.error : budgetUsed > 70 ? colors.status.warning : colors.status.success }]} />
                </View>
                <Text style={[s.budgetPercent, { color: budgetUsed > 90 ? colors.status.error : colors.text.tertiary }]}>{budgetUsed.toFixed(0)}% used</Text>
              </View>
            </>
          )}

          {Object.keys(categoryTotals).length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Expenses by Category</Text>
              <View style={[s.chartCard, { backgroundColor: colors.bg.secondary }]}>
                {Object.entries(categoryTotals)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amt]) => {
                    const pct = totalSpent > 0 ? (amt / totalSpent) * 100 : 0;
                    return (
                      <View key={cat} style={s.barRow}>
                        <View style={s.barLabelRow}>
                          <Text style={[s.barLabel, { color: colors.text.primary }]}>{cat}</Text>
                          <Text style={[s.barValue, { color: colors.text.tertiary }]}>{fmt(amt)}</Text>
                        </View>
                        <View style={s.barTrack}>
                          <View style={[s.barFill, { width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat] || colors.text.tertiary }]} />
                        </View>
                      </View>
                    );
                  })}
              </View>
            </>
          )}

          {recentExpenses.length > 0 && (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[s.sectionTitle, { color: colors.text.primary, marginBottom: 0 }]}>Recent Expenses</Text>
                {groupId && (
                  <TouchableOpacity onPress={() => navigation.navigate('SharedGroupDetail', { groupId, groupName: trip?.destination || 'Trip' })}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent.primary }}>View all</Text>
                  </TouchableOpacity>
                )}
              </View>
              {recentExpenses.map((exp: any) => {
                const payer = members.find((m: any) => m.userId === exp.paidBy);
                const payerName = payer?.user?.firstName || payer?.user?.email || 'Someone';
                return (
                  <View key={exp.id} style={[s.expenseCard, { backgroundColor: colors.bg.secondary }]}>
                    <View style={[s.expenseAvatar, { backgroundColor: colors.accent.primary }]}>
                      <Text style={s.expenseAvatarText}>{payerName[0]?.toUpperCase() || '?'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.expenseDesc, { color: colors.text.primary }]} numberOfLines={1}>{exp.description || exp.category || 'Expense'}</Text>
                      <Text style={[s.expenseMeta, { color: colors.text.tertiary }]}>{payerName} · {new Date(exp.date || exp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                    </View>
                    <Text style={[s.expenseAmount, { color: colors.text.primary }]}>{fmt(Number(exp.amount || 0))}</Text>
                  </View>
                );
              })}
            </>
          )}

          {balances.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Member Balances</Text>
              {balances.map((b) => {
                const owes = b.balance < 0;
                return (
                  <View key={b.id} style={[s.balanceCard, { backgroundColor: colors.bg.secondary }]}>
                    <View style={[s.balanceAvatar, { backgroundColor: owes ? colors.status.error : colors.status.success }]}>
                      <Text style={s.balanceAvatarText}>{b.name[0]?.toUpperCase() || '?'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.balanceName, { color: colors.text.primary }]}>{b.name}</Text>
                      <Text style={[s.balancePaid, { color: colors.text.tertiary }]}>Paid {fmt(b.paid)}</Text>
                    </View>
                    <Text style={[s.balanceAmt, { color: owes ? colors.status.error : colors.status.success }]}>
                      {owes ? 'Owes ' : 'Gets '}{fmt(Math.abs(b.balance))}
                    </Text>
                    {owes && currentUser?.id !== b.userId && (
                      <TouchableOpacity
                        style={[s.settleBtn, { backgroundColor: colors.status.success }]}
                        onPress={() => {
                          const upiLink = `upi://pay?pa=${encodeURIComponent(b.upiId || '')}&pn=${encodeURIComponent(b.name)}&am=${Math.abs(b.balance)}&cu=INR&tn=Settling%20via%20Dabbu`;
                          Linking.openURL(upiLink).catch(() => Alert.alert('Settle Up', `Pay ${fmt(Math.abs(b.balance))} to ${b.name}`));
                        }}
                      >
                        <Text style={s.settleBtnText}>Settle</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.accent.primary }]}
        onPress={() => navigation.navigate('SharedExpenseForm', { groupId, tripId })}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  heroSection: { paddingHorizontal: 20, paddingBottom: 32 },
  backBtnWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 16 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#FFF', marginBottom: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  heroDesc: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 8 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  budgetCard: { borderRadius: 18, padding: 18, marginBottom: 16 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  budgetLabel: { fontSize: 13 },
  budgetValue: { fontSize: 15, fontWeight: '700' },
  budgetBarOuter: { width: '100%', height: 8, backgroundColor: 'rgba(150,150,150,0.15)', borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  budgetBarFill: { height: '100%', borderRadius: 4 },
  budgetPercent: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  chartCard: { borderRadius: 18, padding: 18, marginBottom: 16 },
  barRow: { marginBottom: 12 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { fontSize: 13, fontWeight: '500' },
  barValue: { fontSize: 12 },
  barTrack: { width: '100%', height: 6, backgroundColor: 'rgba(150,150,150,0.1)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  expenseCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, marginBottom: 8, gap: 12 },
  expenseAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  expenseAvatarText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  expenseDesc: { fontSize: 14, fontWeight: '600' },
  expenseMeta: { fontSize: 11, marginTop: 2 },
  expenseAmount: { fontSize: 15, fontWeight: '700' },
  balanceCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 8, gap: 12 },
  balanceAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  balanceAvatarText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  balanceName: { fontSize: 14, fontWeight: '700' },
  balancePaid: { fontSize: 12, marginTop: 2 },
  balanceAmt: { fontSize: 14, fontWeight: '800' },
  settleBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  settleBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  fab: { position: 'absolute', right: 20, bottom: 28, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6, zIndex: 100 },
});
