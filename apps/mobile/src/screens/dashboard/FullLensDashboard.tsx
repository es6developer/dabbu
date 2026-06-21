import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useLensStore } from '../../store/lensStore';
import { useSpaceStore } from '../../store/spaceStore';

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

export function FullLensDashboard() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { spaces } = useSpaceStore();
  const activeLens = useLensStore((s) => s.activeLens);

  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await api.get<any>('/dashboard/lens', ctrl.signal);
      const data = res?.data || res;
      if (!ctrl.signal.aborted) {
        setDashboard(data);
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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const userName = user?.firstName || 'User';
  const greeting = getGreeting();
  const d = dashboard?.data || dashboard || {};
  const personal = d.personal || {};
  const partnered = d.partnered || {};
  const family = d.family || {};
  const fullNetWorth = personal.netWorth?.total || 0;
  const fullIncome =
    (personal.income || 0) + (partnered.incomeCombined || 0) + (family.familyIncome || 0);
  const fullExpense =
    (personal.expense || 0) + (partnered.expenseCombined || 0) + (family.familyExpense || 0);

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
        <LinearGradient
          colors={isDark ? ['#1A1020', colors.bg.primary] : ['#FEF3C7', colors.bg.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          locations={[0, 0.3]}
          style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 20 }}
        >
          <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}>
            {greeting}
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary }}>
            {userName}
          </Text>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#D97706" />
            <Text style={{ marginTop: 12, fontSize: 14, color: colors.text.tertiary }}>
              Loading everything...
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={isDark ? ['#1A1020', colors.bg.primary] : ['#FEF3C7', colors.bg.primary]}
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
              onRefresh={() => loadData(true)}
              tintColor="#D97706"
            />
          }
        >
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <View style={styles.headerRow}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}>
                  {greeting}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text.primary }}>
                    {userName}
                  </Text>
                  <View style={[styles.lensBadge, { backgroundColor: '#D9770620' }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#D97706' }}>
                      EVERYTHING
                    </Text>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ProfileTab', { screen: 'SettingsMain' })}
                  style={[styles.iconBtn, { backgroundColor: colors.bg.card }]}
                >
                  <AntDesign name="menuunfold" size={18} color={colors.text.secondary} />
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

          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('HomeTab', { screen: 'NetWorth' })}
              activeOpacity={0.8}
            >
              <View style={[styles.heroCard, { backgroundColor: '#D97706' }]}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>
                  Net Worth
                </Text>
                <Text style={{ fontSize: 36, fontWeight: '800', color: '#FFF', marginTop: 2 }}>
                  {fmt(fullNetWorth)}
                </Text>
                <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatLabel}>Total Income</Text>
                    <Text style={styles.heroStatValue}>{fmtShort(fullIncome)}</Text>
                  </View>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatLabel}>Total Expense</Text>
                    <Text style={styles.heroStatValue}>{fmtShort(fullExpense)}</Text>
                  </View>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatLabel}>Budget Health</Text>
                    <Text style={styles.heroStatValue}>
                      {fullIncome > 0 ? Math.round((1 - fullExpense / fullIncome) * 100) : 0}%
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                Goal Progress
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('HomeTab', { screen: 'GoalsList' })}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#D97706' }}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8 }}>
              {(d.goals?.length > 0 ? d.goals : []).slice(0, 5).map((g: any, i: number) => (
                <View key={g.id || i} style={[styles.goalRow, { backgroundColor: colors.bg.card }]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}
                        >
                          {g.name}
                        </Text>
                        <View
                          style={[
                            styles.goalLensBadge,
                            {
                              backgroundColor:
                                g.lens === 'PERSONAL'
                                  ? '#7C3AED20'
                                  : g.lens === 'PARTNERED'
                                    ? '#F43F5E20'
                                    : g.lens === 'FAMILY'
                                      ? '#05966920'
                                      : '#D9770620',
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 8,
                              fontWeight: '700',
                              color:
                                g.lens === 'PERSONAL'
                                  ? '#7C3AED'
                                  : g.lens === 'PARTNERED'
                                    ? '#F43F5E'
                                    : g.lens === 'FAMILY'
                                      ? '#059669'
                                      : '#D97706',
                            }}
                          >
                            {g.lens?.slice(0, 4)}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                        {fmt(g.currentAmount)} / {fmt(g.targetAmount)}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 4,
                        backgroundColor: colors.border.subtle,
                        borderRadius: 2,
                        marginTop: 6,
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.min(g.progress || 0, 100)}%`,
                          height: 4,
                          backgroundColor:
                            g.lens === 'PERSONAL'
                              ? '#7C3AED'
                              : g.lens === 'PARTNERED'
                                ? '#F43F5E'
                                : g.lens === 'FAMILY'
                                  ? '#059669'
                                  : '#D97706',
                          borderRadius: 2,
                        }}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                Spaces Summary
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('SpacesTab', { screen: 'SpacesDashboard' })}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#D97706' }}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8 }}>
              {(d.spaces?.length > 0 ? d.spaces : []).slice(0, 5).map((s: any, i: number) => (
                <View
                  key={s.id || i}
                  style={[styles.spaceRow, { backgroundColor: colors.bg.card }]}
                >
                  <View
                    style={[
                      styles.spaceDot,
                      {
                        backgroundColor:
                          s.type === 'COUPLE'
                            ? '#F43F5E'
                            : s.type === 'FAMILY'
                              ? '#059669'
                              : s.type === 'PERSONAL'
                                ? '#7C3AED'
                                : '#D97706',
                      },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                      {s.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.text.tertiary }}>
                      {s.memberCount || 0} members · {s.type}
                    </Text>
                  </View>
                  <AntDesign name="right" size={14} color={colors.text.tertiary} />
                </View>
              ))}
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                Investments
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('WalletTab', { screen: 'Investments' })}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#D97706' }}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8 }}>
              {(d.investments?.length > 0 ? d.investments : [])
                .slice(0, 5)
                .map((inv: any, i: number) => (
                  <View
                    key={inv.id || i}
                    style={[styles.investmentRow, { backgroundColor: colors.bg.card }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                        {inv.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.text.tertiary }}>{inv.type}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}>
                        {fmt(inv.value)}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: (inv.returnsPct || 0) >= 0 ? '#22C55E' : '#EF4444',
                        }}
                      >
                        {inv.returnsPct >= 0 ? '+' : ''}
                        {inv.returnsPct}%
                      </Text>
                    </View>
                  </View>
                ))}
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                Upcoming Bills
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('HomeTab', { screen: 'BillsList' })}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#D97706' }}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8 }}>
              {(d.bills?.length > 0 ? d.bills : []).slice(0, 5).map((b: any, i: number) => (
                <View key={b.id || i} style={[styles.billRow, { backgroundColor: colors.bg.card }]}>
                  <View
                    style={[
                      styles.billDot,
                      {
                        backgroundColor:
                          b.lens === 'PERSONAL'
                            ? '#7C3AED'
                            : b.lens === 'PARTNERED'
                              ? '#F43F5E'
                              : b.lens === 'FAMILY'
                                ? '#059669'
                                : '#D97706',
                      },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                        {b.title}
                      </Text>
                      <View
                        style={[
                          styles.goalLensBadge,
                          {
                            backgroundColor:
                              b.lens === 'PERSONAL'
                                ? '#7C3AED20'
                                : b.lens === 'PARTNERED'
                                  ? '#F43F5E20'
                                  : '#05966920',
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 8,
                            fontWeight: '700',
                            color:
                              b.lens === 'PERSONAL'
                                ? '#7C3AED'
                                : b.lens === 'PARTNERED'
                                  ? '#F43F5E'
                                  : '#059669',
                          }}
                        >
                          {b.lens?.slice(0, 4)}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.text.tertiary }}>
                      Due{' '}
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

          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={[styles.insightCard, { backgroundColor: colors.bg.card }]}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}
              >
                <View style={[styles.insightIcon, { backgroundColor: '#D9770615' }]}>
                  <AntDesign name="bulb1" size={18} color="#D97706" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}>
                  AI Insights
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.text.secondary, lineHeight: 18 }}>
                {fullIncome > 0
                  ? `You're managing ${fmtShort(fullIncome)} across all lenses. Your net worth is ${fmtShort(fullNetWorth)}. Keep tracking across all dimensions.`
                  : 'Add transactions to get AI-powered insights across your entire financial life.'}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('HomeTab', { screen: 'DabbuAI' })}
                style={{ marginTop: 10 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#D97706' }}>
                  View all insights →
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, marginBottom: 16, gap: 8 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: colors.text.primary,
                marginBottom: 4,
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
                onPress={() => navigation.navigate('SpacesTab', { screen: 'CreateSpace' })}
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#D9770615' }]}>
                  <AntDesign name="team" size={22} color="#D97706" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Create Space</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('HomeTab', { screen: 'CreateGoal' })}
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#F59E0B15' }]}>
                  <AntDesign name="flag" size={22} color="#F59E0B" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Add Goal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('HomeTab', { screen: 'Reports' })}
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#22C55E15' }]}>
                  <AntDesign name="barschart" size={22} color="#22C55E" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Export Report</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('WalletTab', { screen: 'AddInvestment' })}
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#3B82F615' }]}>
                  <AntDesign name="linechart" size={22} color="#3B82F6" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Add Investment</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  heroCard: { borderRadius: 24, padding: 20 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 },
  heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  heroStatValue: { fontSize: 16, fontWeight: '700', color: '#FFF', marginTop: 2 },
  goalRow: { borderRadius: 12, padding: 14 },
  goalLensBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  spaceRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, gap: 10 },
  spaceDot: { width: 8, height: 8, borderRadius: 4 },
  investmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  billRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, gap: 10 },
  billDot: { width: 8, height: 8, borderRadius: 4 },
  insightCard: { borderRadius: 20, padding: 18 },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
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
});
