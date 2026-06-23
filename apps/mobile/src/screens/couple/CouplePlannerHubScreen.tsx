import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, StyleSheet, Animated, Dimensions } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 14;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - CARD_GAP) / 2;
const RING_SIZE = 48;
const STROKE_WIDTH = 3;

const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);

interface LifePlan {
  id: string;
  plannerType: string;
  targetAmount: number;
  currentSavings: number;
  progress: number;
  timeline: number;
  monthlyRequirement: number;
  targetDate: string | null;
  status: string;
  aiAdvice: string | null;
  details: Record<string, any>;
}

const PLAN_TYPES = [
  { type: 'BABY', icon: 'smileo', label: 'Baby Planning', color: '#FF8A65', subtitle: 'Growing family' },
  { type: 'HOUSE', icon: 'home', label: 'House Planning', color: '#60A5FA', subtitle: 'Dream home' },
  { type: 'CAR', icon: 'car', label: 'Car Planning', color: '#34C759', subtitle: 'Dream car' },
  { type: 'RETIREMENT', icon: 'Safety', label: 'Retirement Planning', color: '#5AC8FA', subtitle: 'Golden years' },
  { type: 'EDUCATION', icon: 'book', label: 'Education Planning', color: '#F59E0B', subtitle: 'Knowledge fund' },
  { type: 'EMERGENCY', icon: 'warning', label: 'Emergency Planning', color: '#EF4444', subtitle: 'Safety net' },
];

function ProgressRing({ progress, color, size = RING_SIZE }: { progress: number; color: string; size?: number }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (size - STROKE_WIDTH * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: Math.min(progress, 100),
      duration: 1200,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const dashOffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <SvgCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(128,128,128,0.1)"
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontSize: 9, fontWeight: '800', color }}>
        {Math.round(progress)}%
      </Text>
    </View>
  );
}

function ShimmerBlock({ width, height, style }: { width: number | string; height: number; style?: any }) {
  const { colors } = useTheme();
  return (
    <View style={[{ width: width as any, height, borderRadius: 6, backgroundColor: colors.skeleton.base, overflow: 'hidden' }, style]}>
      <View style={{ flex: 1 }} />
    </View>
  );
}

function SkeletonGrid() {
  const { colors } = useTheme();
  const shimmerAnims = useRef(PLAN_TYPES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = shimmerAnims.map((anim) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);

  const rows = [];
  for (let i = 0; i < 3; i++) {
    const leftAnim = shimmerAnims[i * 2];
    const rightAnim = shimmerAnims[i * 2 + 1];
    rows.push(
      <View key={i} style={{ flexDirection: 'row', gap: CARD_GAP, marginBottom: CARD_GAP }}>
        {[leftAnim, rightAnim].map((anim, idx) => (
          <Animated.View
            key={idx}
            style={[styles.skeletonCard, { backgroundColor: colors.bg.card, opacity: anim?.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.7] }) || 0.4 }]}
          >
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <ShimmerBlock width={RING_SIZE} height={RING_SIZE} style={{ borderRadius: RING_SIZE / 2 }} />
              <View style={{ flex: 1, gap: 6 }}>
                <ShimmerBlock width="80%" height={12} />
                <ShimmerBlock width="60%" height={10} />
                <ShimmerBlock width="100%" height={10} />
              </View>
            </View>
            <View style={{ gap: 6, marginTop: 12 }}>
              <ShimmerBlock width="70%" height={10} />
              <ShimmerBlock width="90%" height={10} />
            </View>
          </Animated.View>
        ))}
      </View>
    );
  }
  return <>{rows}</>;
}

