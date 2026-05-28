import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { Card } from '../../components/ui/Card';

const { width } = Dimensions.get('window');

export function CoupleFinanceDashboardScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const [dashboard, setDashboard] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadData();
  }, [accessToken]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [loading]);

  async function loadData() {
    try {
      const [dashRes, profRes] = await Promise.all([
        api.get<any>('/shared-finance/couple/dashboard'),
        api.get<any>('/shared-finance/couple/profile'),
      ]);
      setDashboard(dashRes.data);
      setProfile(profRes.data);
    } catch (e) {
      console.error('CoupleFinanceDashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }

  const p1 = profile?.partner1 || { name: 'Partner1', avatar: null };
  const p2 = profile?.partner2 || { name: 'Partner2', avatar: null };
  const d = dashboard || {};
  const savingsTarget = d.sharedSavingsTarget || 1;
  const savingsProgress = Math.min((d.sharedSavingsCurrent || 0) / savingsTarget, 1);
  const savingsPct = Math.round(savingsProgress * 100);
  const ringRadius = 44;
  const ringCirc = 2 * Math.PI * ringRadius;
  const comparisonPct = d.comparisonPercentage || 35;
  const comparisonLeader = d.comparisonLeader || p1.name;
  const sharedExpenses = Array.isArray(d.recentSharedExpenses) ? d.recentSharedExpenses : [];

  const formatCurrency = (val: number) => {
    if (val >= 10000000) return '₹' + (val / 10000000).toFixed(1) + 'Cr';
    if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L';
    return '₹' + val.toLocaleString('en-IN');
  };

  const ratioBanner = `Recommended split ${d.recommendedSplit || '60:40'} based on income`;
  const categoryComparison = Array.isArray(d.categoryComparison) ? d.categoryComparison : [];

  const incomeVsExpense = d.monthlyIncome || 0;
  const maxBar = Math.max(incomeVsExpense, d.monthlySpending || 0, 1);

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.bg.primary, opacity: fadeAnim }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
      >
        <LinearGradient colors={['#1a1a2e', colors.bg.primary]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.headerGradient}>
          <View style={styles.partnerRow}>
            <View style={styles.partnerCard}>
              <LinearGradient colors={[colors.accent.primary, colors.accent.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.partnerAvatar}>
                <Text style={styles.partnerAvatarText}>{p1.name?.[0] || 'A'}</Text>
              </LinearGradient>
              <Text style={[styles.partnerName, { color: colors.text.primary }]}>{p1.name}</Text>
              <Text style={[styles.partnerSub, { color: colors.text.tertiary }]}>Partner 1</Text>
            </View>
            <View style={styles.partnerHeart}>
              <Ionicons name="heart" size={24} color={colors.accent.primary} />
            </View>
            <View style={styles.partnerCard}>
              <LinearGradient colors={[colors.status.info, '#a29bfe']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.partnerAvatar}>
                <Text style={styles.partnerAvatarText}>{p2.name?.[0] || 'B'}</Text>
              </LinearGradient>
              <Text style={[styles.partnerName, { color: colors.text.primary }]}>{p2.name}</Text>
              <Text style={[styles.partnerSub, { color: colors.text.tertiary }]}>Partner 2</Text>
            </View>
          </View>
        </LinearGradient>

        <Card variant="glass" style={styles.sectionCard} padding="xl">
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Joint Summary</Text>
          <View style={styles.jointRow}>
            <View style={styles.jointItem}>
              <Text style={[styles.jointLabel, { color: colors.text.tertiary }]}>Monthly Spending</Text>
              <Text style={[styles.jointValue, { color: colors.status.error }]}>{formatCurrency(d.monthlySpending || 0)}</Text>
            </View>
            <View style={[styles.jointDivider, { backgroundColor: colors.border.subtle }]} />
            <View style={styles.jointItem}>
              <Text style={[styles.jointLabel, { color: colors.text.tertiary }]}>Monthly Income</Text>
              <Text style={[styles.jointValue, { color: colors.status.success }]}>{formatCurrency(d.monthlyIncome || 0)}</Text>
            </View>
          </View>
          <View style={styles.savingsSection}>
            <View style={styles.savingsRing}>
              <Svg width={100} height={100} viewBox="0 0 100 100">
                <Circle cx="50" cy="50" r={ringRadius} stroke={colors.border.subtle} strokeWidth="8" fill="none" />
                <Circle
                  cx="50" cy="50" r={ringRadius}
                  stroke={colors.accent.primary} strokeWidth="8" fill="none"
                  strokeDasharray={`${savingsPct * ringCirc / 100} ${ringCirc}`}
                  strokeDashoffset={ringCirc * 0.25}
                  strokeLinecap="round"
                />
              </Svg>
              <View style={styles.savingsRingCenter}>
                <Text style={[styles.savingsPct, { color: colors.text.primary }]}>{savingsPct}%</Text>
                <Text style={[styles.savingsLabel, { color: colors.text.tertiary }]}>saved</Text>
              </View>
            </View>
            <View style={styles.savingsInfo}>
              <Text style={[styles.savingsTitle, { color: colors.text.secondary }]}>Shared Savings</Text>
              <Text style={[styles.savingsAmount, { color: colors.text.primary }]}>{formatCurrency(d.sharedSavingsCurrent || 0)}</Text>
              <Text style={[styles.savingsTarget, { color: colors.text.tertiary }]}>of {formatCurrency(savingsTarget)} target</Text>
            </View>
          </View>
        </Card>

        <View style={[styles.ratioBanner, { backgroundColor: colors.accent.primary + '12', borderColor: colors.accent.primary + '30' }]}>
          <Ionicons name="calculator-outline" size={18} color={colors.accent.primary} />
          <Text style={[styles.ratioText, { color: colors.accent.primary }]}>{ratioBanner}</Text>
        </View>

        <Card variant="glass" style={styles.sectionCard} padding="xl">
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Partner Comparison</Text>
            <TouchableOpacity style={styles.seeAllBtn}>
              <Text style={[styles.seeAllText, { color: colors.accent.primary }]}>Details</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.accent.primary} />
            </TouchableOpacity>
          </View>
          {categoryComparison.length > 0 ? categoryComparison.map((cat: any, i: number) => {
            const maxCat = Math.max(cat.partner1Amount || 0, cat.partner2Amount || 0, 1);
            return (
              <View key={i} style={styles.compCategory}>
                <Text style={[styles.compCatName, { color: colors.text.secondary }]}>{cat.category || 'Category'}</Text>
                <View style={styles.compBarRow}>
                  <Text style={[styles.compBarLabel, { color: colors.text.tertiary }]}>{p1.name?.slice(0, 3)}</Text>
                  <View style={styles.compBarTrack}>
                    <View style={[styles.compBarFill, { width: `${((cat.partner1Amount || 0) / maxCat) * 100}%`, backgroundColor: colors.accent.primary }]} />
                  </View>
                </View>
                <View style={styles.compBarRow}>
                  <Text style={[styles.compBarLabel, { color: colors.text.tertiary }]}>{p2.name?.slice(0, 3)}</Text>
                  <View style={styles.compBarTrack}>
                    <View style={[styles.compBarFill, { width: `${((cat.partner2Amount || 0) / maxCat) * 100}%`, backgroundColor: colors.status.info }]} />
                  </View>
                </View>
              </View>
            );
          }) : (
            <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>No comparison data yet</Text>
          )}
          {comparisonPct > 0 && (
            <View style={[styles.compAlert, { backgroundColor: colors.status.warningLight }]}>
              <Ionicons name="trending-up" size={16} color={colors.status.warning} />
              <Text style={[styles.compAlertText, { color: colors.status.warning }]}>
                {comparisonLeader} spent {comparisonPct}% more this month
              </Text>
            </View>
          )}
        </Card>

        <Card variant="glass" style={styles.sectionCard} padding="xl">
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Monthly Overview</Text>
          <View style={styles.barChart}>
            <View style={styles.barChartCol}>
              <Text style={[styles.barChartLabel, { color: colors.text.tertiary }]}>Income</Text>
              <View style={styles.barChartTrack}>
                <View style={[styles.barChartFill, { height: `${(incomeVsExpense / maxBar) * 100}%`, backgroundColor: colors.status.success }]} />
              </View>
              <Text style={[styles.barChartValue, { color: colors.status.success }]}>{formatCurrency(incomeVsExpense)}</Text>
            </View>
            <View style={styles.barChartCol}>
              <Text style={[styles.barChartLabel, { color: colors.text.tertiary }]}>Expense</Text>
              <View style={styles.barChartTrack}>
                <View style={[styles.barChartFill, { height: `${((d.monthlySpending || 0) / maxBar) * 100}%`, backgroundColor: colors.status.error }]} />
              </View>
              <Text style={[styles.barChartValue, { color: colors.status.error }]}>{formatCurrency(d.monthlySpending || 0)}</Text>
            </View>
          </View>
        </Card>

        <Card variant="glass" style={styles.sectionCard} padding="xl">
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>AI Insights</Text>
          <View style={[styles.insightCard, { backgroundColor: colors.bg.glass }]}>
            <Ionicons name="bulb-outline" size={20} color={colors.accent.primary} />
            <Text style={[styles.insightText, { color: colors.text.secondary }]}>
              {d.insightFairContribution || 'Based on your income ratio, fair contribution would be split proportionally.'}
            </Text>
          </View>
          <View style={[styles.insightCard, { backgroundColor: colors.bg.glass }]}>
            <Ionicons name="pricetag-outline" size={20} color={colors.status.warning} />
            <Text style={[styles.insightText, { color: colors.text.secondary }]}>
              {d.insightSubscriptions || 'You could save more by sharing subscriptions and memberships.'}
            </Text>
          </View>
        </Card>

        <Card variant="glass" style={styles.sectionCard} padding="xl">
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Recent Shared Expenses</Text>
          </View>
          {sharedExpenses.length > 0 ? sharedExpenses.slice(0, 5).map((exp: any, i: number) => (
            <TouchableOpacity key={exp.id || i} style={[styles.expenseRow, { borderBottomColor: colors.border.subtle }]}>
              <View style={[styles.expenseIcon, { backgroundColor: colors.status.errorLight }]}>
                <Ionicons name="receipt-outline" size={16} color={colors.status.error} />
              </View>
              <View style={styles.expenseInfo}>
                <Text style={[styles.expenseName, { color: colors.text.primary }]}>{exp.description || 'Shared expense'}</Text>
                <Text style={[styles.expenseMeta, { color: colors.text.tertiary }]}>
                  {exp.paidBy?.name || 'Someone'} · {new Date(exp.date || exp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <Text style={[styles.expenseAmount, { color: colors.status.error }]}>-{formatCurrency(Number(exp.amount))}</Text>
            </TouchableOpacity>
          )) : (
            <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>No shared expenses yet</Text>
          )}
        </Card>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.accent.primary }]} onPress={() => navigation.navigate('CreateGroupExpense')}>
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Add Shared Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border.default }]} onPress={() => navigation.navigate('GroupDashboard')}>
            <Text style={[styles.secondaryBtnText, { color: colors.text.secondary }]}>View Full Report</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerGradient: { paddingTop: 60, paddingBottom: 20 },
  partnerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, gap: 16 },
  partnerCard: { alignItems: 'center', flex: 1 },
  partnerAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  partnerAvatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  partnerName: { fontSize: 16, fontWeight: '600' },
  partnerSub: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  partnerHeart: { marginBottom: 24 },
  sectionCard: { marginHorizontal: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 12, fontWeight: '600' },
  jointRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  jointItem: { flex: 1, alignItems: 'center' },
  jointLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  jointValue: { fontSize: 20, fontWeight: '700' },
  jointDivider: { width: 1, height: 36, marginHorizontal: 12 },
  savingsSection: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  savingsRing: { position: 'relative', width: 100, height: 100, justifyContent: 'center', alignItems: 'center' },
  savingsRingCenter: { position: 'absolute', alignItems: 'center' },
  savingsPct: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  savingsLabel: { fontSize: 9, fontWeight: '500', marginTop: 1 },
  savingsInfo: { flex: 1 },
  savingsTitle: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  savingsAmount: { fontSize: 22, fontWeight: '700' },
  savingsTarget: { fontSize: 11, marginTop: 2 },
  ratioBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 14, borderWidth: 1, gap: 10 },
  ratioText: { fontSize: 13, fontWeight: '600', flex: 1 },
  compCategory: { marginBottom: 14 },
  compCatName: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  compBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  compBarLabel: { fontSize: 11, fontWeight: '600', width: 28 },
  compBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  compBarFill: { height: '100%', borderRadius: 4 },
  compAlert: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, gap: 8, marginTop: 8 },
  compAlertText: { fontSize: 12, fontWeight: '500', flex: 1 },
  barChart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120 },
  barChartCol: { alignItems: 'center', gap: 6, flex: 1 },
  barChartLabel: { fontSize: 10, fontWeight: '500' },
  barChartTrack: { width: 40, height: 80, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'flex-end', overflow: 'hidden' },
  barChartFill: { width: '100%', borderRadius: 20, minHeight: 4 },
  barChartValue: { fontSize: 10, fontWeight: '700' },
  insightCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 14, gap: 10, marginBottom: 10 },
  insightText: { fontSize: 13, lineHeight: 18, flex: 1 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  expenseIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  expenseInfo: { flex: 1 },
  expenseName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  expenseMeta: { fontSize: 11 },
  expenseAmount: { fontSize: 14, fontWeight: '700' },
  emptyText: { fontSize: 13, paddingVertical: 12, textAlign: 'center' },
  actionsRow: { paddingHorizontal: 16, gap: 12, marginTop: 8 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },
});
