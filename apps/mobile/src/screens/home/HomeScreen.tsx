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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { BalanceCard } from '../../components/ui/BalanceCard';
import { QuickActions } from '../../components/ui/QuickActions';
import { TransactionCard } from '../../components/ui/TransactionCard';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

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

  const quickActions = [
    { label: 'Add Expense', icon: 'add-circle-outline' as const, color: '#6C3EF4', onPress: () => navigation.navigate('Expense', { screen: 'CategorySelection' }) },
    { label: 'Create Circle', icon: 'people-outline' as const, color: '#8B5CF6', onPress: () => navigation.navigate('Spaces', { screen: 'CreateCircle' }) },
    { label: 'Split Payment', icon: 'swap-horizontal-outline' as const, color: '#34C759', onPress: () => navigation.navigate('Spaces', { screen: 'SplitExpense' }) },
    { label: 'Reports', icon: 'stats-chart-outline' as const, color: '#F3D28F', onPress: () => navigation.navigate('Settings', { screen: 'Reports' }) },
  ];

  if (loading) return <LoadingScreen />;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
      <Animated.View style={[styles.screen, { opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(true); }} tintColor="#6C3EF4" />}
        >
          <LinearGradient
            colors={['#6C3EF4', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingTop: insets.top + 16, paddingBottom: 48, paddingHorizontal: 20 }}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.avatarRow} onPress={() => navigation.navigate('Settings', { screen: 'Profile' })} activeOpacity={0.8}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{user?.firstName?.[0] || 'U'}</Text>
                </View>
                <View>
                  <Text style={styles.greeting}>Hello {user?.firstName || 'User'} 👋</Text>
                  <Text style={styles.headerSubtitle}>Manage your money smarter</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.notifBtn}>
                <Ionicons name="notifications-outline" size={24} color="#FFF" />
                {unreadNotifications > 0 && (
                  <View style={styles.notifDot}><Text style={styles.notifDotText}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text></View>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <BalanceCard
            totalBalance={data.totalBalance}
            monthlySpending={data.monthlySpending}
            monthlyBudget={data.monthlyBudget}
          />

          <QuickActions actions={quickActions} />

          {data.categories.length > 0 && (
            <View style={styles.spendingSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Spending by Category</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Settings', { screen: 'Reports' })}>
                  <Text style={[styles.seeAll, { color: '#6C3EF4' }]}>See all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                {data.categories.slice(0, 8).map((cat: any, i: number) => {
                  const catColors: Record<string, string> = {
                    Food: '#FF6B6B', Travel: '#60A5FA', Shopping: '#A78BFA',
                    Bills: '#F59E0B', Fuel: '#34C759', Medical: '#FF4D4F',
                    Entertainment: '#8B5CF6', Groceries: '#F3D28F',
                  };
                  const cc = catColors[cat.category || cat.name] || '#6C3EF4';
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

          <View style={styles.recentSection}>
            <View style={[styles.sectionHeader, { paddingHorizontal: 20 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Recent Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Expense', { screen: 'ExpenseHome' })}>
                <Text style={[styles.seeAll, { color: '#6C3EF4' }]}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 20, marginTop: 4 }}>
              {data.recentTransactions.length > 0 ? (
                data.recentTransactions.map((tx: any) => (
                  <TransactionCard
                    key={tx.id}
                    name={tx.description || tx.category?.name || tx.category || 'Transaction'}
                    amount={tx.amount ? -Math.abs(Number(tx.amount)) : 0}
                    category={tx.category?.name || tx.category || 'General'}
                    date={fdate(tx.date || tx.createdAt)}
                    onPress={() => navigation.navigate('Expense', { screen: 'TransactionDetail', params: { transactionId: tx.id } })}
                  />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIcon, { backgroundColor: '#6C3EF415' }]}>
                    <Ionicons name="receipt-outline" size={32} color="#6C3EF4" />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>No activity yet</Text>
                  <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>Add your first expense to see activity here</Text>
                  <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: '#6C3EF4' }]} onPress={() => navigation.navigate('Expense', { screen: 'CategorySelection' })}>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  greeting: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500', marginTop: 1 },
  notifBtn: { position: 'relative', padding: 4 },
  notifDot: { position: 'absolute', top: 0, right: 0, backgroundColor: '#FF4D4F', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notifDotText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  spendingSection: { marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  seeAll: { fontSize: 13, fontWeight: '600' },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catLabel: { fontSize: 12, fontWeight: '600' },
  catAmount: { fontSize: 11, fontWeight: '700' },
  recentSection: { marginTop: 24 },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40, lineHeight: 18 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 14, marginTop: 4 },
  emptyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