function EmptyState({ onStart }: { onStart: () => void }) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={{
        width: 88, height: 88, borderRadius: 44, backgroundColor: `${colors.accent.primary}15`,
        alignItems: 'center', justifyContent: 'center', marginBottom: 24,
      }}>
        <AntDesign name="calendar" size={40} color={colors.accent.primary} />
      </View>
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text.primary, marginBottom: 8, textAlign: 'center' }}>
        Plan Your Future Together
      </Text>
      <Text style={{ fontSize: 15, color: colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
        Start planning life's biggest moments — from your dream home to your golden years. Create your first life plan and we'll guide you every step of the way.
      </Text>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onStart}
        style={{
          backgroundColor: colors.accent.primary, paddingHorizontal: 32, paddingVertical: 16,
          borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
        }}
      >
        <AntDesign name="plus" size={20} color={colors.text.inverse} />
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.inverse }}>
          Start Planning Together
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function PlanCard({
  planType, plan, index, onPress, colors,
}: {
  planType: typeof PLAN_TYPES[0]; plan: LifePlan | undefined; index: number; onPress: () => void; colors: any;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 500, delay: index * 100, useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 500, delay: index * 100, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const progress = plan?.progress ?? 0;
  const target = plan?.targetAmount ?? 0;
  const saved = plan?.currentSavings ?? 0;
  const monthlyReq = plan?.monthlyRequirement ?? 0;
  const advice = plan?.aiAdvice;
  const hasData = !!plan;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[
          styles.card,
          {
            backgroundColor: colors.bg.card,
            borderLeftColor: planType.color,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: `${planType.color}18` }]}>
            <AntDesign name={planType.icon as any} size={20} color={planType.color} />
          </View>
          <ProgressRing progress={progress} color={planType.color} />
        </View>

        <Text style={[styles.cardTitle, { color: colors.text.primary }]} numberOfLines={1}>
          {planType.label}
        </Text>
        <Text style={[styles.cardSubtitle, { color: colors.text.tertiary }]} numberOfLines={1}>
          {planType.subtitle}
        </Text>

        <View style={styles.cardStats}>
          {hasData ? (
            <>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Target</Text>
                <Text style={[styles.statValue, { color: colors.text.primary }]}>
                  ₹{target.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Saved</Text>
                <Text style={[styles.statValue, { color: colors.status.success }]}>
                  ₹{saved.toLocaleString('en-IN')}
                </Text>
              </View>
              {monthlyReq > 0 && (
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Monthly</Text>
                  <Text style={[styles.statValue, { color: planType.color }]}>
                    ₹{monthlyReq.toLocaleString('en-IN')}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={[styles.notStartedBadge, { backgroundColor: `${planType.color}12` }]}>
              <Text style={[styles.notStartedText, { color: planType.color }]}>Not started</Text>
            </View>
          )}
        </View>

        {advice && (
          <View style={[styles.adviceChip, { backgroundColor: `${planType.color}10` }]}>
            <AntDesign name="bulb1" size={10} color={planType.color} />
            <Text style={[styles.adviceText, { color: planType.color }]} numberOfLines={2}>
              {advice}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function CouplePlannerHubScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [plans, setPlans] = useState<LifePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const planMap = useRef<Record<string, LifePlan>>({}).current;

  const fetchPlans = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get<LifePlan[]>('/couple/life-plans');
      const arr = Array.isArray(res) ? res : [];
      setPlans(arr);
      arr.forEach((p) => { planMap[p.plannerType] = p; });
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const handleCardPress = (pt: typeof PLAN_TYPES[0]) => {
    const plan = planMap[pt.type];
    navigation.navigate('LifePlanDetail', { type: pt.type, id: plan?.id || '' });
  };

  const handleStartPlanning = () => {
    navigation.navigate('LifePlanForm');
  };

  const hasAnyPlan = plans.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View style={{
        paddingTop: insets.top + 8, paddingBottom: 4, paddingHorizontal: 20,
        backgroundColor: colors.bg.primary, borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border.subtle,
      }}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: colors.text.primary, letterSpacing: -0.5 }}>
          Life Plans
        </Text>
        <Text style={{ fontSize: 14, color: colors.text.secondary, marginTop: 2, marginBottom: 8 }}>
          {hasAnyPlan ? `${plans.length} plan${plans.length > 1 ? 's' : ''} in progress` : 'Plan your biggest life decisions'}
        </Text>
      </View>

      {loading ? (
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} tintColor={colors.accent.primary} />}
        >
          <SkeletonGrid />
        </ScrollView>
      ) : !hasAnyPlan ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPlans(true)} tintColor={colors.accent.primary} />}
        >
          <EmptyState onStart={handleStartPlanning} />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchPlans(true)} tintColor={colors.accent.primary} />
          }
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP }}>
            {PLAN_TYPES.map((pt, idx) => (
              <View key={pt.type} style={{ width: CARD_WIDTH }}>
                <PlanCard
                  planType={pt}
                  plan={planMap[pt.type]}
                  index={idx}
                  colors={colors}
                  onPress={() => handleCardPress(pt)}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {hasAnyPlan && !loading && (
        <View style={[styles.bottomCta, {
          paddingBottom: Math.max(insets.bottom, 16),
          backgroundColor: colors.bg.primary,
          borderTopColor: colors.border.subtle,
        }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleStartPlanning}
            style={[styles.ctaButton, { backgroundColor: colors.accent.primary }]}
          >
            <AntDesign name="plus" size={20} color={colors.text.inverse} />
            <Text style={[styles.ctaText, { color: colors.text.inverse }]}>
              Start Planning Together
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 14,
    borderLeftWidth: 3,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 200,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 11,
    marginBottom: 10,
  },
  cardStats: {
    gap: 4,
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  notStartedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  notStartedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  adviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 2,
  },
  adviceText: {
    fontSize: 10,
    fontWeight: '500',
    flex: 1,
    lineHeight: 14,
  },
  skeletonCard: {
    borderRadius: 20,
    padding: 14,
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    width: '100%',
  },
  bottomCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
