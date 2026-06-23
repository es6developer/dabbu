import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';
import { useLensChange } from '../../hooks/useLensChange';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';

import { alertService } from '../../components/ui';
function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtDate(d: string) {
  if (!d) {
    return '';
  }
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const ICON_COLORS: Record<string, string> = {
  users: '#6366F1',
  home: '#22C55E',
  heart: '#EC4899',
  team: '#3B82F6',
  bank: '#8B5CF6',
  wallet: '#14B8A6',
  car: '#F59E0B',
  earth: '#06B6D4',
  book: '#3B82F6',
  shoppingcart: '#F97316',
};

const EXPENSE_ICONS: Record<string, React.ComponentProps<typeof AntDesign>['name']> = {
  'Food & Dining': 'rest',
  Groceries: 'shoppingcart',
  Transport: 'car',
  Shopping: 'tags',
  'Bills & Utilities': 'filetext1',
  Entertainment: 'playcircleo',
  'Health & Fitness': 'hearto',
  Education: 'book',
  Travel: 'earth',
  Rent: 'home',
  Insurance: 'Safety',
  Other: 'ellipsis1',
};

export function GroupDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const groupId = route.params?.groupId;

  const [group, setGroup] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<
    { name: string; total: number; count: number; percentage: number; color: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const iconName = group?.icon || 'users';
  const accentColor = ICON_COLORS[iconName] || colors.accent.primary;

  const loadData = useCallback(
    async (silent = false, refresh = false) => {
      try {
        if (refresh) {
          setRefreshing(true);
        } else if (!silent) {
          setLoading(true);
        }
        const [groupRes, txnRes, catRes] = await Promise.all([
          api.get(`/expense-groups/${groupId}`).catch(() => null),
          api
            .get(`/transactions?expenseGroupId=${groupId}&limit=50&sortBy=date&sortOrder=desc`)
            .catch(() => ({ data: [] })),
          api.get(`/transactions/categories-summary?expenseGroupId=${groupId}`).catch(() => null),
        ]);
        if (groupRes) {
          const d = groupRes as any;
          setGroup(d?.data || d);
        }
        const tr = txnRes as any;
        setTransactions(Array.isArray(tr) ? tr : tr?.data || []);
        const cd = catRes as any;
        setCategories(Array.isArray(cd?.data) ? cd.data : []);
      } catch {
        void 0;
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [groupId],
  );

  useSilentRefresh(
    useCallback(
      (isInitial) => {
        loadData(!isInitial);
      },
      [loadData],
    ),
  );

  useLensChange(
    useCallback(() => {
      loadData(true);
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    await loadData(false, true);
  }, [loadData]);

  const expenseTxns = useMemo(
    () => transactions.filter((t: any) => t.type === 'expense' || t.type === 'arrowdown'),
    [transactions],
  );
  const incomeTxns = useMemo(
    () => transactions.filter((t: any) => t.type === 'income' || t.type === 'arrowup'),
    [transactions],
  );
  const totalSpent = useMemo(
    () => expenseTxns.reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
    [expenseTxns],
  );
  const totalIncome = useMemo(
    () => incomeTxns.reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
    [incomeTxns],
  );

  const now = new Date();
  const thisMonthExpenses = useMemo(
    () =>
      expenseTxns.filter((t: any) => {
        const d = new Date(t.date || t.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }),
    [expenseTxns, now],
  );
  const monthlySpending = useMemo(
    () => thisMonthExpenses.reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
    [thisMonthExpenses],
  );

  const categoryBreakdown = useMemo(() => {
    if (categories.length > 0) {
      return categories.map((c) => ({
        category: c.name,
        amount: c.total,
        percentage: c.percentage,
      }));
    }
    const map = new Map<string, { amount: number }>();
    for (const t of expenseTxns) {
      const cat = t.category?.name || (typeof t.category === 'string' ? t.category : 'Other');
      const prev = map.get(cat) || { amount: 0 };
      map.set(cat, { amount: prev.amount + Number(t.amount || 0) });
    }
    const total = [...map.values()].reduce((s, v) => s + v.amount, 0);
    return [...map.entries()]
      .map(([category, { amount }]) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [categories, expenseTxns]);

  const avgTransaction = useMemo(() => {
    return expenseTxns.length > 0 ? totalSpent / expenseTxns.length : 0;
  }, [expenseTxns, totalSpent]);

  const lastMonthExpenses = useMemo(() => {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return expenseTxns.filter((t: any) => {
      const d = new Date(t.date || t.createdAt);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });
  }, [expenseTxns, now]);
  const lastMonthSpending = useMemo(
    () => lastMonthExpenses.reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
    [lastMonthExpenses],
  );

  const members = group?.members || [];
  const memberCount = group?._count?.members || members.length || 0;
  const recentTxns = transactions.slice(0, 10);

  if (loading && !group) {
    return (
      <View
        style={[
          s.root,
          { backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <LinearGradient
        colors={isDark ? ['#1A0A2E', '#2D1B69'] : [accentColor + '15', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top, minHeight: insets.top + 56, justifyContent: 'center' }}
      >
        <View style={s.heroRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <AntDesign name="arrowleft" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={[s.heroIcon, { backgroundColor: accentColor + '20' }]}>
            <AntDesign name={iconName as any} size={22} color={accentColor} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={[s.heroName, { color: colors.text.primary }]} numberOfLines={1}>
              {group?.name || 'Group'}
            </Text>
            <Text style={[s.heroMeta, { color: colors.text.tertiary }]}>
              {memberCount} member{memberCount !== 1 ? 's' : ''} · Created{' '}
              {fmtDate(group?.createdAt)}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.backBtn]}
            onPress={() => {
              alertService.alert('Group Options', undefined, [
                {
                  text: 'Manage Members',
                  onPress: () =>
                    navigation.navigate('AddMember', {
                      groupId,
                      type: 'expense-group',
                      existingMemberIds: members.map((m: any) => m.userId),
                    }),
                },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
          >
            <AntDesign name="ellipsis1" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.md, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Action Buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={[
              s.actionBtn,
              {
                backgroundColor: colors.status.error + '12',
                borderColor: colors.status.error + '25',
              },
            ]}
            onPress={() =>
              navigation.navigate('AddExpense', { type: 'expense', expenseGroupId: groupId })
            }
          >
            <View style={[s.actionIconBg, { backgroundColor: colors.status.error }]}>
              <AntDesign name="arrowdown" size={16} color="#FFF" />
            </View>
            <Text style={[s.actionLabel, { color: colors.status.error }]}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.actionBtn,
              {
                backgroundColor: colors.status.success + '12',
                borderColor: colors.status.success + '25',
              },
            ]}
            onPress={() =>
              navigation.navigate('AddExpense', { type: 'income', expenseGroupId: groupId })
            }
          >
            <View style={[s.actionIconBg, { backgroundColor: colors.status.success }]}>
              <AntDesign name="arrowup" size={16} color="#FFF" />
            </View>
            <Text style={[s.actionLabel, { color: colors.status.success }]}>Income</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.actionBtn,
              {
                backgroundColor: colors.accent.primary + '12',
                borderColor: colors.accent.primary + '25',
              },
            ]}
            onPress={() => navigation.navigate('AddMember', { groupId, type: 'expense-group' })}
          >
            <View style={[s.actionIconBg, { backgroundColor: colors.accent.primary }]}>
              <AntDesign name="adduser" size={16} color="#FFF" />
            </View>
            <Text style={[s.actionLabel, { color: colors.accent.primary }]}>Member</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          <View
            style={[
              s.summaryCard,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, flex: 1 },
            ]}
          >
            <View style={[s.summaryIcon, { backgroundColor: colors.status.error + '12' }]}>
              <AntDesign name="arrowdown" size={14} color={colors.status.error} />
            </View>
            <Text style={[s.summaryLabel, { color: colors.text.tertiary }]}>Spent</Text>
            <Text style={[s.summaryValue, { color: colors.status.error }]}>{fmt(totalSpent)}</Text>
          </View>
          <View
            style={[
              s.summaryCard,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, flex: 1 },
            ]}
          >
            <View style={[s.summaryIcon, { backgroundColor: colors.status.success + '12' }]}>
              <AntDesign name="arrowup" size={14} color={colors.status.success} />
            </View>
            <Text style={[s.summaryLabel, { color: colors.text.tertiary }]}>Income</Text>
            <Text style={[s.summaryValue, { color: colors.status.success }]}>
              {fmt(totalIncome)}
            </Text>
          </View>
          <View
            style={[
              s.summaryCard,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, flex: 1 },
            ]}
          >
            <View style={[s.summaryIcon, { backgroundColor: colors.accent.primary + '12' }]}>
              <AntDesign name="wallet" size={14} color={colors.accent.primary} />
            </View>
            <Text style={[s.summaryLabel, { color: colors.text.tertiary }]}>Budget</Text>
            <Text style={[s.summaryValue, { color: colors.text.primary }]}>
              {group?.monthlyBudget ? fmt(Number(group.monthlyBudget)) : '—'}
            </Text>
          </View>
        </View>

        {/* This Month */}
        <View
          style={[
            s.monthCard,
            { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[s.monthIcon, { backgroundColor: colors.status.warning + '12' }]}>
              <AntDesign name="calendar" size={14} color={colors.status.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.monthLabel, { color: colors.text.tertiary }]}>This Month</Text>
              <Text style={[s.monthValue, { color: colors.status.warning }]}>
                {fmt(monthlySpending)}
              </Text>
            </View>
            {lastMonthSpending > 0 && (
              <View style={{ alignItems: 'flex-end', marginRight: spacing.sm }}>
                <Text style={{ fontSize: 9, color: colors.text.tertiary, fontWeight: '500' }}>
                  vs last mo
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color:
                      monthlySpending > lastMonthSpending
                        ? colors.status.error
                        : colors.status.success,
                  }}
                >
                  {monthlySpending > lastMonthSpending ? '+' : ''}
                  {monthlySpending > 0
                    ? (((monthlySpending - lastMonthSpending) / lastMonthSpending) * 100).toFixed(0)
                    : '0'}
                  %
                </Text>
              </View>
            )}
            <View style={[s.countBadge, { backgroundColor: colors.accent.primary + '12' }]}>
              <Text style={[s.countText, { color: colors.accent.primary }]}>
                {thisMonthExpenses.length} txn{thisMonthExpenses.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Category Breakdown */}
        {categoryBreakdown.length > 0 && (
          <View>
            <View style={s.sectionHeader}>
              <View
                style={{
                  width: 4,
                  height: 14,
                  borderRadius: 2,
                  backgroundColor: colors.accent.primary,
                }}
              />
              <Text style={[s.sectionTitle, { color: colors.text.secondary }]}>
                Spending by Category
              </Text>
            </View>
            <View
              style={[
                s.catCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
              ]}
            >
              {categoryBreakdown.slice(0, 5).map((c, i) => (
                <View key={c.category}>
                  {i > 0 && (
                    <View style={[s.catDivider, { backgroundColor: colors.border.subtle }]} />
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={[
                        s.catDot,
                        {
                          backgroundColor: [
                            colors.accent.primary,
                            colors.status.error,
                            colors.status.success,
                            colors.status.warning,
                            colors.accent.secondary,
                          ][i % 5],
                        },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <Text style={[s.catName, { color: colors.text.primary }]}>
                          {c.category}
                        </Text>
                        <Text style={[s.catAmount, { color: colors.text.secondary }]}>
                          {fmt(c.amount)}
                        </Text>
                      </View>
                      <View style={s.catBarBg}>
                        <View
                          style={[
                            s.catBarFill,
                            {
                              width: `${Math.max(c.percentage, 3)}%`,
                              backgroundColor: [
                                colors.accent.primary,
                                colors.status.error,
                                colors.status.success,
                                colors.status.warning,
                                colors.accent.secondary,
                              ][i % 5],
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={[s.catPercent, { color: colors.text.tertiary }]}>
                      {c.percentage.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Insights */}
        {expenseTxns.length > 0 && (
          <View
            style={[
              s.insightCard,
              {
                backgroundColor: colors.accent.primary + '08',
                borderColor: colors.accent.primary + '20',
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AntDesign name="bulb1" size={14} color={colors.accent.primary} />
              <Text style={[s.insightTitle, { color: colors.accent.primary }]}>Quick Insights</Text>
            </View>
            <View style={{ gap: 3, marginTop: 6 }}>
              <Text style={[s.insightLine, { color: colors.text.secondary }]}>
                Avg. transaction:{' '}
                <Text style={{ fontWeight: '700' }}>{fmt(Math.round(avgTransaction))}</Text>
              </Text>
              {categoryBreakdown.length > 0 && (
                <Text style={[s.insightLine, { color: colors.text.secondary }]}>
                  Top category:{' '}
                  <Text style={{ fontWeight: '700' }}>{categoryBreakdown[0].category}</Text> (
                  {categoryBreakdown[0].percentage.toFixed(0)}% of spending)
                </Text>
              )}
              <Text style={[s.insightLine, { color: colors.text.secondary }]}>
                Total transactions: <Text style={{ fontWeight: '700' }}>{expenseTxns.length}</Text>
              </Text>
            </View>
          </View>
        )}

        {/* Members */}
        {members.length > 0 && (
          <View style={s.sectionHeader}>
            <View
              style={{
                width: 4,
                height: 14,
                borderRadius: 2,
                backgroundColor: colors.accent.primary,
              }}
            />
            <Text style={[s.sectionTitle, { color: colors.text.secondary }]}>Members</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={() => navigation.navigate('AddMember', { groupId, type: 'expense-group' })}
            >
              <AntDesign name="pluscircleo" size={16} color={colors.accent.primary} />
            </TouchableOpacity>
          </View>
        )}
        {members.length > 0 && (
          <View style={s.membersRow}>
            {members.slice(0, 6).map((m: any) => {
              const u = m.user;
              return (
                <View key={m.id || u?.id} style={s.memberChip}>
                  <View style={[s.memberAvatar, { backgroundColor: accentColor + '20' }]}>
                    <Text style={[s.memberInitial, { color: accentColor }]}>
                      {(u?.firstName || '?')[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    style={[s.memberChipName, { color: colors.text.secondary }]}
                    numberOfLines={1}
                  >
                    {u?.firstName || 'Member'}
                  </Text>
                </View>
              );
            })}
            {members.length > 6 && (
              <View style={s.memberChip}>
                <View style={[s.memberAvatar, { backgroundColor: colors.bg.tertiary }]}>
                  <Text style={[s.memberInitial, { color: colors.text.tertiary }]}>
                    +{members.length - 6}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Recent Transactions */}
        <View style={s.sectionHeader}>
          <View
            style={{
              width: 4,
              height: 14,
              borderRadius: 2,
              backgroundColor: colors.accent.primary,
            }}
          />
          <Text style={[s.sectionTitle, { color: colors.text.secondary }]}>
            Recent Transactions
          </Text>
        </View>

        {recentTxns.length === 0 ? (
          <View
            style={[
              s.emptyBox,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
            ]}
          >
            <AntDesign name="inbox" size={28} color={colors.text.tertiary} />
            <Text style={[s.emptyText, { color: colors.text.tertiary }]}>No transactions yet</Text>
          </View>
        ) : (
          recentTxns.map((txn: any) => {
            const isExpense = txn.type === 'expense' || txn.type === 'arrowdown';
            const catName =
              txn.category?.name || (typeof txn.category === 'string' ? txn.category : '');
            return (
              <TouchableOpacity
                key={txn.id}
                style={[
                  s.txnCard,
                  { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
                ]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('TransactionDetail', { transactionId: txn.id })}
              >
                <View style={s.txnRow}>
                  <View
                    style={[
                      s.txnIconBg,
                      {
                        backgroundColor: isExpense
                          ? colors.status.error + '12'
                          : colors.status.success + '12',
                      },
                    ]}
                  >
                    <AntDesign
                      name={isExpense ? 'arrowdown' : 'arrowup'}
                      size={14}
                      color={isExpense ? colors.status.error : colors.status.success}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.txnDesc, { color: colors.text.primary }]} numberOfLines={1}>
                      {txn.description || catName || 'Transaction'}
                    </Text>
                    <View
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}
                    >
                      {catName ? (
                        <View
                          style={[
                            s.catBadge,
                            {
                              backgroundColor: isExpense
                                ? colors.status.error + '10'
                                : colors.status.success + '10',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              s.catBadgeText,
                              { color: isExpense ? colors.status.error : colors.status.success },
                            ]}
                          >
                            {catName}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={[s.txnDate, { color: colors.text.tertiary }]}>
                        {fmtDate(txn.date || txn.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      s.txnAmount,
                      { color: isExpense ? colors.status.error : colors.status.success },
                    ]}
                  >
                    {isExpense ? '-' : '+'}
                    {fmt(txn.amount || 0)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.xl,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: { fontSize: 17, fontWeight: '800' },
  heroMeta: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
  },
  actionIconBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 12, fontWeight: '700' },
  summaryCard: { borderRadius: borderRadius['2xl'], borderWidth: 1, padding: spacing.lg, gap: 4 },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  summaryValue: { fontSize: 15, fontWeight: '700' },
  monthCard: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  monthIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { fontSize: 10, fontWeight: '500', marginBottom: 2 },
  monthValue: { fontSize: 16, fontWeight: '700' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  countText: { fontSize: 10, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  membersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  memberChip: { alignItems: 'center', gap: 3, width: 56 },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: { fontSize: 13, fontWeight: '700' },
  memberChipName: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  emptyBox: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  txnCard: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  txnIconBg: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnDesc: { fontSize: 13, fontWeight: '600' },
  catBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  catBadgeText: { fontSize: 8, fontWeight: '700' },
  txnDate: { fontSize: 10, fontWeight: '500' },
  txnAmount: { fontSize: 14, fontWeight: '700' },
  catCard: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  catDivider: { height: 1, marginVertical: spacing.sm },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { fontSize: 12, fontWeight: '600' },
  catAmount: { fontSize: 12, fontWeight: '600' },
  catBarBg: { height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.12)' },
  catBarFill: { height: 4, borderRadius: 2 },
  catPercent: { fontSize: 11, fontWeight: '600', minWidth: 32, textAlign: 'right' },
  insightCard: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  insightTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  insightLine: { fontSize: 12, fontWeight: '500', lineHeight: 18 },
});
