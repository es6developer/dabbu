import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Animated,
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
  return '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function normalizePayload<T>(response: any): T {
  if (!response) {
    return [] as unknown as T;
  }
  if (Array.isArray(response)) {
    return response as T;
  }
  if (response.data && Array.isArray(response.data)) {
    return response.data as T;
  }
  return response as T;
}

function getSettledError(result: PromiseSettledResult<any>): string | null {
  if (result.status === 'fulfilled') {
    return null;
  }
  return result.reason?.message || 'Request failed';
}

function MoneyLoader() {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.65)).current;
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.65, duration: 650, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(lift, { toValue: -8, duration: 650, useNativeDriver: true }),
          Animated.timing(lift, { toValue: 0, duration: 650, useNativeDriver: true }),
        ]),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [lift, pulse]);

  return (
    <View style={styles.moneyLoader}>
      <Animated.View
        style={[
          styles.moneyCoin,
          {
            backgroundColor: colors.accent.primary,
            opacity: pulse,
            transform: [{ translateY: lift }],
          },
        ]}
      >
        <Text style={styles.moneyCoinText}>₹</Text>
      </Animated.View>
      <Text style={[styles.moneyLoadingTitle, { color: colors.text.primary }]}>
        Loading expenses
      </Text>
      <Text style={[styles.moneyLoadingText, { color: colors.text.tertiary }]}>
        Counting every rupee
      </Text>
    </View>
  );
}

export function GroupExpensesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accessToken } = useAuth();
  const { colors, isDark, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { groupId, groupName: routeGroupName } = route.params || {};

  const [transactions, setTransactions] = useState<any[]>([]);
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!groupId) {
      setError('Missing group identifier');
      setTransactions([]);
      setGroup(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const [txRes, grpRes] = await Promise.allSettled([
        api.get<any>(`/transactions?expenseGroupId=${groupId}`),
        api.get<any>(`/expense-groups/${groupId}`),
      ]);

      const txData = normalizePayload<any[]>(txRes.status === 'fulfilled' ? txRes.value : null);
      const groupData = grpRes.status === 'fulfilled' ? normalizePayload<any>(grpRes.value) : null;

      if (txRes.status === 'rejected' && grpRes.status === 'rejected') {
        throw new Error(
          getSettledError(txRes) || getSettledError(grpRes) || 'Unable to load expenses',
        );
      }

      setTransactions(Array.isArray(txData) ? txData : []);
      setGroup(groupData);
      setError(getSettledError(txRes) || getSettledError(grpRes));
    } catch (loadError: any) {
      setError(loadError?.message || 'Unable to load expenses');
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, groupId]);

  useFocusEffect(
    useCallback(() => {
      if (transactions.length === 0) {
        setLoading(true);
      }
      loadData();
    }, [loadData, transactions.length]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  const onRetry = useCallback(async () => {
    setLoading(true);
    await loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthly = transactions.filter((t) => {
      const date = new Date(t.date || t.createdAt || t.createdAt);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const monthlySpending = monthly
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const budget = Number(group?.monthlyBudget || 0);
    const budgetRemaining = budget > 0 ? budget - monthlySpending : null;
    return {
      totalExpense,
      totalIncome,
      monthlySpending,
      budgetRemaining,
      totalCount: transactions.length,
    };
  }, [transactions, group]);

  const members = Array.isArray(group?.members) ? group.members : [];
  const memberMap = useMemo(() => {
    const map: Record<string, any> = {};
    members.forEach((member: any) => {
      if (member?.userId) {
        map[member.userId] = member.user || member;
      }
    });
    return map;
  }, [members]);

  const displayedGroupName = group?.name || routeGroupName || 'Group';

  if (loading) {
    return (
      <View
        style={[
          styles.loadingScreen,
          { backgroundColor: colors.bg.primary, paddingTop: insets.top + 14 },
        ]}
      >
        <MoneyLoader />
      </View>
    );
  }

  const listHeader = (
    <View style={styles.headerSection}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backBtn,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.avatarCircle}>
          <Ionicons
            name={group?.icon === 'users' ? 'people' : group?.icon || 'people'}
            size={24}
            color="#FFF"
          />
        </LinearGradient>
        <View style={styles.groupInfo}>
          <Text style={[styles.groupName, { color: colors.text.primary }]} numberOfLines={1}>
            {displayedGroupName}
          </Text>
          <Text style={[styles.groupMembers, { color: colors.text.secondary }]}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </Text>
        </View>
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
          <View style={styles.membersRow}>
            {members.map((member: any) => (
              <View
                key={member.id}
                style={[styles.memberChip, { backgroundColor: colors.bg.tertiary }]}
              >
                <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.memberDot}>
                  <Text style={styles.memberInitial}>
                    {(member.user?.firstName?.[0] || member.firstName?.[0] || '?').toUpperCase()}
                  </Text>
                </LinearGradient>
                <Text style={[styles.memberName, { color: colors.text.primary }]} numberOfLines={1}>
                  {member.user?.firstName || member.user?.email || member.firstName || 'Member'}
                </Text>
              </View>
            ))}
          </View>
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
  );

  if (error) {
    return (
      <View
        style={[
          styles.loadingScreen,
          { backgroundColor: colors.bg.primary, paddingTop: insets.top + 14 },
        ]}
      >
        <Text style={[styles.errorText, { color: colors.text.primary }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.accent.primary }]}
          onPress={onRetry}
        >
          <Text style={[styles.retryText, { color: '#FFFFFF' }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        windowSize={10}
        maxToRenderPerBatch={10}
        initialNumToRender={8}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={
          transactions.length === 0 ? styles.emptyContainer : { paddingBottom: insets.bottom + 140 }
        }
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => {
          const isIncome = item.type === 'income';
          const user = memberMap[item.userId];
          const userName = user
            ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'You'
            : 'You';
          const catName = item.category?.name || item.category || 'Other';
          const date = new Date(item.date || item.createdAt || '');

          return (
            <TouchableOpacity
              style={[styles.txCard, { backgroundColor: colors.bg.secondary }]}
              onPress={() => navigation.navigate('TransactionDetail', { transactionId: item.id })}
              activeOpacity={0.8}
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
                    {formatCurrency(Number(item.amount || 0))}
                  </Text>
                </View>
                <View style={styles.txBottom}>
                  <Text style={[styles.txDesc, { color: colors.text.tertiary }]} numberOfLines={1}>
                    {item.description || catName}
                  </Text>
                  <Text style={[styles.txTime, { color: colors.text.tertiary }]}>
                    {' '}
                    {isNaN(date.getTime())
                      ? ''
                      : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{' '}
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

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24, backgroundColor: '#6C5CE7' }]}
        onPress={() =>
          navigation.navigate('CreateTransaction', {
            prefill: { groupId, groupName: displayedGroupName, returnTo: 'GroupExpenses' },
          })
        }
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSection: {
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '700',
  },
  groupMembers: {
    marginTop: 4,
    fontSize: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 18,
  },
  summaryCard: {
    flex: 1,
    minWidth: 140,
    padding: 14,
    borderRadius: 18,
  },
  summaryLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  membersSection: {
    marginTop: 18,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  membersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  memberDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 90,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
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
  txAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  txBody: {
    flex: 1,
  },
  txTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txUserName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  txBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  txDesc: {
    fontSize: 12,
    flex: 1,
  },
  txTime: {
    fontSize: 11,
    marginLeft: 8,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 60,
  },
  empty: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 48,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 14,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  retryBtn: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  moneyLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  moneyCoin: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  moneyCoinText: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '800',
  },
  moneyLoadingTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  moneyLoadingText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
