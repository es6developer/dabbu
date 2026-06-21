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

function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
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

export function FamilyLensDashboard() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const activeLens = useLensStore((s) => s.activeLens);

  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasFamily, setHasFamily] = useState<boolean | null>(null);
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
      const res = await api.get<any>('/dashboard/lens', ctrl.signal);
      const data = res?.data || res;
      if (!ctrl.signal.aborted) {
        setDashboard(data);
        const d = data?.data || data;
        setHasFamily(!!(d?.familyIncome !== undefined || d?.householdIncome !== undefined));
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
    useCallback((isInitial) => {
      loadData(!isInitial);
    }, [loadData]),
  );

  const userName = user?.firstName || 'User';
  const greeting = getGreeting();
  const d = dashboard?.data || dashboard || {};

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
        <LinearGradient
          colors={isDark ? ['#0A1A12', colors.bg.primary] : ['#D1FAE5', colors.bg.primary]}
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
            <ActivityIndicator size="large" color="#059669" />
            <Text style={{ marginTop: 12, fontSize: 14, color: colors.text.tertiary }}>
              Loading household finances...
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (!hasFamily && (d as any)?.familyIncome === undefined) {
    return (
      <View style={styles.screen}>
        <LinearGradient
          colors={isDark ? ['#0A1A12', colors.bg.primary] : ['#D1FAE5', colors.bg.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          locations={[0, 0.3]}
          style={{ flex: 1 }}
        >
          <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
            <View style={styles.headerRow}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}>
                  {greeting}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text.primary }}>
                    {userName}
                  </Text>
                  <View style={[styles.lensBadge, { backgroundColor: '#05966920' }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669' }}>
                      HOUSEHOLD
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
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 32,
              gap: 12,
            }}
          >
            <View style={[styles.emptyIcon, { backgroundColor: '#05966915' }]}>
              <AntDesign name="team" size={36} color="#059669" />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '800',
                color: colors.text.primary,
                textAlign: 'center',
              }}
            >
              Create your family workspace
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.text.tertiary,
                textAlign: 'center',
                lineHeight: 20,
              }}
            >
              Set up a family workspace to manage household expenses, goals, bills, and allowances
              together.
            </Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('HomeTab', {
                  screen: 'CreateSpace',
                  params: { type: 'FAMILY' },
                })
              }
              style={[styles.ctaBtn, { backgroundColor: '#059669' }]}
              activeOpacity={0.8}
            >
              <AntDesign name="team" size={16} color="#FFF" />
              <Text style={styles.ctaText}>Create Family Workspace</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={isDark ? ['#0A1A12', colors.bg.primary] : ['#D1FAE5', colors.bg.primary]}
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
              tintColor="#059669"
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
                  <View style={[styles.lensBadge, { backgroundColor: '#05966920' }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669' }}>
                      HOUSEHOLD
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
            <View style={[styles.heroCard, { backgroundColor: '#059669' }]}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>
                Household Income
              </Text>
              <Text style={{ fontSize: 32, fontWeight: '800', color: '#FFF', marginTop: 2 }}>
                {fmt(d.familyIncome || 0)}
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Household Expenses</Text>
                  <Text style={styles.heroStatValue}>{fmt(d.familyExpense || 0)}</Text>
                </View>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Net Worth</Text>
                  <Text style={styles.heroStatValue}>{fmt(d.familyNetWorth?.total || 0)}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                Utility Bills
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('WalletTab', { screen: 'BillsList' })}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669' }}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8 }}>
              {(d.utilityBills?.length > 0 ? d.utilityBills : d.familyBills || [])
                .slice(0, 5)
                .map((b: any, i: number) => (
                  <View
                    key={b.id || i}
                    style={[styles.billRow, { backgroundColor: colors.bg.card }]}
                  >
                    <View
                      style={[styles.dot, { backgroundColor: b.paid ? '#22C55E' : '#059669' }]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                        {b.title}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.text.tertiary }}>
                        {b.category || 'Utility'} · Due{' '}
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
              {(!d.utilityBills || d.utilityBills.length === 0) && (!d.familyBills || d.familyBills.length === 0) && (
                <View style={[styles.card, { backgroundColor: colors.bg.card, alignItems: 'center', paddingVertical: 24 }]}>
                  <AntDesign name="filetext1" size={24} color={colors.text.tertiary} />
                  <Text style={{ fontSize: 13, color: colors.text.tertiary, marginTop: 6 }}>
                    No utility bills yet
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('WalletTab', { screen: 'BillsList' })}
                    style={{ marginTop: 10, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#059669' }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>
                      Add Bill
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                Family Budget
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              {(d.familyBudget?.length > 0 ? d.familyBudget : [])
                .slice(0, 5)
                .map((b: any, i: number) => (
                  <View key={b.id || i} style={[styles.card, { backgroundColor: colors.bg.card }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                        {b.category}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.text.secondary }}>
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
                          width: `${Math.min(b.limit > 0 ? (b.spent / b.limit) * 100 : 0, 100)}%`,
                          height: 4,
                          backgroundColor: '#059669',
                          borderRadius: 2,
                        }}
                      />
                    </View>
                  </View>
                ))}
              {(!d.familyBudget || d.familyBudget.length === 0) && (
                <View style={[styles.card, { backgroundColor: colors.bg.card, alignItems: 'center', paddingVertical: 24 }]}>
                  <AntDesign name="wallet" size={24} color={colors.text.tertiary} />
                  <Text style={{ fontSize: 13, color: colors.text.tertiary, marginTop: 6 }}>
                    No family budget set
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('HomeTab', { screen: 'CoupleBudgets' })}
                    style={{ marginTop: 10, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#059669' }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>
                      Create Budget
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                Family Savings Goal
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('HomeTab', { screen: 'GoalsList' })}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669' }}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8 }}>
              {(d.familyGoals?.length > 0 ? d.familyGoals : [])
                .slice(0, 5)
                .map((g: any, i: number) => (
                  <View key={g.id || i} style={[styles.card, { backgroundColor: colors.bg.card }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                        {g.name}
                      </Text>
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
                          backgroundColor: g.progress >= 100 ? '#22C55E' : '#059669',
                          borderRadius: 2,
                        }}
                      />
                    </View>
                    <Text style={{ fontSize: 10, color: colors.text.tertiary, marginTop: 2 }}>
                      {g.progress}% complete
                    </Text>
                  </View>
                ))}
              {(!d.familyGoals || d.familyGoals.length === 0) && (
                <View style={[styles.card, { backgroundColor: colors.bg.card, alignItems: 'center', paddingVertical: 24 }]}>
                  <AntDesign name="flag" size={24} color={colors.text.tertiary} />
                  <Text style={{ fontSize: 13, color: colors.text.tertiary, marginTop: 6 }}>
                    No family goals yet
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('HomeTab', { screen: 'GoalsList' })}
                    style={{ marginTop: 10, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#059669' }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>
                      Create Goal
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                Family Reminders
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              {(d.reminders?.length > 0 ? d.reminders : []).slice(0, 5).map((r: any, i: number) => (
                <View
                  key={r.id || i}
                  style={[styles.reminderRow, { backgroundColor: colors.bg.card }]}
                >
                  <AntDesign
                    name={r.completed ? 'checkcircle' : 'clockcircleo'}
                    size={18}
                    color={r.completed ? '#22C55E' : '#F59E0B'}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                      {r.title}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.text.tertiary }}>
                      Due{' '}
                      {r.dueDate
                        ? new Date(r.dueDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : 'Soon'}
                    </Text>
                  </View>
                </View>
              ))}
              {(!d.reminders || d.reminders.length === 0) && (
                <View style={[styles.card, { backgroundColor: colors.bg.card, alignItems: 'center', paddingVertical: 24 }]}>
                  <AntDesign name="bells" size={24} color={colors.text.tertiary} />
                  <Text style={{ fontSize: 13, color: colors.text.tertiary, marginTop: 6 }}>
                    No reminders
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('SpacesTab', { screen: 'SpacesDashboard' })}
                    style={{ marginTop: 10, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#059669' }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>
                      Add Reminder
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
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
                onPress={() =>
                  navigation.navigate('WalletTab', {
                    screen: 'AddExpense',
                    params: { type: 'family' },
                  })
                }
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#05966915' }]}>
                  <AntDesign name="minuscircle" size={22} color="#059669" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>
                  Household Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('WalletTab', { screen: 'AddBill' })}
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#F59E0B15' }]}>
                  <AntDesign name="filetext1" size={22} color="#F59E0B" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Add Bill</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('HomeTab', { screen: 'GoalsList' })}
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#3B82F615' }]}>
                  <AntDesign name="flag" size={22} color="#3B82F6" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Add Goal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('SpacesTab', { screen: 'SpacesDashboard' })}
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#8B5CF615' }]}>
                  <AntDesign name="gift" size={22} color="#8B5CF6" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Allowance</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('SpacesTab', { screen: 'SpacesDashboard' })}
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#22C55E15' }]}>
                  <AntDesign name="bells" size={22} color="#22C55E" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Reminder</Text>
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
  heroStatValue: { fontSize: 18, fontWeight: '700', color: '#FFF', marginTop: 2 },
  card: { borderRadius: 12, padding: 14 },
  billRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, gap: 10 },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    marginTop: 8,
  },
  ctaText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
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
