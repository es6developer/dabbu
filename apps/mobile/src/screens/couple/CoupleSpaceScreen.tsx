import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  { key: 'CoupleIncome', icon: 'trending-up-outline', label: 'Income', desc: 'Add & manage income', gradient: ['#34C759', '#30D158'] as [string, string] },
  { key: 'CoupleExpenses', icon: 'cart-outline', label: 'Expenses', desc: 'Personal, shared & split', gradient: ['#FF4D4F', '#FF6B6B'] as [string, string] },
  { key: 'CoupleBudgets', icon: 'wallet-outline', label: 'Budgets', desc: 'Monthly budget tracking', gradient: ['#6C3EF4', '#8B5CF6'] as [string, string] },
  { key: 'CoupleSavings', icon: 'save-outline', label: 'Savings', desc: 'Save together', gradient: ['#F3D28F', '#F5DBA8'] as [string, string] },
  { key: 'CoupleGoals', icon: 'trophy-outline', label: 'Goals', desc: 'Shared wishlist & goals', gradient: ['#F59E0B', '#FBBF24'] as [string, string] },
  { key: 'CoupleBills', icon: 'calendar-outline', label: 'Bills', desc: 'Upcoming & recurring', gradient: ['#60A5FA', '#93C5FD'] as [string, string] },
  { key: 'CoupleSettlements', icon: 'cash-outline', label: 'Settlements', desc: 'Balances & settle up', gradient: ['#8B5CF6', '#A78BFA'] as [string, string] },
  { key: 'CoupleReports', icon: 'stats-chart-outline', label: 'Reports', desc: 'Spending insights', gradient: ['#EC4899', '#F472B6'] as [string, string] },
  { key: 'CoupleSettings', icon: 'settings-outline', label: 'Settings', desc: 'Preferences & profile', gradient: ['#6B7280', '#9CA3AF'] as [string, string] },
];

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
          <LinearGradient
            colors={['#5D38B5', '#7A52D1']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ paddingTop: insets.top + 12, paddingBottom: 28, paddingHorizontal: 20, position: 'absolute', top: 0, left: 0, right: 0 }}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Couple Space</Text>
              <View style={{ width: 32 }} />
            </View>
          </LinearGradient>
          <Ionicons name="heart-dislike-outline" size={48} color={isDark ? '#7A52D1' : '#5D38B5'} />
          <Text style={[styles.emptyTitle, { color: colors.text.secondary, marginTop: 12 }]}>No Couple Space</Text>
          <Text style={[styles.emptyDesc, { color: colors.text.tertiary, textAlign: 'center' }]}>{error}</Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCoupleData(true); }} tintColor="#5D38B5" />}
      >
        <LinearGradient
          colors={['#5D38B5', '#7A52D1']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingBottom: 28, paddingHorizontal: 20 }}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Couple Space</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CoupleSettings')} style={styles.backBtn}>
              <Ionicons name="settings-outline" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.coupleInfo}>
            <View style={styles.profileRow}>
              <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Text style={styles.avatarText}>{p1Initial}</Text>
              </View>
              <View style={styles.heartWrap}>
                <Ionicons name="heart" size={18} color="#FFEBB4" />
              </View>
              <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Text style={styles.avatarText}>{p2Initial}</Text>
              </View>
            </View>
            <Text style={styles.coupleName}>{partner1Name} & {partner2Name}</Text>
            {togetherSince && <Text style={styles.coupleSubtitle}>Together since {togetherSince}</Text>}
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
          <View style={[styles.heroCard, { backgroundColor: '#FFEBB4' }]}>
            <View style={styles.heroTop}>
              <Text style={styles.heroLabel}>Total Shared Expenses</Text>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{daysTogether} days</Text>
              </View>
            </View>
            <Text style={styles.heroAmount}>{fmt(totalPaid)}</Text>
            <TouchableOpacity
              style={styles.heroBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('CoupleExpenses')}
            >
              <Text style={styles.heroBtnText}>View Expenses</Text>
            </TouchableOpacity>
          </View>

          {budgetTotal > 0 && (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.bg.card }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('CoupleBudgets')}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Monthly Budget</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
              </View>
              <View style={styles.budgetRow}>
                <Text style={[styles.budgetAmount, { color: colors.text.primary }]}>{fmt(budgetTotal)}</Text>
                <Text style={[styles.budgetLabel, { color: colors.text.tertiary }]}> / month</Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.bg.tertiary }]}>
                <View style={[styles.progressFill, { width: `${Math.min(budgetPct, 100)}%` }]} />
              </View>
              <Text style={[styles.progressLabel, { color: colors.text.tertiary }]}>
                {fmt(budgetUsed)} used ({budgetPct}%)
              </Text>
            </TouchableOpacity>
          )}

          {savingsTarget > 0 && (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.bg.card }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('CoupleSavings')}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Savings Goal</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
              </View>
              <Text style={[styles.goalAmount, { color: colors.text.primary }]}>{fmt(savingsAmount)}</Text>
              <Text style={[styles.goalTarget, { color: colors.text.tertiary }]}>of {fmt(savingsTarget)} target</Text>
              <View style={[styles.progressBar, { backgroundColor: colors.bg.tertiary, marginTop: 8 }]}>
                <View style={[styles.progressFill, { width: `${Math.min(savingsPct, 100)}%`, backgroundColor: '#F3D28F' }]} />
              </View>
              <Text style={[styles.progressLabel, { color: colors.text.tertiary }]}>{savingsPct}% completed</Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>All Modules</Text>

          <View style={styles.sectionGrid}>
            {sections.map((sec) => (
              <TouchableOpacity
                key={sec.key}
                activeOpacity={0.7}
                style={[styles.moduleCard, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}
                onPress={() => navigation.navigate(sec.key)}
              >
                <LinearGradient colors={sec.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.moduleIconWrap}>
                  <Ionicons name={sec.icon as any} size={20} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.moduleLabel, { color: colors.text.primary }]}>{sec.label}</Text>
                <Text style={[styles.moduleDesc, { color: colors.text.tertiary }]}>{sec.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {goals.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Shared Wishlist</Text>
                <TouchableOpacity onPress={() => navigation.navigate('CoupleGoals')}>
                  <Text style={[styles.cardAction, { color: '#5D38B5' }]}>View All</Text>
                </TouchableOpacity>
              </View>
              {goals.slice(0, 3).map((item: any, i: number) => (
                <View key={i} style={styles.wishlistItem}>
                  <View style={styles.wishlistDot}>
                    <Ionicons name="gift-outline" size={14} color="#FFF" />
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
  backBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  coupleInfo: { alignItems: 'center', marginTop: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  heartWrap: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  coupleName: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  coupleSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500', marginTop: 4 },

  heroCard: {
    borderRadius: 24, padding: 22, marginTop: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  heroLabel: { fontSize: 12, fontWeight: '600', color: '#5D38B5', letterSpacing: 0.3 },
  heroBadge: { backgroundColor: 'rgba(93,56,181,0.12)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  heroBadgeText: { fontSize: 11, fontWeight: '700', color: '#5D38B5' },
  heroAmount: { fontSize: 32, fontWeight: '800', color: '#5D38B5', letterSpacing: -1, marginBottom: 14 },
  heroBtn: {
    backgroundColor: '#5D38B5', paddingVertical: 14, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  heroBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  card: { borderRadius: 20, padding: 18, gap: 8, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardAction: { fontSize: 13, fontWeight: '600' },
  budgetRow: { flexDirection: 'row', alignItems: 'baseline' },
  budgetAmount: { fontSize: 28, fontWeight: '800' },
  budgetLabel: { fontSize: 14, fontWeight: '500' },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', backgroundColor: '#5D38B5', borderRadius: 3 },
  progressLabel: { fontSize: 11, fontWeight: '500', marginTop: 4 },
  goalAmount: { fontSize: 24, fontWeight: '800' },
  goalTarget: { fontSize: 12, fontWeight: '500' },

  sectionLabel: { fontSize: 18, fontWeight: '800', marginTop: 8, marginBottom: -4 },
  sectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },
  moduleCard: {
    width: CARD_W, borderRadius: 20, padding: 16, gap: 8,
    borderWidth: 1, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  moduleIconWrap: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  moduleLabel: { fontSize: 14, fontWeight: '700' },
  moduleDesc: { fontSize: 11, fontWeight: '500', lineHeight: 15 },

  wishlistItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  wishlistDot: {
    width: 28, height: 28, borderRadius: 10, backgroundColor: '#5D38B5',
    alignItems: 'center', justifyContent: 'center',
  },
  wishlistText: { fontSize: 13, fontWeight: '600' },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 14 },
});
