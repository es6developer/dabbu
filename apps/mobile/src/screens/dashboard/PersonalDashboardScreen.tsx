import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useLensStore } from '../../store/lensStore';
import { useFinanceStore } from '../../store/financeStore';
import { useSpaceStore } from '../../store/spaceStore';
import { useHealthStore } from '../../store/healthStore';
import { useAIStore } from '../../store/aiStore';
import { useAuth } from '../../store/AuthContext';
import { HealthScoreGauge } from '../../components/ui/HealthScoreGauge';
import { DashboardGrid } from '../../components/dashboard/DashboardGrid';
import { mapPersonalDashboard } from '../../utils/dashboardMapper';

function fmt(v: number) { return '₹' + Math.round(v).toLocaleString('en-IN'); }

export function PersonalDashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { accessToken, user } = useAuth();
  const activeLens = useLensStore((s) => s.activeLens);
  const { dashboard, loading: financeLoading, fetchDashboard } = useFinanceStore();
  const { spaces, pinnedSpaceIds, togglePinSpace, fetchSpaces } = useSpaceStore();
  const { score: healthScore, fetchScore } = useHealthStore();
  const { insights, fetchInsights } = useAIStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const [dashGridData, setDashGridData] = React.useState<any>({});
  const [gridLoading, setGridLoading] = React.useState(true);

  useEffect(() => {
    fetchDashboard(accessToken, activeLens);
    fetchSpaces(accessToken);
    fetchScore(accessToken, 'USER', user?.id);
    fetchInsights(accessToken);
    apiGetDashboard();
  }, [activeLens]);

  const apiGetDashboard = useCallback(async () => {
    try {
      const { api } = await import('../../services/api');
      const res = await api.get<any>('/dashboard/personal');
      setDashGridData(mapPersonalDashboard(res));
    } catch { setDashGridData(mapPersonalDashboard({})); }
    setGridLoading(false);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDashboard(accessToken, activeLens),
      fetchSpaces(accessToken),
      fetchScore(accessToken, 'USER', user?.id),
      fetchInsights(accessToken),
    ]);
    setRefreshing(false);
  }, [activeLens]);

  const moneySections: { label: string; income: number; expense: number }[] = [];
  if (dashboard?.myMoney) {
    moneySections.push({ label: activeLens === 'PERSONAL' ? 'My Money' : 'Personal', ...dashboard.myMoney });
  }
  if (activeLens !== 'PERSONAL' && dashboard?.ourMoney) {
    moneySections.push({ label: 'Our Money', ...dashboard.ourMoney });
  }
  if ((activeLens === 'FAMILY' || activeLens === 'FULL') && dashboard?.familyMoney) {
    moneySections.push({ label: 'Family Money', ...dashboard.familyMoney });
  }

  let gridMode: 'personal' | 'couple' | 'family' = 'personal';
  if (activeLens === 'FAMILY') gridMode = 'family';
  else if (activeLens === 'PARTNERED' || activeLens === 'FULL') gridMode = 'couple';

  if (financeLoading && !dashboard) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ─── Net Worth + Health Score ─── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, backgroundColor: colors.accent.primary, padding: 16, borderRadius: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>Net Worth</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 4 }}>
                {fmt(dashboard?.netWorth?.netWorth ?? 0)}
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.bg.card, padding: 16, borderRadius: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text.tertiary, marginBottom: 8 }}>Health Score</Text>
              <HealthScoreGauge score={healthScore?.score ?? 0} size="sm" />
            </View>
          </View>
        </View>

        {/* ─── Money Sections ─── */}
        {moneySections.map((ms) => (
          <View key={ms.label} style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.secondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{ms.label}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, backgroundColor: colors.bg.card, padding: 14, borderRadius: 12 }}>
                <Text style={{ fontSize: 11, color: colors.status.success }}>Income</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text.primary }}>{fmt(ms.income)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.bg.card, padding: 14, borderRadius: 12 }}>
                <Text style={{ fontSize: 11, color: colors.status.error }}>Expense</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text.primary }}>{fmt(ms.expense)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.bg.card, padding: 14, borderRadius: 12 }}>
                <Text style={{ fontSize: 11, color: colors.accent.primary }}>Savings</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text.primary }}>{fmt(ms.income - ms.expense)}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* ─── Pinned Spaces ─── */}
        <View style={{ paddingVertical: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>Pinned Spaces</Text>
            <TouchableOpacity onPress={() => navigation?.navigate('SpacesDashboard')}>
              <Text style={{ fontSize: 13, color: colors.accent.primary, fontWeight: '600' }}>See all</Text>
            </TouchableOpacity>
          </View>
          {pinnedSpaceIds.length === 0 ? (
            <View style={{ marginHorizontal: 16, backgroundColor: colors.bg.card, padding: 20, borderRadius: 12, alignItems: 'center' }}>
              <AntDesign name="pushpino" size={24} color={colors.text.tertiary} />
              <Text style={{ fontSize: 13, color: colors.text.tertiary, marginTop: 6 }}>Pin a space to see it here</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {spaces.filter(s => pinnedSpaceIds.includes(s.id)).slice(0, 6).map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => navigation?.navigate('SpaceDetail', { spaceId: s.id })}
                  style={{ backgroundColor: colors.bg.card, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border.default }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}>{s.name}</Text>
                    <AntDesign name="pushpin" size={12} color={colors.accent.primary} />
                  </View>
                  <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 2 }}>{s.type} · {s.memberCount}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => navigation?.navigate('CreateSpace')}
                style={{ backgroundColor: colors.accent.primary + '10', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
              >
                <AntDesign name="plus" size={20} color={colors.accent.primary} />
                <Text style={{ fontSize: 12, color: colors.accent.primary, fontWeight: '600', marginTop: 4 }}>New</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* ─── Life Hub ─── */}
        <View style={{ paddingHorizontal: 16, marginVertical: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 8 }}>Life Hub</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={() => navigation?.navigate('HousePlanner')} style={{ flex: 1, backgroundColor: colors.bg.card, padding: 14, borderRadius: 12, alignItems: 'center' }}>
              <AntDesign name="home" size={22} color={colors.accent.primary} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text.primary, marginTop: 4 }}>House</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation?.navigate('BabyPlanner')} style={{ flex: 1, backgroundColor: colors.bg.card, padding: 14, borderRadius: 12, alignItems: 'center' }}>
              <AntDesign name="smileo" size={22} color={colors.accent.primary} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text.primary, marginTop: 4 }}>Baby</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation?.navigate('RetirementPlanner')} style={{ flex: 1, backgroundColor: colors.bg.card, padding: 14, borderRadius: 12, alignItems: 'center' }}>
              <AntDesign name="clockcircleo" size={22} color={colors.accent.primary} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text.primary, marginTop: 4 }}>Retire</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation?.navigate('InvestmentPlanner')} style={{ flex: 1, backgroundColor: colors.bg.card, padding: 14, borderRadius: 12, alignItems: 'center' }}>
              <AntDesign name="barschart" size={22} color={colors.accent.primary} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text.primary, marginTop: 4 }}>Investment</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Recent Activity ─── */}
        <View style={{ paddingHorizontal: 16, marginVertical: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 8 }}>Recent Activity</Text>
          {dashboard?.recentTransactions?.length ? (
            dashboard.recentTransactions.slice(0, 5).map((t: any) => (
              <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.card, padding: 12, borderRadius: 12, marginBottom: 6 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.type === 'income' ? colors.status.success + '18' : colors.status.error + '18', alignItems: 'center', justifyContent: 'center' }}>
                  <AntDesign name={t.type === 'income' ? 'arrowdown' : 'arrowup'} size={14} color={t.type === 'income' ? colors.status.success : colors.status.error} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }} numberOfLines={1}>{t.description || 'Transaction'}</Text>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>{t.date?.slice(0, 10) || ''}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: t.type === 'income' ? colors.status.success : colors.status.error }}>
                  {t.type === 'income' ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                </Text>
              </View>
            ))
          ) : (
            <View style={{ backgroundColor: colors.bg.card, padding: 20, borderRadius: 12, alignItems: 'center' }}>
              <AntDesign name="clockcircleo" size={24} color={colors.text.tertiary} />
              <Text style={{ fontSize: 13, color: colors.text.tertiary, marginTop: 6 }}>No recent activity</Text>
            </View>
          )}
        </View>

        {/* ─── AI Insights Card ─── */}
        {insights.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginVertical: 8 }}>
            <View style={{ backgroundColor: `${colors.accent.primary}08`, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: `${colors.accent.primary}15` }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <AntDesign name="bulb1" size={18} color={colors.accent.primary} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}>AI Insights</Text>
              </View>
              {insights.slice(0, 2).map((ins) => (
                <View key={ins.id} style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>{ins.title}</Text>
                  <Text style={{ fontSize: 12, color: colors.text.tertiary }} numberOfLines={2}>{ins.description}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ─── Dashboard Grid ─── */}
        {!gridLoading && (
          <DashboardGrid
            data={dashGridData}
            mode={gridMode}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onWidgetPress={(type) => {
              if (type === 'goals') navigation?.navigate('GoalsList');
              else if (type === 'upcomingBills') navigation?.navigate('Wallet', { screen: 'BillsList' });
              else if (type === 'recentTransactions') navigation?.navigate('Wallet', { screen: 'WalletHome' });
              else if (type === 'budgetsOverview') navigation?.navigate('Wallet', { screen: 'Analytics' });
            }}
            onNavigate={(screen, params) => navigation?.navigate(screen, params)}
          />
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
