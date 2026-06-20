import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';
import { api } from '../../services/api';

function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtDate(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TYPE_COLORS: Record<string, string> = {
  Personal: '#6366F1',
  Household: '#22C55E',
  Roommates: '#3B82F6',
  Couple: '#EC4899',
  Family: '#F59E0B',
  Business: '#8B5CF6',
  'Travel Group': '#06B6D4',
  'Shared Subscriptions': '#14B8A6',
};

const TYPE_ICONS: Record<string, React.ComponentProps<typeof AntDesign>['name']> = {
  Personal: 'user',
  Household: 'home',
  Roommates: 'team',
  Couple: 'heart',
  Family: 'team',
  Business: 'bank',
  'Travel Group': 'earth',
  'Shared Subscriptions': 'wallet',
};

export function WalletHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const [groups, setGroups] = useState<any[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [groupsRes, statsRes, txnsRes] = await Promise.all([
        api.get('/shared-finance/groups').catch(() => ({ data: [] })),
        api.get('/transactions/stats').catch(() => ({})),
        api.get('/transactions?limit=10&orderBy=date:desc').catch(() => ({ data: [] })),
      ]);
      const gr = groupsRes as any;
      const groupsList = Array.isArray(gr) ? gr : gr?.data || [];
      setGroups(groupsList);
      const stats = (statsRes as any)?.data || statsRes || {};
      setMonthlyIncome(Number(stats.monthlyIncome || stats.income || 0));
      setMonthlyExpense(Number(stats.monthlyExpense || stats.expense || 0));
      const tr = txnsRes as any;
      setRecentTxns(Array.isArray(tr) ? tr : tr?.data || []);
    } catch { } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const netMonthly = monthlyIncome - monthlyExpense;

  const renderTxnIcon = (txn: any) => {
    const isExpense = txn.type === 'expense' || txn.type === 'arrowdown';
    return (
      <View style={[s.txnIcon, { backgroundColor: isExpense ? colors.status.error + '15' : colors.status.success + '15' }]}>
        <AntDesign name={isExpense ? 'arrowdown' : 'arrowup'} size={16} color={isExpense ? colors.status.error : colors.status.success} />
      </View>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: colors.bg.primary }]}>
      <LinearGradient
        colors={isDark ? ['#1A0A2E', colors.bg.primary] : ['#F0E6FF', colors.bg.primary]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} locations={[0, 0.3]}
        style={{ flex: 1 }}
      >
        <View style={[s.header, { paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.xl }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 4, height: 24, borderRadius: 2, backgroundColor: colors.accent.primary }} />
            <Text style={[s.title, { color: colors.text.primary }]}>Wallet</Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.xl, paddingTop: 0, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Balance Card */}
          <View style={[s.balanceCard, { backgroundColor: colors.card.balance, ...shadows.md }]}>
            <Text style={[s.balanceLabel, { color: colors.text.secondary }]}>Monthly Overview</Text>
            <View style={s.monthlyRow}>
              <View style={s.monthlyItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <AntDesign name="arrowup" size={12} color={colors.status.success} />
                  <Text style={[s.monthlyLabel, { color: colors.status.success }]}>Income</Text>
                </View>
                <Text style={[s.monthlyValue, { color: colors.text.primary }]}>{fmt(monthlyIncome)}</Text>
              </View>
              <View style={s.monthlyItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <AntDesign name="arrowdown" size={12} color={colors.status.error} />
                  <Text style={[s.monthlyLabel, { color: colors.status.error }]}>Expenses</Text>
                </View>
                <Text style={[s.monthlyValue, { color: colors.text.primary }]}>{fmt(monthlyExpense)}</Text>
              </View>
              <View style={s.monthlyItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <AntDesign name="swap" size={12} color={netMonthly >= 0 ? colors.status.success : colors.status.error} />
                  <Text style={[s.monthlyLabel, { color: netMonthly >= 0 ? colors.status.success : colors.status.error }]}>Net</Text>
                </View>
                <Text style={[s.monthlyValue, { color: colors.text.primary }]}>{fmt(netMonthly)}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.status.error + '12', borderWidth: 1, borderColor: colors.status.error + '25' }]}
              onPress={() => navigation.navigate('AddExpense', { type: 'expense' })}
            >
              <View style={[s.actionIcon, { backgroundColor: colors.status.error }]}>
                <AntDesign name="arrowdown" size={18} color="#FFF" />
              </View>
              <Text style={[s.actionLabel, { color: colors.status.error }]}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.status.success + '12', borderWidth: 1, borderColor: colors.status.success + '25' }]}
              onPress={() => navigation.navigate('AddExpense', { type: 'income' })}
            >
              <View style={[s.actionIcon, { backgroundColor: colors.status.success }]}>
                <AntDesign name="arrowup" size={18} color="#FFF" />
              </View>
              <Text style={[s.actionLabel, { color: colors.status.success }]}>Income</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.accent.primary + '12', borderWidth: 1, borderColor: colors.accent.primary + '25' }]}
              onPress={() => navigation.navigate('CreateGroup')}
            >
              <View style={[s.actionIcon, { backgroundColor: colors.accent.primary }]}>
                <AntDesign name="addusergroup" size={18} color="#FFF" />
              </View>
              <Text style={[s.actionLabel, { color: colors.accent.primary }]}>Group</Text>
            </TouchableOpacity>
          </View>

          {/* Your Groups */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md, marginTop: spacing.xs }}>
            <View style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: colors.accent.primary }} />
            <Text style={[s.sectionTitle, { color: colors.text.secondary }]}>Your Groups</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => navigation.navigate('CreateGroup')}>
              <AntDesign name="pluscircleo" size={18} color={colors.accent.primary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <View key={i} style={[s.skeletonCard, { backgroundColor: colors.bg.card }]} />
            ))
          ) : groups.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <View style={[s.emptyIconBg, { backgroundColor: colors.accent.primary + '12' }]}>
                <AntDesign name="addusergroup" size={28} color={colors.accent.primary} />
              </View>
              <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No groups yet</Text>
              <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>Create a group to split expenses, track shared budgets, and manage finances together.</Text>
              <TouchableOpacity
                style={[s.createBtn, { backgroundColor: colors.accent.primary }]}
                onPress={() => navigation.navigate('CreateGroup')}
              >
                <AntDesign name="plus" size={16} color="#FFF" />
                <Text style={s.createBtnText}>Create Group</Text>
              </TouchableOpacity>
            </View>
          ) : (
            groups.map((m: any) => {
              const g = m.group || m;
              const type = g.type || 'Personal';
              const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
              const color = TYPE_COLORS[typeLabel] || '#6366F1';
              const icon = TYPE_ICONS[typeLabel] || 'team';
              const totalSpent = Number(g.totalSpent || 0);
              const totalIncome = Number(g.monthlyIncome || 0);
              const totalLeft = totalIncome - totalSpent;
              const creator = g.creator || g.createdBy || {};
              const memberCount = g._count?.members || g.members?.length || 0;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[s.groupCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('GroupDetail', { groupId: g.id, group: g })}
                >
                  <LinearGradient
                    colors={[color + '08', 'transparent']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: borderRadius['2xl'] }}
                  />
                  <View style={s.groupTop}>
                    <View style={[s.groupIcon, { backgroundColor: color + '15' }]}>
                      <AntDesign name={icon} size={18} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.groupName, { color: colors.text.primary }]} numberOfLines={1}>{g.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[s.typeBadge, { backgroundColor: color + '15' }]}>
                          <Text style={[s.typeBadgeText, { color }]}>{typeLabel}</Text>
                        </View>
                        <Text style={[s.memberCount, { color: colors.text.tertiary }]}>{memberCount} members</Text>
                      </View>
                    </View>
                    <AntDesign name="right" size={14} color={colors.text.tertiary} />
                  </View>
                  <View style={[s.divider, { backgroundColor: colors.border.subtle }]} />
                  <View style={s.groupStats}>
                    <View style={s.statItem}>
                      <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Income</Text>
                      <Text style={[s.statValue, { color: colors.status.success }]}>{fmt(totalIncome)}</Text>
                    </View>
                    <View style={s.statItem}>
                      <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Spent</Text>
                      <Text style={[s.statValue, { color: colors.status.error }]}>{fmt(totalSpent)}</Text>
                    </View>
                    <View style={s.statItem}>
                      <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Left</Text>
                      <Text style={[s.statValue, { color: totalLeft >= 0 ? colors.status.success : colors.status.error }]}>{fmt(totalLeft)}</Text>
                    </View>
                  </View>
                  <View style={s.groupMeta}>
                    <AntDesign name="calendar" size={10} color={colors.text.tertiary} />
                    <Text style={[s.metaText, { color: colors.text.tertiary }]}>Created {fmtDate(g.createdAt)}</Text>
                    {creator?.firstName ? (
                      <>
                        <Text style={{ color: colors.text.tertiary, fontSize: 10 }}>by</Text>
                        <Text style={[s.creatorText, { color: colors.text.tertiary }]}>{creator.firstName}</Text>
                      </>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* Recent Transactions */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md, marginTop: spacing.xl }}>
            <View style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: colors.accent.primary }} />
            <Text style={[s.sectionTitle, { color: colors.text.secondary }]}>Recent Transactions</Text>
          </View>

          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <View key={i} style={[s.skeletonCard, { backgroundColor: colors.bg.card }]} />
            ))
          ) : recentTxns.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>No transactions yet. Add your first expense or income.</Text>
            </View>
          ) : (
            recentTxns.map((txn: any) => {
              const isExpense = txn.type === 'expense' || txn.type === 'arrowdown';
              const catName = txn.category?.name || (typeof txn.category === 'string' ? txn.category : '');
              return (
                <TouchableOpacity
                  key={txn.id}
                  style={[s.txnCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('TransactionDetail', { transactionId: txn.id })}
                >
                  <View style={s.txnRow}>
                    {renderTxnIcon(txn)}
                    <View style={s.txnInfo}>
                      <Text style={[s.txnDesc, { color: colors.text.primary }]} numberOfLines={1}>
                        {txn.description || txn.title || txn.merchant || catName || 'Transaction'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        {catName ? (
                          <View style={[s.catBadge, { backgroundColor: isExpense ? colors.status.error + '10' : colors.status.success + '10' }]}>
                            <Text style={[s.catBadgeText, { color: isExpense ? colors.status.error : colors.status.success }]}>{catName}</Text>
                          </View>
                        ) : null}
                        <Text style={[s.txnDate, { color: colors.text.tertiary }]}>
                          {fmtDate(txn.date || txn.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[s.txnAmount, { color: isExpense ? colors.status.error : colors.status.success }]}>
                      {isExpense ? '-' : '+'}{fmt(txn.amount || 0)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  balanceCard: {
    borderRadius: borderRadius['3xl'], padding: spacing.xl, marginBottom: spacing['2xl'],
  },
  balanceLabel: { fontSize: 13, fontWeight: '500', marginBottom: spacing.md },
  monthlyRow: { flexDirection: 'row', gap: spacing.lg },
  monthlyItem: { flex: 1 },
  monthlyLabel: { fontSize: 11, fontWeight: '700' },
  monthlyValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing['2xl'] },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, borderRadius: borderRadius['2xl'], gap: spacing.xs,
  },
  actionIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  skeletonCard: { height: 60, borderRadius: borderRadius.xl, marginBottom: spacing.sm },
  emptyCard: {
    borderRadius: borderRadius['2xl'], borderWidth: 1, padding: spacing['2xl'],
    alignItems: 'center', gap: spacing.sm,
  },
  emptyIconBg: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: spacing.xs },
  emptyDesc: { fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 18, paddingHorizontal: spacing.md },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: spacing.sm,
  },
  createBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  groupCard: {
    borderRadius: borderRadius['2xl'], borderWidth: 1, padding: spacing.lg,
    marginBottom: spacing.sm, overflow: 'hidden',
  },
  groupTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  groupName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  memberCount: { fontSize: 11, fontWeight: '500' },
  divider: { height: 1, marginVertical: spacing.sm },
  groupStats: { flexDirection: 'row', gap: spacing.xs },
  statItem: { flex: 1, gap: 2 },
  statLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  statValue: { fontSize: 14, fontWeight: '700' },
  groupMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  metaText: { fontSize: 10, fontWeight: '500' },
  creatorText: { fontSize: 10, fontWeight: '600' },
  txnCard: {
    borderRadius: borderRadius['2xl'], borderWidth: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  txnIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 14, fontWeight: '600' },
  catBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  catBadgeText: { fontSize: 9, fontWeight: '700' },
  txnDate: { fontSize: 11, fontWeight: '500' },
  txnAmount: { fontSize: 15, fontWeight: '700' },
});
