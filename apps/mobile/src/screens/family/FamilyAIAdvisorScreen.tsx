import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { spacing, borderRadius, shadows } from '../../theme/design';

const { width } = Dimensions.get('window');
const RING_SIZE = 140;
const RING_STROKE = 7;

function getScoreColor(score: number) {
  if (score >= 80) return '#4ADE80';
  if (score >= 60) return '#FBBF24';
  if (score >= 40) return '#FB923C';
  return '#F87171';
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Attention';
}

function fmt(v: number) {
  return `\u20B9${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtShort(v: number) {
  if (v >= 10000000) return `\u20B9${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `\u20B9${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `\u20B9${(v / 1000).toFixed(1)}K`;
  return fmt(v);
}

function HealthRing({ score, size = RING_SIZE, strokeWidth = RING_STROKE }: { score: number; size?: number; strokeWidth?: number }) {
  const { colors } = useTheme();
  const pct = Math.min(score, 100);
  const color = getScoreColor(pct);
  const halfSize = size / 2;
  const leftAnim = useRef(new Animated.Value(0)).current;
  const rightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const lv = Math.min(pct, 50) / 50;
    const rv = Math.max(0, pct - 50) / 50;
    Animated.parallel([
      Animated.timing(leftAnim, { toValue: lv, duration: 1200, useNativeDriver: false }),
      Animated.timing(rightAnim, { toValue: rv, duration: 1200, useNativeDriver: false }),
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
      <Text style={{ fontSize: size * 0.3, fontWeight: '800', color: colors.text.primary }}>{pct}</Text>
      <Text style={{ fontSize: 10, color: colors.text.tertiary, marginTop: 2 }}>{getScoreLabel(pct)}</Text>
    </View>
  );
}

function SkeletonLoader() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, gap: 16, paddingTop: 60 }}>
        <Animated.View style={{ height: 32, width: 160, borderRadius: 8, backgroundColor: '#27272A', opacity }} />
        <Animated.View style={{ height: 200, borderRadius: 24, backgroundColor: '#27272A', opacity }} />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Animated.View key={i} style={{ height: 120, borderRadius: 20, backgroundColor: '#27272A', opacity }} />
        ))}
      </View>
    </View>
  );
}

function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

const SECTION_CONFIG: Record<string, { icon: string; color: string }> = {
  spending: { icon: 'swap', color: '#F59E0B' },
  investment: { icon: 'linechart', color: '#A78BFA' },
  insurance: { icon: 'Safety', color: '#60A5FA' },
  goals: { icon: 'flag', color: '#4ADE80' },
  emergency: { icon: 'save', color: '#FB923C' },
  savings: { icon: 'bulb1', color: '#EC4899' },
};

function SectionCard({
  icon,
  color,
  title,
  children,
}: {
  icon: string;
  color: string;
  title: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View style={[sectionStyles.card, { backgroundColor: colors.bg.card }]}>
      <View style={[sectionStyles.accentBar, { backgroundColor: color }]} />
      <View style={sectionStyles.content}>
        <View style={sectionStyles.headerRow}>
          <View style={[sectionStyles.iconWrap, { backgroundColor: `${color}18` }]}>
            <AntDesign name={icon as any} size={18} color={color} />
          </View>
          <Text style={[sectionStyles.headerTitle, { color: colors.text.primary }]}>{title}</Text>
        </View>
        {children}
      </View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  card: {
    borderRadius: borderRadius['3xl'],
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  accentBar: {
    height: 4,
  },
  content: {
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default function FamilyAIAdvisorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthScore, setHealthScore] = useState<any>(null);
  const [aiReview, setAiReview] = useState<any>(null);

  const fetchData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const families = await api.get<any>('/family');
      const activeFamily = Array.isArray(families) ? families[0] : null;
      if (!activeFamily) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const familyId = route.params?.familyId ?? activeFamily.id;
      const [health, review] = await Promise.all([
        api.get<any>(`/family/health-score?familyId=${familyId}`).catch(() => null),
        api.get<any>(`/family/ai-review?familyId=${familyId}`).catch(() => null),
      ]);
      setHealthScore(health);
      setAiReview(review);
    } catch {
      /* silently ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route.params?.familyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <SkeletonLoader />
      </View>
    );
  }

  const overallScore = healthScore?.overallScore ?? 0;
  const spending = aiReview?.spending ?? {};
  const investment = aiReview?.investment ?? {};
  const insurance = aiReview?.insurance ?? {};
  const goals = aiReview?.goals ?? {};
  const emergency = aiReview?.emergency ?? {};
  const tips = aiReview?.savingsOpportunities ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* Large Title */}
        <View style={[styles.headerArea, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.backBtn, { backgroundColor: colors.bg.tertiary }]}
            >
              <AntDesign name="left" size={20} color={colors.text.primary} />
            </TouchableOpacity>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.largeTitle, { color: colors.text.primary }]}>AI Advisor</Text>
              <Text style={[styles.headerSub, { color: colors.text.tertiary }]}>
                Intelligent guidance for your family
              </Text>
            </View>
          </View>
        </View>

        {/* Health Score Card */}
        <AnimatedSection delay={0}>
          <View style={[styles.healthCard, { backgroundColor: colors.bg.card, ...shadows.md }]}>
            <HealthRing score={overallScore} />
            <Text style={[styles.healthTitle, { color: colors.text.primary }]}>Family Financial Health</Text>
            <View style={styles.scoreRow}>
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreValue, { color: getScoreColor(healthScore?.savingsAlignment ?? 0) }]}>
                  {healthScore?.savingsAlignment ?? 0}
                </Text>
                <Text style={[styles.scoreLabel, { color: colors.text.tertiary }]}>Savings</Text>
              </View>
              <View style={[styles.scoreDivider, { backgroundColor: colors.border.subtle }]} />
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreValue, { color: getScoreColor(healthScore?.emergencyFund ?? 0) }]}>
                  {healthScore?.emergencyFund ?? 0}
                </Text>
                <Text style={[styles.scoreLabel, { color: colors.text.tertiary }]}>Emergency</Text>
              </View>
              <View style={[styles.scoreDivider, { backgroundColor: colors.border.subtle }]} />
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreValue, { color: getScoreColor(healthScore?.goalAlignment ?? 0) }]}>
                  {healthScore?.goalAlignment ?? 0}
                </Text>
                <Text style={[styles.scoreLabel, { color: colors.text.tertiary }]}>Goals</Text>
              </View>
            </View>
          </View>
        </AnimatedSection>

        {/* Section 1: Family Spending Review */}
        <AnimatedSection delay={100}>
          <SectionCard icon={SECTION_CONFIG.spending.icon} color={SECTION_CONFIG.spending.color} title="Family Spending Review">
            <View style={styles.statGrid}>
              <View style={styles.statCol}>
                <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Monthly Income</Text>
                <Text style={[styles.statValue, { color: colors.status.success }]}>
                  {fmtShort(spending.monthlyIncome ?? 0)}
                </Text>
              </View>
              <View style={styles.statCol}>
                <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Monthly Expenses</Text>
                <Text style={[styles.statValue, { color: colors.status.error }]}>
                  {fmtShort(spending.monthlyExpenses ?? 0)}
                </Text>
              </View>
            </View>
            <View style={[styles.statSeparator, { backgroundColor: colors.border.subtle }]} />
            <View style={styles.statGrid}>
              <View style={styles.statCol}>
                <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Savings Rate</Text>
                <Text style={[styles.statValue, { color: getScoreColor(spending.savingsRate ?? 0) }]}>
                  {spending.savingsRate ?? 0}%
                </Text>
              </View>
              <View style={styles.statCol}>
                <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Trend</Text>
                <View style={styles.trendRow}>
                  <AntDesign
                    name={(spending.trend ?? 'up') === 'up' ? 'arrowup' : 'arrowdown'}
                    size={14}
                    color={(spending.trend ?? 'up') === 'up' ? colors.status.error : colors.status.success}
                  />
                  <Text style={[styles.statValue, { color: colors.text.primary }]}>
                    {spending.trendPercent ?? 0}%
                  </Text>
                </View>
              </View>
            </View>
            {spending.recommendation && (
              <Text style={[styles.recommendationText, { color: colors.text.secondary }]}>
                {spending.recommendation}
              </Text>
            )}
          </SectionCard>
        </AnimatedSection>

        {/* Section 2: Investment Review */}
        <AnimatedSection delay={150}>
          <SectionCard icon={SECTION_CONFIG.investment.icon} color={SECTION_CONFIG.investment.color} title="Investment Review">
            <View style={styles.statGrid}>
              <View style={styles.statCol}>
                <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Total Portfolio</Text>
                <Text style={[styles.statValue, { color: colors.text.primary }]}>
                  {fmtShort(investment.totalPortfolio ?? 0)}
                </Text>
              </View>
              <View style={styles.statCol}>
                <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Return</Text>
                <Text style={[styles.statValue, { color: (investment.returnPercent ?? 0) >= 0 ? colors.status.success : colors.status.error }]}>
                  {investment.returnPercent ?? 0}%
                </Text>
              </View>
            </View>
            {investment.recommendations && investment.recommendations.length > 0 && (
              <View style={styles.bulletList}>
                {investment.recommendations.map((rec: string, i: number) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={[styles.bullet, { color: SECTION_CONFIG.investment.color }]}>•</Text>
                    <Text style={[styles.bulletText, { color: colors.text.secondary }]}>{rec}</Text>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>
        </AnimatedSection>

        {/* Section 3: Insurance Review */}
        <AnimatedSection delay={200}>
          <SectionCard icon={SECTION_CONFIG.insurance.icon} color={SECTION_CONFIG.insurance.color} title="Insurance Review">
            {insurance.coverageGaps && insurance.coverageGaps.length > 0 && (
              <View style={styles.bulletList}>
                {insurance.coverageGaps.map((gap: string, i: number) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={[styles.bullet, { color: SECTION_CONFIG.insurance.color }]}>•</Text>
                    <Text style={[styles.bulletText, { color: colors.text.secondary }]}>{gap}</Text>
                  </View>
                ))}
              </View>
            )}
            {insurance.recommendations && insurance.recommendations.length > 0 && (
              <>
                <Text style={[styles.subSectionTitle, { color: colors.text.tertiary }]}>Recommendations</Text>
                {insurance.recommendations.map((rec: string, i: number) => (
                  <View key={i} style={styles.pillRow}>
                    <View style={[styles.pill, { backgroundColor: `${SECTION_CONFIG.insurance.color}18`, borderColor: `${SECTION_CONFIG.insurance.color}30` }]}>
                      <Text style={[styles.pillText, { color: SECTION_CONFIG.insurance.color }]}>{rec}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </SectionCard>
        </AnimatedSection>

        {/* Section 4: Goal Forecasting */}
        <AnimatedSection delay={250}>
          <SectionCard icon={SECTION_CONFIG.goals.icon} color={SECTION_CONFIG.goals.color} title="Goal Forecasting">
            {goals.items && goals.items.length > 0 ? (
              goals.items.map((goal: any, i: number) => {
                const pct = Math.min(goal.progress ?? 0, 100);
                const gColor = pct >= 80 ? colors.status.success : pct >= 50 ? colors.status.warning : colors.status.error;
                return (
                  <View key={i} style={styles.goalRow}>
                    <View style={styles.goalInfo}>
                      <Text style={[styles.goalName, { color: colors.text.primary }]}>{goal.name}</Text>
                      <Text style={[styles.goalDate, { color: colors.text.tertiary }]}>
                        {goal.projectedDate ? `By ${new Date(goal.projectedDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : 'No date set'}
                      </Text>
                    </View>
                    <View style={styles.goalRight}>
                      <Text style={[styles.goalPct, { color: gColor }]}>{pct}%</Text>
                      <View style={[styles.goalTrack, { backgroundColor: colors.border.subtle }]}>
                        <View style={[styles.goalBar, { width: `${pct}%`, backgroundColor: gColor }]} />
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>No goals tracked yet.</Text>
            )}
          </SectionCard>
        </AnimatedSection>

        {/* Section 5: Emergency Fund Analysis */}
        <AnimatedSection delay={300}>
          <SectionCard icon={SECTION_CONFIG.emergency.icon} color={SECTION_CONFIG.emergency.color} title="Emergency Fund Analysis">
            <View style={styles.statGrid}>
              <View style={styles.statCol}>
                <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Months Covered</Text>
                <Text style={[styles.statValue, { color: colors.text.primary }]}>
                  {emergency.monthsOfCoverage ?? 0}m
                </Text>
              </View>
              <View style={styles.statCol}>
                <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Readiness</Text>
                <Text style={[styles.statValue, { color: getScoreColor(emergency.readinessScore ?? 0) }]}>
                  {emergency.readinessScore ?? 0}%
                </Text>
              </View>
            </View>
            {(emergency.monthsOfCoverage ?? 0) < 6 && (
              <Text style={[styles.recommendationText, { color: colors.status.warning }]}>
                Aim for at least 6 months of expenses covered in your emergency fund.
              </Text>
            )}
          </SectionCard>
        </AnimatedSection>

        {/* Section 6: Savings Opportunities */}
        <AnimatedSection delay={350}>
          <SectionCard icon={SECTION_CONFIG.savings.icon} color={SECTION_CONFIG.savings.color} title="Savings Opportunities">
            {tips.length > 0 ? (
              tips.map((tip: any, i: number) => (
                <View key={i} style={styles.tipRow}>
                  <View style={[styles.tipDot, { backgroundColor: SECTION_CONFIG.savings.color }]} />
                  <View style={styles.tipContent}>
                    <Text style={[styles.tipTitle, { color: colors.text.primary }]}>{tip.title}</Text>
                    <Text style={[styles.tipDesc, { color: colors.text.secondary }]}>{tip.description}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>No savings opportunities identified yet.</Text>
            )}
          </SectionCard>
        </AnimatedSection>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerArea: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  largeTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    marginTop: 2,
  },
  healthCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: borderRadius['4xl'],
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  healthTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  scoreItem: {
    flex: 1,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  scoreDivider: {
    width: 1,
    height: 32,
  },
  statGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statSeparator: {
    height: 1,
    marginVertical: spacing.md,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recommendationText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: spacing.md,
    lineHeight: 17,
  },
  bulletList: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 16,
    lineHeight: 20,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: spacing.md,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 14,
    fontWeight: '600',
  },
  goalDate: {
    fontSize: 11,
    marginTop: 2,
  },
  goalRight: {
    alignItems: 'flex-end',
    width: 80,
  },
  goalPct: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  goalTrack: {
    height: 5,
    width: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalBar: {
    height: 5,
    borderRadius: 3,
  },
  tipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 8,
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  tipDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
