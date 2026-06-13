import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import { BaseScreen } from '../../components/ui/BaseScreen';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

type GoalConfig = {
  icon: string;
  color: string;
};

const GOAL_CONFIGS: Record<string, GoalConfig> = {
  emergency: { icon: 'shield-checkmark', color: '#FF6B6B' },
  vacation: { icon: 'airplane', color: '#00B894' },
  education: { icon: 'school', color: '#4F6EF7' },
  home: { icon: 'home', color: '#F97316' },
  car: { icon: 'car-sport', color: '#14B8A6' },
  wedding: { icon: 'heart', color: '#FF6B9D' },
  retirement: { icon: 'umbrella', color: '#247BA0' },
  custom: { icon: 'trophy', color: '#14B8A6' },
};

const MILESTONES = [25, 50, 75, 100];

function fmt(v: number) {
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function daysRemaining(dateStr: string | null): number | null {
  if (!dateStr) {
    return null;
  }
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getMotivationalTagline(pct: number): string {
  if (pct >= 100) {
    return 'Goal complete! Amazing work!';
  }
  if (pct >= 75) {
    return 'So close! The final stretch!';
  }
  if (pct >= 50) {
    return 'Halfway there! Keep crushing it!';
  }
  if (pct >= 25) {
    return "Quarter way there! You've got this";
  }
  if (pct > 0) {
    return 'Building momentum — keep going!';
  }
  return 'Every journey begins with a single step';
}

function getGoalConfig(type: string): GoalConfig {
  return GOAL_CONFIGS[type] || GOAL_CONFIGS.custom;
}

function ProgressRing({
  size = 160,
  progress = 0,
  strokeWidth = 8,
  color,
  trackColor,
  children,
}: {
  size?: number;
  progress?: number;
  strokeWidth?: number;
  color: string;
  trackColor?: string;
  children?: React.ReactNode;
}) {
  const animVal = useRef(new Animated.Value(0)).current;
  const half = size / 2;
  const innerSize = size - strokeWidth * 4;

  useEffect(() => {
    Animated.spring(animVal, {
      toValue: Math.min(progress, 100) / 100,
      friction: 6,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const rRight = animVal.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['180deg', '0deg', '0deg'],
  });
  const rLeft = animVal.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['180deg', '180deg', '0deg'],
  });

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: strokeWidth,
          borderColor: trackColor || 'rgba(255,255,255,0.08)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: half,
          top: 0,
          width: half,
          height: size,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            left: -half,
            top: 0,
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: strokeWidth,
            borderColor: color,
            transform: [{ rotate: rRight }],
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: half,
          height: size,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: strokeWidth,
            borderColor: color,
            transform: [{ rotate: rLeft }],
          }}
        />
      </View>
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {children}
      </View>
    </View>
  );
}

