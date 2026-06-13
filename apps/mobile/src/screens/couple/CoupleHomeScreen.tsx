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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { useAuth } from '../../store/AuthContext';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;

function fmt(v: number) {
  return `\u20B9${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function shortFmt(v: number) {
  if (v >= 10000000) {
    return `\u20B9${(v / 10000000).toFixed(1)}Cr`;
  }
  if (v >= 100000) {
    return `\u20B9${(v / 100000).toFixed(1)}L`;
  }
  if (v >= 1000) {
    return `\u20B9${(v / 1000).toFixed(1)}K`;
  }
  return `\u20B9${Math.round(v)}`;
}

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

const PLANNER_BADGES = [
  { type: 'BABY', label: 'Baby', icon: 'happy-outline', color: '#FF8A65' },
  { type: 'HOUSE', label: 'House', icon: 'home-outline', color: '#60A5FA' },
  { type: 'CAR', label: 'Car', icon: 'car-outline', color: '#34C759' },
  { type: 'RETIREMENT', label: 'Retire', icon: 'umbrella-outline', color: '#A78BFA' },
];

const QUICK_ACTIONS = [
  { key: 'CoupleSpaceHome', icon: 'wallet-outline', label: 'Wallet', color: '#F97316' },
  { key: 'CoupleIncome', icon: 'trending-up-outline', label: 'Income', color: '#34C759' },
  { key: 'CoupleExpenses', icon: 'cart-outline', label: 'Expenses', color: '#FF6B6B' },
  { key: 'CoupleBudgets', icon: 'wallet-outline', label: 'Budgets', color: '#F59E0B' },
  { key: 'CoupleSavings', icon: 'save-outline', label: 'Savings', color: '#60A5FA' },
  { key: 'CoupleGoals', icon: 'trophy-outline', label: 'Goals', color: '#A78BFA' },
  { key: 'CoupleBills', icon: 'calendar-outline', label: 'Bills', color: '#FF8A65' },
  { key: 'CoupleSettlements', icon: 'cash-outline', label: 'Settle', color: '#14B8A6' },
  { key: 'CoupleReports', icon: 'stats-chart-outline', label: 'Reports', color: '#4F46E5' },
  { key: 'CouplePlanners', icon: 'map-outline', label: 'Planners', color: '#60A5FA' },
  { key: 'CoupleTimeline', icon: 'time-outline', label: 'Timeline', color: '#34C759' },
  { key: 'CoupleCoach', icon: 'bulb-outline', label: 'AI Coach', color: '#8B5CF6' },
];

interface HealthRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}
function HealthRing({ score, size = 88, strokeWidth = 6 }: HealthRingProps) {
  const pct = Math.min(score, 100);
  const color = pct >= 80 ? '#34C759' : pct >= 60 ? '#F59E0B' : '#FF6B6B';
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
      <View
        style={{
          width: size,
          height: size,
          borderRadius: halfSize,
          borderWidth: strokeWidth,
          borderColor: '#1E293B',
          position: 'absolute',
        }}
      />
      {pct > 0 && (
        <>
          <View
            style={{
              width: halfSize,
              height: size,
              position: 'absolute',
              left: halfSize,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={{
                width: size,
                height: size,
                borderRadius: halfSize,
                borderWidth: strokeWidth,
                borderColor: color,
                borderLeftColor: 'transparent',
                borderBottomColor: 'transparent',
                position: 'absolute',
                left: -halfSize,
                transform: [{ rotate: rr }],
              }}
            />
          </View>
          <View
            style={{
              width: halfSize,
              height: size,
              position: 'absolute',
              left: 0,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={{
                width: size,
                height: size,
                borderRadius: halfSize,
                borderWidth: strokeWidth,
                borderColor: color,
                borderRightColor: 'transparent',
                borderTopColor: 'transparent',
                position: 'absolute',
                left: 0,
                transform: [{ rotate: lr }],
              }}
            />
          </View>
        </>
      )}
      <Text style={{ fontSize: size * 0.28, fontWeight: '800', color: '#FFF' }}>{pct}</Text>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  isRate,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  isRate?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#161224',
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>{value}</Text>
      <Text style={{ fontSize: 10, color: '#64748B' }}>{label}</Text>
    </View>
  );
}

function GradientCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View
      style={[
        {
          backgroundColor: '#161224',
          borderRadius: 20,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CoupleHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
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

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard(true);
  }, [fetchDashboard]);

  if (loading) {
    return <LoadingScreen />;
  }

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
      style={{ flex: 1, backgroundColor: '#0D0B1A' }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />
      }
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Header */}
        <LinearGradient
          colors={['#1a1428', '#0D0B1A']}
          style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 20 }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFF' }}>
                <Text style={{ color: '#FF4D8C' }}>&#x2764;&#xFE0F;</Text> {myName} & {partnerName}
              </Text>
              {data?.togetherSince && (
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Together since{' '}
                  {new Date(data.togetherSince).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}{' '}
                  &middot; {daysSince(data.togetherSince)} days
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('CoupleCoach')}
                style={styles.iconBtn}
              >
                <Ionicons name="bulb-outline" size={20} color="#8B5CF6" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('CoupleSettings')}
                style={styles.iconBtn}
              >
                <Ionicons name="settings-outline" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {error ? (
          <View style={{ padding: 16 }}>
            <Text style={{ color: '#FF6B6B', fontSize: 14 }}>{error}</Text>
          </View>
        ) : (
          <>
            {/* Health Score + Net Worth */}
            <View style={{ paddingHorizontal: 20, marginTop: -8 }}>
              <GradientCard style={{ padding: 20 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flex: 1, marginRight: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>
                      Combined Net Worth
                    </Text>
                    <Text style={{ fontSize: 32, fontWeight: '800', color: '#FFF', marginTop: 4 }}>
                      {shortFmt(data?.netWorth?.total || 0)}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 20, marginTop: 12 }}>
                      <View>
                        <Text style={{ fontSize: 11, color: '#34C759' }}>Assets</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>
                          {shortFmt(data?.netWorth?.assets || 0)}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 11, color: '#FF6B6B' }}>Liabilities</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>
                          {shortFmt(data?.netWorth?.liabilities || 0)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={{ marginTop: 12 }}
                      onPress={() => navigation.navigate('CoupleReports')}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 12, color: '#8B5CF6', fontWeight: '600' }}>
                          View Breakdown
                        </Text>
                        <Ionicons name="chevron-forward" size={12} color="#8B5CF6" />
                      </View>
                    </TouchableOpacity>
                  </View>
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <HealthRing score={score} />
                    <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '500' }}>
                      Health Score
                    </Text>
                  </View>
                </View>

                {data?.netWorth?.trend?.length > 1 && (
                  <View
                    style={{
                      marginTop: 16,
                      height: 44,
                      flexDirection: 'row',
                      alignItems: 'flex-end',
                      gap: 3,
                    }}
                  >
                    {data.netWorth.trend.slice(-12).map((pt: any, i: number) => {
                      const slice = data.netWorth.trend.slice(-12);
                      const max = Math.max(...slice.map((p: any) => p.netWorth));
                      const h = max > 0 ? (pt.netWorth / max) * 40 : 0;
                      return (
                        <View
                          key={i}
                          style={{
                            flex: 1,
                            height: Math.max(h, 3),
                            backgroundColor: '#8B5CF6',
                            borderTopLeftRadius: 3,
                            borderTopRightRadius: 3,
                            opacity: 0.4 + (i / 12) * 0.6,
                          }}
                        />
                      );
                    })}
                  </View>
                )}
              </GradientCard>
            </View>

            {/* Quick Balance Card */}
            <View style={{ paddingHorizontal: 20, marginTop: CARD_GAP }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate('CoupleSettlements')}
                style={{
                  backgroundColor: '#161224',
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: '#34C75915',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="wallet" size={22} color="#34C759" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>Shared Balance</Text>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFF' }}>
                      {fmt(data?.sharedBalance?.amount || 0)}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    backgroundColor: '#8B5CF620',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#8B5CF6' }}>
                    Settle Up
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Monthly Snapshot */}
            <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>
                  Monthly Snapshot
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('CoupleReports')}>
                  <Text style={{ fontSize: 12, color: '#8B5CF6' }}>Details</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <StatCard
                  icon="trending-up"
                  label="Income"
                  value={fmt(data?.monthlySnapshot?.income || 0)}
                  color="#34C759"
                />
                <StatCard
                  icon="cart"
                  label="Expenses"
                  value={fmt(data?.monthlySnapshot?.expenses || 0)}
                  color="#FF6B6B"
                />
                <StatCard
                  icon="save"
                  label="Savings"
                  value={fmt(data?.monthlySnapshot?.savings || 0)}
                  color="#60A5FA"
                />
                <StatCard
                  icon="pie-chart"
                  label="Rate"
                  value={`${data?.monthlySnapshot?.savingsRate || 0}%`}
                  color="#A78BFA"
                  isRate
                />
              </View>
              {data?.monthlySnapshot?.change !== null && data.monthlySnapshot.change !== 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                  <Ionicons
                    name={data.monthlySnapshot.change > 0 ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={data.monthlySnapshot.change > 0 ? '#FF6B6B' : '#34C759'}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      color: data.monthlySnapshot.change > 0 ? '#FF6B6B' : '#34C759',
                    }}
                  >
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
                    backgroundColor: '#1E1030',
                    borderRadius: 16,
                    padding: 16,
                    borderLeftWidth: 3,
                    borderLeftColor: '#8B5CF6',
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        backgroundColor: '#8B5CF620',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="bulb" size={16} color="#8B5CF6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#8B5CF6' }}>
                        AI Couple Coach
                      </Text>
                      <Text style={{ fontSize: 13, color: '#CCC', marginTop: 4, lineHeight: 18 }}>
                        {data.aiSummary.text}
                      </Text>
                      {data.aiSummary.insights?.length > 1 && (
                        <Text style={{ fontSize: 11, color: '#8B5CF6', marginTop: 6 }}>
                          +{data.aiSummary.insights.length - 1} more insights
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#64748B"
                      style={{ marginTop: 2 }}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Goals */}
            {goals.length > 0 && (
              <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Goals</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('CoupleGoals')}>
                    <Text style={{ fontSize: 12, color: '#8B5CF6' }}>See All</Text>
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
                        backgroundColor: '#161224',
                        borderRadius: 14,
                        padding: 14,
                        marginBottom: 6,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 12,
                          backgroundColor: '#A78BFA18',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="trophy-outline" size={16} color="#A78BFA" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFF' }}>
                          {goal.name || goal.title}
                        </Text>
                        <View
                          style={{
                            height: 4,
                            backgroundColor: '#1E293B',
                            borderRadius: 2,
                            marginTop: 6,
                          }}
                        >
                          <View
                            style={{
                              width: `${pct}%`,
                              height: 4,
                              backgroundColor: '#A78BFA',
                              borderRadius: 2,
                            }}
                          />
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>{pct}%</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Active Planners */}
            {planners.length > 0 && (
              <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>
                    Life Planners
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('CouplePlanners')}>
                    <Text style={{ fontSize: 12, color: '#8B5CF6' }}>Manage</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10 }}
                >
                  {planners.map((pl: any) => {
                    const target = Number(pl.targetAmount || 0);
                    const current = Number(pl.currentSavings || 0);
                    const pct = target > 0 ? Math.round((current / target) * 100) : 0;
                    const badge = PLANNER_BADGES.find((b) => b.type === pl.plannerType) || {
                      label: pl.plannerType,
                      icon: 'flag-outline',
                      color: '#64748B',
                    };
                    return (
                      <TouchableOpacity
                        key={pl.id}
                        style={{
                          backgroundColor: '#161224',
                          borderRadius: 16,
                          padding: 14,
                          width: 160,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            backgroundColor: `${badge.color}18`,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 8,
                          }}
                        >
                          <Ionicons name={badge.icon as any} size={16} color={badge.color} />
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>
                          {badge.label}
                        </Text>
                        <Text
                          style={{ fontSize: 15, fontWeight: '800', color: '#FFF', marginTop: 4 }}
                        >
                          {shortFmt(target)}
                        </Text>
                        <View
                          style={{
                            height: 4,
                            backgroundColor: '#1E293B',
                            borderRadius: 2,
                            marginTop: 8,
                          }}
                        >
                          <View
                            style={{
                              width: `${pct}%`,
                              height: 4,
                              backgroundColor: badge.color,
                              borderRadius: 2,
                            }}
                          />
                        </View>
                        <Text style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>
                          {pct}% saved
                        </Text>
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
                    backgroundColor: '#161224',
                    borderRadius: 16,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor:
                          g.level === 'Platinum Couple'
                            ? '#E2E8F020'
                            : g.level === 'Gold Couple'
                              ? '#F59E0B20'
                              : g.level === 'Silver Couple'
                                ? '#94A3B820'
                                : '#CD7F3220',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons
                        name="diamond"
                        size={18}
                        color={
                          g.level === 'Platinum Couple'
                            ? '#E2E8F0'
                            : g.level === 'Gold Couple'
                              ? '#F59E0B'
                              : g.level === 'Silver Couple'
                                ? '#94A3B8'
                                : '#CD7F32'
                        }
                      />
                    </View>
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>
                        {g.level}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                        {g.xp} XP &middot; {g.achievements || g.achievementsCount || 0} achievements
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={{ width: 60, height: 4, backgroundColor: '#1E293B', borderRadius: 2 }}
                    >
                      <View
                        style={{
                          width: `${g.xpRequired > 0 ? Math.round((g.xpProgress / g.xpRequired) * 100) : 0}%`,
                          height: 4,
                          backgroundColor: '#8B5CF6',
                          borderRadius: 2,
                        }}
                      />
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#64748B" />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Actions Grid */}
            <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF', marginBottom: 12 }}>
                All Modules
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {QUICK_ACTIONS.map((mod) => (
                  <TouchableOpacity
                    key={mod.key}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate(mod.key)}
                    style={{
                      width: (width - 40 - 32) / 4,
                      backgroundColor: '#161224',
                      borderRadius: 16,
                      padding: 10,
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        backgroundColor: `${mod.color}18`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name={mod.icon as any} size={16} color={mod.color} />
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFF' }}>
                      {mod.label}
                    </Text>
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
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
