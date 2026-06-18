import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { getCategoryIcon, getCategoryColor } from '../../config/categoryIcons';

const { width } = Dimensions.get('window');

const DEFAULT_CAT = { icon: 'minuscircleo', color: '#9CA3AF' };

function fmt(v: number) {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) {
    return 'Today';
  }
  if (diff === 1) {
    return 'Yesterday';
  }
  if (diff < 7) {
    return `${diff}d ago`;
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function CoupleExpensesScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'shared' | 'split'>('personal');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [coupleData, setCoupleData] = useState<any>(null);
  const [error, setError] = useState('');

  const tabs = [
    { key: 'personal' as const, label: 'Personal', icon: 'user' },
    { key: 'shared' as const, label: 'Shared', icon: 'team' },
    { key: 'split' as const, label: 'Split', icon: 'codesquareo' },
  ];

  useEffect(() => {}, []);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const coupleGroup = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (!coupleGroup) {
        setError('No couple space found.');
        setCoupleData(null);
        setExpenses([]);
        return;
      }
      const [dashboard, expenseList] = await Promise.all([
        api.get<any>(`/shared-finance/groups/${coupleGroup.id}/couple/dashboard`),
        api.get<any[]>(`/shared-finance/groups/${coupleGroup.id}/expenses`),
      ]);
      setCoupleData({ ...(dashboard || {}), group: coupleGroup });
      setExpenses(Array.isArray(expenseList) ? expenseList : []);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredExpenses = expenses.filter((e) => {
    if (activeTab === 'personal') {
      return e.type === 'personal' || (!e.type && !e.splitType);
    }
    if (activeTab === 'shared') {
      return e.type === 'shared' || e.splitType === 'shared';
    }
    if (activeTab === 'split') {
      return e.splitType === 'split' || e.type === 'split';
    }
    return true;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const partner1Name = coupleData?.profile?.partner1?.firstName || 'Partner 1';
  const partner2Name = coupleData?.profile?.partner2?.firstName || 'Partner 2';
  const groupId = coupleData?.group?.id;

  function renderExpenseRow(item: any) {
    const catName = item.category?.name || item.category;
    const catInfo = {
      icon: getCategoryIcon(catName, 'minuscirlceo'),
      color: getCategoryColor(catName),
    };
    const isOwn =
      item.paidBy === 'me' || !item.paidBy || item.paidBy === coupleData?.profile?.partner1?.id;
    const paidByName = isOwn ? 'You' : partner1Name === 'Partner 1' ? partner2Name : partner1Name;
    const showPaidBy = activeTab !== 'personal';

    return (
      <TouchableOpacity
        key={item.id || Math.random().toString()}
        activeOpacity={0.7}
        style={[styles.expenseRow, { backgroundColor: colors.bg.card }]}
        onPress={() => navigation.navigate('TransactionDetail', { transactionId: item.id })}
      >
        <View style={[styles.catIconCircle, { backgroundColor: `${catInfo.color}18` }]}>
          <AntDesign name={catInfo.icon as any} size={20} color={catInfo.color} />
        </View>
        <View style={styles.expenseInfo}>
          <View style={styles.expenseTop}>
            <Text style={[styles.expenseDesc, { color: colors.text.primary }]} numberOfLines={1}>
              {item.description || item.category?.name || 'Expense'}
            </Text>
            <Text style={[styles.expenseAmount, { color: colors.text.primary }]}>
              {fmt(item.amount)}
            </Text>
          </View>
          <View style={styles.expenseBottom}>
            <Text style={[styles.expenseDate, { color: colors.text.tertiary }]}>
              {fmtDate(item.date || item.createdAt)}
            </Text>
            <View style={styles.expenseBadges}>
              {item.category?.name ? (
                <View style={[styles.categoryBadge, { backgroundColor: `${catInfo.color}15` }]}>
                  <Text style={[styles.categoryBadgeText, { color: catInfo.color }]}>
                    {item.category.name}
                  </Text>
                </View>
              ) : null}
              {showPaidBy ? (
                <View style={[styles.paidByChip, { backgroundColor: colors.bg.tertiary }]}>
                  <AntDesign  name="user" size={10} color={colors.text.secondary} />
                  <Text style={[styles.paidByText, { color: colors.text.secondary }]}>
                    {paidByName}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        {item.splitType === 'split' && item.shares ? (
          <View style={[styles.splitIndicator, { borderLeftColor: colors.border.subtle }]}>
            <Text style={[styles.splitPct, { color: colors.accent.primary }]}>
              {Math.round(item.shares.partner1?.percentage || item.shares.percentage || 50)}%
            </Text>
            <Text style={[styles.splitLabel, { color: colors.text.tertiary }]}>your share</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData(true);
            }}
            tintColor={colors.accent.primary}
          />
        }
      >
        <View
          style={{
            paddingTop: insets.top + spacing.md,
            paddingBottom: spacing['2xl'],
            paddingHorizontal: spacing.xl,
            backgroundColor: colors.accent.primary,
          }}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <AntDesign  name="arrowleft" size={22} color={colors.text.inverse} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Expenses</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('CoupleTransactionForm', {
                  prefill: {
                    groupId,
                    groupName: 'Couple',
                    returnTo: 'CoupleExpenses',
                    type: 'wallet',
                  },
                })
              }
              style={styles.backBtn}
            >
              <AntDesign  name="plus" size={22} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabSection}>
          <View style={[styles.segmentRow, { backgroundColor: colors.bg.tertiary }]}>
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  activeOpacity={0.8}
                  onPress={() => setActiveTab(tab.key)}
                  style={[styles.segmentBtn, active && { backgroundColor: colors.accent.primary }]}
                >
                  <AntDesign
                    name={tab.icon as any}
                    size={14}
                    color={active ? colors.text.inverse : colors.text.secondary}
                  />
                  <Text
                    style={[styles.segmentText, { color: active ? colors.text.inverse : colors.text.secondary }]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg }}>
          <View style={[styles.summaryCard, { backgroundColor: '#FFEBB4' }]}>
            <View style={styles.summaryTop}>
              <Text style={styles.summaryLabel}>
                {activeTab === 'personal'
                  ? 'Your Expenses'
                  : activeTab === 'shared'
                    ? 'Shared Expenses'
                    : 'Split Expenses'}
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{filteredExpenses.length} items</Text>
              </View>
            </View>
            <Text style={styles.summaryAmount}>{fmt(totalExpenses)}</Text>
            <Text style={styles.summarySub}>Total for this period</Text>
          </View>

          {error && !filteredExpenses.length ? (
            <View style={styles.emptyWrap}>
              <AntDesign  name="filetext1" size={48} color={colors.text.tertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>
                No expenses yet
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>{error}</Text>
            </View>
          ) : !filteredExpenses.length ? (
            <View style={styles.emptyWrap}>
              <AntDesign  name="filetext1" size={48} color={colors.text.tertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>
                No {activeTab} expenses
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
                Tap + to add one
              </Text>
            </View>
          ) : (
            <View style={styles.expenseList}>{filteredExpenses.map(renderExpenseRow)}</View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  tabSection: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  segmentRow: { flexDirection: 'row', borderRadius: borderRadius.xl, padding: 3 },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
  },
  segmentText: { fontSize: 13, fontWeight: '700' },

  summaryCard: {
    borderRadius: borderRadius['4xl'],
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLabel: { fontSize: 12, fontWeight: '600', color: '#F97316', letterSpacing: 0.3 },
  countBadge: {
    backgroundColor: 'rgba(93,56,181,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.md,
  },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: '#F97316' },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F97316',
    letterSpacing: -1,
    marginBottom: 2,
  },
  summarySub: { fontSize: 12, fontWeight: '500', color: 'rgba(93,56,181,0.6)' },

  expenseList: { gap: spacing.lg, paddingTop: 16 },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    gap: spacing.md,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  catIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseInfo: { flex: 1, gap: 6 },
  expenseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expenseDesc: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: spacing.sm },
  expenseAmount: { fontSize: 16, fontWeight: '800' },
  expenseBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expenseDate: { fontSize: 11, fontWeight: '500' },
  expenseBadges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.sm },
  categoryBadgeText: { fontSize: 10, fontWeight: '700' },
  paidByChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  paidByText: { fontSize: 10, fontWeight: '600' },
  splitIndicator: {
    borderLeftWidth: 1,
    paddingLeft: 10,
    alignItems: 'center',
  },
  splitPct: { fontSize: 14, fontWeight: '800' },
  splitLabel: { fontSize: 9, fontWeight: '500', marginTop: 1 },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyDesc: { fontSize: 13, fontWeight: '500' },
});
