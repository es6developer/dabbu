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
import { spacing, borderRadius, shadows } from '../../theme/design';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.xl * 2 - spacing.md) / 2;

function getTemplates(colors: any) {
  return [
    { type: 'HOUSE', icon: 'home', label: 'House', color: '#60A5FA' },
    { type: 'CAR', icon: 'car', label: 'Car', color: '#34C759' },
    { type: 'BABY', icon: 'smileo', label: 'Baby Fund', color: '#FF8A65' },
    { type: 'VACATION', icon: 'earth', label: 'Vacation', color: colors.status.warning },
    { type: 'WEDDING', icon: 'heart', label: 'Wedding', color: colors.accent.primary },
    { type: 'INVESTMENT', icon: 'linechart', label: 'Investment', color: colors.accent.tertiary },
  ];
}

function fmt(v: number) {
  return `\u20B9${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [pct]);
  const w = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });
  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, { width: w, backgroundColor: color }]} />
    </View>
  );
}

function useStagger(count: number, baseDelay = 80) {
  const anims = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(
      baseDelay,
      anims.map((a) => Animated.timing(a, { toValue: 1, duration: 400, useNativeDriver: true })),
    ).start();
  }, [count]);
  return anims;
}

function SkeletonGoalCard() {
  const { colors } = useTheme();
  return (
    <View style={[styles.goalCard, { backgroundColor: colors.bg.card }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Skeleton width={40} height={40} borderRadius={12} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="70%" height={14} borderRadius={6} />
          <Skeleton width="50%" height={11} borderRadius={5} />
        </View>
      </View>
      <Skeleton width="100%" height={6} borderRadius={3} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Skeleton width="35%" height={20} borderRadius={6} />
        <Skeleton width={50} height={18} borderRadius={9} />
      </View>
    </View>
  );
}

function GoalsSkeleton() {
  return (
    <View style={{ paddingHorizontal: spacing.xl, gap: 12, paddingTop: spacing.lg }}>
      <Skeleton width={120} height={16} borderRadius={8} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10 }}
      >
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} width={CARD_WIDTH} height={100} borderRadius={20} />
        ))}
      </ScrollView>
      <Skeleton width={100} height={16} borderRadius={8} style={{ marginTop: 8 }} />
      <SkeletonGoalCard />
      <SkeletonGoalCard />
    </View>
  );
}

export function CoupleGoalsScreen({ navigation: nav }: any) {
  const navigation = nav || useNavigation<any>();
  const { colors, isDark } = useTheme();
  const templates = getTemplates(colors);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goals, setGoals] = useState<any[]>([]);
  const [aiPredictions, setAiPredictions] = useState<Record<string, any>>({});
  const [completedExpanded, setCompletedExpanded] = useState(false);

  const activeGoals = goals.filter((g: any) => g.status !== 'COMPLETED');
  const completedGoals = goals.filter((g: any) => g.status === 'COMPLETED');

  const stagger = useStagger(activeGoals.length + 1);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    try {
      const dashboard = await api.get<any>('/couple/dashboard');
      const goalsData = dashboard?.goals || [];
      setGoals(goalsData);

      const predMap: Record<string, any> = {};
      await Promise.allSettled(
        goalsData.map(async (goal: any) => {
          try {
            const pred = await api.get(`/ai/goals/${goal.id}/prediction`);
            predMap[goal.id] = (pred as any)?.data || pred;
          } catch {
            /* ignore */
          }
        }),
      );
      setAiPredictions(predMap);
    } catch {
      setGoals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  if (loading) {
    return <LoadingScreen skeleton={<GoalsSkeleton />} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: spacing.xl,
            paddingBottom: spacing.sm,
          }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text style={[styles.largeTitle, { color: colors.text.primary }]}>Goals</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('LifePlanForm')}
              style={[styles.headerBtn, { backgroundColor: colors.bg.tertiary }]}
            >
              <AntDesign name="plus" size={20} color={colors.accent.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {goals.length === 0 && !loading ? (
          /* Empty State */
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.accent.primary}15` }]}>
              <AntDesign name="heart" size={48} color={colors.accent.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              Start dreaming together
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              Create your first shared goal and start saving for what matters most.
            </Text>
            <TouchableOpacity
              style={[styles.emptyCta, { backgroundColor: colors.accent.primary }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('LifePlanForm')}
            >
              <AntDesign name="pluscircleo" size={18} color="#FFF" />
              <Text style={styles.emptyCtaText}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Section 1: Goal Templates */}
            <View style={{ paddingTop: spacing.md }}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                  Goal Templates
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('LifePlanForm')}>
                  <Text style={[styles.seeAll, { color: colors.accent.primary }]}>See All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: 10 }}
              >
                {templates.map((t, i) => (
                  <TouchableOpacity
                    key={t.type}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('LifePlanForm', { plannerType: t.type })}
                    style={[
                      styles.templateCard,
                      {
                        backgroundColor: colors.bg.card,
                        borderColor: colors.border.subtle,
                      },
                      shadows.md,
                    ]}
                  >
                    <View style={[styles.templateIcon, { backgroundColor: `${t.color}18` }]}>
                      <AntDesign name={t.icon as any} size={22} color={t.color} />
                    </View>
                    <Text style={[styles.templateLabel, { color: colors.text.primary }]}>
                      {t.label}
                    </Text>
                    <View style={[styles.templateCta, { backgroundColor: colors.accent.primary }]}>
                      <Text style={styles.templateCtaText}>Create</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Section 2: Active Goals */}
            {activeGoals.length > 0 && (
              <View style={{ paddingTop: spacing['2xl'] }}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                    Active Goals
                  </Text>
                  <Text style={[styles.sectionCount, { color: colors.text.tertiary }]}>
                    {activeGoals.length}
                  </Text>
                </View>
                <View style={{ paddingHorizontal: spacing.xl, gap: 12 }}>
                  {activeGoals.map((goal: any, idx: number) => {
                    const target = Number(goal.targetAmount || goal.target || 0);
                    const saved = Number(goal.savedAmount || goal.currentAmount || 0);
                    const pct = target > 0 ? Math.min(Math.round((saved / target) * 100), 100) : 0;
                    const catIcon = templates.find(
                      (t) => t.type === goal.category || t.label === goal.category,
                    );
                    const icon = catIcon?.icon || 'Trophy';
                    const iconColor = catIcon?.color || colors.accent.primary;
                    const prediction = aiPredictions[goal.id];
                    const predDate = prediction?.predictedCompletion;
                    const predSuggestion = prediction?.suggestion;

                    return (
                      <Animated.View key={goal.id} style={{ opacity: stagger[idx] }}>
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => navigation.navigate('Goals', { goalId: goal.id })}
                          style={[
                            styles.goalCard,
                            { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
                            shadows.md,
                          ]}
                        >
                          <View style={styles.goalTop}>
                            <View style={[styles.goalIcon, { backgroundColor: `${iconColor}18` }]}>
                              <AntDesign name={icon as any} size={20} color={iconColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[styles.goalName, { color: colors.text.primary }]}
                                numberOfLines={1}
                              >
                                {goal.name}
                              </Text>
                              <Text style={[styles.goalTarget, { color: colors.text.tertiary }]}>
                                Target {fmt(target)}
                              </Text>
                            </View>
                            <View style={[styles.pctBadge, { backgroundColor: `${iconColor}15` }]}>
                              <Text style={[styles.pctText, { color: iconColor }]}>{pct}%</Text>
                            </View>
                          </View>

                          <ProgressBar pct={pct} color={iconColor} />

                          <View style={styles.goalStats}>
                            <View>
                              <Text style={[styles.goalSaved, { color: colors.text.primary }]}>
                                {fmt(saved)}
                              </Text>
                              <Text
                                style={[styles.goalSavedLabel, { color: colors.text.tertiary }]}
                              >
                                saved
                              </Text>
                            </View>
                            {predDate && (
                              <View style={styles.forecast}>
                                <AntDesign name="calendar" size={11} color={colors.text.tertiary} />
                                <Text
                                  style={[styles.forecastText, { color: colors.text.tertiary }]}
                                >
                                  Est. {fmtDate(predDate)}
                                </Text>
                              </View>
                            )}
                          </View>

                          {(predDate || predSuggestion) && (
                            <View
                              style={[
                                styles.aiSnippet,
                                { backgroundColor: `${colors.status.warning}10` },
                              ]}
                            >
                              <AntDesign name="bulb1" size={12} color="#FBBF24" />
                              <Text
                                style={[styles.aiText, { color: colors.text.secondary }]}
                                numberOfLines={2}
                              >
                                {predSuggestion || `AI predicts completion by ${fmtDate(predDate)}`}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Section 3: Completed Goals */}
            {completedGoals.length > 0 && (
              <View style={{ paddingTop: spacing['2xl'] }}>
                <TouchableOpacity
                  style={styles.sectionHeaderRow}
                  activeOpacity={0.7}
                  onPress={() => setCompletedExpanded((p) => !p)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                      Completed
                    </Text>
                    <View
                      style={[
                        styles.completedCount,
                        { backgroundColor: colors.status.successLight },
                      ]}
                    >
                      <Text style={[styles.completedCountText, { color: colors.status.success }]}>
                        {completedGoals.length}
                      </Text>
                    </View>
                  </View>
                  <AntDesign
                    name={completedExpanded ? 'up' : 'down'}
                    size={14}
                    color={colors.text.tertiary}
                  />
                </TouchableOpacity>
                {completedExpanded && (
                  <View
                    style={{ paddingHorizontal: spacing.xl, gap: 10, paddingBottom: spacing.lg }}
                  >
                    {completedGoals.map((goal: any) => {
                      const target = Number(goal.targetAmount || 0);
                      const saved = Number(goal.savedAmount || 0);
                      return (
                        <View
                          key={goal.id}
                          style={[
                            styles.completedCard,
                            { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
                          ]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View
                              style={[
                                styles.completedIcon,
                                { backgroundColor: colors.status.successLight },
                              ]}
                            >
                              <AntDesign
                                name="checkcircle"
                                size={18}
                                color={colors.status.success}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[styles.goalName, { color: colors.text.primary }]}
                                numberOfLines={1}
                              >
                                {goal.name}
                              </Text>
                              <Text style={[styles.goalTarget, { color: colors.text.tertiary }]}>
                                {fmt(saved)} of {fmt(target)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('LifePlanForm')}
        style={[
          styles.fab,
          {
            backgroundColor: colors.accent.primary,
            bottom: insets.bottom + 24,
          },
          shadows.lg,
        ]}
      >
        <AntDesign name="plus" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  largeTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Sections */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* Templates */
  templateCard: {
    width: CARD_WIDTH,
    padding: spacing.lg,
    borderRadius: borderRadius['3xl'],
    borderWidth: 1,
    gap: 10,
  },
  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  templateCta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  templateCtaText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Goal Card */
  goalCard: {
    borderRadius: borderRadius['3xl'],
    padding: spacing.lg,
    borderWidth: 1,
    gap: 12,
  },
  goalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalName: {
    fontSize: 15,
    fontWeight: '700',
  },
  goalTarget: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  pctBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  pctText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* Progress Bar */
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  /* Stats */
  goalStats: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  goalSaved: {
    fontSize: 22,
    fontWeight: '800',
  },
  goalSavedLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  forecast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  forecastText: {
    fontSize: 11,
    fontWeight: '500',
  },

  /* AI Snippet */
  aiSnippet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 10,
    borderRadius: borderRadius.xl,
  },
  aiText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },

  /* Completed */
  completedCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  completedCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  completedCard: {
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    borderWidth: 1,
  },
  completedIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Empty State */
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['4xl'],
    paddingTop: 60,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyDesc: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing['2xl'],
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: borderRadius['2xl'],
  },
  emptyCtaText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /* FAB */
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
