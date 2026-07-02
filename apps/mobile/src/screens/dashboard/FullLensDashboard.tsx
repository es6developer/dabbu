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
import { useNavigation } from '@react-navigation/native';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useLensStore } from '../../store/lensStore';
import { useSpaceStore } from '../../store/spaceStore';
import { Avatar } from '../../components/ui/Avatar';

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
  const [sharedGroups, setSharedGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
      const [dashRes, groupsRes] = await Promise.all([
        api.get<any>('/dashboard/lens', ctrl.signal),
        api.get<any>('/shared-finance/groups', ctrl.signal).catch(() => null),
      ]);
      if (!ctrl.signal.aborted) {
        const dashData = dashRes?.data || dashRes;
        setDashboard(dashData);
        if (groupsRes) {
          const list = Array.isArray(groupsRes)
            ? groupsRes
            : groupsRes?.items || groupsRes?.data || [];
          setSharedGroups(list);
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
          colors={[colors.bg.gradientStart, colors.bg.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          locations={[0, 0.3]}
          style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 24 }}
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
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text.tertiary }}>
                {greeting}
              </Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text.primary }}>
                {userName}
              </Text>
            </View>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
            <Text style={{ marginTop: 14, fontSize: 16, color: colors.text.tertiary }}>
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
          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
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
                  <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text.tertiary }}>
                    {greeting}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text.primary }}>
                      {userName}
                    </Text>
                    <View
                      style={[styles.lensBadge, { backgroundColor: colors.accent.primary + '20' }]}
                    >
                      <Text
                        style={{ fontSize: 10, fontWeight: '700', color: colors.accent.primary }}
                      >
                        EVERYTHING
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
                  onPress={() => navigation.navigate('ProfileTab', { screen: 'LensPicker' })}
                  style={[styles.iconBtn, { backgroundColor: colors.bg.card }]}
                >
                  <AntDesign name="appstore-o" size={18} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('HomeTab', { screen: 'NetWorth' })}
              activeOpacity={0.8}
            >
              <View style={[styles.heroCard, { backgroundColor: colors.accent.primary }]}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>
                  Net Worth
                </Text>
                <Text style={{ fontSize: 36, fontWeight: '800', color: '#FFF', marginTop: 2 }}>
                  {fmt(fullNetWorth)}
                </Text>
                <View style={{ flexDirection: 'row', marginTop: 20, gap: 14 }}>
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

          <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                Goal Progress
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('HomeTab', { screen: 'GoalsList' })}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent.primary }}>
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8 }}>
              {(d.goals?.length > 0 ? d.goals : []).slice(0, 5).map((g: any, i: number) => (
                <View key={g.id || i} style={[styles.goalRow, { backgroundColor: colors.bg.card }]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}
                        >
                          {g.name}
                        </Text>
                        <View
                          style={[
                            styles.goalLensBadge,
                            {
                              backgroundColor:
                                g.lens === 'PERSONAL'
                                  ? colors.brand.primary + '20'
                                  : g.lens === 'PARTNERED'
                                    ? '#F43F5E20'
                                    : g.lens === 'FAMILY'
                                      ? '#0D948820'
                                      : colors.accent.primary + '20',
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 8,
                              fontWeight: '700',
                              color:
                                g.lens === 'PERSONAL'
                                  ? colors.brand.primary
                                  : g.lens === 'PARTNERED'
                                    ? '#F43F5E'
                                    : g.lens === 'FAMILY'
                                      ? '#0D9488'
                                      : colors.accent.primary,
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
                        borderRadius: 4,
                        marginTop: 6,
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.min(g.progress || 0, 100)}%`,
                          height: 4,
                          backgroundColor:
                            g.lens === 'PERSONAL'
                              ? colors.brand.primary
                              : g.lens === 'PARTNERED'
                                ? '#F43F5E'
                                : g.lens === 'FAMILY'
                                  ? '#0D9488'
                                  : colors.accent.primary,
                          borderRadius: 4,
                        }}
                      />
                    </View>
                  </View>
                </View>
              ))}
              {(!d.goals || d.goals.length === 0) && (
                <View
                  style={[
                    styles.goalRow,
                    { backgroundColor: colors.bg.card, alignItems: 'center', paddingVertical: 28 },
                  ]}
                >
                  <AntDesign name="flag" size={24} color={colors.text.tertiary} />
                  <Text style={{ fontSize: 16, color: colors.text.tertiary, marginTop: 6 }}>
                    No goals yet
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('HomeTab', { screen: 'GoalsList' })}
                    style={{
                      marginTop: 10,
                      paddingVertical: 8,
                      paddingHorizontal: 24,
                      borderRadius: 24,
                      backgroundColor: colors.accent.primary,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>
                      Create Goal
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                Shared-finance spaces
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('SpacesTab', { screen: 'SpacesDashboard' })}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent.primary }}>
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8 }}>
              {sharedGroups.length > 0 ? (
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
                  <View
                    style={{
                      borderRadius: 30,
                      padding: 22,
                      alignItems: 'center',
                      backgroundColor: colors.bg.card,
                      flex: 1,
                    }}
                  >
                    <Text style={{ fontSize: 26, fontWeight: '800', color: colors.accent.primary }}>
                      {sharedGroups.length}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 2 }}>
                      Total
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 30,
                      padding: 22,
                      alignItems: 'center',
                      backgroundColor: colors.bg.card,
                      flex: 1,
                    }}
                  >
                    <Text style={{ fontSize: 26, fontWeight: '800', color: '#22C55E' }}>
                      {
                        sharedGroups.filter((g: any) => g.type === 'couple' || g.type === 'family')
                          .length
                      }
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 2 }}>
                      Shared
                    </Text>
                  </View>
                </View>
              ) : null}
              {sharedGroups.slice(0, 5).map((s: any, i: number) => (
                <TouchableOpacity
                  key={s.id || i}
                  onPress={() =>
                    navigation.navigate('SpacesTab', {
                      screen: 'SharedGroupDetail',
                      params: { groupId: s.id, groupName: s.name },
                    })
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderRadius: 28,
                    padding: 18,
                    gap: 10,
                    backgroundColor: colors.bg.card,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 8,
                      backgroundColor:
                        s.type === 'couple'
                          ? '#F43F5E'
                          : s.type === 'family'
                            ? '#0D9488'
                            : s.type === 'trip'
                              ? '#0D9488'
                              : colors.accent.primary,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>
                      {s.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.text.tertiary }}>
                      {s.memberCount || 0} members · {s.type}
                    </Text>
                  </View>
                  <AntDesign name="right" size={14} color={colors.text.tertiary} />
                </TouchableOpacity>
              ))}
              {sharedGroups.length === 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderRadius: 28,
                    paddingVertical: 28,
                    paddingHorizontal: 24,
                    gap: 10,
                    backgroundColor: colors.bg.card,
                    justifyContent: 'center',
                  }}
                >
                  <AntDesign name="team" size={24} color={colors.text.tertiary} />
                  <Text style={{ fontSize: 16, color: colors.text.tertiary, marginTop: 6 }}>
                    No shared spaces yet
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('SpacesTab', { screen: 'CreateSharedGroup' })
                    }
                    style={{
                      marginTop: 10,
                      paddingVertical: 8,
                      paddingHorizontal: 24,
                      borderRadius: 24,
                      backgroundColor: colors.accent.primary,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>Create</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                Investments
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('HomeTab', { screen: 'InvestmentPlanner' })}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent.primary }}>
                  See All
                </Text>
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
                      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>
                        {inv.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.text.tertiary }}>{inv.type}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                        {fmt(inv.value)}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
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
              {(!d.investments || d.investments.length === 0) && (
                <View
                  style={[
                    styles.investmentRow,
                    { backgroundColor: colors.bg.card, alignItems: 'center', paddingVertical: 28 },
                  ]}
                >
                  <AntDesign name="linechart" size={24} color={colors.text.tertiary} />
                  <Text style={{ fontSize: 16, color: colors.text.tertiary, marginTop: 6 }}>
                    No investments tracked
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('HomeTab', { screen: 'InvestmentPlanner' })}
                    style={{
                      marginTop: 10,
                      paddingVertical: 8,
                      paddingHorizontal: 24,
                      borderRadius: 24,
                      backgroundColor: colors.accent.primary,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>
                      Add Investment
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                Upcoming Bills
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('WalletTab', { screen: 'BillsList' })}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent.primary }}>
                  See All
                </Text>
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
                            ? colors.brand.primary
                            : b.lens === 'PARTNERED'
                              ? '#F43F5E'
                              : b.lens === 'FAMILY'
                                ? '#0D9488'
                                : colors.accent.primary,
                      },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>
                        {b.title}
                      </Text>
                      <View
                        style={[
                          styles.goalLensBadge,
                          {
                            backgroundColor:
                              b.lens === 'PERSONAL'
                                ? colors.brand.primary + '20'
                                : b.lens === 'PARTNERED'
                                  ? '#F43F5E20'
                                  : '#0D948820',
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 8,
                            fontWeight: '700',
                            color:
                              b.lens === 'PERSONAL'
                                ? colors.brand.primary
                                : b.lens === 'PARTNERED'
                                  ? '#F43F5E'
                                  : '#0D9488',
                          }}
                        >
                          {b.lens?.slice(0, 4)}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.text.tertiary }}>
                      Due{' '}
                      {b.dueDate
                        ? new Date(b.dueDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : 'Soon'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                    {fmt(b.amount)}
                  </Text>
                </View>
              ))}
              {(!d.bills || d.bills.length === 0) && (
                <View
                  style={[
                    styles.billRow,
                    { backgroundColor: colors.bg.card, alignItems: 'center', paddingVertical: 28 },
                  ]}
                >
                  <AntDesign name="filetext1" size={24} color={colors.text.tertiary} />
                  <Text style={{ fontSize: 16, color: colors.text.tertiary, marginTop: 6 }}>
                    No upcoming bills
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('WalletTab', { screen: 'BillsList' })}
                    style={{
                      marginTop: 10,
                      paddingVertical: 8,
                      paddingHorizontal: 24,
                      borderRadius: 24,
                      backgroundColor: colors.accent.primary,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>Add Bill</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <View style={[styles.insightCard, { backgroundColor: colors.bg.card }]}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}
              >
                <View
                  style={[styles.insightIcon, { backgroundColor: colors.accent.primary + '15' }]}
                >
                  <AntDesign name="bulb1" size={18} color={colors.accent.primary} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
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
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent.primary }}>
                  View all insights →
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ paddingHorizontal: 24, marginBottom: 20, gap: 8 }}>
            <Text
              style={{
                fontSize: 16,
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
                onPress={() => navigation.navigate('HomeTab', { screen: 'CreateFamilyWorkspace' })}
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: colors.accent.primary + '15' }]}>
                  <AntDesign name="team" size={22} color={colors.accent.primary} />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Create Space</Text>
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
                <View style={[styles.qaIcon, { backgroundColor: '#22C55E15' }]}>
                  <AntDesign name="barschart" size={22} color="#22C55E" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Export Report</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('LifeHubTab', { screen: 'InvestmentPlanner' })}
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
  lensBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: { borderRadius: 32, padding: 24 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 28, padding: 18 },
  heroStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  heroStatValue: { fontSize: 16, fontWeight: '700', color: '#FFF', marginTop: 2 },
  goalRow: { borderRadius: 28, padding: 18 },
  goalLensBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  spaceRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 28, padding: 18, gap: 10 },
  spaceDot: { width: 8, height: 8, borderRadius: 8 },
  investmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    padding: 18,
    gap: 10,
  },
  billRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 28, padding: 18, gap: 10 },
  billDot: { width: 8, height: 8, borderRadius: 8 },
  insightCard: { borderRadius: 28, padding: 22 },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 28,
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
  qaCard: { width: '48%', borderRadius: 26, padding: 22, alignItems: 'center', gap: 8 },
  qaIcon: {
    width: 44,
    height: 52,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
