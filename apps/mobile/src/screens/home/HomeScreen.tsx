import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { getCategoryColor } from '../../config/categoryIcons';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface DashboardData {
  totalBalance: number;
  monthlySpending: number;
  monthlyBudget: number;
  recentTransactions: any[];
  categories: any[];
  sharedGroups: any[];
  reminders: any[];
  goals: any[];
}

const emptyData: DashboardData = {
  totalBalance: 0,
  monthlySpending: 0,
  monthlyBudget: 0,
  recentTransactions: [],
  categories: [],
  sharedGroups: [],
  reminders: [],
  goals: [],
};

function fmt(v: number) {
  const n = v || 0;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fdate(d: string | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { user, accessToken } = useAuth();

  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    if (accessToken) setAccessToken(accessToken);

    if (!isRefresh) {
      try {
        const cached = await AsyncStorage.getItem(`home_cache_${user?.id || 'anon'}`);
        if (cached) { setData(JSON.parse(cached)); fadeAnim.setValue(1); setLoading(false); }
      } catch {}
    }

    try {
      const results = await Promise.allSettled([
        api.get<any>('/accounts/stats', ctrl.signal),
        api.get<any>('/transactions/recent?limit=5', ctrl.signal),
        api.get<any>('/transactions/categories-summary?months=1', ctrl.signal),
        api.get<any>('/shared-finance/groups', ctrl.signal),
        api.get<any>('/notifications', ctrl.signal),
      ]);
      if (ctrl.signal.aborted) return;

      const accountStats: any = results[0].status === 'fulfilled' ? results[0].value?.data || results[0].value : {};
      const transactions: any[] = results[1].status === 'fulfilled' ? (Array.isArray(results[1].value) ? results[1].value : results[1].value?.data || []) : [];
      const categories: any[] = results[2].status === 'fulfilled' ? (Array.isArray(results[2].value) ? results[2].value : results[2].value?.data || []) : [];
      const groups: any[] = results[3].status === 'fulfilled' ? (Array.isArray(results[3].value) ? results[3].value : results[3].value?.data || []) : [];
      const notifRes: any[] = results[4].status === 'fulfilled' ? (Array.isArray(results[4].value) ? results[4].value : results[4].value?.data || []) : [];

      const fresh: DashboardData = {
        totalBalance: accountStats?.totalBalance ?? 0,
        monthlySpending: accountStats?.monthlySpending ?? accountStats?.monthlyExpense ?? 0,
        monthlyBudget: accountStats?.monthlyBudget ?? accountStats?.monthlyIncome ?? 0,
        recentTransactions: transactions,
        categories,
        sharedGroups: groups,
        reminders: [],
        goals: [],
      };

      setUnreadNotifications(notifRes.filter((n: any) => !n.read).length);
      setData(fresh);
      AsyncStorage.setItem(`home_cache_${user?.id || 'anon'}`, JSON.stringify(fresh)).catch(() => {});
      Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    } finally {
      if (!ctrl.signal.aborted) { setLoading(false); setRefreshing(false); }
    }
  }, [accessToken, fadeAnim, user?.id]);

  useFocusEffect(useCallback(() => { loadData(); return () => abortRef.current?.abort(); }, [loadData]));

  if (loading) return <LoadingScreen />;

  const spendPct = data.monthlyBudget > 0 ? Math.min((data.monthlySpending / data.monthlyBudget) * 100, 100) : 0;
  const remaining = data.monthlyBudget - data.monthlySpending;

  const HEADER_H = insets.top + 100;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
      <Animated.View style={[styles.screen, { opacity: fadeAnim }]}>
        <BlurView intensity={15} tint="dark" style={[styles.header, { paddingTop: insets.top + 24 }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Settings', { screen: 'Profile' })} style={styles.avatarRow} activeOpacity={0.8}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.firstName?.[0] || 'U'}</Text>
              </View>
              <View>
                <Text style={styles.greeting}>Hello {user?.firstName || 'User'}</Text>
                <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>Manage your money smarter</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.notifBtn}>
              <Ionicons name="notifications-outline" size={24} color="#FFF" />
              {unreadNotifications > 0 && (
                <View style={styles.notifDot}><Text style={styles.notifDotText}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text></View>
              )}
            </TouchableOpacity>
          </View>
        </BlurView>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: HEADER_H, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(true); }} tintColor={colors.accent.primary} />}
        >

          <View style={styles.balanceWrap}>
            <View
              
              
              
              style={[styles.balanceCard, { backgroundColor: colors.accent.primary, shadowColor: colors.accent.primary }]}
            >
              <View style={styles.balanceTop}>
                <View>
                  <Text style={styles.balanceLabel}>Total Balance</Text>
                  <Text style={styles.balanceAmount}>{fmt(data.totalBalance)}</Text>
                </View>
                <View style={styles.premiumBadge}>
                  <Ionicons name="wallet" size={14} color="#F3D28F" />
                  <Text style={styles.premiumText}>Premium</Text>
                </View>
              </View>

              <View style={styles.balanceDivider} />

              <View style={styles.balanceStats}>
                <View style={styles.balanceStat}>
                  <Text style={styles.balanceStatLabel}>Monthly Spending</Text>
                  <Text style={styles.balanceStatValue}>{fmt(data.monthlySpending)}</Text>
                </View>
                <View style={styles.balanceStatDivider} />
                <View style={styles.balanceStat}>
                  <Text style={styles.balanceStatLabel}>Monthly Budget</Text>
                  <Text style={styles.balanceStatValue}>{fmt(data.monthlyBudget)}</Text>
                </View>
              </View>

              <View style={styles.balanceProgress}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>{spendPct.toFixed(0)}% used</Text>
                  <Text style={[styles.progressLabel, remaining >= 0 ? { color: 'rgba(255,255,255,0.7)' } : { color: '#FF4D4F' }]}>
                    {remaining >= 0 ? `${fmt(remaining)} left` : `${fmt(Math.abs(remaining))} over`}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(spendPct, 100)}%` }]} />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.qaCard, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Expense', { screen: 'CategorySelection' })}
            >
              <View style={[styles.qaIcon, { backgroundColor: `${colors.accent.primary}15` }]}>
                <Ionicons name="add-circle-outline" size={24} color={colors.accent.primary} />
              </View>
              <Text style={[styles.qaLabel, { color: colors.text.secondary }]}>Add Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.qaCard, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Spaces', { screen: 'CreateCircle' })}
            >
              <View style={[styles.qaIcon, { backgroundColor: `${colors.accent.primary}15` }]}>
                <Ionicons name="people-outline" size={24} color={colors.accent.primary} />
              </View>
              <Text style={[styles.qaLabel, { color: colors.text.secondary }]}>Create Circle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.qaCard, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Spaces', { screen: 'SplitExpense' })}
            >
              <View style={[styles.qaIcon, { backgroundColor: '#34C75915' }]}>
                <Ionicons name="swap-horizontal-outline" size={24} color="#34C759" />
              </View>
              <Text style={[styles.qaLabel, { color: colors.text.secondary }]}>Split Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.qaCard, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Settings', { screen: 'Reports' })}
            >
              <View style={[styles.qaIcon, { backgroundColor: '#F3D28F20' }]}>
                <Ionicons name="stats-chart-outline" size={24} color="#F3D28F" />
              </View>
              <Text style={[styles.qaLabel, { color: colors.text.secondary }]}>Reports</Text>
            </TouchableOpacity>
          </View>

          {data.categories.length > 0 && (
            <View style={styles.spendingSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Spending by Category</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Settings', { screen: 'Reports' })}>
                  <Text style={[styles.seeAll, { color: colors.accent.primary }]}>See all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                {data.categories.slice(0, 8).map((cat: any, i: number) => {
                  const cc = getCategoryColor(cat.category || cat.name, colors.accent.primary);
                  return (
                    <View key={i} style={[styles.catPill, { backgroundColor: `${cc}15`, borderColor: `${cc}30` }]}>
                      <View style={[styles.catDot, { backgroundColor: cc }]} />
                      <Text style={[styles.catLabel, { color: colors.text.primary }]}>{cat.category || cat.name}</Text>
                      <Text style={[styles.catAmount, { color: cc }]}>₹{Math.round(cat.amount || cat.total || 0).toLocaleString('en-IN')}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {data.sharedGroups.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Active Groups</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Spaces', { screen: 'GroupsList' })}>
                  <Text style={[styles.seeAll, { color: colors.accent.primary }]}>See all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                {data.sharedGroups.slice(0, 5).map((g: any) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.groupCard, { backgroundColor: colors.bg.card }]}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('Spaces', { screen: 'GroupDetail', params: { groupId: g.id } })}
                  >
                    <View
                      
                       
                      style={styles.groupAvatar}
                    >
                      <Ionicons name="people" size={18} color="#FFF" />
                    </View>
                    <Text style={[styles.groupName, { color: colors.text.primary }]} numberOfLines={1}>{g.name}</Text>
                    <Text style={[styles.groupExpense, { color: colors.text.secondary }]}>₹{((g as any).totalExpense || 0).toLocaleString('en-IN')}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Recent Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Expense', { screen: 'ExpenseHome' })}>
                <Text style={[styles.seeAll, { color: colors.accent.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 20, marginTop: 4 }}>
              {data.recentTransactions.length > 0 ? (
                data.recentTransactions.map((tx: any) => (
                  <TouchableOpacity
                    key={tx.id}
                    style={[styles.txCard, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('Expense', { screen: 'TransactionDetail', params: { transactionId: tx.id } })}
                  >
                    <View style={[styles.txAvatar, { backgroundColor: `${colors.accent.primary}15` }]}>
                      <Ionicons
                        name={(tx.category as any)?.icon || 'receipt-outline'}
                        size={18}
                        color={colors.accent.primary}
                      />
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={[styles.txName, { color: colors.text.primary }]} numberOfLines={1}>
                        {tx.description || tx.category?.name || tx.category || 'Transaction'}
                      </Text>
                      <Text style={[styles.txCategory, { color: colors.text.tertiary }]}>
                        {tx.category?.name || tx.category || 'General'} · {fdate(tx.date || tx.createdAt)}
                      </Text>
                    </View>
                    <Text style={[styles.txAmount, { color: Number(tx.amount) > 0 ? '#34C759' : '#FF4D4F' }]}>
                      {Number(tx.amount) > 0 ? '+' : ''}{fmt(Math.abs(Number(tx.amount)))}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIcon, { backgroundColor: `${colors.accent.primary}15` }]}>
                    <Ionicons name="receipt-outline" size={32} color={colors.accent.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>No activity yet</Text>
                  <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>Add your first expense to see activity here</Text>
                  <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.accent.primary, borderColor: colors.brand.hover }]} onPress={() => navigation.navigate('Expense', { screen: 'CategorySelection' })}>
                    <Ionicons name="add" size={16} color="#FFF" />
                    <Text style={styles.emptyBtnText}>Add Expense</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  greeting: { color: '#FFF', fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, fontWeight: '500', marginTop: 1 },
  notifBtn: { position: 'relative', padding: 4 },
  notifDot: { position: 'absolute', top: 0, right: 0, backgroundColor: '#FF4D4F', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notifDotText: { color: '#FFF', fontSize: 9, fontWeight: '700' },

  balanceWrap: { marginHorizontal: 16, marginTop: 12 },
  balanceCard: { borderRadius: 24, padding: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 12 },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  balanceLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500', letterSpacing: 0.3 },
  balanceAmount: { color: '#FFFFFF', fontSize: 36, fontWeight: '800', letterSpacing: -1, marginTop: 4 },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(243,210,143,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  premiumText: { color: '#F3D28F', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  balanceDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 16 },
  balanceStats: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  balanceStat: { flex: 1 },
  balanceStatLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '500', marginBottom: 4 },
  balanceStatValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  balanceStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 12 },
  balanceProgress: { marginTop: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500' },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#F3D28F', borderRadius: 3 },

  quickActions: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 20 },
  qaCard: { flex: 1, alignItems: 'center', gap: 8, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 4, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  qaIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },

  section: { marginTop: 24 },
  spendingSection: { marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  seeAll: { fontSize: 13, fontWeight: '600' },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catLabel: { fontSize: 12, fontWeight: '600' },
  catAmount: { fontSize: 11, fontWeight: '700' },

  groupCard: { width: 140, padding: 14, borderRadius: 18, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  groupAvatar: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  groupName: { fontSize: 13, fontWeight: '700' },
  groupExpense: { fontSize: 12, fontWeight: '600' },

  txCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, marginBottom: 8, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  txAvatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1, gap: 2 },
  txName: { fontSize: 14, fontWeight: '600' },
  txCategory: { fontSize: 11, fontWeight: '500' },
  txAmount: { fontSize: 15, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40, lineHeight: 18 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 14, borderWidth: 1.5, borderColor: '#E86310', marginTop: 4 },
  emptyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
