import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';

function fmt(v: number) {
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtShort(v: number) {
  if (v >= 10000000) return '₹' + (v / 10000000).toFixed(1) + 'Cr';
  if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '₹' + (v / 1000).toFixed(1) + 'K';
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function Avatar({ name, url, size = 44, colors }: { name?: string; url?: string; size?: number; colors: any }) {
  const initials = (name || '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accent.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
      {url ? (
        <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={{ fontSize: size * 0.4, fontWeight: '700', color: colors.accent.primary }}>{initials}</Text>
      )}
    </View>
  );
}

export function CoupleSpaceScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { accessToken } = useAuth();
  const groupIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const buildData = useCallback((dashboard: any, groupId: string) => {
    const profile = dashboard?.profile || {};
    const p1 = profile.partner1 || {};
    const p2 = profile.partner2 || {};
    const expenses = Array.isArray(dashboard?.expenses) ? dashboard.expenses : [];
    const incomes = Array.isArray(dashboard?.incomes) ? dashboard.incomes : [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthlyExpenses = expenses.filter((e: any) => e.date >= monthStart);
    const monthlyIncomes = incomes.filter((i: any) => i.date >= monthStart);
    const p1MonthlySpent = monthlyExpenses
      .filter((e: any) => e.paidBy === p1.id)
      .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const p2MonthlySpent = monthlyExpenses
      .filter((e: any) => e.paidBy === p2.id)
      .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const totalMonthlyExpenses = monthlyExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const totalMonthlyIncome = monthlyIncomes.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
    return {
      user: { firstName: p1.firstName, monthlySpent: p1MonthlySpent },
      partner: { firstName: p2.firstName, monthlySpent: p2MonthlySpent },
      totalMonthlySpent: totalMonthlyExpenses,
      sharedMonthlyExpenses: totalMonthlyExpenses,
      sharedMonthlyIncome: totalMonthlyIncome,
      recentExpenses: expenses.slice(-5).reverse(),
      recentIncomes: incomes.slice(-5).reverse(),
      goalsProgress: dashboard?.goalsProgress || 0,
      goalsTarget: dashboard?.goalsTarget || 0,
      upcomingBills: Array.isArray(dashboard?.bills) ? dashboard.bills : [],
      partnerSince: dashboard?.partnerSince || null,
      groupId,
    };
  }, []);

  const [aiIntelligence, setAiIntelligence] = useState<any>(null);

  const fetchDashboard = useCallback(async (silent = false, refresh = false) => {
    if (!accessToken) return;
    setAccessToken(accessToken);
    if (refresh) setRefreshing(true); else if (!silent) setLoading(true);
    setError(null);
    try {
      let groupId = groupIdRef.current;
      if (!groupId) {
        const groups: any[] = await api.get('/shared-finance/groups', undefined, 8000);
        const coupleGroup = Array.isArray(groups)
          ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
          : null;
        if (!coupleGroup) {
          if (mountedRef.current) setData(null);
          return;
        }
        groupId = coupleGroup.id;
        groupIdRef.current = groupId;
      }
      const [dashboard, aiData] = await Promise.all([
        api.get(`/shared-finance/groups/${groupId!}/couple/dashboard`, undefined, 10000),
        api.get(`/ai/couple/intelligence?groupId=${groupId!}`).catch(() => null),
      ]);
      if (mountedRef.current) {
        setData(buildData(dashboard, groupId!));
        setAiIntelligence((aiData as any)?.data || aiData);
      }
    } catch (e: any) {
      if (mountedRef.current) setError(e?.message || 'Failed to load couple data');
    } finally {
      if (mountedRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [accessToken, buildData]);

  useSilentRefresh(useCallback((isInitial) => {
    fetchDashboard(!isInitial);
  }, [fetchDashboard]));

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <AntDesign  name="left" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Couple Space</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <AntDesign  name="hearto" size={48} color={colors.text.tertiary} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.secondary, marginTop: 12 }}>Not Connected</Text>
          <Text style={{ fontSize: 13, color: colors.text.tertiary, textAlign: 'center', marginTop: 4 }}>Connect with your partner to see shared finances</Text>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('ProfileTab', { screen: 'AddPartner' })}
            style={{ marginTop: 20, backgroundColor: colors.accent.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Connect Partner</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { user, partner, couple, totalMonthlySpent, sharedMonthlyExpenses, sharedMonthlyIncome, recentExpenses, recentIncomes, goalsProgress, goalsTarget, upcomingBills, partnerSince } = data;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.bg.gradientStart, colors.bg.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.3]}
        style={{ flex: 1 }}
      >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign  name="left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Couple Space</Text>
        <TouchableOpacity onPress={() => (navigation as any).navigate('ProfileTab', { screen: 'AddPartner' })}>
          <AntDesign  name="setting" size={22} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboard(false, true)} tintColor={colors.accent.primary} />}>
        {/* Partner Card */}
        <View style={[styles.partnerCard, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Avatar name={user?.firstName} size={52} colors={colors} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.tertiary }}>You</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>{user?.firstName || 'You'}</Text>
            </View>
            <AntDesign  name="hearto" size={20} color="#FF6B9D" />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.tertiary }}>Partner</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>{partner?.firstName || 'Partner'}</Text>
            </View>
            <Avatar name={partner?.firstName} size={52} colors={colors} />
          </View>
          {partnerSince && (
            <Text style={{ fontSize: 12, color: colors.text.tertiary, textAlign: 'center', marginTop: 10 }}>
              Together since {partnerSince}
            </Text>
          )}
        </View>

        {/* Monthly Stats */}
        <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
          <Text style={[styles.cardTitle, { color: colors.text.primary }]}>This Month</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
            <View style={[styles.statBox, { backgroundColor: colors.bg.tertiary }]}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>You Spent</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.status.error, marginTop: 2 }}>
                {fmtShort(user?.monthlySpent || 0)}
              </Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.bg.tertiary }]}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>Partner Spent</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.status.warning, marginTop: 2 }}>
                {fmtShort(partner?.monthlySpent || 0)}
              </Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.accent.primary + '10' }]}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>Total</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.accent.primary, marginTop: 2 }}>
                {fmtShort(totalMonthlySpent || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Shared Expenses & Income */}
        {(sharedMonthlyExpenses > 0 || sharedMonthlyIncome > 0) && (
          <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Shared Finance (This Month)</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
              <View style={[styles.statBox, { backgroundColor: '#DC262615' }]}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>Shared Expenses</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#DC2626', marginTop: 2 }}>
                  {fmtShort(sharedMonthlyExpenses)}
                </Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: '#16A34A15' }]}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>Shared Income</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#16A34A', marginTop: 2 }}>
                  {fmtShort(sharedMonthlyIncome)}
                </Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: '#2563EB15' }]}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>Net</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#2563EB', marginTop: 2 }}>
                  {fmtShort(sharedMonthlyIncome - sharedMonthlyExpenses)}
                </Text>
              </View>
            </View>
            {/* Recent shared transactions */}
            {recentExpenses?.length > 0 && (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border.subtle }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: 6 }}>Recent Expenses</Text>
                {recentExpenses.slice(0, 5).map((e: any) => (
                  <View key={e.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                    <Text style={{ fontSize: 13, color: colors.text.primary, flex: 1 }} numberOfLines={1}>{e.description}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#DC2626' }}>{fmt(e.amount)}</Text>
                  </View>
                ))}
              </View>
            )}
            {recentIncomes?.length > 0 && (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border.subtle }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: 6 }}>Recent Income</Text>
                {recentIncomes.slice(0, 5).map((i: any) => (
                  <View key={i.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                    <Text style={{ fontSize: 13, color: colors.text.primary, flex: 1 }} numberOfLines={1}>{i.source || i.type}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#16A34A' }}>{fmt(i.amount)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Combined Goals */}
        {goalsTarget > 0 && (
          <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Combined Goals</Text>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.bg.tertiary, marginTop: 10, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min((goalsProgress / goalsTarget) * 100, 100)}%`, height: '100%', backgroundColor: colors.status.success, borderRadius: 4 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Saved: {fmtShort(goalsProgress)}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text.primary }}>Target: {fmtShort(goalsTarget)}</Text>
            </View>
          </View>
        )}

        {/* Upcoming Bills */}
        {upcomingBills?.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Upcoming Bills</Text>
              <TouchableOpacity onPress={() => (navigation as any).navigate('Bills')}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent.primary }}>See All</Text>
              </TouchableOpacity>
            </View>
            {upcomingBills.slice(0, 3).map((bill: any) => (
              <View key={bill.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AntDesign  name="filetext1" size={16} color={colors.text.tertiary} />
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary }}>{bill.name}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.status.warning }}>{fmt(bill.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* AI Couple Intelligence */}
        {aiIntelligence && (
          <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AntDesign name="bulb1" size={18} color="#FBBF24" />
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>AI Couple Intelligence</Text>
            </View>
            {aiIntelligence.compatibilityScore != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <View style={[styles.statBox, { backgroundColor: colors.bg.tertiary, flex: 0 }]}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>Compatibility</Text>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: aiIntelligence.compatibilityScore >= 70 ? colors.status.success : colors.status.warning, marginTop: 2 }}>
                    {aiIntelligence.compatibilityScore}%
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  {aiIntelligence.sharedGoals != null && (
                    <Text style={{ fontSize: 12, color: colors.text.secondary }}>🎯 {aiIntelligence.sharedGoals} shared goals</Text>
                  )}
                  {aiIntelligence.fairnessScore != null && (
                    <Text style={{ fontSize: 12, color: colors.text.secondary }}>⚖️ Spending fairness: {aiIntelligence.fairnessScore}%</Text>
                  )}
                  {aiIntelligence.savingsRate != null && (
                    <Text style={{ fontSize: 12, color: colors.text.secondary }}>💾 Combined savings rate: {aiIntelligence.savingsRate}%</Text>
                  )}
                </View>
              </View>
            )}
            {aiIntelligence.insight && (
              <View style={{ marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: colors.bg.tertiary }}>
                <Text style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 18 }}>{aiIntelligence.insight}</Text>
              </View>
            )}
            {aiIntelligence.personalityMatch && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Personality: {aiIntelligence.personalityMatch}</Text>
              </View>
            )}
          </View>
        )}

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Quick Actions</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[
            { icon: 'pluscircleo', label: 'Add Expense', color: '#DC2626', screen: 'Couple', params: { screen: 'CoupleTransactionForm', params: { prefill: { groupId: data.groupId, type: 'wallet' as const } } } },
            { icon: 'linechart', label: 'Add Income', color: '#16A34A', screen: 'Couple', params: { screen: 'CoupleTransactionForm', params: { prefill: { groupId: data.groupId, type: 'arrowdown' as const } } } },
            { icon: 'wallet', label: 'Wallet', color: '#2563EB', screen: 'Wallet', params: { screen: 'WalletHome' } },
            { icon: 'barchart', label: 'Net Worth', color: '#7C3AED', screen: 'Dashboard', params: { screen: 'NetWorth' } },
            { icon: 'flag', label: 'Goals', color: '#F59E0B', screen: 'Couple', params: { screen: 'Goals' } },
            { icon: 'setting', label: 'Settings', color: '#14B8A6', screen: 'Couple', params: { screen: 'CoupleSettings' } },
          ].map((action) => (
            <TouchableOpacity key={action.label} activeOpacity={0.7}
              onPress={() => (navigation as any).navigate(action.screen, action.params)}
              style={{ width: '31%', alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 16, backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border.subtle }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: action.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                <AntDesign name={action.icon as any} size={20} color={action.color} />
              </View>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.secondary, textAlign: 'center' }}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  partnerCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
});
