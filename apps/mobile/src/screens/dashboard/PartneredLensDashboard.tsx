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

export function PartneredLensDashboard() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const activeLens = useLensStore((s) => s.activeLens);

  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPartner, setHasPartner] = useState<boolean | null>(null);
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
        setHasPartner(!!(d?.incomeCombined !== undefined || d?.sharedBalance !== undefined));
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
          colors={isDark ? ['#1A0A12', colors.bg.primary] : ['#FFE4E8', colors.bg.primary]}
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
            <ActivityIndicator size="large" color="#F43F5E" />
            <Text style={{ marginTop: 12, fontSize: 14, color: colors.text.tertiary }}>
              Loading your shared finances...
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (!hasPartner && (d as any)?.incomeCombined === undefined) {
    return (
      <View style={styles.screen}>
        <LinearGradient
          colors={isDark ? ['#1A0A12', colors.bg.primary] : ['#FFE4E8', colors.bg.primary]}
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
                  <View style={[styles.lensBadge, { backgroundColor: '#F43F5E20' }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#F43F5E' }}>
                      OUR MONEY
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
            <View style={[styles.emptyIcon, { backgroundColor: '#F43F5E15' }]}>
              <AntDesign name="heart" size={36} color="#F43F5E" />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '800',
                color: colors.text.primary,
                textAlign: 'center',
              }}
            >
              Connect your partner
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.text.tertiary,
                textAlign: 'center',
                lineHeight: 20,
              }}
            >
              Link with your partner to track shared finances, combined goals, and spending
              together.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProfileTab', { screen: 'AddPartner' })}
              style={[styles.ctaBtn, { backgroundColor: '#F43F5E' }]}
              activeOpacity={0.8}
            >
              <AntDesign name="heart" size={16} color="#FFF" />
              <Text style={styles.ctaText}>Connect with Partner</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={isDark ? ['#1A0A12', colors.bg.primary] : ['#FFE4E8', colors.bg.primary]}
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
              tintColor="#F43F5E"
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
                  <View style={[styles.lensBadge, { backgroundColor: '#F43F5E20' }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#F43F5E' }}>
                      OUR MONEY
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
            <View style={[styles.heroCard, { backgroundColor: '#F43F5E' }]}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>
                Combined Income
              </Text>
              <Text style={{ fontSize: 32, fontWeight: '800', color: '#FFF', marginTop: 2 }}>
                {fmt(d.incomeCombined || 0)}
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Combined Expenses</Text>
                  <Text style={styles.heroStatValue}>{fmt(d.expenseCombined || 0)}</Text>
                </View>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Shared Balance</Text>
                  <Text style={styles.heroStatValue}>{fmt(d.sharedBalance || 0)}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                Joint Budget
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              {(d.sharedBudget?.length > 0 ? d.sharedBudget : [])
                .slice(0, 5)
                .map((b: any, i: number) => (
                  <View key={b.id || i} style={[styles.card, { backgroundColor: colors.bg.card }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                        {b.category}
                      </Text>
                      <Text
                        style={{ fontSize: 12, fontWeight: '600', color: colors.text.secondary }}
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
                          width: `${Math.min(b.limit > 0 ? (b.spent / b.limit) * 100 : 0, 100)}%`,
                          height: 4,
                          backgroundColor: '#F43F5E',
                          borderRadius: 2,
                        }}
                      />
                    </View>
                  </View>
                ))}
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                Couple Savings Goal
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('HomeTab', { screen: 'CoupleGoals' })}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#F43F5E' }}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8 }}>
              {(d.sharedGoals?.length > 0 ? d.sharedGoals : [])
                .slice(0, 5)
                .map((g: any, i: number) => (
                  <View key={g.id || i} style={[styles.card, { backgroundColor: colors.bg.card }]}>
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
                          backgroundColor: '#F43F5E',
                          borderRadius: 2,
                        }}
                      />
                    </View>
                    <Text style={{ fontSize: 10, color: colors.text.tertiary, marginTop: 2 }}>
                      {g.progress}% complete
                    </Text>
                  </View>
                ))}
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                Upcoming Shared Bills
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              {(d.sharedBills?.length > 0 ? d.sharedBills : [])
                .slice(0, 5)
                .map((b: any, i: number) => (
                  <View
                    key={b.id || i}
                    style={[styles.billRow, { backgroundColor: colors.bg.card }]}
                  >
                    <View style={[styles.dot, { backgroundColor: '#F43F5E' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                        {b.title}
                      </Text>
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
            <View style={styles.sectionHeader}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                Spending Comparison
              </Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}
              >
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    padding: 12,
                    backgroundColor: '#F43F5E10',
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#F43F5E' }}>You</Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '800',
                      color: colors.text.primary,
                      marginTop: 2,
                    }}
                  >
                    {fmt(d.expenseCombined ? Math.round(d.expenseCombined / 2) : 0)}
                  </Text>
                </View>
                <AntDesign name="swap" size={20} color={colors.text.tertiary} />
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    padding: 12,
                    backgroundColor: '#6366F110',
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#6366F1' }}>Partner</Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '800',
                      color: colors.text.primary,
                      marginTop: 2,
                    }}
                  >
                    {fmt(d.expenseCombined ? Math.round(d.expenseCombined / 2) : 0)}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: colors.text.tertiary, textAlign: 'center' }}>
                Balanced spending this month
              </Text>
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
                    params: { type: 'shared' },
                  })
                }
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#F43F5E15' }]}>
                  <AntDesign name="addusergroup" size={22} color="#F43F5E" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Shared Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('WalletTab', {
                    screen: 'AddExpense',
                    params: { type: 'shared_income' },
                  })
                }
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#22C55E15' }]}>
                  <AntDesign name="pluscircle" size={22} color="#22C55E" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Shared Income</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('HomeTab', { screen: 'CoupleGoals' })}
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#F59E0B15' }]}>
                  <AntDesign name="flag" size={22} color="#F59E0B" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>
                  Contribute Goal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('SpacesTab', { screen: 'Settlements' })}
                style={[styles.qaCard, { backgroundColor: colors.bg.card }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIcon, { backgroundColor: '#3B82F615' }]}>
                  <AntDesign name="swap" size={22} color="#3B82F6" />
                </View>
                <Text style={[styles.qaLabel, { color: colors.text.primary }]}>Settle Balance</Text>
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
