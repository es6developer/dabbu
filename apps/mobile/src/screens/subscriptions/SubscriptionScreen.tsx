import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
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
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        if (accessToken) setAccessToken(accessToken);
        const res = await api.get<any>('/accounts/subscriptions');
        setData(res);
      } catch {
        /* noop */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <View style={{ padding: 24, gap: 16 }}>
          <Skeleton width={160} height={14} />
          <Skeleton width="100%" height={120} borderRadius={20} />
          <Skeleton width="100%" height={80} borderRadius={16} />
          <Skeleton width="100%" height={80} borderRadius={16} />
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
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
          tintColor={colors.accent.primary}
        />
      }
    >
      <LinearGradient
        colors={['#2D1B4E', '#1A0A2E']}
        style={[s.heroSection, { paddingTop: insets.top + 8 }]}
      >
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
      </LinearGradient>

      {upcomingRenewals.length > 0 && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>
            Upcoming Renewals
          </Text>
          {upcomingRenewals.slice(0, 5).map((sub: any, i: number) => (
            <View key={sub.id || i} style={[s.subCard, { backgroundColor: colors.bg.secondary }]}>
              <View style={[s.subIcon, { backgroundColor: `${colors.status.warning}18` }]}>
                <Ionicons name="refresh" size={16} color={colors.status.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.subName, { color: colors.text.primary }]}>{sub.name}</Text>
                <Text style={[s.subMeta, { color: colors.text.tertiary }]}>
                  {sub.daysUntilDue !== null && sub.daysUntilDue <= 0
                    ? 'Due today'
                    : sub.daysUntilDue === 1
                      ? 'Due tomorrow'
                      : `Due in ${sub.daysUntilDue} days`}
                  {' · '}{sub.frequency}
                </Text>
              </View>
              <Text style={[s.subAmount, { color: colors.text.primary }]}>{fmt(sub.amount)}</Text>
            </View>
          ))}
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
                <Ionicons name="pause-circle" size={16} color={colors.text.tertiary} />
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

      {activeCount === 0 && upcomingRenewals.length === 0 && (
        <View style={s.emptyState}>
          <Ionicons name="card-outline" size={48} color={colors.text.tertiary} />
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
    paddingHorizontal: 24,
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
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4, marginBottom: 20 },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: 20,
    width: '100%',
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  heroStatValue: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  heroDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 16,
  },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    gap: 12,
  },
  subIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subName: { fontSize: 14, fontWeight: '600' },
  subMeta: { fontSize: 11, marginTop: 2 },
  subAmount: { fontSize: 15, fontWeight: '700' },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  breakdownName: { flex: 1, fontSize: 13, fontWeight: '500' },
  breakdownFreq: { fontSize: 12, marginRight: 12 },
  breakdownAnnual: { fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
});
