import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated, Dimensions } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';

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

function AvatarStack({ members, max = 4, size = 36 }: { members: any[]; max?: number; size?: number }) {
  const { colors } = useTheme();
  const visible = members.slice(0, max);
  const overflow = members.length - max;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {visible.map((m: any, i: number) => {
        const initial = ((m.name || m.firstName || '?')[0] || '?').toUpperCase();
        return (
          <View
            key={m.id || i}
            style={{
              width: size, height: size, borderRadius: size / 2,
              backgroundColor: colors.accent.primary + '20',
              borderWidth: 2, borderColor: colors.bg.primary,
              alignItems: 'center', justifyContent: 'center',
              marginLeft: i === 0 ? 0 : -8,
            }}
          >
            <Text style={{ fontSize: size * 0.35, fontWeight: '700', color: colors.accent.primary }}>{initial}</Text>
          </View>
        );
      })}
      {overflow > 0 && (
        <View style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: colors.bg.tertiary,
          borderWidth: 2, borderColor: colors.bg.primary,
          alignItems: 'center', justifyContent: 'center',
          marginLeft: -8,
        }}>
          <Text style={{ fontSize: size * 0.3, fontWeight: '600', color: colors.text.tertiary }}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

function HealthBar({ score }: { score: number }) {
  const { colors } = useTheme();
  const pct = Math.min(Math.max(score, 0), 100);
  const color = pct >= 80 ? colors.status.success : pct >= 50 ? colors.status.warning : colors.status.error;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text.secondary }}>Family Health Score</Text>
        <Text style={{ fontSize: 20, fontWeight: '800', color }}>{pct}</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.bg.tertiary, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
      </View>
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
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent.primary }}>{action}</Text>
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

const NAV_SECTIONS = [
  { key: 'Members', icon: 'team', label: 'Members', color: '#22C55E' },
  { key: 'Money', icon: 'wallet', label: 'Money', color: '#F59E0B' },
  { key: 'Goals', icon: 'flag', label: 'Goals', color: '#60A5FA' },
  { key: 'Investments', icon: 'linechart', label: 'Investments', color: '#A78BFA' },
  { key: 'Documents', icon: 'filetext1', label: 'Documents', color: '#14B8A6' },
  { key: 'Calendar', icon: 'calendar', label: 'Calendar', color: '#F97316' },
  { key: 'Tasks', icon: 'checksquareo', label: 'Tasks', color: '#6366F1' },
  { key: 'AI', icon: 'bulb1', label: 'AI Advisor', color: '#EC4899' },
];

