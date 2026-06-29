import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useLensStore } from '../../store/lensStore';
import { downloadAndShareFile } from '../../utils/exportFile';
import { Avatar } from '../../components/ui/Avatar';

import { alertService } from '../../components/ui';
const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 64;

function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtShort(v: number) {
  if (v >= 10000000) {
    return '\u20B9' + (v / 10000000).toFixed(1) + 'Cr';
  }
  if (v >= 100000) {
    return '\u20B9' + (v / 100000).toFixed(1) + 'L';
  }
  if (v >= 1000) {
    return '\u20B9' + (v / 1000).toFixed(1) + 'K';
  }
  return fmt(v);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) {
    return 'Good Morning';
  }
  if (h < 17) {
    return 'Good Afternoon';
  }
  return 'Good Evening';
}

export function PersonalLensDashboard() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { user, accessToken } = useAuth();
  const activeLens = useLensStore((s) => s.activeLens);

  const [dashboard, setDashboard] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [spacesData, setSpacesData] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<
    { month: string; income: number; expense: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
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
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endDate = now.toISOString().split('T')[0];

      const [dashRes, analyticRes, catRes, spacesRes, remindersRes, trendRes] =
        await Promise.allSettled([
          api.get<any>('/dashboard/lens', ctrl.signal),
          api.get<any>(
            `/analytics/dashboard?startDate=${startDate}&endDate=${endDate}`,
            ctrl.signal,
          ),
          api.get<any>(
            `/analytics/category-breakdown?startDate=${startDate}&endDate=${endDate}`,
            ctrl.signal,
          ),
          api.get<any>('/shared-finance/groups', ctrl.signal),
          api.get<any>('/reminders/upcoming?limit=5', ctrl.signal),
          api.get<any>('/transactions/monthly-summary?months=6', ctrl.signal),
        ]);

      if (!ctrl.signal.aborted) {
        if (dashRes.status === 'fulfilled') {
          const data = dashRes.value?.data || dashRes.value;
          setDashboard(data);
        }
        if (analyticRes.status === 'fulfilled') {
          const data = analyticRes.value?.data || analyticRes.value;
          setAnalytics(data);
        }
        if (catRes.status === 'fulfilled') {
          const data = catRes.value?.data || catRes.value || [];
          setCategoryData(data);
        }
        if (spacesRes.status === 'fulfilled') {
          const data = spacesRes.value?.data || spacesRes.value || [];
          setSpacesData(Array.isArray(data) ? data : []);
        }
        if (remindersRes.status === 'fulfilled') {
          const data = remindersRes.value?.data || remindersRes.value || [];
          setReminders(Array.isArray(data) ? data : []);
        }
        if (trendRes.status === 'fulfilled') {
          const raw = trendRes.value?.data || trendRes.value || {};
          const trend = raw?.data?.monthlyTrend || raw?.monthlyTrend || [];
          setMonthlyTrend(Array.isArray(trend) ? trend : []);
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

  const handleTestPush = useCallback(async () => {
    try {
      const res = await api.post<any>('/devices/test-push', {
        title: 'Test',
        body: 'This is a test push notification from Dabbu',
      });
      if (res?.success) {
        alertService.alert('Sent', res.message || 'Test push sent to your devices.');
      } else {
        alertService.alert(
          'No Device',
          res?.message || 'No active devices found. Open the app on your device to register it.',
        );
      }
    } catch {
      alertService.alert(
        'Failed',
        'Could not send test push. Check that your device is registered.',
      );
    }
  }, []);

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    setExporting(format);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await downloadAndShareFile(
        '/reports/export',
        {
          type: 'monthly',
          format,
          startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            .toISOString()
            .split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        },
        `dabbu-report-${new Date().toISOString().split('T')[0]}`,
        format,
      );
    } catch {
      /* silent */
    } finally {
      setExporting(null);
    }
  };

  const userName = user?.firstName || 'User';
  const greeting = getGreeting();
  const d = dashboard?.data || dashboard || {};
  const a = analytics || {};

  const income = a.monthlyIncome || d.income || 0;
  const expense = a.monthlyExpense || d.expense || 0;
  const savings = income - expense;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
  const netWorth = d.netWorth?.total || 0;
  const balance = income - expense;

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
        <LinearGradient
          colors={[colors.bg.gradientStart, colors.bg.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          locations={[0, 0.3]}
          style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 20 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProfileTab', { screen: 'SettingsMain' })}
            >
              <Avatar
                uri={user?.avatarUrl}
                name={`${user?.firstName || ''} ${user?.lastName || ''}`}
                size={36}
              />
            </TouchableOpacity>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}>
                {greeting}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary }}>
                {userName}
              </Text>
            </View>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.brand.primary} />
            <Text style={{ marginTop: 12, fontSize: 14, color: colors.text.tertiary }}>
              Loading your finances...
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

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
              tintColor={colors.brand.primary}
            />
          }
        >
          {/* ── Header ── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <View style={styles.headerRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ProfileTab', { screen: 'SettingsMain' })}
                >
                  <Avatar
                    uri={user?.avatarUrl}
                    name={`${user?.firstName || ''} ${user?.lastName || ''}`}
                    size={36}
                  />
                </TouchableOpacity>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}>
                    {greeting}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text.primary }}>
                      {userName}
                    </Text>
                    <View
                      style={[styles.lensBadge, { backgroundColor: colors.brand.primary + '20' }]}
                    >
                      <Text
                        style={{ fontSize: 10, fontWeight: '700', color: colors.brand.primary }}
                      >
                        MY MONEY
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Notifications')}
                  style={[styles.iconBtn, { backgroundColor: colors.bg.card }]}
                >
                  <AntDesign name="bells" size={18} color={colors.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleTestPush}
                  style={[styles.iconBtn, { backgroundColor: colors.bg.card }]}
                >
                  <AntDesign name="rocket1" size={18} color={colors.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ProfileTab', { screen: 'LensPicker' })}
                  style={[styles.iconBtn, { backgroundColor: colors.bg.card }]}
                >
                  <AntDesign name="appstore-o" size={18} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Balance Hero ── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <LinearGradient
              colors={[colors.brand.primary, colors.brand.hover]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Monthly Balance
              </Text>
              <Text
                style={{
                  fontSize: 34,
                  fontWeight: '800',
                  color: '#FFF',
                  marginTop: 4,
                  letterSpacing: -1,
                }}
              >
                {fmt(balance)}
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
                {[
                  { label: 'Income', value: income, color: colors.status.success },
                  { label: 'Expense', value: expense, color: colors.status.error },
                  { label: 'Savings', value: savings, color: colors.accent.secondary },
                ].map((item, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      borderRadius: 14,
                      padding: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.6)',
                        textTransform: 'uppercase',
                        fontWeight: '600',
                        letterSpacing: 0.3,
                      }}
                    >
                      {item.label}
                    </Text>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFF', marginTop: 4 }}>
                      {fmt(item.value)}
                    </Text>
                  </View>
                ))}
              </View>
              {income > 0 && (
                <View
                  style={{
                    marginTop: 12,
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                      Savings Rate
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFF' }}>
                      {savingsRate}%
                    </Text>
                  </View>
                  <View
                    style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3 }}
                  >
                    <View
                      style={{
                        width: `${Math.min(savingsRate, 100)}%`,
                        height: 5,
                        backgroundColor: '#FFF',
                        borderRadius: 3,
                      }}
                    />
                  </View>
                </View>
              )}
            </LinearGradient>
          </View>

          {/* ── Monthly Trend Chart ── */}
          {monthlyTrend.length > 1 && (
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <View style={styles.sectionHeader}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                  Monthly Trend
                </Text>
              </View>
              <View style={[styles.card, { backgroundColor: colors.bg.card, padding: 16 }]}>
                <LineChart
                  data={{
                    labels: monthlyTrend.map((m) => {
                      const parts = m.month.split('-');
                      const months = [
                        'Jan',
                        'Feb',
                        'Mar',
                        'Apr',
                        'May',
                        'Jun',
                        'Jul',
                        'Aug',
                        'Sep',
                        'Oct',
                        'Nov',
                        'Dec',
                      ];
                      return months[parseInt(parts[1]) - 1] || m.month;
                    }),
                    datasets: [
                      {
                        data: monthlyTrend.map((m) => m.income || 0),
                        color: () => '#22C55E',
                        strokeWidth: 2,
                      },
                      {
                        data: monthlyTrend.map((m) => m.expense || 0),
                        color: () => '#EF4444',
                        strokeWidth: 2,
                      },
                    ],
                    legend: ['Income', 'Expense'],
                  }}
                  width={CHART_W}
                  height={180}
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: colors.bg.card,
                    backgroundGradientFrom: colors.bg.card,
                    backgroundGradientTo: colors.bg.card,
                    decimalPlaces: 0,
                    color: () => colors.text.secondary,
                    labelColor: () => colors.text.tertiary,
                    propsForDots: { r: '4', strokeWidth: '2' },
                    propsForBackgroundLines: {
                      strokeDasharray: '',
                      stroke: colors.border.subtle,
                      strokeWidth: 1,
                    },
                  }}
                  bezier
                  style={{ borderRadius: 12 }}
                />
              </View>
            </View>
          )}

          {/* ── Net Worth Card ── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('HomeTab', { screen: 'NetWorth' })}
              activeOpacity={0.8}
            >
              <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}>
                    Net Worth
                  </Text>
                  <AntDesign name="right" size={14} color={colors.text.tertiary} />
                </View>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: '800',
                    color: netWorth >= 0 ? '#22C55E' : '#EF4444',
                    marginTop: 4,
                  }}
                >
                  {fmtShort(netWorth)}
                </Text>
                <View style={{ flexDirection: 'row', marginTop: 8, gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Assets</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                      {fmt(d.netWorth?.assets || 0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Liabilities</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#EF4444' }}>
                      {fmt(d.netWorth?.liabilities || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Category Breakdown ── */}
          {categoryData.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <View style={styles.sectionHeader}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                  Spending by Category
                </Text>
              </View>
              <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
                {categoryData.slice(0, 6).map((c: any, i: number) => (
                  <View key={i} style={styles.catRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text
                          style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}
                        >
                          {c.name}
                        </Text>
                        <Text
                          style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}
                        >
                          {fmt(c.amount || 0)}
                        </Text>
                      </View>
                      <View
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}
                      >
                        <View
                          style={{
                            flex: 1,
                            height: 6,
                            backgroundColor: colors.border.subtle,
                            borderRadius: 3,
                            overflow: 'hidden',
                          }}
                        >
                          <View
                            style={{
                              width: `${Math.min(c.percentage || 0, 100)}%`,
                              height: 6,
                              backgroundColor: c.color || colors.accent.primary,
                              borderRadius: 3,
                            }}
                          />
                        </View>
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '600',
                            color: colors.text.tertiary,
                            minWidth: 32,
                            textAlign: 'right',
                          }}
                        >
                          {Math.round(c.percentage || 0)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Budget Progress ── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                Budget Progress
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('HomeTab', { screen: 'BudgetsList' })}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brand.primary }}>
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8 }}>
              {(d.budgets?.length > 0 ? d.budgets : []).slice(0, 4).map((b: any, i: number) => (
                <View
                  key={b.id || i}
                  style={[styles.budgetRow, { backgroundColor: colors.bg.card }]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                        {b.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: b.progress > 80 ? '#EF4444' : colors.text.secondary,
                        }}
                      >
                        {fmt(b.spent)} / {fmt(b.amount)}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 5,
                        backgroundColor: colors.border.subtle,
                        borderRadius: 3,
                        marginTop: 6,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.min(b.progress || 0, 100)}%`,
                          height: 5,
                          backgroundColor:
                            b.progress > 80 ? '#EF4444' : b.progress > 60 ? '#F59E0B' : '#22C55E',
                          borderRadius: 3,
                        }}
                      />
                    </View>
                  </View>
                </View>
              ))}
              {(!d.budgets || d.budgets.length === 0) && (
                <View style={[styles.emptyCard, { backgroundColor: colors.bg.card }]}>
                  <AntDesign name="wallet" size={24} color={colors.text.tertiary} />
                  <Text style={{ fontSize: 13, color: colors.text.tertiary, marginTop: 6 }}>
                    No budgets set
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('HomeTab', { screen: 'CreateBudget' })}
                    style={{
                      marginTop: 10,
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      backgroundColor: colors.brand.primary,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>
                      Create Budget
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* ── Shared-finance spaces ── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                Shared-finance spaces
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('SpacesTab', { screen: 'SpacesDashboard' })}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brand.primary }}>
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8 }}>
              {spacesData.length > 0 ? (
                <>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={[styles.statCard, { backgroundColor: colors.bg.card, flex: 1 }]}>
                      <Text
                        style={{ fontSize: 24, fontWeight: '800', color: colors.brand.primary }}
                      >
                        {spacesData.length}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.text.tertiary, marginTop: 2 }}>
                        Total
                      </Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.bg.card, flex: 1 }]}>
                      <Text style={{ fontSize: 24, fontWeight: '800', color: '#22C55E' }}>
                        {
                          spacesData.filter((s: any) => s.type === 'couple' || s.type === 'family')
                            .length
                        }
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.text.tertiary, marginTop: 2 }}>
                        Shared
                      </Text>
                    </View>
                  </View>
                  {spacesData.slice(0, 3).map((s: any) => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() =>
                        navigation.navigate('SpacesTab', {
                          screen: 'SharedGroupDetail',
                          params: { groupId: s.id, groupName: s.name },
                        })
                      }
                      style={[styles.spaceRow, { backgroundColor: colors.bg.card }]}
                    >
                      <View
                        style={[
                          styles.spaceDot,
                          { backgroundColor: s.coverColor || colors.brand.primary },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}
                        >
                          {s.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.text.tertiary }}>
                          {s.type} · {s.memberCount || s._count?.members || 0} members
                        </Text>
                      </View>
                      <AntDesign name="right" size={14} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <View
                  style={[
                    styles.spaceRow,
                    { backgroundColor: colors.bg.card, alignItems: 'center', paddingVertical: 24 },
                  ]}
                >
                  <AntDesign name="team" size={24} color={colors.text.tertiary} />
                  <Text style={{ fontSize: 13, color: colors.text.tertiary, marginTop: 6 }}>
                    No shared spaces yet
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('SpacesTab', { screen: 'CreateSharedGroup' })
                    }
                    style={{
                      marginTop: 10,
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      backgroundColor: colors.accent.primary,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>Create</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* ── Upcoming Reminders ── */}
          {reminders.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <View style={styles.sectionHeader}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                  Upcoming Reminders
                </Text>
              </View>
              <View style={{ gap: 6 }}>
                {reminders.slice(0, 4).map((r: any) => (
                  <View
                    key={r.id}
                    style={[styles.reminderRow, { backgroundColor: colors.bg.card }]}
                  >
                    <View
                      style={[
                        styles.reminderDot,
                        { backgroundColor: r.status === 'active' ? '#F59E0B' : '#22C55E' },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                        {r.title || r.name}
                      </Text>
                      {r.dueDate && (
                        <Text style={{ fontSize: 11, color: colors.text.tertiary }}>
                          Due{' '}
                          {new Date(r.dueDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </Text>
                      )}
                    </View>
                    <AntDesign name="bells" size={16} color={colors.text.tertiary} />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Quick Actions ── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: colors.text.primary,
                marginBottom: 12,
              }}
            >
              Quick Actions
            </Text>
            <View style={styles.qaGrid}>
              <TouchableOpacity
                onPress={() => navigation.navigate('WalletTab', { screen: 'AddExpense' })}
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#EF444415' }]}>
                  <AntDesign name="minuscircle" size={22} color="#EF4444" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Add Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('WalletTab', {
                    screen: 'AddExpense',
                    params: { type: 'income' },
                  })
                }
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#22C55E15' }]}>
                  <AntDesign name="pluscircle" size={22} color="#22C55E" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Add Income</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('HomeTab', { screen: 'GoalsList' })}
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#F59E0B15' }]}>
                  <AntDesign name="flag" size={22} color="#F59E0B" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Add Goal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('WalletTab', { screen: 'Analytics' })}
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: colors.brand.primary + '15' }]}>
                  <AntDesign name="barschart" size={22} color={colors.brand.primary} />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Full Reports</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Export Reports ── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: colors.text.primary,
                marginBottom: 12,
              }}
            >
              Export Reports
            </Text>
            <View style={[styles.exportCard, { backgroundColor: colors.bg.card }]}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}
              >
                <View
                  style={[styles.exportIconBox, { backgroundColor: colors.brand.primary + '12' }]}
                >
                  <AntDesign name="filetext1" size={20} color={colors.brand.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}>
                    Monthly Report
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary, marginTop: 1 }}>
                    {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[
                  {
                    format: 'pdf' as const,
                    label: 'PDF',
                    color: '#EF4444',
                    bgColor: '#FEF2F2',
                    icon: 'filetext1',
                  },
                  {
                    format: 'excel' as const,
                    label: 'Excel',
                    color: '#22C55E',
                    bgColor: '#F0FDF4',
                    icon: 'appstore1',
                  },
                  {
                    format: 'csv' as const,
                    label: 'CSV',
                    color: '#3B82F6',
                    bgColor: '#EFF6FF',
                    icon: 'paperclip',
                  },
                ].map((btn) => (
                  <TouchableOpacity
                    key={btn.format}
                    style={[
                      styles.exportBtn,
                      { backgroundColor: btn.bgColor, opacity: exporting === btn.format ? 0.6 : 1 },
                    ]}
                    onPress={() => handleExport(btn.format)}
                    disabled={exporting !== null}
                    activeOpacity={0.7}
                  >
                    {exporting === btn.format ? (
                      <ActivityIndicator size="small" color={btn.color} />
                    ) : (
                      <>
                        <AntDesign name={btn.icon as any} size={15} color={btn.color} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: btn.color }}>
                          {btn.label}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* ── Upcoming Bills ── */}
          {d.bills?.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <View style={styles.sectionHeader}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                  Upcoming Bills
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('WalletTab', { screen: 'BillsList' })}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brand.primary }}>
                    See All
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ gap: 8 }}>
                {d.bills.slice(0, 4).map((b: any, i: number) => (
                  <View
                    key={b.id || i}
                    style={[styles.billRow, { backgroundColor: colors.bg.card }]}
                  >
                    <View
                      style={[
                        styles.billDot,
                        { backgroundColor: b.isPaid ? '#22C55E' : '#F59E0B' },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                        {b.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.text.tertiary }}>
                        {b.category} · Due{' '}
                        {b.dueDate
                          ? new Date(b.dueDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })
                          : 'Soon'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                      {fmt(b.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Goals ── */}
          {d.goals?.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <View style={styles.sectionHeader}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                  Goal Progress
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('HomeTab', { screen: 'GoalsList' })}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brand.primary }}>
                    See All
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ gap: 8 }}>
                {d.goals.slice(0, 3).map((g: any, i: number) => (
                  <View
                    key={g.id || i}
                    style={[styles.goalRow, { backgroundColor: colors.bg.card }]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                        {g.name}
                      </Text>
                      <Text
                        style={{ fontSize: 12, fontWeight: '600', color: colors.text.secondary }}
                      >
                        {fmt(g.currentAmount)} / {fmt(g.targetAmount)}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 5,
                        backgroundColor: colors.border.subtle,
                        borderRadius: 3,
                        marginTop: 6,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.min(g.progress || 0, 100)}%`,
                          height: 5,
                          backgroundColor:
                            g.progress >= 100
                              ? '#22C55E'
                              : g.progress >= 50
                                ? '#F59E0B'
                                : colors.brand.primary,
                          borderRadius: 3,
                        }}
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '500',
                        color: colors.text.tertiary,
                        marginTop: 2,
                      }}
                    >
                      {g.progress}% complete
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Empty State ── */}
          {!income && !expense && !d.budgets?.length && !d.goals?.length && !d.bills?.length && (
            <View style={styles.emptyState}>
              <AntDesign name="barschart" size={48} color={colors.text.tertiary} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.text.tertiary,
                  marginTop: 12,
                }}
              >
                No financial data yet
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.text.tertiary,
                  textAlign: 'center',
                  marginTop: 6,
                  lineHeight: 18,
                  paddingHorizontal: 40,
                }}
              >
                Start by adding a transaction or creating a budget to see your analytics here.
              </Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lensBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: { borderRadius: 24, padding: 20 },
  card: { borderRadius: 20, padding: 18 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  budgetRow: { borderRadius: 14, padding: 14 },
  billRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, gap: 10 },
  billDot: { width: 8, height: 8, borderRadius: 4 },
  goalRow: { borderRadius: 14, padding: 14 },
  emptyCard: { borderRadius: 14, padding: 24, alignItems: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },

  catRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.08)',
  },

  statCard: { borderRadius: 16, padding: 16, alignItems: 'center' },
  spaceRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, gap: 10 },
  spaceDot: { width: 8, height: 8, borderRadius: 4 },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  reminderDot: { width: 8, height: 8, borderRadius: 4 },

  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  qaCard: { width: '48%', borderRadius: 18, padding: 16, alignItems: 'center', gap: 8 },
  qaIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  exportCard: { borderRadius: 20, padding: 18 },
  exportIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
});
