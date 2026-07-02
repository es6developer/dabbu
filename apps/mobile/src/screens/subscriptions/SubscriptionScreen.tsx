import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken, warmupBackend } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

function fmt(v: number) {
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { colors } = useTheme();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(
    async (silent = false, refresh = false) => {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      warmupBackend().catch(() => {});
      if (refresh) {
        setRefreshing(true);
      } else if (!silent) {
        setLoading(true);
      }
      const settleTimer = setTimeout(() => setLoading(false), 3000);
      try {
        const res = await api.get<any>('/premium/billing');
        setData(res);
      } catch {
        /* noop */
      } finally {
        clearTimeout(settleTimer);
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken],
  );

  useSilentRefresh(
    useCallback((isInitial) => {
      loadData(!isInitial);
    }, [loadData]),
  );

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <View style={{ padding: 28, gap: 20 }}>
          <Skeleton width={160} height={14} />
          <Skeleton width="100%" height={120} borderRadius={28} />
          <Skeleton width="100%" height={80} borderRadius={24} />
          <Skeleton width="100%" height={80} borderRadius={24} />
        </View>
      </View>
    );
  }

  const monthlyTotal = data?.monthlyTotal || 0;
  const yearlyTotal = data?.yearlyTotal || 0;
  const activeCount = data?.activeCount || 0;
  const upcomingRenewals = data?.upcomingRenewals || [];
  const inactiveSubs = data?.inactiveSubscriptions || [];
  const annualBreakdown = data?.annualBreakdown || [];

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: colors.bg.primary }]}
      contentContainerStyle={{ paddingBottom: 44 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadData(false, true)}
          tintColor={colors.accent.primary}
        />
      }
    >
      <View style={[s.heroSection, { paddingTop: insets.top + 8 }]}>
        <Text style={s.heroEyebrow}>Subscriptions</Text>
        <Text style={s.heroTitle}>Subscription Intelligence</Text>
        <Text style={s.heroSub}>
          {activeCount} active subscription{activeCount !== 1 ? 's' : ''}
        </Text>

        <View style={s.heroStatsRow}>
          <View style={s.heroStat}>
            <Text style={s.heroStatLabel}>Monthly</Text>
            <Text style={s.heroStatValue}>{fmt(monthlyTotal)}</Text>
          </View>
          <View style={s.heroDivider} />
          <View style={s.heroStat}>
            <Text style={s.heroStatLabel}>Yearly</Text>
            <Text style={s.heroStatValue}>{fmt(yearlyTotal)}</Text>
          </View>
        </View>
      </View>

      {upcomingRenewals.length > 0 && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Upcoming Renewals</Text>
          {upcomingRenewals.slice(0, 5).map((sub: any, i: number) => (
            <View key={sub.id || i} style={[s.subCard, { backgroundColor: colors.bg.secondary }]}>
              <View style={[s.subIcon, { backgroundColor: `${colors.status.warning}18` }]}>
                <AntDesign  name="reload1" size={16} color={colors.status.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.subName, { color: colors.text.primary }]}>{sub.name}</Text>
                <Text style={[s.subMeta, { color: colors.text.tertiary }]}>
                  {sub.daysUntilDue !== null && sub.daysUntilDue <= 0
                    ? 'Due today'
                    : sub.daysUntilDue === 1
                      ? 'Due tomorrow'
                      : `Due in ${sub.daysUntilDue} days`}
                  {' · '}
                  {sub.frequency}
                </Text>
              </View>
              <Text style={[s.subAmount, { color: colors.text.primary }]}>{fmt(sub.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Potential Savings */}
      {monthlyTotal > 0 && (
        <View style={[s.savingsCard, { backgroundColor: colors.bg.secondary }]}>
          <View style={s.savingsHeader}>
            <AntDesign  name="wallet" size={20} color="#00E676" />
            <Text style={s.savingsTitle}>Potential Savings</Text>
          </View>
          <Text style={s.savingsAmount}>
            ₹{(monthlyTotal * 0.15).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={s.savingsDesc}>
            15% of your monthly subscription spend could be saved by reviewing unused services
          </Text>
          <View style={s.savingsRow}>
            <View style={s.savingsStat}>
              <Text style={s.savingsStatLabel}>Monthly</Text>
              <Text style={[s.savingsStatValue, { color: colors.text.primary }]}>
                {fmt(monthlyTotal)}
              </Text>
            </View>
            <View style={s.savingsStat}>
              <Text style={s.savingsStatLabel}>Yearly</Text>
              <Text style={[s.savingsStatValue, { color: colors.text.primary }]}>
                {fmt(yearlyTotal)}
              </Text>
            </View>
            <View style={s.savingsStat}>
              <Text style={s.savingsStatLabel}>Active</Text>
              <Text style={[s.savingsStatValue, { color: '#00E676' }]}>{activeCount}</Text>
            </View>
          </View>
        </View>
      )}

      {activeCount > 0 && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>
            Annual Spend Breakdown
          </Text>
          {annualBreakdown.slice(0, 10).map((item: any, i: number) => (
            <View key={i} style={[s.breakdownRow, { borderBottomColor: colors.border.subtle }]}>
              <Text style={[s.breakdownName, { color: colors.text.primary }]}>{item.name}</Text>
              <Text style={[s.breakdownFreq, { color: colors.text.tertiary }]}>
                {fmt(item.amount)}/{item.frequency}
              </Text>
              <Text style={[s.breakdownAnnual, { color: colors.accent.primary }]}>
                {fmt(item.annualCost)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {inactiveSubs.length > 0 && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>
            Inactive Subscriptions
          </Text>
          {inactiveSubs.map((sub: any, i: number) => (
            <View key={sub.id || i} style={[s.subCard, { backgroundColor: colors.bg.secondary }]}>
              <View style={[s.subIcon, { backgroundColor: `${colors.text.tertiary}18` }]}>
                <AntDesign  name="pausecircleo" size={16} color={colors.text.tertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.subName, { color: colors.text.secondary }]}>{sub.name}</Text>
                <Text style={[s.subMeta, { color: colors.text.tertiary }]}>Inactive</Text>
              </View>
              <Text style={[s.subAmount, { color: colors.text.tertiary }]}>{fmt(sub.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Common Subscriptions */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Common Subscriptions</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { name: 'Netflix', icon: 'tablet1' },
            { name: 'Amazon Prime', icon: 'shoppingcart' },
            { name: 'Spotify', icon: 'notification' },
            { name: 'Hotstar', icon: 'playcircleo' },
            { name: 'YouTube Premium', icon: 'youtube' },
            { name: 'ChatGPT', icon: 'message1' },
            { name: 'Google One', icon: 'cloud' },
            { name: 'iCloud', icon: 'cloud' },
            { name: 'Zomato Pro', icon: 'gift' },
            { name: 'Swiggy One', icon: 'car' },
          ].map((item) => (
            <TouchableOpacity
              key={item.name}
              style={[
                s.templateChip,
                { backgroundColor: colors.bg.tertiary },
              ]}
              activeOpacity={0.7}
            >
              <AntDesign name={item.icon as any} size={14} color={colors.accent.primary} />
              <Text style={[s.templateChipText, { color: colors.text.secondary }]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {activeCount === 0 && upcomingRenewals.length === 0 && (
        <View style={s.emptyState}>
          <AntDesign  name="creditcard" size={48} color={colors.text.tertiary} />
          <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No Subscriptions</Text>
          <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
            Recurring transactions and subscription reminders will appear here.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  heroSection: {
    paddingHorizontal: 28,
    paddingBottom: 28,
    alignItems: 'center',
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', textAlign: 'center' },
  heroSub: { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginTop: 4, marginBottom: 24 },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 26,
    padding: 24,
    width: '100%',
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  heroStatValue: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  heroDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 20,
  },
  section: { paddingHorizontal: 24, marginTop: 28 },
  sectionTitle: { fontSize: 19, fontWeight: '700', marginBottom: 14 },
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 30,
    marginBottom: spacing.lg,
    gap: 14,
  },
  subIcon: {
    width: 36,
    height: 36,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subName: { fontSize: 16, fontWeight: '600' },
  subMeta: { fontSize: 12, marginTop: 2 },
  subAmount: { fontSize: 16, fontWeight: '700' },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  breakdownName: { flex: 1, fontSize: 16, fontWeight: '500' },
  breakdownFreq: { fontSize: 12, marginRight: 14 },
  breakdownAnnual: { fontSize: 16, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 14 },
  emptyTitle: { fontSize: 19, fontWeight: '700' },
  emptyDesc: { fontSize: 16, textAlign: 'center', paddingHorizontal: 44 },
  savingsCard: {
    marginHorizontal: 24,
    marginTop: 28,
    borderRadius: 28,
    padding: 24,
  },
  savingsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  savingsTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  savingsAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#00E676',
    letterSpacing: -1,
    marginBottom: 6,
  },
  savingsDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 16, marginBottom: 20 },
  savingsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 28,
    padding: 18,
  },
  savingsStat: { flex: 1, alignItems: 'center' },
  savingsStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 2,
  },
  savingsStatValue: { fontSize: 19, fontWeight: '800' },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 28,
  },
  templateChipText: { fontSize: 12, fontWeight: '600' },
});
