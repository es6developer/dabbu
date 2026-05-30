import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../store/AuthContext';
import { api, setAccessToken } from '../../services/api';
import { useTheme, spacing, borderRadius } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../components/ui/Card';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 64) / 2;

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadData();
  }, [accessToken]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [loading]);

  async function loadData() {
    try {
      const [statsRes, catRes] = await Promise.all([
        api.get<any>('/accounts/stats'),
        api.get<any>('/transactions/categories-summary?months=1'),
      ]);
      setStats(statsRes.data);
      setCategoryData(Array.isArray(catRes.data) ? catRes.data.slice(0, 5) : []);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const txn = stats?.recentTransactions || [];
  const monthlyIncome = Number(stats?.monthlyIncome || 0);
  const monthlyExpense = Number(stats?.monthlyExpense || 0);
  const totalBalance = Number(stats?.totalBalance || 0);
  const totalAccounts = stats?.totalAccounts || 0;

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }

  const formatCurrency = (val: number) => {
    if (val >= 10000000) {
      return '₹' + (val / 10000000).toFixed(1) + 'Cr';
    }
    if (val >= 100000) {
      return '₹' + (val / 100000).toFixed(1) + 'L';
    }
    return '₹' + val.toLocaleString('en-IN');
  };

  const totalSpending = monthlyIncome + monthlyExpense || 1;
  const incomePct = (monthlyIncome / totalSpending) * 100;
  const expensePct = (monthlyExpense / totalSpending) * 100;
  const ringRadius = 42;
  const ringCirc = 2 * Math.PI * ringRadius;

  const quickActions = [
    {
      icon: 'camera-outline',
      label: 'Scan Bill',
      color: '#FF6B6B',
      action: () => navigation.navigate('Accounts', { screen: 'BillScanner' }),
    },
    {
      icon: 'add-circle-outline',
      label: 'Add Expense',
      color: '#00B894',
      action: () => navigation.navigate('Accounts', { screen: 'AddExpense' }),
    },
    {
      icon: 'swap-horizontal-outline',
      label: 'Transfer',
      color: '#FDCB6E',
      action: () => navigation.navigate('Accounts', { screen: 'CreateTransaction' }),
    },
    {
      icon: 'pie-chart-outline',
      label: 'Budgets',
      color: '#74B9FF',
      action: () =>
        navigation.navigate('Accounts', { screen: 'ExpenseHome', params: { screen: 'MyWallet' } }),
    },
  ];

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: colors.bg.primary, opacity: fadeAnim }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        <LinearGradient
          colors={isDark ? ['#1a1a2e', colors.bg.primary] : ['#eef1ff', colors.bg.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerLeft}>
                <Text style={[styles.greeting, { color: colors.text.tertiary }]}>Welcome back</Text>
                <Text style={[styles.name, { color: colors.text.primary }]}>
                  {user?.firstName || 'there'}
                </Text>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity
                  style={[
                    styles.notifBtn,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                  ]}
                  onPress={() => navigation.navigate('SMS', { screen: 'SmsPermission' })}
                >
                  <Ionicons name="chatbubbles-outline" size={20} color={colors.accent.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.notifBtn,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                  ]}
                  onPress={() => navigation.navigate('Notifications')}
                >
                  <Ionicons name="notifications-outline" size={20} color={colors.text.secondary} />
                  <View style={[styles.notifDot, { backgroundColor: colors.accent.primary }]} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.avatarWrap}
                  onPress={() => navigation.navigate('Settings', { screen: 'SettingsMain' })}
                >
                  <LinearGradient
                    colors={['#f7892c', '#ff9f43']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>{user?.firstName?.[0] || 'U'}</Text>
                  </LinearGradient>
                  <View
                    style={[
                      styles.avatarDot,
                      { backgroundColor: colors.status.success, borderColor: colors.bg.primary },
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Card variant="glass" style={styles.balanceCard} padding="xl">
            <View style={styles.balanceTop}>
              <View style={styles.balanceLabelRow}>
                <View style={[styles.balanceDot, { backgroundColor: colors.accent.primary }]} />
                <Text style={[styles.balanceLabel, { color: colors.text.tertiary }]}>
                  Total Balance
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.eyeBtn,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                <Ionicons name="eye-outline" size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.balanceAmount, { color: colors.text.primary }]}>
              {formatCurrency(totalBalance)}
            </Text>
            <View style={styles.balanceMeta}>
              <View style={styles.balanceMetaItem}>
                <Text style={[styles.balanceMetaLabel, { color: colors.text.tertiary }]}>
                  Income
                </Text>
                <Text style={[styles.balanceMetaValue, { color: colors.status.success }]}>
                  +{formatCurrency(monthlyIncome)}
                </Text>
              </View>
              <View
                style={[styles.balanceMetaDivider, { backgroundColor: colors.border.subtle }]}
              />
              <View style={styles.balanceMetaItem}>
                <Text style={[styles.balanceMetaLabel, { color: colors.text.tertiary }]}>
                  Spent
                </Text>
                <Text style={[styles.balanceMetaValue, { color: colors.status.error }]}>
                  -{formatCurrency(monthlyExpense)}
                </Text>
              </View>
              <View
                style={[styles.balanceMetaDivider, { backgroundColor: colors.border.subtle }]}
              />
              <View style={styles.balanceMetaItem}>
                <Text style={[styles.balanceMetaLabel, { color: colors.text.tertiary }]}>
                  Accounts
                </Text>
                <Text style={[styles.balanceMetaValue, { color: colors.text.primary }]}>
                  {totalAccounts}
                </Text>
              </View>
            </View>
          </Card>
        </LinearGradient>

        <View style={styles.quickActions}>
          {quickActions.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.quickActionCard,
                {
                  backgroundColor: colors.bg.card,
                  borderWidth: 1,
                  borderColor: colors.border.subtle,
                },
              ]}
              onPress={action.action}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
                <Ionicons name={action.icon as any} size={22} color={action.color} />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text.secondary }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {categoryData.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Spending Breakdown
              </Text>
              <TouchableOpacity style={styles.seeAllBtn}>
                <Text style={[styles.seeAllText, { color: colors.accent.primary }]}>Details</Text>
                <Ionicons name="chevron-forward" size={12} color={colors.accent.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.breakdownContainer}>
              <View style={styles.ringSection}>
                <Svg width={110} height={110} viewBox="0 0 110 110">
                  <Circle
                    cx="55"
                    cy="55"
                    r={ringRadius}
                    stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                    strokeWidth="10"
                    fill="none"
                  />
                  {categoryData.slice(0, 4).map((cat: any, i: number) => {
                    const pct = Math.min(cat.percentage || 0, 100);
                    const dashLen = (pct / 100) * ringCirc;
                    const offset = categoryData
                      .slice(0, i)
                      .reduce(
                        (s: number, c: any) =>
                          s - (Math.min(c.percentage || 0, 100) / 100) * ringCirc,
                        -ringCirc * 0.25,
                      );
                    return (
                      <Circle
                        key={i}
                        cx="55"
                        cy="55"
                        r={ringRadius}
                        stroke={cat.color || ['#FF6B6B', '#FDCB6E', '#00B894', '#74B9FF'][i]}
                        strokeWidth="10"
                        fill="none"
                        strokeDasharray={`${dashLen} ${ringCirc - dashLen}`}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </Svg>
                <View style={styles.ringCenter}>
                  <Text style={[styles.ringCenterValue, { color: colors.text.primary }]}>
                    {categoryData
                      .reduce((s: number, c: any) => s + (c.percentage || 0), 0)
                      .toFixed(0)}
                    %
                  </Text>
                  <Text style={[styles.ringCenterLabel, { color: colors.text.tertiary }]}>
                    spent
                  </Text>
                </View>
              </View>
              <View style={styles.breakdownList}>
                {categoryData.slice(0, 4).map((cat: any, i: number) => (
                  <View key={i} style={styles.breakdownRow}>
                    <View
                      style={[
                        styles.breakdownDot,
                        {
                          backgroundColor:
                            cat.color || ['#FF6B6B', '#FDCB6E', '#00B894', '#74B9FF'][i],
                        },
                      ]}
                    />
                    <Text
                      style={[styles.breakdownName, { color: colors.text.secondary }]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                    <Text style={[styles.breakdownPct, { color: colors.text.primary }]}>
                      {Math.round(cat.percentage || 0)}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Recent Activity
            </Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('Accounts', {
                  screen: 'ExpenseHome',
                  params: { screen: 'MyWallet' },
                })
              }
              style={styles.seeAllBtn}
            >
              <Text style={[styles.seeAllText, { color: colors.accent.primary }]}>See all</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.accent.primary} />
            </TouchableOpacity>
          </View>
          {txn.length === 0 ? (
            <Card variant="glass" style={styles.emptyCard} padding="xl">
              <View style={styles.emptyContent}>
                <View
                  style={[styles.emptyIconWrap, { backgroundColor: colors.accent.primary + '15' }]}
                >
                  <Ionicons name="receipt-outline" size={32} color={colors.accent.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
                  No transactions yet
                </Text>
                <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
                  Tap + to add your first transaction or scan a bill
                </Text>
              </View>
            </Card>
          ) : (
            txn.map((item: any, i: number) => {
              const isExpense = item.type === 'expense';
              return (
                <TouchableOpacity
                  key={item.id || i}
                  style={[
                    styles.txnCard,
                    {
                      backgroundColor: colors.bg.card,
                      borderWidth: 1,
                      borderColor: colors.border.subtle,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('Accounts', {
                      screen: 'TransactionDetail',
                      params: { transactionId: item.id },
                    })
                  }
                >
                  <View
                    style={[
                      styles.txnIconWrap,
                      {
                        backgroundColor: isExpense
                          ? colors.status.error + '18'
                          : colors.status.success + '18',
                      },
                    ]}
                  >
                    <Ionicons
                      name={isExpense ? 'arrow-up' : 'arrow-down'}
                      size={16}
                      color={isExpense ? colors.status.error : colors.status.success}
                    />
                  </View>
                  <View style={styles.txnInfo}>
                    <Text
                      style={[styles.txnName, { color: colors.text.primary }]}
                      numberOfLines={1}
                    >
                      {item.description || item.category?.name || 'Transaction'}
                    </Text>
                    <Text style={[styles.txnMeta, { color: colors.text.tertiary }]}>
                      {item.category?.name ? `${item.category.name} · ` : ''}
                      {new Date(item.date || item.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                  <View style={styles.txnRight}>
                    <Text
                      style={[
                        styles.txnAmount,
                        { color: isExpense ? colors.status.error : colors.status.success },
                      ]}
                    >
                      {isExpense ? '-' : '+'}
                      {formatCurrency(Number(item.amount))}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerGradient: { paddingBottom: 0 },
  header: { paddingHorizontal: 24, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: {},
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  name: { fontSize: 24, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: { width: 6, height: 6, borderRadius: 3, position: 'absolute', top: 10, right: 10 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  avatarDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderWidth: 2,
  },
  balanceCard: { marginHorizontal: 24 },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balanceDot: { width: 6, height: 6, borderRadius: 3 },
  balanceLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  eyeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceAmount: { fontSize: 38, fontWeight: '700', letterSpacing: -1, marginBottom: 16 },
  balanceMeta: { flexDirection: 'row', alignItems: 'center' },
  balanceMetaItem: { flex: 1 },
  balanceMetaLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  balanceMetaValue: { fontSize: 15, fontWeight: '700' },
  balanceMetaDivider: { width: 1, height: 32, marginHorizontal: 8 },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 12,
    marginTop: 24,
    marginBottom: 28,
  },
  quickActionCard: { width: CARD_WIDTH, borderRadius: 18, padding: 18, alignItems: 'center' },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: { fontSize: 13, fontWeight: '600' },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, fontWeight: '600' },
  breakdownContainer: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  ringSection: {
    width: 110,
    height: 110,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringCenterValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  ringCenterLabel: { fontSize: 9, fontWeight: '500', marginTop: 1 },
  breakdownList: { flex: 1, gap: 10 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  breakdownDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownName: { flex: 1, fontSize: 13, fontWeight: '500' },
  breakdownPct: { fontSize: 13, fontWeight: '700' },
  emptyCard: { alignItems: 'center' },
  emptyContent: { alignItems: 'center', paddingVertical: 12, gap: 8 },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyDesc: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginBottom: 8,
    gap: 14,
  },
  txnIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnInfo: { flex: 1 },
  txnName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  txnMeta: { fontSize: 11 },
  txnRight: {},
  txnAmount: { fontSize: 15, fontWeight: '700' },
});
