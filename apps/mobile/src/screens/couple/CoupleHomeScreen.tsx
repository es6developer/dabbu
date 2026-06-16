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

const { width } = Dimensions.get('window');
const CARD_GAP = 12;

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
  { type: 'RETIREMENT', label: 'Retire', icon: 'Safety', color: '#A78BFA' },
];

const QUICK_ACTIONS = [
  { key: 'CoupleSpaceHome', icon: 'wallet', label: 'Wallet', color: '#F97316' },
  { key: 'CoupleIncome', icon: 'linechart', label: 'Income', color: '#34C759' },
  { key: 'CoupleExpenses', icon: 'shoppingcart', label: 'Expenses', color: '#FF6B6B' },
  { key: 'CoupleBudgets', icon: 'wallet', label: 'Budgets', color: '#F59E0B' },
  { key: 'CoupleSavings', icon: 'save', label: 'Savings', color: '#60A5FA' },
  { key: 'CoupleGoals', icon: 'flag', label: 'Goals', color: '#A78BFA' },
  { key: 'CoupleBills', icon: 'calendar', label: 'Bills', color: '#FF8A65' },
  { key: 'CoupleSettlements', icon: 'wallet', label: 'Settle', color: '#14B8A6' },
  { key: 'CoupleReports', icon: 'barchart', label: 'Reports', color: '#4F46E5' },
  { key: 'CouplePlanners', icon: 'find', label: 'Planners', color: '#60A5FA' },
  { key: 'CoupleTimeline', icon: 'clockcircleo', label: 'Timeline', color: '#34C759' },
  { key: 'CoupleCoach', icon: 'bulb1', label: 'AI Coach', color: '#8B5CF6' },
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

function StatCard({
  icon, label, value, color,
}: {
  icon: string; label: string; value: string; color: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.card, borderRadius: 14, padding: 12, alignItems: 'center', gap: 6 }}>
      <AntDesign name={icon as any} size={16} color={color} />
      <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text.primary }}>{value}</Text>
      <Text style={{ fontSize: 10, color: colors.text.tertiary }}>{label}</Text>
    </View>
  );
}

