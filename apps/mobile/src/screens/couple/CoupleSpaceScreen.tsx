import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Dimensions, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_W = (width - 40 - CARD_GAP) / 2;

function fmt(v: number) {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

const sections = [
  { key: 'CoupleIncome', icon: 'trending-up-outline', label: 'Income', desc: 'Add & manage income' },
  { key: 'CoupleExpenses', icon: 'cart-outline', label: 'Expenses', desc: 'Personal, shared & split' },
  { key: 'CoupleBudgets', icon: 'wallet-outline', label: 'Budgets', desc: 'Monthly budget tracking' },
  { key: 'CoupleSavings', icon: 'save-outline', label: 'Savings', desc: 'Save together' },
  { key: 'CoupleGoals', icon: 'trophy-outline', label: 'Goals', desc: 'Shared wishlist & goals' },
  { key: 'CoupleBills', icon: 'calendar-outline', label: 'Bills', desc: 'Upcoming & recurring' },
  { key: 'CoupleSettlements', icon: 'cash-outline', label: 'Settlements', desc: 'Balances & settle up' },
  { key: 'CoupleReports', icon: 'stats-chart-outline', label: 'Reports', desc: 'Spending insights' },
  { key: 'CoupleSettings', icon: 'settings-outline', label: 'Settings', desc: 'Preferences & profile' },
];

function ModuleCard({ sec, colors, navigation }: { sec: typeof sections[0]; colors: any; navigation: any }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() => navigation.navigate(sec.key)}
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
    >
      <Animated.View
        style={[
          styles.moduleCard,
          {
            backgroundColor: colors.bg.card,
            borderColor: colors.border.subtle,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={[styles.moduleIconWrap, { backgroundColor: colors.bg.tertiary }]}>
          <Ionicons name={sec.icon as any} size={20} color={colors.accent.primary} />
        </View>
        <Text style={[styles.moduleLabel, { color: colors.text.primary }]}>{sec.label}</Text>
        <Text style={[styles.moduleDesc, { color: colors.text.secondary }]}>{sec.desc}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function CoupleSpaceScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coupleData, setCoupleData] = useState<any>(null);
  const [error, setError] = useState('');

  const fetchCoupleData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const coupleGroup = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (!coupleGroup) {
        setError('No couple space found. Create a couple group to get started.');
        setCoupleData(null);
        return;
      }
      const dashboard = await api.get<any>(`/shared-finance/groups/${coupleGroup.id}/couple/dashboard`);
      setCoupleData({ ...(dashboard || {}), group: coupleGroup });
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load couple data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchCoupleData(); }, [fetchCoupleData]);

  if (loading) return <LoadingScreen />;

  const p1 = coupleData?.profile?.partner1;
  const p2 = coupleData?.profile?.partner2;
  const group = coupleData?.group;
  const partnerStats = coupleData?.partnerStats;
  const savingsProgress = coupleData?.savingsProgress;
  const goals = coupleData?.goals || [];

  const partner1Name = p1?.firstName || 'Partner 1';
  const partner2Name = p2?.firstName || 'Partner 2';
  const p1Initial = partner1Name[0] || 'P';
  const p2Initial = partner2Name[0] || 'P';

  const totalPaid = (partnerStats?.partner1?.totalPaid || 0) + (partnerStats?.partner2?.totalPaid || 0);
  const daysTogether = group?.createdAt ? daysSince(group.createdAt) : 0;
  const togetherSince = group?.createdAt
    ? new Date(group.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '';

  const sharedBudget = coupleData?.sharedBudget;
  const budgetUsed = sharedBudget?.spent ?? 0;
  const budgetTotal = sharedBudget?.budget ?? 0;
  const budgetPct = budgetTotal > 0 ? Math.round((budgetUsed / budgetTotal) * 100) : 0;

  const savingsAmount = savingsProgress?.saved ?? 0;
  const savingsTarget = savingsProgress?.goal ?? 0;
  const savingsPct = savingsProgress?.percentage ?? (savingsTarget > 0 ? Math.round((savingsAmount / savingsTarget) * 100) : 0);

  if (error && !coupleData) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
        <ScrollView contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View
            style={{ paddingTop: insets.top + 12, paddingBottom: 28, paddingHorizontal: 20, position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#d81159' }}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="arrow-back" size={22} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Couple Space</Text>
              <View style={{ width: 34 }} />
            </View>
          </View>
          <Ionicons name="heart-dislike-outline" size={48} color={colors.text.secondary} />
          <Text style={[styles.emptyTitle, { color: colors.text.primary, marginTop: 12 }]}>No Couple Space</Text>
          <Text style={[styles.emptyDesc, { color: colors.text.secondary, textAlign: 'center' }]}>{error}</Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCoupleData(true); }} tintColor={colors.accent.primary} />}
      >
        {/* ─── Premium Header ─── */}
        <View
          style={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: 20, backgroundColor: '#d81159' }}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Couple Space</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CoupleSettings')} style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="settings-outline" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.coupleInfo}>
            <View style={styles.profileRow}>
              <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={styles.avatarText}>{p1Initial}</Text>
              </View>
              <View style={[styles.heartWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="heart" size={18} color="#FFEBB4" />
              </View>
              <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={styles.avatarText}>{p2Initial}</Text>
              </View>
            </View>
            <Text style={styles.coupleName}>{partner1Name} & {partner2Name}</Text>
            {togetherSince && <Text style={styles.coupleSubtitle}>Together since {togetherSince}</Text>}
          </View>
        </View>

        {/* ─── Content ─── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
          {/* ─── Hero Card: Financial Status ─── */}
          <View style={[styles.heroCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
            <View style={styles.heroTop}>
              <Text style={[styles.heroLabel, { color: colors.text.secondary }]}>Total Shared Expenses</Text>
              <View style={[styles.heroBadge, { backgroundColor: colors.bg.tertiary }]}>
                <Ionicons name="calendar-outline" size={11} color={colors.accent.primary} />
                <Text style={[styles.heroBadgeText, { color: colors.accent.primary }]}>{daysTogether}d</Text>
              </View>
            </View>
            <Text style={[styles.heroAmount, { color: colors.text.primary }]}>{fmt(totalPaid)}</Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatLabel, { color: colors.text.secondary }]}>Partner 1</Text>
                <Text style={[styles.heroStatVal, { color: '#27D376' }]}>+{fmt(partnerStats?.partner1?.totalPaid || 0)}</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatLabel, { color: colors.text.secondary }]}>Partner 2</Text>
                <Text style={[styles.heroStatVal, { color: '#27D376' }]}>+{fmt(partnerStats?.partner2?.totalPaid || 0)}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.heroBtn, { backgroundColor: colors.accent.primary }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CoupleExpenses')}
            >
              <Ionicons name="receipt-outline" size={16} color="#FFF" />
              <Text style={styles.heroBtnText}>View Expenses</Text>
            </TouchableOpacity>
          </View>

          {/* ─── Budget Card ─── */}
          {budgetTotal > 0 && (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('CoupleBudgets')}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardIcon, { backgroundColor: colors.bg.tertiary }]}>
                    <Ionicons name="wallet-outline" size={16} color={colors.accent.primary} />
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Monthly Budget</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
              </View>
              <View style={styles.budgetRow}>
                <Text style={[styles.budgetAmount, { color: colors.text.primary }]}>{fmt(budgetTotal)}</Text>
                <Text style={[styles.budgetLabel, { color: colors.text.secondary }]}> / month</Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.bg.tertiary }]}>
                <View style={[styles.progressFill, { width: `${Math.min(budgetPct, 100)}%`, backgroundColor: colors.accent.primary }]} />
              </View>
              <View style={styles.progressMeta}>
                <Text style={[styles.progressLabel, { color: colors.text.secondary }]}>{fmt(budgetUsed)} used</Text>
                <Text style={[styles.progressPct, { color: budgetPct > 80 ? '#FF4545' : colors.text.secondary }]}>{budgetPct}%</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ─── Savings Card ─── */}
          {savingsTarget > 0 && (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('CoupleSavings')}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardIcon, { backgroundColor: colors.bg.tertiary }]}>
                    <Ionicons name="save-outline" size={16} color={colors.accent.primary} />
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Savings Goal</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
              </View>
              <View style={styles.savingsRow}>
                <Text style={[styles.goalAmount, { color: colors.text.primary }]}>{fmt(savingsAmount)}</Text>
                <Text style={[styles.goalTarget, { color: colors.text.secondary }]}>of {fmt(savingsTarget)}</Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.bg.tertiary }]}>
                <View style={[styles.progressFill, { width: `${Math.min(savingsPct, 100)}%`, backgroundColor: '#27D376' }]} />
              </View>
              <View style={styles.progressMeta}>
                <Text style={[styles.progressLabel, { color: colors.text.secondary }]}>{savingsPct}% completed</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ─── Modules Grid ─── */}
          <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>All Modules</Text>
          <View style={styles.sectionGrid}>
            {sections.map((sec) => (
              <ModuleCard key={sec.key} sec={sec} colors={colors} navigation={navigation} />
            ))}
          </View>

          {/* ─── Wishlist ─── */}
          {goals.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardIcon, { backgroundColor: colors.bg.tertiary }]}>
                    <Ionicons name="gift-outline" size={16} color={colors.accent.primary} />
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Shared Wishlist</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('CoupleGoals')}>
                  <Text style={[styles.cardAction, { color: colors.accent.primary }]}>View All</Text>
                </TouchableOpacity>
              </View>
              {goals.slice(0, 3).map((item: any, i: number) => (
                <View key={i} style={styles.wishlistItem}>
                  <View style={[styles.wishlistDot, { backgroundColor: colors.bg.tertiary }]}>
                    <Ionicons name="gift-outline" size={14} color={colors.accent.primary} />
                  </View>
                  <Text style={[styles.wishlistText, { color: colors.text.primary }]}>{item.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  coupleInfo: { alignItems: 'center', marginTop: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  heartWrap: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  coupleName: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  coupleSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500', marginTop: 4 },

  /* ─── Hero Card ─── */
  heroCard: {
    borderRadius: 24, padding: 22, marginTop: 0, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  heroLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  heroBadgeText: { fontSize: 11, fontWeight: '700' },
  heroAmount: { fontSize: 34, fontWeight: '800', letterSpacing: -1, marginBottom: 16 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  heroStat: { flex: 1 },
  heroStatLabel: { fontSize: 11, fontWeight: '500' },
  heroStatVal: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  heroStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 12 },
  heroBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 16,
  },
  heroBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  /* ─── Cards ─── */
  card: { borderRadius: 20, padding: 18, gap: 8, borderWidth: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardAction: { fontSize: 13, fontWeight: '600' },
  budgetRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  budgetAmount: { fontSize: 28, fontWeight: '800' },
  budgetLabel: { fontSize: 14, fontWeight: '500' },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  progressLabel: { fontSize: 11, fontWeight: '500' },
  progressPct: { fontSize: 11, fontWeight: '700' },
  savingsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  goalAmount: { fontSize: 24, fontWeight: '800' },
  goalTarget: { fontSize: 12, fontWeight: '500' },

  /* ─── Modules Grid ─── */
  sectionLabel: { fontSize: 18, fontWeight: '800', marginTop: 8, marginBottom: -4 },
  sectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },
  moduleCard: {
    width: CARD_W, borderRadius: 20, padding: 16, gap: 8,
    borderWidth: 1,
  },
  moduleIconWrap: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  moduleLabel: { fontSize: 14, fontWeight: '700' },
  moduleDesc: { fontSize: 11, fontWeight: '500', lineHeight: 15 },

  /* ─── Wishlist ─── */
  wishlistItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  wishlistDot: {
    width: 28, height: 28, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  wishlistText: { fontSize: 13, fontWeight: '600' },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 14 },
});
