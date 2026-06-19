import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { spacing, borderRadius, shadows } from '../../theme/design';

const { width } = Dimensions.get('window');
const RING_SIZE = 160;
const RING_STROKE = 8;

function getScoreColor(score: number) {
  if (score >= 80) return '#4ADE80';
  if (score >= 50) return '#FBBF24';
  return '#F87171';
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Needs Attention';
}

function fmt(v: number) {
  return `\u20B9${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
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
      <Text style={{ fontSize: 11, color: colors.text.tertiary, marginTop: 2 }}>{getScoreLabel(pct)}</Text>
    </View>
  );
}

function SkeletonLoader() {
  const { colors } = useTheme();
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg.primary }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ height: 60 }} />
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Animated.View style={{ width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, backgroundColor: colors.border.default, opacity }} />
      </View>
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginTop: 8 }}>
        {[1, 2].map((i) => (
          <Animated.View key={i} style={{ flex: 1, height: 80, borderRadius: 16, backgroundColor: colors.border.default, opacity }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginTop: 12 }}>
        {[1, 2, 3, 4].map((i) => (
          <Animated.View key={i} style={{ flex: 1, height: 90, borderRadius: 16, backgroundColor: colors.border.default, opacity }} />
        ))}
      </View>
      {[1, 2, 3].map((i) => (
        <Animated.View key={i} style={{ marginHorizontal: 20, marginTop: 12, height: 80, borderRadius: 16, backgroundColor: colors.border.default, opacity }} />
      ))}
    </ScrollView>
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

export function CoupleCoachScreen({ navigation }: any) {
  const nav = navigation || useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthScore, setHealthScore] = useState<any>(null);
  const [aiReview, setAiReview] = useState<any>(null);
  const [coachData, setCoachData] = useState<any>(null);

  const fetchData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [health, review, coach] = await Promise.all([
        api.get<any>('/couple/health-score').catch(() => null),
        api.get<any>('/couple/ai-review').catch(() => null),
        api.get<any>('/couple/coach').catch(() => null),
      ]);
      setHealthScore(health);
      setAiReview(review);
      setCoachData(coach);
    } catch {
      /* silently ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <SkeletonLoader />;

  const overallScore = healthScore?.overallScore ?? 0;
  const categories = healthScore?.categories ?? {};
  const summary = aiReview?.summary ?? {};
  const goals = aiReview?.goals ?? {};
  const insights = aiReview?.insights ?? coachData?.insights ?? [];
  const alerts = aiReview?.alerts ?? coachData?.alerts ?? [];
  const recommendations = aiReview?.recommendations ?? coachData?.recommendations ?? [];

  const catItems = [
    { key: 'savingsAlignment', label: 'Savings Alignment', score: categories.savingsAlignment ?? 0 },
    { key: 'emergencyFund', label: 'Emergency Fund', score: categories.emergencyFund ?? 0 },
    { key: 'debtManagement', label: 'Debt Management', score: categories.debtManagement ?? 0 },
    { key: 'goalAlignment', label: 'Goal Alignment', score: categories.goalAlignment ?? 0 },
  ];

  const projected1yr = summary.savings ? fmt(summary.savings * 12) : null;
  const projected5yr = summary.savings ? fmt(summary.savings * 60) : null;
  const projected10yr = summary.savings ? fmt(summary.savings * 120) : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg.primary }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchData(true)}
          tintColor={colors.accent.primary}
        />
      }
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.bg.secondary }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => nav.goBack()}
            style={[styles.backBtn, { backgroundColor: colors.bg.tertiary }]}
          >
            <AntDesign name="left" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>AI Coach</Text>
            <Text style={[styles.headerSubtitle, { color: colors.text.tertiary }]}>
              Personalized financial intelligence
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => nav.navigate('CoupleReports')}
            style={[styles.reportBtn, { backgroundColor: `${colors.accent.primary}18` }]}
          >
            <Text style={[styles.reportBtnText, { color: colors.accent.primary }]}>Full Report</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section 1: Health Score Card */}
      <AnimatedSection delay={0}>
        <View style={[styles.healthCard, { backgroundColor: colors.bg.card, ...shadows.md }]}>
          <HealthRing score={overallScore} />
          <Text style={[styles.healthTitle, { color: colors.text.primary }]}>Overall Financial Health</Text>

          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: getScoreColor(healthScore?.financialCompatibility ?? 0) }]}>
                {healthScore?.financialCompatibility ?? 0}
              </Text>
              <Text style={[styles.scoreLabel, { color: colors.text.tertiary }]}>Compatibility</Text>
            </View>
            <View style={[styles.scoreDivider, { backgroundColor: colors.border.subtle }]} />
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, { color: getScoreColor(healthScore?.monthlyRelationshipScore ?? 0) }]}>
                {healthScore?.monthlyRelationshipScore ?? 0}
              </Text>
              <Text style={[styles.scoreLabel, { color: colors.text.tertiary }]}>Monthly Score</Text>
            </View>
          </View>
        </View>
      </AnimatedSection>

      {/* Section 2: Category Scores */}
      <AnimatedSection delay={150}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Category Scores</Text>
        </View>
        <View style={styles.catGrid}>
          {catItems.map((cat) => {
            const catColor = getScoreColor(cat.score);
            return (
              <View key={cat.key} style={[styles.catCard, { backgroundColor: colors.bg.card }]}>
                <Text style={[styles.catLabel, { color: colors.text.secondary }]}>{cat.label}</Text>
                <View style={[styles.progressTrack, { backgroundColor: colors.border.subtle }]}>
                  <View style={[styles.progressBar, { width: `${cat.score}%`, backgroundColor: catColor }]} />
                </View>
                <Text style={[styles.catScore, { color: catColor }]}>{cat.score}</Text>
              </View>
            );
          })}
        </View>
      </AnimatedSection>

      {/* Section 3: AI Recommendations */}
      <AnimatedSection delay={300}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>AI Recommendations</Text>
        </View>
        <View style={styles.recContainer}>
          {recommendations.length > 0 ? (
            recommendations.map((rec: any, i: number) => {
              const recColor = rec.type === 'alert' ? colors.status.error : rec.type === 'warning' ? colors.status.warning : colors.accent.primary;
              const recIcon = rec.type === 'alert' ? 'warning' : rec.type === 'warning' ? 'exclamationcircleo' : 'bulb1';
              return (
                <View key={i} style={[styles.recCard, { backgroundColor: colors.bg.card, borderLeftColor: recColor }]}>
                  <View style={[styles.recIconWrap, { backgroundColor: `${recColor}18` }]}>
                    <AntDesign name={recIcon as any} size={18} color={recColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recTitle, { color: colors.text.primary }]}>{rec.title || rec.label}</Text>
                    <Text style={[styles.recDesc, { color: colors.text.secondary }]}>{rec.description || rec.message}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <>
              {projected1yr && (
                <View style={[styles.recCard, { backgroundColor: colors.bg.card, borderLeftColor: colors.accent.primary }]}>
                  <View style={[styles.recIconWrap, { backgroundColor: `${colors.accent.primary}18` }]}>
                    <AntDesign name="linechart" size={18} color={colors.accent.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recTitle, { color: colors.text.primary }]}>Future Forecasting</Text>
                    <Text style={[styles.recDesc, { color: colors.text.secondary }]}>
                      Projected net worth: 1yr: {projected1yr} · 5yr: {projected5yr} · 10yr: {projected10yr}
                    </Text>
                  </View>
                </View>
              )}
              {summary.savingsRate > 0 && (
                <View style={[styles.recCard, { backgroundColor: colors.bg.card, borderLeftColor: '#4ADE80' }]}>
                  <View style={[styles.recIconWrap, { backgroundColor: '#4ADE8018' }]}>
                    <AntDesign name="save" size={18} color="#4ADE80" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recTitle, { color: colors.text.primary }]}>Savings Recommendation</Text>
                    <Text style={[styles.recDesc, { color: colors.text.secondary }]}>
                      Your savings rate is {summary.savingsRate}%. Aim for at least 20% for long-term security.
                    </Text>
                  </View>
                </View>
              )}
              {goals?.onTrack !== undefined && (
                <View style={[styles.recCard, { backgroundColor: colors.bg.card, borderLeftColor: '#FBBF24' }]}>
                  <View style={[styles.recIconWrap, { backgroundColor: '#FBBF2418' }]}>
                    <AntDesign name="Trophy" size={18} color="#FBBF24" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recTitle, { color: colors.text.primary }]}>Goal Optimization</Text>
                    <Text style={[styles.recDesc, { color: colors.text.secondary }]}>
                      {goals.active || 0} active goals · {goals.onTrack || 0} on track · {goals.completed || 0} completed
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}

          {alerts.length > 0 && alerts.map((alert: any, i: number) => (
            <View key={`alert-${i}`} style={[styles.recCard, { backgroundColor: colors.bg.card, borderLeftColor: colors.status.error }]}>
              <View style={[styles.recIconWrap, { backgroundColor: `${colors.status.error}18` }]}>
                <AntDesign name="warning" size={18} color={colors.status.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.recTitle, { color: colors.text.primary }]}>Risk Alert</Text>
                <Text style={[styles.recDesc, { color: colors.text.secondary }]}>{alert.message || alert.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </AnimatedSection>

      {/* Section 4: AI Insights */}
      {insights.length > 0 && (
        <AnimatedSection delay={450}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>AI Insights</Text>
          </View>
          <View style={styles.insightsContainer}>
            {insights.map((insight: any, i: number) => {
              const insColor = insight.type === 'positive'
                ? '#4ADE80'
                : insight.type === 'warning'
                  ? '#FBBF24'
                  : colors.accent.primary;
              const insIcon = insight.type === 'positive' ? 'checkcircle' : insight.type === 'warning' ? 'exclamationcircle' : 'infocirlce';
              return (
                <View key={i} style={[styles.insightRow, { backgroundColor: colors.bg.card }]}>
                  <View style={[styles.insightIconWrap, { backgroundColor: `${insColor}18` }]}>
                    <AntDesign name={insIcon as any} size={16} color={insColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.insightTitle, { color: colors.text.primary }]}>
                      {insight.title || insight.label}
                    </Text>
                    <Text style={[styles.insightText, { color: colors.text.secondary }]}>
                      {insight.description || insight.text || insight.message}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </AnimatedSection>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  reportBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reportBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  healthCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  healthTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 0,
  },
  scoreItem: {
    flex: 1,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 26,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  scoreDivider: {
    width: 1,
    height: 36,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 10,
  },
  catCard: {
    width: (width - 20 - 20 - 10) / 2,
    borderRadius: 16,
    padding: 14,
  },
  catLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  catScore: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  recContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  recCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderLeftWidth: 3,
    marginBottom: 2,
  },
  recIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  recTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  recDesc: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  insightsContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  insightRow: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  insightIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  insightText: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
});
