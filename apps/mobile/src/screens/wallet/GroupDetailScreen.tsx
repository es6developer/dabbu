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
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const iconName = group?.icon || 'users';
  const accentColor = ICON_COLORS[iconName] || colors.accent.primary;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const ts = Date.now();
      const [groupRes, txnRes] = await Promise.all([
        api.get(`/expense-groups/${groupId}?_=${ts}`).catch(() => null),
        api
          .get(
            `/transactions?expenseGroupId=${groupId}&limit=50&sortBy=date&sortOrder=desc&_=${ts}`,
          )
          .catch(() => ({ data: [] })),
      ]);
      if (groupRes) {
        const d = groupRes as any;
        setGroup(d?.data || d);
      }
      const tr = txnRes as any;
      setTransactions(Array.isArray(tr) ? tr : tr?.data || []);
    } catch {
      void 0;
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
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
        style={{ paddingTop: insets.top }}
      >
        <View style={s.heroRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <AntDesign name="arrowleft" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={[s.heroIcon, { backgroundColor: accentColor + '20' }]}>
            <AntDesign name={iconName as any} size={22} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.heroName, { color: colors.text.primary }]} numberOfLines={1}>
              {group?.name || 'Group'}
            </Text>
            <Text style={[s.heroMeta, { color: colors.text.tertiary }]}>
              {memberCount} member{memberCount !== 1 ? 's' : ''} · Created{' '}
              {fmtDate(group?.createdAt)}
            </Text>
          </View>
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
            <View style={[s.countBadge, { backgroundColor: colors.accent.primary + '12' }]}>
              <Text style={[s.countText, { color: colors.accent.primary }]}>
                {expenseTxns.length} txn{expenseTxns.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

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
    paddingBottom: spacing.lg,
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
});
