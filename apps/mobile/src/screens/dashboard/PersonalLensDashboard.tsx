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
  const { user } = useAuth();
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
  const income = d.income || 0;
  const expense = d.expense || 0;
  const savings = d.savings || 0;
  const netWorth = d.netWorth?.total || 0;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
        <LinearGradient
          colors={isDark ? ['#1A0A2E', colors.bg.primary] : ['#F0E6FF', colors.bg.primary]}
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
        colors={isDark ? ['#1A0A2E', colors.bg.primary] : ['#F0E6FF', colors.bg.primary]}
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
              tintColor={colors.brand.primary}
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
                  <View
                    style={[styles.lensBadge, { backgroundColor: colors.brand.primary + '20' }]}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.brand.primary }}>
                      MY MONEY
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
            <View style={[styles.balanceCard, { backgroundColor: '#7C3AED' }]}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>
                Monthly Balance
              </Text>
              <Text style={{ fontSize: 32, fontWeight: '800', color: '#FFF', marginTop: 4 }}>
                {fmt(income - expense)}
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Income</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFF', marginTop: 2 }}>
                    {fmt(income)}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Expense</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFF', marginTop: 2 }}>
                    {fmt(expense)}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Savings</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFF', marginTop: 2 }}>
                    {fmt(savings)}
                  </Text>
                </View>
              </View>
              {income > 0 && (
                <View
                  style={{
                    marginTop: 12,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                      Savings Rate
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFF' }}>
                      {savingsRate}%
                    </Text>
                  </View>
                  <View
                    style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}
                  >
                    <View
                      style={{
                        width: `${Math.min(savingsRate, 100)}%`,
                        height: 4,
                        backgroundColor: '#FFF',
                        borderRadius: 2,
                      }}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: colors.text.primary,
                marginBottom: 10,
              }}
            >
              Account Balances
            </Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.bg.card }]}>
              {(d.accountBalances?.length > 0 ? d.accountBalances : []).map(
                (acct: any, i: number) => (
                  <TouchableOpacity
                    key={acct.id || i}
                    activeOpacity={0.7}
                    style={[
                      styles.row,
                      i < (d.accountBalances?.length || 0) - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border.subtle,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>
                        {acct.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.text.tertiary }}>
                        {acct.institution || acct.type}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '700',
                        color: acct.balance >= 0 ? colors.text.primary : '#EF4444',
                      }}
                    >
                      {fmt(acct.balance)}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
              {(!d.accountBalances || d.accountBalances.length === 0) && (
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.text.tertiary,
                    textAlign: 'center',
                    paddingVertical: 20,
                  }}
                >
                  No accounts linked yet
                </Text>
              )}
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                Budget Progress
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('HomeTab', { screen: 'Budgets' })}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brand.primary }}>
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8 }}>
              {(d.budgets?.length > 0 ? d.budgets : []).slice(0, 5).map((b: any, i: number) => (
                <View
                  key={b.id || i}
                  style={[styles.budgetRow, { backgroundColor: colors.bg.card }]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                        {b.category}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: b.progress > 80 ? '#EF4444' : colors.text.secondary,
                        }}
                      >
                        {fmt(b.spent)} / {fmt(b.limit)}
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
                          width: `${Math.min(b.progress || 0, 100)}%`,
                          height: 4,
                          backgroundColor:
                            b.progress > 80 ? '#EF4444' : b.progress > 60 ? '#F59E0B' : '#22C55E',
                          borderRadius: 2,
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
                </View>
              )}
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
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brand.primary }}>
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8 }}>
              {(d.bills?.length > 0 ? d.bills : []).slice(0, 5).map((b: any, i: number) => (
                <View key={b.id || i} style={[styles.billRow, { backgroundColor: colors.bg.card }]}>
                  <View
                    style={[styles.billDot, { backgroundColor: b.paid ? '#22C55E' : '#F59E0B' }]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                      {b.title}
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
              {(!d.bills || d.bills.length === 0) && (
                <View style={[styles.emptyCard, { backgroundColor: colors.bg.card }]}>
                  <AntDesign name="filetext1" size={24} color={colors.text.tertiary} />
                  <Text style={{ fontSize: 13, color: colors.text.tertiary, marginTop: 6 }}>
                    No upcoming bills
                  </Text>
                </View>
              )}
            </View>
          </View>

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
              {(d.goals?.length > 0 ? d.goals : []).slice(0, 5).map((g: any, i: number) => (
                <View key={g.id || i} style={[styles.goalRow, { backgroundColor: colors.bg.card }]}>
                  <View style={{ flex: 1 }}>
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
                            g.progress >= 100
                              ? '#22C55E'
                              : g.progress >= 50
                                ? '#F59E0B'
                                : '#7C3AED',
                          borderRadius: 2,
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
                </View>
              ))}
              {(!d.goals || d.goals.length === 0) && (
                <View style={[styles.emptyCard, { backgroundColor: colors.bg.card }]}>
                  <AntDesign name="flag" size={24} color={colors.text.tertiary} />
                  <Text style={{ fontSize: 13, color: colors.text.tertiary, marginTop: 6 }}>
                    No goals yet
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('HomeTab', { screen: 'NetWorth' })}
              activeOpacity={0.8}
            >
              <View style={[styles.netWorthCard, { backgroundColor: colors.bg.card }]}>
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
                  {fmt(netWorth)}
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
                onPress={() => navigation.navigate('HomeTab', { screen: 'Budget' })}
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#3B82F615' }]}>
                  <AntDesign name="wallet" size={22} color="#3B82F6" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Create Budget</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('HomeTab', { screen: 'BillsList' })}
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#7C3AED15' }]}>
                  <AntDesign name="filetext1" size={22} color="#7C3AED" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Pay Bill</Text>
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
  balanceCard: { borderRadius: 24, padding: 20 },
  sectionCard: { borderRadius: 16, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  budgetRow: { borderRadius: 12, padding: 14 },
  billRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, gap: 10 },
  billDot: { width: 8, height: 8, borderRadius: 4 },
  goalRow: { borderRadius: 12, padding: 14 },
  netWorthCard: { borderRadius: 20, padding: 18 },
  emptyCard: { borderRadius: 12, padding: 24, alignItems: 'center' },
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
