import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated, Dimensions } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

const { width } = Dimensions.get('window');

function fmt(v: number) {
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtShort(v: number) {
  if (v >= 10000000) { return '₹' + (v / 10000000).toFixed(1) + 'Cr'; }
  if (v >= 100000) { return '₹' + (v / 100000).toFixed(1) + 'L'; }
  if (v >= 1000) { return '₹' + (v / 1000).toFixed(1) + 'K'; }
  return fmt(v);
}

function HealthRing({ score, size = 72 }: { score: number; size?: number }) {
  const { colors } = useTheme();
  const pct = Math.min(Math.max(score, 0), 100);
  const color = pct >= 80 ? colors.status.success : pct >= 50 ? colors.status.warning : colors.status.error;
  const half = size / 2;
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
        width: size, height: size, borderRadius: half,
        borderWidth: 4, borderColor: colors.border.subtle, position: 'absolute',
      }} />
      {pct > 0 && (
        <>
          <View style={{ width: half, height: size, position: 'absolute', left: half, overflow: 'hidden' }}>
            <Animated.View style={{
              width: size, height: size, borderRadius: half,
              borderWidth: 4, borderColor: color,
              borderLeftColor: 'transparent', borderBottomColor: 'transparent',
              position: 'absolute', left: -half, transform: [{ rotate: rr }],
            }} />
          </View>
          <View style={{ width: half, height: size, position: 'absolute', left: 0, overflow: 'hidden' }}>
            <Animated.View style={{
              width: size, height: size, borderRadius: half,
              borderWidth: 4, borderColor: color,
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

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{title}</Text>
      {action && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={[styles.sectionAction, { color: colors.accent.primary }]}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function MiniStat({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.miniStat, { backgroundColor: colors.bg.secondary }]}>
      <View style={[styles.miniStatIcon, { backgroundColor: color + '15' }]}>
        <AntDesign name={icon as any} size={14} color={color} />
      </View>
      <Text style={[styles.miniStatValue, { color: colors.text.primary }]}>{value}</Text>
      <Text style={[styles.miniStatLabel, { color: colors.text.tertiary }]}>{label}</Text>
    </View>
  );
}

function EventBadge({ icon, label, date, color }: { icon: string; label: string; date: string; color: string }) {
  const { colors } = useTheme();
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleString('en-IN', { month: 'short' });
  return (
    <View style={[styles.eventBadge, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
      <View style={[styles.eventBadgeIcon, { backgroundColor: color + '15' }]}>
        <AntDesign name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.eventBadgeDay, { color: colors.text.primary }]}>{day}</Text>
      <Text style={[styles.eventBadgeMonth, { color: colors.text.tertiary }]}>{month}</Text>
      <Text style={[styles.eventBadgeLabel, { color: colors.text.secondary }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const NAV_SECTIONS = [
  { key: 'Money', icon: 'wallet', label: 'Money', color: '#22C55E' },
  { key: 'Goals', icon: 'flag', label: 'Goals', color: '#F59E0B' },
  { key: 'LifePlans', icon: 'calendar', label: 'Life Plans', color: '#60A5FA' },
  { key: 'Timeline', icon: 'clockcircleo', label: 'Timeline', color: '#A78BFA' },
  { key: 'AI', icon: 'bulb1', label: 'AI Coach', color: '#F43F5E' },
];

export function CoupleOverviewScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) { setLoading(true); }
    try {
      const res = await api.get<any>('/couple/dashboard');
      setData(res);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch {
      // handled by empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  const myName = user?.firstName || 'You';
  const partnerName = data?.coupleHero?.partner?.firstName || 'Partner';
  const since = data?.coupleHero?.since;
  const daysTogether = data?.coupleHero?.daysTogether || 0;
  const healthScore = data?.coupleHealth?.overallScore || 0;
  const wealth = data?.combinedWealth || {};
  const snapshot = data?.coupleSnapshot || {};
  const savingsRate = snapshot.combinedIncome > 0
    ? Math.round((snapshot.savings / snapshot.combinedIncome) * 100)
    : 0;
  const goals = data?.coupleGoals || [];
  const aiInsights = data?.coupleAI?.insights || [];

  const upcomingEvents = useMemo(() => {
    const events: any[] = [];
    const today = new Date();
    if (since) {
      const anniversary = new Date(since);
      anniversary.setFullYear(today.getFullYear());
      if (anniversary < today) { anniversary.setFullYear(today.getFullYear() + 1); }
      events.push({ icon: 'heart', label: 'Anniversary', date: anniversary.toISOString(), color: '#F43F5E' });
    }
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5);
  }, [since]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <View style={[styles.skeletonHero, { backgroundColor: colors.skeleton.base }]} />
          <View style={[styles.skeletonCard, { backgroundColor: colors.skeleton.base, marginTop: 16 }]} />
          <View style={[styles.skeletonCard, { backgroundColor: colors.skeleton.base, marginTop: 12 }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />
          }
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
        >
          {/* Hero Card */}
          <View style={[styles.heroCard, { backgroundColor: colors.bg.secondary, paddingTop: insets.top + 20 }]}>
            <View style={styles.heroTop}>
              <View style={styles.heroNames}>
                <Text style={[styles.heroTitle, { color: colors.text.primary }]}>
                  {myName}
                  <Text style={{ color: colors.accent.primary }}> {'❤️'} </Text>
                  {partnerName}
                </Text>
                {since && (
                  <Text style={[styles.heroSince, { color: colors.text.tertiary }]}>
                    Together since {new Date(since).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · {daysTogether} days
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => navigation?.navigate('CoupleSettings')}
                style={[styles.heroSettings, { backgroundColor: colors.bg.tertiary }]}
              >
                <AntDesign name="setting" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.heroScores}>
              <View style={styles.heroScoreItem}>
                <HealthRing score={healthScore} size={64} />
                <Text style={[styles.heroScoreLabel, { color: colors.text.tertiary }]}>Financial Health</Text>
              </View>
              <View style={styles.heroScoreItem}>
                <HealthRing score={data?.coupleHealth?.compatibilityScore || Math.round(healthScore * 0.9)} size={64} />
                <Text style={[styles.heroScoreLabel, { color: colors.text.tertiary }]}>Compatibility</Text>
              </View>
            </View>
          </View>

          {/* Section Nav */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sectionNav}
          >
            {NAV_SECTIONS.map((section) => (
              <TouchableOpacity
                key={section.key}
                style={[styles.sectionNavItem, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}
                onPress={() => navigation?.navigate(section.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.sectionNavIcon, { backgroundColor: section.color + '15' }]}>
                  <AntDesign name={section.icon as any} size={18} color={section.color} />
                </View>
                <Text style={[styles.sectionNavLabel, { color: colors.text.secondary }]}>{section.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Combined Wealth */}
          <View style={styles.section}>
            <SectionHeader title="Combined Wealth" action="Details" onAction={() => navigation?.navigate('Money')} />
            <View style={[styles.wealthCard, { backgroundColor: colors.bg.secondary }]}>
              <View style={styles.wealthTop}>
                <Text style={[styles.wealthTitle, { color: colors.text.tertiary }]}>Net Worth</Text>
                <Text style={[styles.wealthAmount, { color: colors.text.primary }]}>{fmtShort(wealth.netWorth || 0)}</Text>
              </View>
              <View style={[styles.wealthDivider, { backgroundColor: colors.border.subtle }]} />
              <View style={styles.wealthGrid}>
                {[
                  { label: 'Cash', value: wealth.totalCash || 0, color: '#22C55E' },
                  { label: 'Savings', value: wealth.totalSavings || 0, color: '#60A5FA' },
                  { label: 'Investments', value: wealth.totalInvestments || 0, color: '#A78BFA' },
                  { label: 'Assets', value: wealth.totalAssets || 0, color: '#F59E0B' },
                  { label: 'Loans', value: wealth.totalLiabilities || 0, color: '#EF4444' },
                ].map((item) => (
                  <View key={item.label} style={styles.wealthItem}>
                    <Text style={[styles.wealthItemLabel, { color: colors.text.tertiary }]}>{item.label}</Text>
                    <Text style={[styles.wealthItemValue, { color: item.label === 'Loans' ? colors.status.error : colors.text.primary }]}>
                      {fmtShort(item.value)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Monthly Snapshot */}
          <View style={styles.section}>
            <SectionHeader title="This Month" action="Full Report" onAction={() => navigation?.navigate('Reports')} />
            <View style={[styles.snapshotRow]}>
              <MiniStat icon="caretup" label="Income" value={fmtShort(snapshot.combinedIncome || 0)} color="#22C55E" />
              <MiniStat icon="shoppingcart" label="Expenses" value={fmtShort(snapshot.combinedExpense || 0)} color="#EF4444" />
              <MiniStat icon="save" label="Savings" value={fmtShort(snapshot.savings || 0)} color="#60A5FA" />
              <MiniStat icon="piechart" label="Savings %" value={`${savingsRate}%`} color="#A78BFA" />
            </View>
          </View>

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Upcoming" action="Calendar" onAction={() => navigation?.navigate('Timeline')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsRow}>
                {upcomingEvents.map((ev, i) => (
                  <EventBadge key={i} icon={ev.icon} label={ev.label} date={ev.date} color={ev.color} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Goals */}
          {goals.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Goals" action="See All" onAction={() => navigation?.navigate('Goals')} />
              {goals.slice(0, 3).map((goal: any) => {
                const pct = goal.targetAmount > 0 ? Math.round((goal.savedAmount / goal.targetAmount) * 100) : 0;
                return (
                  <TouchableOpacity key={goal.id} style={[styles.goalRow, { backgroundColor: colors.bg.secondary }]} activeOpacity={0.7}>
                    <View style={styles.goalInfo}>
                      <Text style={[styles.goalName, { color: colors.text.primary }]}>{goal.name}</Text>
                      <Text style={[styles.goalMeta, { color: colors.text.tertiary }]}>
                        {fmtShort(goal.savedAmount)} of {fmtShort(goal.targetAmount)}
                      </Text>
                    </View>
                    <View style={styles.goalRight}>
                      <Text style={[styles.goalPct, { color: colors.text.primary }]}>{pct}%</Text>
                      <View style={[styles.goalBar, { backgroundColor: colors.bg.tertiary }]}>
                        <View style={[styles.goalBarFill, { width: `${pct}%`, backgroundColor: colors.accent.primary }]} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* AI Insights */}
          {aiInsights.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="AI Insights" action="Open Coach" onAction={() => navigation?.navigate('AI')} />
              <View style={[styles.aiCard, { backgroundColor: colors.bg.secondary, borderLeftColor: colors.accent.primary }]}>
                <View style={styles.aiIcon}>
                  <AntDesign name="bulb1" size={20} color={colors.accent.primary} />
                </View>
                <View style={styles.aiContent}>
                  {aiInsights.slice(0, 2).map((insight: string, i: number) => (
                    <Text key={i} style={[styles.aiText, { color: colors.text.secondary }]}>• {insight}</Text>
                  ))}
                  {aiInsights.length > 2 && (
                    <Text style={[styles.aiMore, { color: colors.accent.primary }]}>
                      +{aiInsights.length - 2} more insights
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Life Planner CTA */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.lifePlannerCta, { backgroundColor: colors.accent.primary }]}
              onPress={() => navigation?.navigate('LifePlans')}
              activeOpacity={0.85}
            >
              <View style={styles.ctaContent}>
                <Text style={styles.ctaTitle}>Plan Your Future Together</Text>
                <Text style={styles.ctaSubtitle}>House, Baby, Car, Retirement — dream together</Text>
              </View>
              <AntDesign name="right" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>

        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { padding: 20, paddingTop: 100 },
  skeletonHero: { height: 200, borderRadius: 24 },
  skeletonCard: { height: 120, borderRadius: 20 },

  heroCard: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroNames: { flex: 1, marginRight: 12 },
  heroTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  heroSince: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  heroSettings: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  heroScores: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 20,
  },
  heroScoreItem: { alignItems: 'center', gap: 6 },
  heroScoreLabel: { fontSize: 11, fontWeight: '600' },

  sectionNav: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  sectionNavItem: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 72,
  },
  sectionNavIcon: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionNavLabel: { fontSize: 11, fontWeight: '600' },

  section: { paddingHorizontal: 20, marginTop: 8 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  sectionAction: { fontSize: 13, fontWeight: '600' },

  wealthCard: {
    borderRadius: 20,
    padding: 20,
  },
  wealthTop: { marginBottom: 12 },
  wealthTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  wealthAmount: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },
  wealthDivider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  wealthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wealthItem: {
    width: (width - 80) / 3,
    paddingVertical: 8,
  },
  wealthItemLabel: { fontSize: 11, fontWeight: '500' },
  wealthItemValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },

  snapshotRow: {
    flexDirection: 'row',
    gap: 8,
  },
  miniStat: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  miniStatIcon: {
    width: 28, height: 28, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  miniStatValue: { fontSize: 15, fontWeight: '800' },
  miniStatLabel: { fontSize: 9, fontWeight: '600', textAlign: 'center' },

  eventsRow: { gap: 10, paddingBottom: 4 },
  eventBadge: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    width: 80,
    gap: 2,
  },
  eventBadgeIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  eventBadgeDay: { fontSize: 18, fontWeight: '800' },
  eventBadgeMonth: { fontSize: 10, fontWeight: '600' },
  eventBadgeLabel: { fontSize: 9, fontWeight: '500', marginTop: 2, textAlign: 'center' },

  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  goalInfo: { flex: 1 },
  goalName: { fontSize: 14, fontWeight: '600' },
  goalMeta: { fontSize: 11, marginTop: 2 },
  goalRight: { alignItems: 'flex-end', marginLeft: 12 },
  goalPct: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  goalBar: { width: 64, height: 4, borderRadius: 2, overflow: 'hidden' },
  goalBarFill: { height: '100%', borderRadius: 2 },

  aiCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 3,
  },
  aiIcon: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  aiContent: { flex: 1, gap: 4 },
  aiText: { fontSize: 13, lineHeight: 18 },
  aiMore: { fontSize: 12, fontWeight: '600', marginTop: 4 },

  lifePlannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    marginTop: 4,
  },
  ctaContent: { flex: 1 },
  ctaTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  ctaSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
});
