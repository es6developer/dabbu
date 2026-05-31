import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { Card } from '../../components/ui/Card';
import { safeData } from '../../utils/shared-finance';

export function SharedSubscriptionsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { groupId } = route.params || {};
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadData();
  }, [accessToken, groupId]);

  async function loadData() {
    try {
      const [subRes, upcRes] = await Promise.all([
        api.get<any>(`/shared-finance/groups/${groupId}/subscriptions`),
        api.get<any>('/shared-finance/subscriptions/reminders/upcoming'),
      ]);
      setSubscriptions(Array.isArray(safeData(subRes, [])) ? safeData(subRes, []) : []);
      setUpcoming(Array.isArray(safeData(upcRes, [])) ? safeData(upcRes, []) : []);
    } catch (e) {
      console.error('SharedSubscriptions load error:', e);
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const totalMonthly = subscriptions.reduce((s, sub) => {
    if (!sub.active) {
      return s;
    }
    const amount = Number(sub.amount) || 0;
    if (sub.billingCycle === 'yearly') {
      return s + amount / 12;
    }
    if (sub.billingCycle === 'quarterly') {
      return s + amount / 3;
    }
    return s + amount;
  }, 0);

  const formatCurrency = (val: number) => '₹' + val.toLocaleString('en-IN');

  function getDaysUntil(dateStr: string): number {
    if (!dateStr) {
      return 0;
    }
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
  }

  function formatBillingCycle(cycle: string) {
    if (cycle === 'yearly') {
      return '/yr';
    }
    if (cycle === 'quarterly') {
      return '/qtr';
    }
    return '/mo';
  }

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={subscriptions}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <LinearGradient
              colors={['#1a1a2e', colors.bg.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.header}
            >
              <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
                Shared Subscriptions
              </Text>
              <Text style={[styles.headerSub, { color: colors.text.tertiary }]}>
                {subscriptions.filter((s) => s.active).length} active ·{' '}
                {formatCurrency(Math.round(totalMonthly))}/mo
              </Text>
            </LinearGradient>

            {upcoming.length > 0 && (
              <Card variant="glass" style={styles.upcomingCard} padding="md">
                <Text style={[styles.upcomingTitle, { color: colors.text.primary }]}>
                  Upcoming Renewals
                </Text>
                {upcoming.map((item: any, i: number) => (
                  <View
                    key={item.id || i}
                    style={[styles.upcomingRow, { borderBottomColor: colors.border.subtle }]}
                  >
                    <Ionicons name="alarm-outline" size={16} color={colors.status.warning} />
                    <Text style={[styles.upcomingName, { color: colors.text.secondary }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.upcomingDate, { color: colors.status.warning }]}>
                      {getDaysUntil(item.nextBillingDate)} days
                    </Text>
                  </View>
                ))}
              </Card>
            )}
          </>
        }
        renderItem={({ item }) => {
          const daysUntil = getDaysUntil(item.nextBillingDate);
          return (
            <Card variant="glass" style={styles.subCard} padding="lg">
              <View style={styles.subHeader}>
                <View
                  style={[styles.subIconWrap, { backgroundColor: colors.accent.primary + '15' }]}
                >
                  <Ionicons name="cloud-outline" size={22} color={colors.accent.primary} />
                </View>
                <View style={styles.subInfo}>
                  <Text style={[styles.subName, { color: colors.text.primary }]}>
                    {item.name || 'Subscription'}
                  </Text>
                  <Text style={[styles.subCycle, { color: colors.text.tertiary }]}>
                    {formatCurrency(Number(item.amount))}
                    {formatBillingCycle(item.billingCycle)}
                  </Text>
                </View>
                <Switch
                  value={item.active}
                  onValueChange={() => {}}
                  trackColor={{ false: colors.border.default, true: colors.accent.primary + '60' }}
                  thumbColor={item.active ? colors.accent.primary : colors.text.tertiary}
                />
              </View>
              <View style={[styles.subMeta, { borderTopColor: colors.border.subtle }]}>
                <View style={styles.subMetaRow}>
                  <Ionicons name="person-outline" size={13} color={colors.text.tertiary} />
                  <Text style={[styles.subMetaText, { color: colors.text.tertiary }]}>
                    Paid by {item.paidBy?.name || 'Unknown'} · {item.memberCount || 1} member
                    {(item.memberCount || 1) > 1 ? 's' : ''}
                  </Text>
                </View>
                {item.nextBillingDate && (
                  <View style={styles.subMetaRow}>
                    <Ionicons name="calendar-outline" size={13} color={colors.text.tertiary} />
                    <Text style={[styles.subMetaText, { color: colors.text.tertiary }]}>
                      Next:{' '}
                      {new Date(item.nextBillingDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {daysUntil > 0 && ` (${daysUntil}d)`}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.accent.primary + '10' }]}>
              <Ionicons name="newspaper-outline" size={44} color={colors.accent.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              No subscriptions
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              Share subscriptions with your group
            </Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.accent.primary, bottom: insets.bottom + 100 },
        ]}
        onPress={() => navigation.navigate('CreateSharedSubscription', { groupId })}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 120 },
  header: { padding: 24, paddingTop: 20 },
  headerTitle: { fontSize: 26, fontWeight: '700', marginBottom: 4 },
  headerSub: { fontSize: 14, fontWeight: '500' },
  upcomingCard: { marginHorizontal: 16, marginBottom: 16 },
  upcomingTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  upcomingName: { flex: 1, fontSize: 13, fontWeight: '500' },
  upcomingDate: { fontSize: 12, fontWeight: '600' },
  subCard: { marginHorizontal: 16, marginBottom: 12 },
  subHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subInfo: { flex: 1 },
  subName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  subCycle: { fontSize: 12, fontWeight: '500' },
  subMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexWrap: 'wrap',
    gap: 6,
  },
  subMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subMetaText: { fontSize: 11, fontWeight: '500' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#f7892c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
});
