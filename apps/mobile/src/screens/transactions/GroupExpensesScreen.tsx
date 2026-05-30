import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatCurrency(val: number) {
  return '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function GroupExpensesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { groupId, groupName } = route.params || {};

  const [transactions, setTransactions] = useState<any[]>([]);
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      loadData();
    }, [groupId, accessToken]),
  );

  async function loadData() {
    try {
      const [txRes, grpRes] = await Promise.all([
        api.get<any>(`/transactions?expenseGroupId=${groupId}`),
        api.get<any>(`/expense-groups/${groupId}`),
      ]);
      const txData = Array.isArray(txRes) ? txRes : Array.isArray(txRes?.data) ? txRes.data : [];
      setTransactions(txData);
      const grpData = grpRes?.data || grpRes;
      setGroup(grpData);
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    const now = new Date();
    const monthly = transactions.filter((t) => {
      const d = new Date(t.date || t.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);
    const monthlySpending = monthly
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const budget = group?.monthlyBudget ? Number(group.monthlyBudget) : 0;
    const budgetRemaining = budget > 0 ? budget - monthlySpending : null;
    return {
      totalExpense,
      totalIncome,
      monthlySpending,
      budgetRemaining,
      totalCount: transactions.length,
    };
  }, [transactions, group]);

  const members = group?.members || [];
  const memberMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const m of members) {
      map[m.userId] = m.user;
    }
    return map;
  }, [members]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
        <View style={[styles.loadingHeader, { paddingTop: insets.top + 20 }]}>
          <View style={[styles.skeletonCircle, { backgroundColor: colors.bg.tertiary }]} />
          <View
            style={[
              styles.skeletonBlock,
              { width: 160, height: 22, backgroundColor: colors.bg.tertiary },
            ]}
          />
        </View>
        <View style={[styles.skeletonCard, { backgroundColor: colors.bg.tertiary }]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={transactions}
        keyExtractor={(t) => t.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={
          transactions.length === 0 ? styles.emptyContainer : { paddingBottom: 100 }
        }
        ListHeaderComponent={
          <View>
            <View style={[styles.headerSection]}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={[
                  styles.backBtn,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                ]}
              >
                <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
              </TouchableOpacity>
              <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.groupAvatar}>
                <Ionicons
                  name={(group?.icon === 'users' ? 'people' : group?.icon || 'people') as any}
                  size={24}
                  color="#FFF"
                />
              </LinearGradient>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{groupName || 'Group'}</Text>
                <Text style={styles.groupMembers}>
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.editBtn, { backgroundColor: `${colors.accent.primary}20` }]}
              >
                <Ionicons name="settings-outline" size={18} color={colors.accent.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.summaryGrid}>
              <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Expenses</Text>
                <Text style={styles.summaryValue}>{formatCurrency(stats.totalExpense)}</Text>
              </LinearGradient>
              <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Transactions</Text>
                <Text style={styles.summaryValue}>{stats.totalCount}</Text>
              </LinearGradient>
              <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Monthly Spend</Text>
                <Text style={styles.summaryValue}>{formatCurrency(stats.monthlySpending)}</Text>
              </LinearGradient>
              {stats.budgetRemaining !== null && (
                <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Budget Left</Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      { color: stats.budgetRemaining >= 0 ? '#00B894' : '#FF6B6B' },
                    ]}
                  >
                    {formatCurrency(Math.abs(stats.budgetRemaining))}
                  </Text>
                </LinearGradient>
              )}
            </View>

            {members.length > 0 && (
              <View style={styles.membersSection}>
                <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Members</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.membersRow}
                >
                  {members.map((m: any) => (
                    <View
                      key={m.id}
                      style={[styles.memberChip, { backgroundColor: colors.bg.tertiary }]}
                    >
                      <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.memberDot}>
                        <Text style={styles.memberInitial}>
                          {(m.user?.firstName?.[0] || '?').toUpperCase()}
                        </Text>
                      </LinearGradient>
                      <Text
                        style={[styles.memberName, { color: colors.text.primary }]}
                        numberOfLines={1}
                      >
                        {m.user?.firstName || m.user?.email || 'Member'}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {transactions.length > 0 && (
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: colors.text.secondary,
                    paddingHorizontal: 24,
                    paddingTop: 20,
                    paddingBottom: 8,
                  },
                ]}
              >
                All Expenses
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const isIncome = item.type === 'income';
          const user = memberMap[item.userId];
          const userName = user
            ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'You'
            : 'You';
          const catName = item.category?.name || item.category || 'Other';
          const date = new Date(item.date || item.createdAt);

          return (
            <TouchableOpacity
              style={[styles.txCard, { backgroundColor: colors.bg.secondary }]}
              onPress={() => navigation.navigate('TransactionDetail', { transactionId: item.id })}
              activeOpacity={0.7}
            >
              <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.txAvatar}>
                <Text style={styles.txAvatarText}>{userName[0]?.toUpperCase() || '?'}</Text>
              </LinearGradient>
              <View style={styles.txBody}>
                <View style={styles.txTop}>
                  <Text
                    style={[styles.txUserName, { color: colors.text.primary }]}
                    numberOfLines={1}
                  >
                    {userName}
                  </Text>
                  <Text style={[styles.txAmount, { color: isIncome ? '#00B894' : '#FF6B6B' }]}>
                    {isIncome ? '+' : '-'}
                    {formatCurrency(Number(item.amount))}
                  </Text>
                </View>
                <View style={styles.txBottom}>
                  <Text style={[styles.txDesc, { color: colors.text.tertiary }]} numberOfLines={1}>
                    {item.description || catName}
                  </Text>
                  <Text style={[styles.txTime, { color: colors.text.tertiary }]}>
                    {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <LinearGradient colors={['#6C5CE720', '#A29BFE20']} style={styles.emptyIconWrap}>
              <Ionicons name="receipt-outline" size={44} color="#6C5CE7" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No expenses yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              Add your first expense to this group
            </Text>
          </View>
        }
      />

      <LinearGradient
        colors={['#6C5CE7', '#A29BFE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.fab, { bottom: insets.bottom + 125 }]}
      >
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('CreateTransaction', {
              prefill: { groupId, groupName, returnTo: 'GroupExpenses' },
            })
          }
          activeOpacity={0.85}
          style={styles.fabTouch}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  skeletonCircle: { width: 48, height: 48, borderRadius: 16 },
  skeletonBlock: { borderRadius: 8 },
  skeletonCard: { marginHorizontal: 24, height: 180, borderRadius: 20 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },

  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  groupMembers: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    width: (320 - 48) / 2,
    flex: 1,
    minWidth: 130,
    padding: 14,
    borderRadius: 16,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  summaryValueDanger: { fontSize: 18, fontWeight: '700', color: '#FF6B6B' },
  summaryValueSuccess: { fontSize: 18, fontWeight: '700', color: '#00B894' },

  membersSection: { paddingHorizontal: 24, marginBottom: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  membersRow: { gap: 8 },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  memberDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  memberName: { fontSize: 13, fontWeight: '500' },

  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 3,
    padding: 14,
    borderRadius: 18,
  },
  txAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txAvatarText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  txBody: { flex: 1 },
  txTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txUserName: { fontSize: 14, fontWeight: '600' },
  txAmount: { fontSize: 16, fontWeight: '700' },
  txBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  txDesc: { fontSize: 12, flex: 1 },
  txTime: { fontSize: 11, marginLeft: 8 },

  empty: { alignItems: 'center', gap: 12, paddingTop: 60 },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 48, lineHeight: 18 },

  fab: {
    position: 'absolute',
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    elevation: 12,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  fabTouch: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
