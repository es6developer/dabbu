import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

function fmt(v: number) {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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
  const sharedBudget = coupleData?.sharedBudget;
  const savingsProgress = coupleData?.savingsProgress;
  const goals = coupleData?.goals || [];
  const upcomingBills = coupleData?.upcomingBills || [];
  const partnerStats = coupleData?.partnerStats;

  const partner1Name = p1?.firstName || 'Partner 1';
  const partner2Name = p2?.firstName || 'Partner 2';
  const p1Initial = partner1Name[0] || 'P';
  const p2Initial = partner2Name[0] || 'P';

  const totalPaid = (partnerStats?.partner1?.totalPaid || 0) + (partnerStats?.partner2?.totalPaid || 0);
  const daysTogether = group?.createdAt ? daysSince(group.createdAt) : 0;
  const togetherSince = group?.createdAt
    ? new Date(group.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '';

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
            <TouchableOpacity style={styles.backBtn}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#FFF" />
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
            <TouchableOpacity style={styles.heroBtn} activeOpacity={0.8}>
              <Text style={styles.heroBtnText}>Start a Split</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <LinearGradient
              colors={['#5D38B510', '#7A52D108']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.statCard, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            >
              <Ionicons name="wallet-outline" size={20} color="#5D38B5" />
              <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Shared</Text>
              <Text style={[styles.statValue, { color: colors.text.primary }]}>{fmt(totalPaid)}</Text>
            </LinearGradient>
            <LinearGradient
              colors={['#5D38B510', '#7A52D108']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.statCard, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            >
              <Ionicons name="calendar-outline" size={20} color="#5D38B5" />
              <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Days</Text>
              <Text style={[styles.statValue, { color: isDark ? '#FFEBB4' : '#5D38B5' }]}>{daysTogether}</Text>
            </LinearGradient>
          </View>

          {budgetTotal > 0 && (
            <View style={[styles.card, { backgroundColor: colors.bg.card, shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.06)' }]}>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Monthly Budget</Text>
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
            </View>
          )}

          {savingsTarget > 0 && (
            <View style={[styles.card, { backgroundColor: colors.bg.card, shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.06)' }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Savings Goal</Text>
                <TouchableOpacity>
                  <Text style={[styles.cardAction, { color: '#5D38B5' }]}>Edit</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.goalAmount, { color: colors.text.primary }]}>{fmt(savingsAmount)}</Text>
              <Text style={[styles.goalTarget, { color: colors.text.tertiary }]}>of {fmt(savingsTarget)} target</Text>
              <View style={[styles.progressBar, { backgroundColor: colors.bg.tertiary, marginTop: 8 }]}>
                <View style={[styles.progressFill, { width: `${Math.min(savingsPct, 100)}%`, backgroundColor: '#F3D28F' }]} />
              </View>
              <Text style={[styles.progressLabel, { color: colors.text.tertiary }]}>{savingsPct}% completed</Text>
            </View>
          )}

          {goals.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.bg.card, shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.06)' }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Shared Wishlist</Text>
                <TouchableOpacity>
                  <Text style={[styles.cardAction, { color: '#5D38B5' }]}>Add</Text>
                </TouchableOpacity>
              </View>
              {goals.map((item: any, i: number) => (
                <View key={i} style={styles.wishlistItem}>
                  <View style={styles.wishlistDot}>
                    <Ionicons name="gift-outline" size={14} color="#FFF" />
                  </View>
                  <Text style={[styles.wishlistText, { color: colors.text.primary }]}>{item.name}</Text>
                </View>
              ))}
            </View>
          )}

          {upcomingBills.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.bg.card, shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.06)' }]}>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Upcoming Bills</Text>
              {upcomingBills.map((bill: any, i: number) => (
                <View key={i} style={styles.billRow}>
                  <View style={[styles.billDot, { backgroundColor: '#FF4D4F' }]} />
                  <Text style={[styles.billName, { color: colors.text.primary }]}>{bill.type || bill.name}</Text>
                  <Text style={[styles.billAmount, { color: colors.text.primary }]}>{fmt(bill.amount)}</Text>
                  <Text style={[styles.billDate, { color: colors.text.tertiary }]}>{fmtDate(bill.dueDate)}</Text>
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

  statsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  statCard: { flex: 1, padding: 16, borderRadius: 18, borderWidth: 1, gap: 6, alignItems: 'center' },
  statLabel: { fontSize: 11, fontWeight: '500' },
  statValue: { fontSize: 20, fontWeight: '800' },

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
  wishlistItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  wishlistDot: {
    width: 28, height: 28, borderRadius: 10, backgroundColor: '#5D38B5',
    alignItems: 'center', justifyContent: 'center',
  },
  wishlistText: { fontSize: 13, fontWeight: '600' },
  billRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  billDot: { width: 6, height: 6, borderRadius: 3 },
  billName: { fontSize: 13, fontWeight: '600', flex: 1 },
  billAmount: { fontSize: 14, fontWeight: '700' },
  billDate: { fontSize: 12, fontWeight: '500', width: 55, textAlign: 'right' },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 14 },
});
