import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  Animated,
  StyleSheet,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';

const { width } = Dimensions.get('window');

function fmt(v: number) {
  return `\u20B9${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function shortFmt(v: number) {
  if (v >= 10000000) return `\u20B9${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `\u20B9${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `\u20B9${(v / 1000).toFixed(1)}K`;
  return `\u20B9${Math.round(v)}`;
}

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

const PLANNER_BADGES = [
  { type: 'BABY', label: 'Baby', icon: 'smileo', color: '#FF8A65' },
  { type: 'HOUSE', label: 'House', icon: 'home', color: '#60A5FA' },
  { type: 'CAR', label: 'Car', icon: 'car', color: '#34C759' },
  { type: 'RETIREMENT', label: 'Retire', icon: 'Safety', color: '#5AC8FA' },
];

const QUICK_ACTIONS = [
  { key: 'CoupleSpaceHome', icon: 'wallet', label: 'Wallet', color: '#F97316' },
  { key: 'CoupleIncome', icon: 'linechart', label: 'Income', color: '#34C759' },
  { key: 'CoupleExpenses', icon: 'shoppingcart', label: 'Expenses', color: '#FF6B6B' },
  { key: 'CoupleBudgets', icon: 'wallet', label: 'Budgets', color: '#F59E0B' },
  { key: 'CoupleSavings', icon: 'save', label: 'Savings', color: '#60A5FA' },
  { key: 'CoupleGoals', icon: 'flag', label: 'Goals', color: '#5AC8FA' },
  { key: 'CoupleBills', icon: 'calendar', label: 'Bills', color: '#FF8A65' },
  { key: 'CoupleSettlements', icon: 'wallet', label: 'Settle', color: '#14B8A6' },
  { key: 'CoupleReports', icon: 'barchart', label: 'Reports', color: '#4F46E5' },
  { key: 'CouplePlanners', icon: 'find', label: 'Planners', color: '#60A5FA' },
  { key: 'CoupleTimeline', icon: 'clockcircleo', label: 'Timeline', color: '#34C759' },
  { key: 'CoupleCoach', icon: 'bulb1', label: 'AI Coach', color: '#7C3AED' },
];

function HealthRing({ score, size = 88, strokeWidth = 6 }: { score: number; size?: number; strokeWidth?: number }) {
  const { colors } = useTheme();
  const pct = Math.min(score, 100);
  const color = pct >= 80 ? colors.status.success : pct >= 60 ? colors.status.warning : colors.status.error;
  const halfSize = size / 2;
  const leftAnim = useRef(new Animated.Value(0)).current;
  const rightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const lv = Math.min(pct, 50) / 50;
    const rv = Math.max(0, pct - 50) / 50;
    Animated.parallel([
      Animated.timing(leftAnim, { toValue: lv, duration: 1000, useNativeDriver: false }),
      Animated.timing(rightAnim, { toValue: rv, duration: 1000, useNativeDriver: false }),
    ]).start();
  }, [pct]);

  const lr = leftAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const rr = rightAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size, height: size, borderRadius: halfSize,
        borderWidth: strokeWidth, borderColor: colors.border.default, position: 'absolute',
      }} />
      {pct > 0 && (
        <>
          <View style={{ width: halfSize, height: size, position: 'absolute', left: halfSize, overflow: 'hidden' }}>
            <Animated.View style={{
              width: size, height: size, borderRadius: halfSize,
              borderWidth: strokeWidth, borderColor: color,
              borderLeftColor: 'transparent', borderBottomColor: 'transparent',
              position: 'absolute', left: -halfSize, transform: [{ rotate: rr }],
            }} />
          </View>
          <View style={{ width: halfSize, height: size, position: 'absolute', left: 0, overflow: 'hidden' }}>
            <Animated.View style={{
              width: size, height: size, borderRadius: halfSize,
              borderWidth: strokeWidth, borderColor: color,
              borderRightColor: 'transparent', borderTopColor: 'transparent',
              position: 'absolute', left: 0, transform: [{ rotate: lr }],
            }} />
          </View>
        </>
      )}
      <Text style={{ fontSize: size * 0.28, fontWeight: '800', color: colors.text.primary }}>{pct}</Text>
    </View>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={[st.statCard, { backgroundColor: colors.bg.secondary }]}>
      <View style={[st.statIcon, { backgroundColor: `${color}15` }]}>
        <AntDesign name={icon as any} size={14} color={color} />
      </View>
      <Text style={[st.statValue, { color: colors.text.primary }]}>{value}</Text>
      <Text style={[st.statLabel, { color: colors.text.tertiary }]}>{label}</Text>
    </View>
  );
}

export function CoupleHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const dashboard = await api.get<any>('/couple/dashboard');
      setData(dashboard);
      setError('');
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (e: any) {
      setError(e?.message || 'Failed to load dashboard');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchDashboard(true); }, [fetchDashboard]);

  if (loading) return <LoadingScreen />;

  const partnerName = data?.partners?.partner
    ? `${data.partners.partner.firstName || ''} ${data.partners.partner.lastName || ''}`.trim()
    : 'Your Partner';
  const myName = user?.firstName || 'You';
  const score = data?.healthScore ?? data?.gamification?.healthScore ?? 0;
  const planners: any[] = data?.planners || [];
  const goals: any[] = data?.goals || [];
  const g = data?.gamification;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg.primary }}
      contentContainerStyle={{ paddingBottom: spacing['5xl'] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Header */}
        <View style={[st.header, { backgroundColor: colors.bg.secondary, paddingTop: insets.top + spacing.xl }]}>
          <View style={st.headerRow}>
            <View style={st.headerLeft}>
              <Text style={[st.headerTitle, { color: colors.text.primary }]}>
                {myName} & {partnerName}
              </Text>
              {data?.togetherSince && (
                <Text style={[st.headerSub, { color: colors.text.tertiary }]}>
                  {daysSince(data.togetherSince)} days together
                </Text>
              )}
            </View>
            <View style={st.headerActions}>
              <TouchableOpacity onPress={() => navigation.navigate('CoupleCoach')} style={[st.iconBtn, { backgroundColor: colors.bg.tertiary }]}>
                <AntDesign name="bulb1" size={18} color={colors.accent.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('CoupleSettings')} style={[st.iconBtn, { backgroundColor: colors.bg.tertiary }]}>
                <AntDesign name="setting" size={18} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {error ? (
          <View style={{ padding: spacing.xl }}><Text style={{ color: colors.status.error, fontSize: 14 }}>{error}</Text></View>
        ) : (
          <>
            {/* Health Score + Net Worth */}
            <View style={st.netWorthSection}>
              <View style={[st.netWorthCard, { backgroundColor: colors.bg.secondary }]}>
                <View style={st.netWorthRow}>
                  <View style={st.netWorthLeft}>
                    <Text style={[st.netWorthLabel, { color: colors.text.tertiary }]}>Combined Net Worth</Text>
                    <Text style={[st.netWorthAmount, { color: colors.text.primary }]}>
                      {shortFmt(data?.netWorth?.total || 0)}
                    </Text>
                    <View style={st.netWorthMeta}>
                      <View>
                        <Text style={[st.metaLabel, { color: colors.status.success }]}>Assets</Text>
                        <Text style={[st.metaValue, { color: colors.text.primary }]}>{shortFmt(data?.netWorth?.assets || 0)}</Text>
                      </View>
                      <View>
                        <Text style={[st.metaLabel, { color: colors.status.error }]}>Liabilities</Text>
                        <Text style={[st.metaValue, { color: colors.text.primary }]}>{shortFmt(data?.netWorth?.liabilities || 0)}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('CoupleReports')}>
                      <Text style={[st.viewLink, { color: colors.accent.primary }]}>View Breakdown <AntDesign name="right" size={10} color={colors.accent.primary} /></Text>
                    </TouchableOpacity>
                  </View>
                  <View style={st.healthRingWrap}>
                    <HealthRing score={score} />
                    <Text style={[st.healthLabel, { color: colors.text.tertiary }]}>Health Score</Text>
                  </View>
                </View>
                {data?.netWorth?.trend?.length > 1 && (
                  <View style={st.trendBars}>
                    {data.netWorth.trend.slice(-12).map((pt: any, i: number) => {
                      const slice = data.netWorth.trend.slice(-12);
                      const max = Math.max(...slice.map((p: any) => p.netWorth));
                      const h = max > 0 ? (pt.netWorth / max) * 36 : 0;
                      return (
                        <View key={i} style={[st.trendBar, {
                          height: Math.max(h, 3),
                          backgroundColor: colors.accent.primary,
                          opacity: 0.3 + (i / 12) * 0.7,
                        }]} />
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            {/* Shared Balance */}
            <View style={st.section}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('CoupleSettlements')}
                style={[st.balanceCard, { backgroundColor: colors.bg.secondary }]}>
                <View style={st.balanceLeft}>
                  <View style={[st.balanceIcon, { backgroundColor: `${colors.status.success}12` }]}>
                    <AntDesign name="wallet" size={20} color={colors.status.success} />
                  </View>
                  <View>
                    <Text style={[st.balanceLabel, { color: colors.text.tertiary }]}>Shared Balance</Text>
                    <Text style={[st.balanceAmount, { color: colors.text.primary }]}>{fmt(data?.sharedBalance?.amount || 0)}</Text>
                  </View>
                </View>
                <View style={[st.settleBadge, { backgroundColor: `${colors.accent.primary}15` }]}>
                  <Text style={[st.settleBadgeText, { color: colors.accent.primary }]}>Settle Up</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Monthly Snapshot */}
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <Text style={[st.sectionTitle, { color: colors.text.primary }]}>Monthly Snapshot</Text>
                <TouchableOpacity onPress={() => navigation.navigate('CoupleReports')}>
                  <Text style={[st.sectionAction, { color: colors.accent.primary }]}>Details</Text>
                </TouchableOpacity>
              </View>
              <View style={st.statRow}>
                <StatCard icon="linechart" label="Income" value={fmt(data?.monthlySnapshot?.income || 0)} color={colors.status.success} />
                <StatCard icon="shoppingcart" label="Expenses" value={fmt(data?.monthlySnapshot?.expenses || 0)} color={colors.status.error} />
                <StatCard icon="save" label="Savings" value={fmt(data?.monthlySnapshot?.savings || 0)} color={colors.accent.primary} />
                <StatCard icon="piechart" label="Rate" value={`${data?.monthlySnapshot?.savingsRate || 0}%`} color={colors.accent.primary} />
              </View>
              {data?.monthlySnapshot?.change !== null && data.monthlySnapshot.change !== 0 && (
                <View style={st.changeRow}>
                  <AntDesign name={(data.monthlySnapshot.change > 0 ? 'linechart' : 'arrowdown') as any} size={12}
                    color={data.monthlySnapshot.change > 0 ? colors.status.error : colors.status.success} />
                  <Text style={{ fontSize: 11, color: data.monthlySnapshot.change > 0 ? colors.status.error : colors.status.success }}>
                    {Math.abs(data.monthlySnapshot.change)}% {data.monthlySnapshot.change > 0 ? 'more' : 'less'} than last month
                  </Text>
                </View>
              )}
            </View>

            {/* AI Coach Insight */}
            {data?.aiSummary?.text && (
              <View style={st.section}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('CoupleCoach')}
                  style={[st.coachCard, { backgroundColor: colors.bg.secondary }]}>
                  <View style={[st.coachAccent, { backgroundColor: colors.accent.primary }]} />
                  <View style={st.coachIconWrap}>
                    <View style={[st.coachIcon, { backgroundColor: `${colors.accent.primary}15` }]}>
                      <AntDesign name="bulb1" size={16} color={colors.accent.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.coachTitle, { color: colors.accent.primary }]}>AI Couple Coach</Text>
                      <Text style={[st.coachText, { color: colors.text.secondary }]}>{data.aiSummary.text}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Goals */}
            {goals.length > 0 && (
              <View style={st.section}>
                <View style={st.sectionHeader}>
                  <Text style={[st.sectionTitle, { color: colors.text.primary }]}>Goals</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('CoupleGoals')}>
                    <Text style={[st.sectionAction, { color: colors.accent.primary }]}>See All</Text>
                  </TouchableOpacity>
                </View>
                {goals.slice(0, 2).map((goal: any) => {
                  const target = Number(goal.targetAmount || goal.target || 0);
                  const current = Number(goal.currentAmount || goal.savedAmount || 0);
                  const pct = target > 0 ? Math.round((current / target) * 100) : 0;
                  return (
                    <TouchableOpacity key={goal.id} style={[st.goalRow, { backgroundColor: colors.bg.secondary }]}>
                      <View style={[st.goalIcon, { backgroundColor: `${colors.accent.primary}12` }]}>
                        <AntDesign name="star" size={16} color={colors.accent.primary} />
                      </View>
                      <View style={st.goalInfo}>
                        <Text style={[st.goalName, { color: colors.text.primary }]}>{goal.name || goal.title}</Text>
                        <View style={[st.progressTrack, { backgroundColor: colors.border.subtle }]}>
                          <View style={[st.progressFill, { width: `${pct}%`, backgroundColor: colors.accent.primary }]} />
                        </View>
                      </View>
                      <Text style={[st.goalPct, { color: colors.text.primary }]}>{pct}%</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Planners */}
            {planners.length > 0 && (
              <View style={st.section}>
                <View style={st.sectionHeader}>
                  <Text style={[st.sectionTitle, { color: colors.text.primary }]}>Life Planners</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('CouplePlanners')}>
                    <Text style={[st.sectionAction, { color: colors.accent.primary }]}>Manage</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                  {planners.map((pl: any) => {
                    const target = Number(pl.targetAmount || 0);
                    const current = Number(pl.currentSavings || 0);
                    const pct = target > 0 ? Math.round((current / target) * 100) : 0;
                    const badge = PLANNER_BADGES.find((b) => b.type === pl.plannerType) || { label: pl.plannerType, icon: 'flag', color: colors.text.tertiary };
                    return (
                      <TouchableOpacity key={pl.id} style={[st.plannerCard, { backgroundColor: colors.bg.secondary }]}>
                        <View style={[st.plannerIcon, { backgroundColor: `${badge.color}15` }]}>
                          <AntDesign name={badge.icon as any} size={16} color={badge.color} />
                        </View>
                        <Text style={[st.plannerType, { color: colors.text.primary }]}>{badge.label}</Text>
                        <Text style={[st.plannerTarget, { color: colors.text.primary }]}>{shortFmt(target)}</Text>
                        <View style={[st.progressTrack, { backgroundColor: colors.border.subtle }]}>
                          <View style={[st.progressFill, { width: `${pct}%`, backgroundColor: badge.color }]} />
                        </View>
                        <Text style={[st.plannerPct, { color: colors.text.tertiary }]}>{pct}% saved</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Gamification */}
            {g && (
              <View style={st.section}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('CoupleGamification')}
                  style={[st.gamiCard, { backgroundColor: colors.bg.secondary }]}>
                  <View style={st.gamiLeft}>
                    <View style={[st.gamiIcon, { backgroundColor: `${colors.status.warning}15` }]}>
                      <AntDesign name="star" size={18} color={colors.status.warning} />
                    </View>
                    <View>
                      <Text style={[st.gamiLevel, { color: colors.text.primary }]}>{g.level}</Text>
                      <Text style={[st.gamiMeta, { color: colors.text.tertiary }]}>{g.xp} XP · {g.achievements || g.achievementsCount || 0} achievements</Text>
                    </View>
                  </View>
                  <View style={st.gamiRight}>
                    <View style={[st.gamiBar, { backgroundColor: colors.border.subtle }]}>
                      <View style={[st.gamiBarFill, { width: `${g.xpRequired > 0 ? Math.round((g.xpProgress / g.xpRequired) * 100) : 0}%`, backgroundColor: colors.accent.primary }]} />
                    </View>
                    <AntDesign name="right" size={14} color={colors.text.tertiary} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Actions */}
            <View style={st.section}>
              <Text style={[st.sectionTitle, { color: colors.text.primary, marginBottom: spacing.md }]}>All Modules</Text>
              <View style={st.actionsGrid}>
                {QUICK_ACTIONS.map((mod) => (
                  <TouchableOpacity key={mod.key} activeOpacity={0.8} onPress={() => navigation.navigate(mod.key)}
                    style={[st.actionTile, { backgroundColor: colors.bg.secondary }]}>
                    <View style={[st.actionIcon, { backgroundColor: `${mod.color}12` }]}>
                      <AntDesign name={mod.icon as any} size={16} color={mod.color} />
                    </View>
                    <Text style={[st.actionLabel, { color: colors.text.primary }]}>{mod.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  header: { paddingHorizontal: spacing['2xl'], paddingBottom: spacing['2xl'] },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, fontWeight: '500', marginTop: spacing.xs },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: { width: 36, height: 36, borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  netWorthSection: { paddingHorizontal: spacing['2xl'], marginTop: -spacing.md },
  netWorthCard: { borderRadius: borderRadius['3xl'], padding: spacing['2xl'] },
  netWorthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netWorthLeft: { flex: 1, marginRight: spacing.lg },
  netWorthLabel: { fontSize: 12, fontWeight: '600' },
  netWorthAmount: { fontSize: 32, fontWeight: '800', marginTop: spacing.sm, letterSpacing: -1 },
  netWorthMeta: { flexDirection: 'row', gap: spacing['2xl'], marginTop: spacing.md },
  metaLabel: { fontSize: 11, fontWeight: '500' },
  metaValue: { fontSize: 15, fontWeight: '700', marginTop: spacing.xs },
  viewLink: { fontSize: 12, fontWeight: '600', marginTop: spacing.md },
  healthRingWrap: { alignItems: 'center', gap: spacing.xs },
  healthLabel: { fontSize: 10, fontWeight: '500' },
  trendBars: { marginTop: spacing.lg, height: 36, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  trendBar: { flex: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  section: { paddingHorizontal: spacing['2xl'], marginTop: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionAction: { fontSize: 13, fontWeight: '600' },
  balanceCard: { borderRadius: borderRadius['2xl'], padding: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  balanceIcon: { width: 44, height: 44, borderRadius: borderRadius['2xl'], alignItems: 'center', justifyContent: 'center' },
  balanceLabel: { fontSize: 12, fontWeight: '500' },
  balanceAmount: { fontSize: 22, fontWeight: '800', marginTop: spacing.xs },
  settleBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius['2xl'] },
  settleBadgeText: { fontSize: 12, fontWeight: '700' },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, borderRadius: borderRadius['2xl'], padding: spacing.md, alignItems: 'center', gap: spacing.xs },
  statIcon: { width: 32, height: 32, borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 15, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '500' },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  coachCard: { borderRadius: borderRadius['2xl'], padding: spacing.lg, flexDirection: 'row', overflow: 'hidden' },
  coachAccent: { width: 3, position: 'absolute', left: 0, top: 0, bottom: 0, borderTopLeftRadius: borderRadius['2xl'], borderBottomLeftRadius: borderRadius['2xl'] },
  coachIconWrap: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', flex: 1 },
  coachIcon: { width: 32, height: 32, borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  coachTitle: { fontSize: 12, fontWeight: '700' },
  coachText: { fontSize: 13, lineHeight: 18, marginTop: spacing.xs },
  goalRow: { borderRadius: borderRadius['2xl'], padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  goalIcon: { width: 36, height: 36, borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  goalInfo: { flex: 1 },
  goalName: { fontSize: 13, fontWeight: '600' },
  progressTrack: { height: 4, borderRadius: 2, marginTop: spacing.sm, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  goalPct: { fontSize: 12, fontWeight: '700' },
  plannerCard: { borderRadius: borderRadius['2xl'], padding: spacing.lg, width: 160 },
  plannerIcon: { width: 32, height: 32, borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  plannerType: { fontSize: 13, fontWeight: '700' },
  plannerTarget: { fontSize: 15, fontWeight: '800', marginTop: spacing.xs },
  plannerPct: { fontSize: 10, fontWeight: '500', marginTop: spacing.xs },
  gamiCard: { borderRadius: borderRadius['2xl'], padding: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gamiLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gamiIcon: { width: 40, height: 40, borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  gamiLevel: { fontSize: 13, fontWeight: '700' },
  gamiMeta: { fontSize: 11, fontWeight: '500', marginTop: spacing.xs },
  gamiRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gamiBar: { width: 60, height: 4, borderRadius: 2, overflow: 'hidden' },
  gamiBarFill: { height: '100%', borderRadius: 2 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionTile: { width: (width - spacing['2xl'] * 2 - spacing.sm * 3) / 4, borderRadius: borderRadius['2xl'], padding: spacing.md, alignItems: 'center', gap: spacing.sm },
  actionIcon: { width: 36, height: 36, borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
});