function QuickContributeModal({
  visible,
  onClose,
  onContribute,
  goalName,
}: {
  visible: boolean;
  onClose: () => void;
  onContribute: (amount: number) => void;
  goalName: string;
}) {
  const { colors, typography } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [amount, setAmount] = useState('');
  const quickAmounts = [500, 1000, 2500, 5000];

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 9,
        tension: 50,
        useNativeDriver: true,
      }).start();
      setAmount('');
    } else {
      slideAnim.setValue(0);
    }
  }, [visible]);

  const handleSubmit = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      Alert.alert('Invalid', 'Enter a valid amount');
      return;
    }
    onContribute(val);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
      >
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <Animated.View
              style={[
                s.modalContent,
                {
                  backgroundColor: colors.bg.secondary,
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [300, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={s.modalHandle}>
                <View style={[s.handleBar, { backgroundColor: colors.border.default }]} />
              </View>
              <Text style={[typography.h3, { color: colors.text.primary }]}>Add to {goalName}</Text>
              <View
                style={[
                  s.amountRow,
                  {
                    backgroundColor: colors.bg.tertiary,
                    borderColor: colors.border.subtle,
                    marginTop: 20,
                  },
                ]}
              >
                <Text style={[typography.h2, { color: colors.text.secondary }]}>₹</Text>
                <TextInput
                  style={[s.amountInput, { color: colors.text.primary }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="500"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="number-pad"
                  autoFocus
                />
              </View>
              <View style={s.quickAmountRow}>
                {quickAmounts.map((qa) => (
                  <TouchableOpacity
                    key={qa}
                    style={[
                      s.quickChip,
                      { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                    ]}
                    onPress={() => setAmount(String(qa))}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        typography.callout,
                        { color: colors.text.secondary, fontWeight: '600' },
                      ]}
                    >
                      {fmt(qa)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: colors.accent.primary, borderRadius: 14 }]}
                onPress={handleSubmit}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={20} color="#FFF" />
                <Text style={[typography.button, { color: '#FFF' }]}>Add Amount</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.secondaryBtn,
                  { backgroundColor: colors.bg.tertiary, borderRadius: 14, marginTop: 10 },
                ]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[typography.button, { color: colors.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function GoalDetailSkeleton() {
  const { colors } = useTheme();
  return (
    <BaseScreen noPadding>
      <View style={{ paddingHorizontal: 16, gap: 16, paddingTop: 60 }}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <Skeleton width="100%" height={260} borderRadius={24} />
        <View style={{ alignItems: 'center', gap: 12, marginTop: 12 }}>
          <Skeleton width={160} height={160} borderRadius={80} />
          <Skeleton width={120} height={16} />
          <Skeleton width={180} height={14} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flex: 1, gap: 8 }}>
              <Skeleton width="100%" height={80} borderRadius={16} />
            </View>
          ))}
        </View>
        <Skeleton width="100%" height={80} borderRadius={16} />
        <Skeleton width="100%" height={140} borderRadius={16} />
      </View>
    </BaseScreen>
  );
}

export function GoalDetailScreen() {
  const { colors, typography, spacing: sp, borderRadius: br } = useTheme();
  const { accessToken } = useAuth();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ GoalDetail: { goalId: string } }, 'GoalDetail'>>();
  const { goalId } = route.params;

  const [goal, setGoal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showContribute, setShowContribute] = useState(false);
  const [contributing, setContributing] = useState(false);

  const entryAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadGoal = useCallback(async () => {
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.get<any>(`/goals/${goalId}`);
      setGoal(res);
    } catch {
      Alert.alert('Error', 'Failed to load goal');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [goalId, accessToken]);

  useEffect(() => {
    loadGoal();
  }, [loadGoal]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(entryAnim, {
        toValue: 1,
        friction: 7,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const saved = Number(goal?.saved || goal?.currentAmount || 0);
  const target = Number(goal?.target || goal?.targetAmount || 0);
  const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
  const remaining = Math.max(target - saved, 0);
  const monthlyContrib = Number(goal?.monthlyContribution || 0);
  const config = getGoalConfig(goal?.type);
  const tagline = getMotivationalTagline(pct);
  const deadline = goal?.deadline || goal?.targetDate || null;
  const daysLeft = daysRemaining(deadline);

  const estMonths = monthlyContrib > 0 ? Math.ceil(remaining / monthlyContrib) : 0;
  const estDate = new Date();
  estDate.setMonth(estDate.getMonth() + estMonths);
  const estLabel =
    monthlyContrib > 0
      ? `Est. completion: ${estDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`
      : null;
  const suggestedMonthly =
    deadline && remaining > 0 && daysLeft && daysLeft > 0
      ? Math.ceil(remaining / (daysLeft / 30))
      : 0;

  const milestoneDates: Record<number, string | null> = {};
  if (goal?.milestoneDates) {
    MILESTONES.forEach((m) => {
      milestoneDates[m] = goal.milestoneDates[`${m}pct`] || null;
    });
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goal?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (accessToken) {
                setAccessToken(accessToken);
              }
              await api.delete(`/goals/${goalId}`);
              showToast('Goal deleted');
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete goal');
            }
          },
        },
      ],
    );
  };

  const handleContribute = async (amount: number) => {
    setContributing(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const updated = await api.post<any>(`/goals/${goalId}/contribute`, { amount });
      setGoal(updated);
      setShowContribute(false);
    } catch {
      Alert.alert('Error', 'Failed to add amount');
    } finally {
      setContributing(false);
    }
  };

  if (loading) {
    return <GoalDetailSkeleton />;
  }
  if (!goal) {
    return null;
  }

  return (
    <BaseScreen noPadding>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        {/* ─── Header Gradient ─── */}
        <View
          style={[
            s.headerGradient,
            {
              paddingTop: insets.top + sp.lg,
              backgroundColor: colors.accent.primary,
              borderWidth: 1,
              borderColor: colors.border.default,
            },
          ]}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={s.headerRow}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={[s.iconBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {}}
                style={[s.iconBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={s.headerContent}>
              <View style={[s.goalIconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name={(config.icon || 'trophy') as any} size={36} color="#FFF" />
              </View>
              <Text style={[typography.h1, { color: '#FFF', marginTop: sp.md }]}>{goal.name}</Text>
              <View style={[s.typeBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text
                  style={[
                    typography.footnote,
                    { color: '#FFF', fontWeight: '700', textTransform: 'capitalize' },
                  ]}
                >
                  {goal.type || 'custom'}
                </Text>
              </View>
              <View style={s.taglinePill}>
                <Ionicons name="sparkles" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={[typography.footnote, { color: '#FFF', fontWeight: '600' }]}>
                  {tagline}
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* ─── Progress Section ─── */}
        <Animated.View
          style={[
            s.progressSection,
            {
              backgroundColor: colors.bg.secondary,
              borderColor: colors.border.subtle,
              transform: [
                {
                  translateY: entryAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                },
              ],
              opacity: entryAnim,
            },
          ]}
        >
          <ProgressRing
            size={160}
            progress={pct}
            strokeWidth={10}
            color={config.color}
            trackColor={colors.bg.tertiary}
          >
            <Text style={[typography.dashboardMetric, { color: config.color, fontSize: 32 }]}>
              {Math.round(pct)}%
            </Text>
          </ProgressRing>
          <Text style={[typography.body, { color: colors.text.secondary, marginTop: sp.sm }]}>
            Saved {fmt(saved)} of {fmt(target)}
          </Text>
        </Animated.View>

        {/* ─── Quick Stats Row ─── */}
        <Animated.View
          style={[
            s.statsRow,
            {
              transform: [
                {
                  translateY: entryAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
              opacity: entryAnim,
            },
          ]}
        >
          <View
            style={[
              s.statCard,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
          >
            <View style={[s.statIconWrap, { backgroundColor: colors.bg.tertiary }]}>
              <Ionicons name="wallet-outline" size={18} color={colors.status.success} />
            </View>
            <Text style={[typography.amountSmall, { color: colors.text.primary }]}>
              {fmt(saved)}
            </Text>
            <Text style={[typography.caption, { color: colors.text.tertiary }]}>Saved</Text>
          </View>
          <View
            style={[
              s.statCard,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
          >
            <View style={[s.statIconWrap, { backgroundColor: colors.bg.tertiary }]}>
              <Ionicons name="trending-up-outline" size={18} color={colors.status.warning} />
            </View>
            <Text style={[typography.amountSmall, { color: colors.status.warning }]}>
              {fmt(remaining)}
            </Text>
            <Text style={[typography.caption, { color: colors.text.tertiary }]}>Remaining</Text>
          </View>
          <View
            style={[
              s.statCard,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
          >
            <View style={[s.statIconWrap, { backgroundColor: colors.bg.tertiary }]}>
              <Ionicons name="repeat-outline" size={18} color={colors.status.info} />
            </View>
            <Text style={[typography.amountSmall, { color: colors.status.info }]}>
              {monthlyContrib > 0 ? fmt(monthlyContrib) : '—'}
            </Text>
            <Text style={[typography.caption, { color: colors.text.tertiary }]}>Monthly</Text>
          </View>
        </Animated.View>

        {/* ─── Est Completion Card ─── */}
        <Animated.View
          style={[
            s.glassCard,
            {
              backgroundColor: colors.bg.glass,
              borderColor: colors.border.subtle,
              transform: [
                {
                  translateY: entryAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [60, 0],
                  }),
                },
              ],
              opacity: entryAnim,
            },
          ]}
        >
          <View style={[s.glassBg, { backgroundColor: config.color + '08' }]} />
          <View style={s.completionRow}>
            <View style={[s.completionIcon, { backgroundColor: colors.bg.secondary }]}>
              <Ionicons name="calendar-outline" size={22} color={config.color} />
            </View>
            <View style={{ flex: 1 }}>
              {estLabel ? (
                <>
                  <Text
                    style={[typography.callout, { color: colors.text.primary, fontWeight: '600' }]}
                  >
                    {estLabel}
                  </Text>
                  <Text
                    style={[typography.footnote, { color: colors.text.tertiary, marginTop: 2 }]}
                  >
                    {estMonths === 1 ? '1 month' : `${estMonths} months`} at {fmt(monthlyContrib)}
                    /mo
                  </Text>
                </>
              ) : suggestedMonthly > 0 ? (
                <>
                  <Text
                    style={[typography.callout, { color: colors.text.primary, fontWeight: '600' }]}
                  >
                    Save {fmt(suggestedMonthly)}/month
                  </Text>
                  <Text
                    style={[typography.footnote, { color: colors.text.tertiary, marginTop: 2 }]}
                  >
                    to finish by{' '}
                    {deadline
                      ? new Date(deadline).toLocaleString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'target date'}
                  </Text>
                </>
              ) : (
                <Text
                  style={[typography.callout, { color: colors.text.primary, fontWeight: '600' }]}
                >
                  Set a monthly contribution to track
                </Text>
              )}
            </View>
            {daysLeft !== null && (
              <View
                style={[
                  s.daysBadge,
                  {
                    backgroundColor:
                      daysLeft <= 0
                        ? colors.status.errorLight
                        : daysLeft <= 30
                          ? colors.status.warningLight
                          : colors.status.successLight,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.footnote,
                    {
                      fontWeight: '700',
                      color:
                        daysLeft <= 0
                          ? colors.status.error
                          : daysLeft <= 30
                            ? colors.status.warning
                            : colors.status.success,
                    },
                  ]}
                >
                  {daysLeft <= 0 ? 'Overdue' : `${daysLeft}d`}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ─── Milestone Timeline ─── */}
        <Animated.View
          style={[
            s.timelineCard,
            {
              backgroundColor: colors.bg.secondary,
              borderColor: colors.border.subtle,
              transform: [
                {
                  translateY: entryAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [70, 0],
                  }),
                },
              ],
              opacity: entryAnim,
            },
          ]}
        >
          <Text style={[typography.h4, { color: colors.text.primary, marginBottom: sp.xl }]}>
            Milestones
          </Text>
          <View style={s.timelineTrack}>
            <View style={[s.timelineLine, { backgroundColor: colors.border.default }]} />
            <View
              style={[
                s.timelineFill,
                { backgroundColor: config.color, height: `${Math.min(pct, 100)}%` },
              ]}
            />
            <View style={s.timelineNodes}>
              {MILESTONES.map((m, idx) => {
                const reached = pct >= m;
                return (
                  <View key={m} style={[s.timelineNodeRow, idx === 0 && { marginTop: 0 }]}>
                    <View style={s.timelineNode}>
                      {reached ? (
                        <View style={[s.nodeReached, { backgroundColor: config.color }]}>
                          <Ionicons name="checkmark" size={14} color="#FFF" />
                        </View>
                      ) : (
                        <View style={[s.nodeEmpty, { borderColor: colors.border.default }]} />
                      )}
                    </View>
                    <View style={s.timelineLabel}>
                      <Text
                        style={[
                          typography.callout,
                          {
                            color: reached ? config.color : colors.text.secondary,
                            fontWeight: '600',
                          },
                        ]}
                      >
                        {m}%
                      </Text>
                      <Text
                        style={[typography.caption, { color: colors.text.tertiary, marginTop: 1 }]}
                      >
                        {reached
                          ? milestoneDates[m] || 'Reached'
                          : m === 100
                            ? 'Goal complete'
                            : 'In progress'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* ─── Notes Section ─── */}
        {goal.notes ? (
          <Animated.View
            style={[
              s.glassCard,
              {
                backgroundColor: colors.bg.glass,
                borderColor: colors.border.subtle,
                transform: [
                  {
                    translateY: entryAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [80, 0],
                    }),
                  },
                ],
                opacity: entryAnim,
              },
            ]}
          >
            <View style={[s.glassBg, { backgroundColor: colors.accent.primary + '06' }]} />
            <View style={{ flexDirection: 'row', gap: sp.sm }}>
              <Ionicons name="document-text-outline" size={18} color={colors.text.tertiary} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.callout, { color: colors.text.primary }]}>
                  {goal.notes}
                </Text>
              </View>
            </View>
          </Animated.View>
        ) : null}

        {/* ─── Spacer for bottom buttons ─── */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ─── Bottom Action Buttons ─── */}
      <Animated.View
        style={[
          s.bottomBar,
          {
            backgroundColor: colors.bg.secondary,
            borderTopColor: colors.border.subtle,
            paddingBottom: insets.bottom + sp.lg,
            bottom: 84,
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: config.color, borderRadius: 14 }]}
          onPress={() => setShowContribute(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={20} color="#FFF" />
          <Text style={[typography.button, { color: '#FFF' }]}>Add to Goal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: colors.bg.tertiary, borderRadius: 14 }]}
          onPress={() => {}}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil-outline" size={20} color={colors.text.primary} />
          <Text style={[typography.button, { color: colors.text.primary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.deleteBtn, { backgroundColor: colors.status.errorLight, borderRadius: 14 }]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color={colors.status.error} />
        </TouchableOpacity>
      </Animated.View>

      <QuickContributeModal
        visible={showContribute}
        onClose={() => setShowContribute(false)}
        onContribute={handleContribute}
        goalName={goal.name}
      />
    </BaseScreen>
  );
}

const s = StyleSheet.create({
  headerGradient: {
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 16,
  },
  goalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
  },
  taglinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginTop: 12,
  },
  progressSection: {
    marginHorizontal: 16,
    marginTop: -28,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  glassCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  glassBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  completionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  completionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  daysBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  timelineCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  timelineTrack: {
    position: 'relative',
    minHeight: 200,
  },
  timelineLine: {
    position: 'absolute',
    left: 12,
    top: 4,
    bottom: 4,
    width: 2,
    borderRadius: 1,
  },
  timelineFill: {
    position: 'absolute',
    left: 12,
    top: 4,
    width: 2,
    borderRadius: 1,
  },
  timelineNodes: {
    gap: 32,
  },
  timelineNodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  timelineNode: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeReached: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeEmpty: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  timelineLabel: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  deleteBtn: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    alignItems: 'center',
    marginBottom: 16,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 12,
    gap: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    paddingVertical: 4,
  },
  quickAmountRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 20,
  },
  quickChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 15,
  },
});