export function FamilyOverviewScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [family, setFamily] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) { setLoading(true); }
    try {
      const families = await api.get<any>('/family');
      const activeFamily = Array.isArray(families) ? families[0] : null;
      if (activeFamily) {
        setFamily(activeFamily);
        const res = await api.get<any>(`/family/dashboard?familyId=${activeFamily.id}`);
        setData(res);
      }
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

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <View style={{ padding: 20, paddingTop: 80, gap: 12 }}>
          <View style={{ height: 180, borderRadius: 24, backgroundColor: colors.skeleton.base }} />
          <View style={{ height: 100, borderRadius: 20, backgroundColor: colors.skeleton.base }} />
          <View style={{ height: 80, borderRadius: 20, backgroundColor: colors.skeleton.base }} />
        </View>
      </View>
    );
  }

  if (!family || !data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top + 60 }]}>
        <View style={{ alignItems: 'center', padding: 40, gap: 12 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.bg.tertiary, alignItems: 'center', justifyContent: 'center' }}>
            <AntDesign name="team" size={36} color={colors.text.tertiary} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary }}>No Family Yet</Text>
          <Text style={{ fontSize: 14, color: colors.text.tertiary, textAlign: 'center', lineHeight: 20 }}>
            Create or join a family to start managing your family's finances together
          </Text>
          <TouchableOpacity
            onPress={() => navigation?.navigate('FamilySettings')}
            style={{ marginTop: 8, backgroundColor: colors.accent.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Create Family</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const hero = data?.familyHero || {};
  const wealth = data?.familyWealth || {};
  const snapshot = data?.familySnapshot || {};
  const health = data?.familyHealth || {};
  const goals = data?.familyGoals || [];
  const savingsRate = snapshot.income > 0 ? Math.round((snapshot.savings / snapshot.income) * 100) : 0;
  const members = hero.members || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />
          }
        >
          {/* Family Hero */}
          <View style={[styles.heroCard, { backgroundColor: colors.bg.secondary, paddingTop: insets.top + 20 }]}>
            <View style={styles.heroTop}>
              <View style={styles.heroInfo}>
                <Text style={[styles.heroTitle, { color: colors.text.primary }]}>{hero.familyName || family.name}</Text>
                <View style={styles.heroMeta}>
                  <AvatarStack members={members} size={32} />
                  <Text style={[styles.heroMemberCount, { color: colors.text.tertiary }]}>
                    {hero.memberCount || members.length} {members.length === 1 ? 'member' : 'members'}
                  </Text>
                </View>
                {hero.createdAt && (
                  <Text style={[styles.heroSince, { color: colors.text.tertiary }]}>
                    Together since {new Date(hero.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => navigation?.navigate('FamilySettings')}
                style={[styles.heroSettings, { backgroundColor: colors.bg.tertiary }]}
              >
                <AntDesign name="setting" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <HealthBar score={health.overallScore || 0} />
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

          {/* Family Wealth */}
          <View style={styles.section}>
            <SectionHeader title="Family Wealth" action="Details" onAction={() => navigation?.navigate('Money')} />
            <View style={[styles.wealthCard, { backgroundColor: colors.bg.secondary }]}>
              <View style={styles.wealthTop}>
                <Text style={[styles.wealthTitle, { color: colors.text.tertiary }]}>Net Worth</Text>
                <Text style={[styles.wealthAmount, { color: colors.text.primary }]}>{fmtShort(wealth.netWorth || 0)}</Text>
              </View>
              <View style={[styles.wealthDivider, { backgroundColor: colors.border.subtle }]} />
              <View style={styles.wealthGrid}>
                {[
                  { label: 'Savings', value: wealth.totalSavings || 0, color: '#22C55E' },
                  { label: 'Investments', value: wealth.totalInvestments || 0, color: colors.accent.secondary },
                  { label: 'Property', value: wealth.totalProperties || 0, color: '#60A5FA' },
                  { label: 'Assets', value: wealth.totalAssets || 0, color: '#F59E0B' },
                  { label: 'Loans', value: wealth.totalLoans || 0, color: '#EF4444' },
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
            <SectionHeader title="This Month" action="Full Analysis" onAction={() => navigation?.navigate('AI')} />
            <View style={styles.snapshotRow}>
              <MiniStat icon="caretup" label="Income" value={fmtShort(snapshot.income || 0)} color="#22C55E" />
              <MiniStat icon="shoppingcart" label="Expenses" value={fmtShort(snapshot.expense || 0)} color="#EF4444" />
              <MiniStat icon="save" label="Savings" value={fmtShort(snapshot.savings || 0)} color="#60A5FA" />
              <MiniStat icon="piechart" label="Savings %" value={`${savingsRate}%`} color={colors.accent.secondary} />
            </View>
          </View>

          {/* Health Score Categories */}
          <View style={styles.section}>
            <SectionHeader title="Health Dashboard" action="Improve" onAction={() => navigation?.navigate('AI')} />
            <View style={[styles.healthCard, { backgroundColor: colors.bg.secondary }]}>
              {[
                { label: 'Savings', score: health.categoryScores?.savings || 0 },
                { label: 'Debt', score: health.categoryScores?.debt || 0 },
                { label: 'Insurance', score: health.categoryScores?.insurance || 0 },
                { label: 'Emergency Fund', score: health.categoryScores?.emergencyFund || 0 },
                { label: 'Investments', score: health.categoryScores?.investmentRatio || 0 },
                { label: 'Goals', score: health.categoryScores?.goals || 0 },
              ].map((cat) => {
                const c = cat.score >= 80 ? colors.status.success : cat.score >= 50 ? colors.status.warning : colors.status.error;
                return (
                  <View key={cat.label} style={styles.healthRow}>
                    <Text style={[styles.healthLabel, { color: colors.text.secondary }]}>{cat.label}</Text>
                    <View style={[styles.healthBar, { backgroundColor: colors.bg.tertiary }]}>
                      <View style={[styles.healthBarFill, { width: `${cat.score}%`, backgroundColor: c }]} />
                    </View>
                    <Text style={[styles.healthScore, { color: c }]}>{cat.score}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Goals */}
          {goals.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Family Goals" action="See All" onAction={() => navigation?.navigate('Goals')} />
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

          {/* Member Contributions */}
          {data?.familyContributions?.byMember && Object.keys(data.familyContributions.byMember).length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Contributions" action="Details" onAction={() => navigation?.navigate('Money')} />
              <View style={[styles.contribCard, { backgroundColor: colors.bg.secondary }]}>
                {Object.entries(data.familyContributions.byMember).map(([userId, info]: any) => (
                  <View key={userId} style={styles.contribRow}>
                    <View style={[styles.contribAvatar, { backgroundColor: colors.accent.primary + '20' }]}>
                      <Text style={[styles.contribAvatarText, { color: colors.accent.primary }]}>
                        {(info.name || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.contribName, { color: colors.text.primary }]}>{info.name}</Text>
                      <Text style={[styles.contribTotal, { color: colors.text.tertiary }]}>
                        Total contributed: {fmtShort(info.total)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  heroCard: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heroInfo: { flex: 1, marginRight: 12 },
  heroTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  heroMemberCount: { fontSize: 13, fontWeight: '500' },
  heroSince: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  heroSettings: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  sectionNav: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  sectionNavItem: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 64,
  },
  sectionNavIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionNavLabel: { fontSize: 10, fontWeight: '600' },

  section: { paddingHorizontal: 20, marginTop: 8 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },

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

  healthCard: {
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  healthLabel: { fontSize: 12, fontWeight: '500', width: 90 },
  healthBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  healthBarFill: { height: '100%', borderRadius: 3 },
  healthScore: { fontSize: 12, fontWeight: '700', width: 28, textAlign: 'right' },

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

  contribCard: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  contribRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contribAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  contribAvatarText: { fontSize: 14, fontWeight: '700' },
  contribName: { fontSize: 14, fontWeight: '600' },
  contribTotal: { fontSize: 11, marginTop: 1 },
});
