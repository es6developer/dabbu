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
  const { colors } = useTheme();
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
            colors={['#FF6B9D', '#FF8FB3']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ paddingTop: insets.top + 12, paddingBottom: 28, paddingHorizontal: 20, position: 'absolute', top: 0, left: 0, right: 0 }}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#FFF" />
              </TouchableOpacity>
              <View style={{ width: 32 }} />
            </View>
          </LinearGradient>
          <Ionicons name="heart-dislike-outline" size={48} color="#FF6B9D" />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCoupleData(true); }} tintColor="#FF6B9D" />}
      >
        <LinearGradient
          colors={['#FF6B9D', '#FF8FB3']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingBottom: 28, paddingHorizontal: 20 }}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={{ width: 32 }} />
          </View>
          <View style={styles.coupleInfo}>
            <View style={styles.profileRow}>
              <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                <Text style={styles.avatarText}>{p1Initial}</Text>
              </View>
              <Ionicons name="heart" size={20} color="#FFF" />
              <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                <Text style={styles.avatarText}>{p2Initial}</Text>
              </View>
            </View>
            <Text style={styles.coupleName}>{partner1Name} ❤️ {partner2Name}</Text>
            {togetherSince && <Text style={styles.coupleSubtitle}>Together since {togetherSince}</Text>}
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
          <View style={styles.statsRow}>
            <LinearGradient
              colors={['#6C3EF415', '#8B5CF608']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.statCard, { borderColor: colors.border.subtle }]}
            >
              <Ionicons name="wallet-outline" size={20} color="#6C3EF4" />
              <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Shared Expenses</Text>
              <Text style={[styles.statValue, { color: colors.text.primary }]}>{fmt(totalPaid)}</Text>
            </LinearGradient>
            <LinearGradient
              colors={['#FF6B9D10', '#FF8FB308']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.statCard, { borderColor: colors.border.subtle }]}
            >
              <Ionicons name="heart-outline" size={20} color="#FF6B9D" />
              <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Days Together</Text>
              <Text style={[styles.statValue, { color: '#FF6B9D' }]}>{daysTogether}</Text>
            </LinearGradient>
          </View>

          {budgetTotal > 0 && (
            <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Monthly Budget</Text>
              <View style={styles.budgetRow}>
                <Text style={[styles.budgetAmount, { color: colors.text.primary }]}>{fmt(budgetTotal)}</Text>
                <Text style={[styles.budgetLabel, { color: colors.text.tertiary }]}> / month</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(budgetPct, 100)}%` }]} />
              </View>
              <Text style={[styles.progressLabel, { color: colors.text.tertiary }]}>
                {fmt(budgetUsed)} used this month ({budgetPct}%)
              </Text>
            </View>
          )}

          {savingsTarget > 0 && (
            <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Savings Goal</Text>
                <TouchableOpacity>
                  <Text style={[styles.cardAction, { color: '#6C3EF4' }]}>Edit</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.goalAmount, { color: colors.text.primary }]}>{fmt(savingsAmount)}</Text>
              <Text style={[styles.goalTarget, { color: colors.text.tertiary }]}>of {fmt(savingsTarget)} target</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(savingsPct, 100)}%`, backgroundColor: '#F3D28F' }]} />
              </View>
              <Text style={[styles.progressLabel, { color: colors.text.tertiary }]}>{savingsPct}% completed</Text>
            </View>
          )}

          {goals.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Shared Wishlist</Text>
                <TouchableOpacity>
                  <Text style={[styles.cardAction, { color: '#6C3EF4' }]}>Add</Text>
                </TouchableOpacity>
              </View>
              {goals.map((item: any, i: number) => (
                <View key={i} style={styles.wishlistItem}>
                  <Ionicons name="gift-outline" size={16} color="#FF6B9D" />
                  <Text style={[styles.wishlistText, { color: colors.text.primary }]}>{item.name}</Text>
                </View>
              ))}
            </View>
          )}

          {upcomingBills.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Upcoming Bills</Text>
              {upcomingBills.map((bill: any, i: number) => (
                <View key={i} style={styles.billRow}>
                  <View style={styles.billInfo}>
                    <View style={[styles.billDot, { backgroundColor: '#FF4D4F' }]} />
                    <Text style={[styles.billName, { color: colors.text.primary }]}>{bill.type || bill.name}</Text>
                  </View>
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
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  coupleInfo: { alignItems: 'center', marginTop: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 50, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  coupleName: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  coupleSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, padding: 16, borderRadius: 18, borderWidth: 1, gap: 6, alignItems: 'center' },
  statLabel: { fontSize: 11, fontWeight: '500' },
  statValue: { fontSize: 18, fontWeight: '800' },
  card: { borderRadius: 20, padding: 18, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardAction: { fontSize: 13, fontWeight: '600' },
  budgetRow: { flexDirection: 'row', alignItems: 'baseline' },
  budgetAmount: { fontSize: 28, fontWeight: '800' },
  budgetLabel: { fontSize: 14, fontWeight: '500' },
  progressBar: { height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', backgroundColor: '#6C3EF4', borderRadius: 3 },
  progressLabel: { fontSize: 11, fontWeight: '500', marginTop: 4 },
  goalAmount: { fontSize: 24, fontWeight: '800' },
  goalTarget: { fontSize: 12, fontWeight: '500' },
  wishlistItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  wishlistText: { fontSize: 13, fontWeight: '500' },
  billRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  billInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  billDot: { width: 6, height: 6, borderRadius: 3 },
  billName: { fontSize: 13, fontWeight: '600' },
  billAmount: { fontSize: 14, fontWeight: '700' },
  billDate: { fontSize: 12, fontWeight: '500', width: 50, textAlign: 'right' },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 14 },
});