export function CoupleHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard(true);
  }, [fetchDashboard]);

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
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Header */}
        <View style={{ backgroundColor: colors.bg.secondary, paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary }}>
                <Text style={{ color: colors.accent.primary }}>{'\u2764\uFE0F'}</Text> {myName} & {partnerName}
              </Text>
              {data?.togetherSince && (
                <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 2 }}>
                  Together since{' '}
                  {new Date(data.togetherSince).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}{' '}
                  &middot; {daysSince(data.togetherSince)} days
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => navigation.navigate('CoupleCoach')} style={[styles.iconBtn, { backgroundColor: colors.bg.tertiary }]}>
                <AntDesign  name="bulb1" size={20} color={colors.accent.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('CoupleSettings')} style={[styles.iconBtn, { backgroundColor: colors.bg.tertiary }]}>
                <AntDesign  name="setting" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {error ? (
          <View style={{ padding: 16 }}>
            <Text style={{ color: colors.status.error, fontSize: 14 }}>{error}</Text>
          </View>
        ) : (
          <>
            {/* Health Score + Net Worth */}
            <View style={{ paddingHorizontal: 20, marginTop: -8 }}>
              <View style={{
                backgroundColor: colors.bg.card, borderRadius: 20, padding: 20,
                shadowColor: colors.border.default, shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3, shadowRadius: 12, elevation: 4,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, marginRight: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text.tertiary }}>Combined Net Worth</Text>
                    <Text style={{ fontSize: 32, fontWeight: '800', color: colors.text.primary, marginTop: 4 }}>
                      {shortFmt(data?.netWorth?.total || 0)}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 20, marginTop: 12 }}>
                      <View>
                        <Text style={{ fontSize: 11, color: colors.status.success }}>Assets</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                          {shortFmt(data?.netWorth?.assets || 0)}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 11, color: colors.status.error }}>Liabilities</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                          {shortFmt(data?.netWorth?.liabilities || 0)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity style={{ marginTop: 12 }} onPress={() => navigation.navigate('CoupleReports')}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 12, color: colors.accent.primary, fontWeight: '600' }}>View Breakdown</Text>
                        <AntDesign  name="right" size={12} color={colors.accent.primary} />
                      </View>
                    </TouchableOpacity>
                  </View>
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <HealthRing score={score} />
                    <Text style={{ fontSize: 10, color: colors.text.tertiary, fontWeight: '500' }}>Health Score</Text>
                  </View>
                </View>

                {data?.netWorth?.trend?.length > 1 && (
                  <View style={{ marginTop: 16, height: 44, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                    {data.netWorth.trend.slice(-12).map((pt: any, i: number) => {
                      const slice = data.netWorth.trend.slice(-12);
                      const max = Math.max(...slice.map((p: any) => p.netWorth));
                      const h = max > 0 ? (pt.netWorth / max) * 40 : 0;
                      return (
                        <View key={i} style={{
                          flex: 1, height: Math.max(h, 3),
                          backgroundColor: colors.accent.primary,
                          borderTopLeftRadius: 3, borderTopRightRadius: 3,
                          opacity: 0.4 + (i / 12) * 0.6,
                        }} />
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            {/* Quick Balance Card */}
            <View style={{ paddingHorizontal: 20, marginTop: CARD_GAP }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate('CoupleSettlements')}
                style={{
                  backgroundColor: colors.bg.card, borderRadius: 16, padding: 16,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{
                    width: 44, height: 44, borderRadius: 14,
                    backgroundColor: `${colors.status.success}15`,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <AntDesign  name="wallet" size={22} color={colors.status.success} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Shared Balance</Text>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text.primary }}>
                      {fmt(data?.sharedBalance?.amount || 0)}
                    </Text>
                  </View>
                </View>
                <View style={{
                  backgroundColor: `${colors.accent.primary}20`,
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent.primary }}>Settle Up</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Monthly Snapshot */}
            <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>Monthly Snapshot</Text>
                <TouchableOpacity onPress={() => navigation.navigate('CoupleReports')}>
                  <Text style={{ fontSize: 12, color: colors.accent.primary }}>Details</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <StatCard icon="linechart" label="Income" value={fmt(data?.monthlySnapshot?.income || 0)} color={colors.status.success} />
                <StatCard icon="shoppingcart" label="Expenses" value={fmt(data?.monthlySnapshot?.expenses || 0)} color={colors.status.error} />
                <StatCard icon="save" label="Savings" value={fmt(data?.monthlySnapshot?.savings || 0)} color={colors.status.info} />
                <StatCard icon="piechart" label="Rate" value={`${data?.monthlySnapshot?.savingsRate || 0}%`} color={colors.accent.secondary} />
              </View>
              {data?.monthlySnapshot?.change !== null && data.monthlySnapshot.change !== 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                  <AntDesign
                    name={(data.monthlySnapshot.change > 0 ? 'linechart' : 'arrowdown') as any}
                    size={14}
                    color={data.monthlySnapshot.change > 0 ? colors.status.error : colors.status.success}
                  />
                  <Text style={{ fontSize: 11, color: data.monthlySnapshot.change > 0 ? colors.status.error : colors.status.success }}>
                    {Math.abs(data.monthlySnapshot.change)}%{' '}
                    {data.monthlySnapshot.change > 0 ? 'more' : 'less'} than last month
                  </Text>
                </View>
              )}
            </View>

            {/* AI Couple Coach Insight */}
            {data?.aiSummary?.text && (
              <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('CoupleCoach')}
                  style={{
                    backgroundColor: colors.bg.highlight, borderRadius: 16, padding: 16,
                    borderLeftWidth: 3, borderLeftColor: colors.accent.primary,
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={{
                      width: 32, height: 32, borderRadius: 10,
                      backgroundColor: `${colors.accent.primary}20`,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <AntDesign  name="bulb1" size={16} color={colors.accent.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent.primary }}>AI Couple Coach</Text>
                      <Text style={{ fontSize: 13, color: colors.text.secondary, marginTop: 4, lineHeight: 18 }}>
                        {data.aiSummary.text}
                      </Text>
                      {data.aiSummary.insights?.length > 1 && (
                        <Text style={{ fontSize: 11, color: colors.accent.primary, marginTop: 6 }}>
                          +{data.aiSummary.insights.length - 1} more insights
                        </Text>
                      )}
                    </View>
                    <AntDesign  name="right" size={16} color={colors.text.tertiary} style={{ marginTop: 2 }} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Goals */}
            {goals.length > 0 && (
              <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>Goals</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('CoupleGoals')}>
                    <Text style={{ fontSize: 12, color: colors.accent.primary }}>See All</Text>
                  </TouchableOpacity>
                </View>
                {goals.slice(0, 2).map((goal: any) => {
                  const target = Number(goal.targetAmount || goal.target || 0);
                  const current = Number(goal.currentAmount || goal.savedAmount || 0);
                  const pct = target > 0 ? Math.round((current / target) * 100) : 0;
                  return (
                    <TouchableOpacity
                      key={goal.id}
                      style={{
                        backgroundColor: colors.bg.card, borderRadius: 14, padding: 14,
                        marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 12,
                      }}
                    >
                      <View style={{
                        width: 36, height: 36, borderRadius: 12,
                        backgroundColor: `${colors.accent.secondary}18`,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <AntDesign name="star" size={16} color={colors.accent.secondary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>
                          {goal.name || goal.title}
                        </Text>
                        <View style={{ height: 4, backgroundColor: colors.bg.tertiary, borderRadius: 2, marginTop: 6 }}>
                          <View style={{ width: `${pct}%`, height: 4, backgroundColor: colors.accent.secondary, borderRadius: 2 }} />
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text.primary }}>{pct}%</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Active Planners */}
            {planners.length > 0 && (
              <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>Life Planners</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('CouplePlanners')}>
                    <Text style={{ fontSize: 12, color: colors.accent.primary }}>Manage</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {planners.map((pl: any) => {
                    const target = Number(pl.targetAmount || 0);
                    const current = Number(pl.currentSavings || 0);
                    const pct = target > 0 ? Math.round((current / target) * 100) : 0;
                    const badge = PLANNER_BADGES.find((b) => b.type === pl.plannerType) || {
                      label: pl.plannerType, icon: 'flag', color: colors.text.tertiary,
                    };
                    return (
                      <TouchableOpacity key={pl.id} style={{
                        backgroundColor: colors.bg.card, borderRadius: 16, padding: 14, width: 160,
                      }}>
                        <View style={{
                          width: 32, height: 32, borderRadius: 10,
                          backgroundColor: `${badge.color}18`, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
                        }}>
                          <AntDesign name={badge.icon as any} size={16} color={badge.color} />
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.primary }}>{badge.label}</Text>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text.primary, marginTop: 4 }}>
                          {shortFmt(target)}
                        </Text>
                        <View style={{ height: 4, backgroundColor: colors.bg.tertiary, borderRadius: 2, marginTop: 8 }}>
                          <View style={{ width: `${pct}%`, height: 4, backgroundColor: badge.color, borderRadius: 2 }} />
                        </View>
                        <Text style={{ fontSize: 10, color: colors.text.tertiary, marginTop: 4 }}>{pct}% saved</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Gamification Strip */}
            {g && (
              <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('CoupleGamification')}
                  style={{
                    backgroundColor: colors.bg.card, borderRadius: 16, padding: 14,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{
                      width: 40, height: 40, borderRadius: 12,
                      backgroundColor: `${colors.status.warning}20`,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <AntDesign name="star" size={18} color={colors.status.warning} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.primary }}>{g.level}</Text>
                      <Text style={{ fontSize: 11, color: colors.text.tertiary, marginTop: 1 }}>
                        {g.xp} XP &middot; {g.achievements || g.achievementsCount || 0} achievements
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 60, height: 4, backgroundColor: colors.bg.tertiary, borderRadius: 2 }}>
                      <View style={{
                        width: `${g.xpRequired > 0 ? Math.round((g.xpProgress / g.xpRequired) * 100) : 0}%`,
                        height: 4, backgroundColor: colors.accent.primary, borderRadius: 2,
                      }} />
                    </View>
                    <AntDesign  name="right" size={16} color={colors.text.tertiary} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Actions Grid */}
            <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 12 }}>All Modules</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {QUICK_ACTIONS.map((mod) => (
                  <TouchableOpacity
                    key={mod.key}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate(mod.key)}
                    style={{
                      width: (width - 40 - 32) / 4,
                      backgroundColor: colors.bg.card, borderRadius: 16, padding: 10,
                      alignItems: 'center', gap: 6,
                    }}
                  >
                    <View style={{
                      width: 36, height: 36, borderRadius: 12,
                      backgroundColor: `${mod.color}18`, alignItems: 'center', justifyContent: 'center',
                    }}>
                      <AntDesign name={mod.icon as any} size={16} color={mod.color} />
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text.primary }}>{mod.label}</Text>
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

const styles = StyleSheet.create({
  iconBtn: {
    width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
});
