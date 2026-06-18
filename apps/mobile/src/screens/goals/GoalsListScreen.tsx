import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import { BaseScreen } from '../../components/ui/BaseScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { CreateGoalModal } from './CreateGoalModal';
// TODO: Import CelebrationOverlay when navigator is ready
// import { CelebrationOverlay } from '../../components/ui/CelebrationOverlay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type GoalConfig = {
  icon: string;
  color: string;
};

const GOAL_CONFIGS: Record<string, GoalConfig> = {
  emergency: { icon: 'Safety', color: '#FF6B6B' },
  vacation: { icon: 'enviroment', color: '#00B894' },
  education: { icon: 'book', color: '#4F6EF7' },
  home: { icon: 'home', color: '#F97316' },
  car: { icon: 'car', color: '#14B8A6' },
  wedding: { icon: 'heart', color: '#FF6B9D' },
  retirement: { icon: 'cloud', color: '#247BA0' },
  savings: { icon: 'wallet', color: '#7C3AED' },
  investment: { icon: 'arrowup', color: '#10B981' },
  baby: { icon: 'smile-circle', color: '#FF69B4' },
  custom: { icon: 'star', color: '#14B8A6' },
};

const SUGGESTED_GOALS = [
  { name: 'Emergency Fund', type: 'emergency', target: 200000 },
  { name: 'Dream Vacation', type: 'vacation', target: 300000 },
  { name: 'New Home', type: 'home', target: 5000000 },
  { name: 'New Car', type: 'car', target: 800000 },
  { name: 'Education Fund', type: 'education', target: 500000 },
  { name: 'Wedding Fund', type: 'wedding', target: 1000000 },
  { name: 'Retirement', type: 'retirement', target: 10000000 },
  { name: 'Baby Fund', type: 'baby', target: 500000 },
  { name: 'General Savings', type: 'savings', target: 100000 },
  { name: 'Investment Goal', type: 'investment', target: 500000 },
];

const MILESTONES = [25, 50, 75, 100];

function fmt(v: number) {
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function daysRemaining(dateStr: string | null): number | null {
  if (!dateStr) {
    return null;
  }
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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
    return 'Building momentum \u2014 keep going!';
  }
  return 'Every journey begins with a single step';
}

function getEstimatedCompletion(
  saved: number,
  target: number,
  monthlyContribution: number,
  deadline: string | null,
): string {
  const remaining = target - saved;
  if (remaining <= 0) {
    return 'Goal achieved!';
  }
  if (monthlyContribution > 0) {
    const monthsRemaining = Math.ceil(remaining / monthlyContribution);
    const estDate = new Date();
    estDate.setMonth(estDate.getMonth() + monthsRemaining);
    return `Est. completion: ${estDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`;
  }
  if (deadline) {
    const dl = daysRemaining(deadline);
    if (dl !== null && dl > 0) {
      const perMonth = Math.ceil(remaining / (dl / 30));
      return `Save ${fmt(perMonth)}/month to finish on time`;
    }
  }
  return 'Set a monthly contribution to track';
}

function getGoalConfig(type: string): GoalConfig {
  return GOAL_CONFIGS[type] || GOAL_CONFIGS.custom;
}

function ProgressRing({
  size = 72,
  progress = 0,
  strokeWidth = 5,
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
      friction: 7,
      tension: 40,
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

function MilestoneDot({
  percentage,
  reached,
  color,
  onPress,
}: {
  percentage: number;
  reached: boolean;
  color: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reached) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }).start();
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    scaleAnim.setValue(0);
    glowAnim.setValue(0);
  }, [reached]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{ alignItems: 'center', gap: 3 }}
    >
      <View style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}>
        {reached ? (
          <>
            <Animated.View
              style={{
                position: 'absolute',
                width: 28,
                height: 28,
    borderRadius: borderRadius.xl,
                backgroundColor: color + '30',
                transform: [
                  {
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.5],
                    }),
                  },
                ],
              }}
            />
            <Animated.View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: color,
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ scale: scaleAnim }],
              }}
            >
              <AntDesign  name="check" size={14} color="#FFF" />
            </Animated.View>
          </>
        ) : (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.border.default,
            }}
          />
        )}
      </View>
      <Text
        style={{
          fontSize: 9,
          fontWeight: '700',
          color: reached ? color : colors.text.tertiary,
        }}
      >
        {percentage}%
      </Text>
    </TouchableOpacity>
  );
}

function GoalCard({
  item,
  index,
  prediction,
  onNavigate,
}: {
  item: any;
  index: number;
  prediction?: any;
  onNavigate: () => void;
}) {
  const { colors, typography } = useTheme();
  const saved = Number(item.saved || item.currentAmount || 0);
  const target = Number(item.target || item.targetAmount || 0);
  const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
  const config = getGoalConfig(item.type);
  const daysLeft = daysRemaining(item.deadline || item.targetDate);
  const monthly = Number(item.monthlyContribution || 0);
  const tagline = getMotivationalTagline(pct);
  const estDate = prediction?.predictedCompletionDate
    ? `Forecast: ${new Date(prediction.predictedCompletionDate).toLocaleString('en-US', { month: 'short', year: 'numeric' })}`
    : getEstimatedCompletion(saved, target, monthly, item.deadline || item.targetDate);
  const paceColor = prediction?.currentPace === 'ahead' ? colors.status.success : prediction?.currentPace === 'ontrack' ? colors.status.warning : prediction?.currentPace === 'behind' ? colors.status.error : prediction?.currentPace === 'critical' ? colors.status.error : colors.text.tertiary;

  const entryAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(entryAnim, {
      toValue: 1,
      delay: index * 80,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const [flashMilestone, setFlashMilestone] = useState<number | null>(null);

  const handleMilestonePress = (mp: number) => {
    if (pct >= mp) {
      setFlashMilestone(mp);
      setTimeout(() => setFlashMilestone(null), 1200);
    }
  };

  return (
    <Animated.View
      style={{
        transform: [
          {
            translateY: entryAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
            }),
          },
        ],
        opacity: entryAnim,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onNavigate}
        style={[
          s.card,
          { backgroundColor: colors.bg.secondary, borderColor: colors.border.default },
        ]}
      >
        <View style={StyleSheet.absoluteFill}>
          <View style={{ flex: 1, borderRadius: 20 }} />
        </View>

        <View style={s.cardTopRow}>
          <View style={s.cardLeftCol}>
                    <View style={[s.cardIcon, { borderRadius: borderRadius.xl }]}>
              <AntDesign name={config.icon as any} size={22} color={config.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.h4, { color: colors.text.primary }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text
                style={[
                  typography.footnote,
                  { color: colors.text.tertiary, textTransform: 'capitalize', marginTop: 1 },
                ]}
              >
                {item.type || 'custom'}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'center' }}>
            <ProgressRing
              size={64}
              progress={pct}
              strokeWidth={4}
              color={config.color}
              trackColor={colors.bg.tertiary}
            >
              <Text style={[typography.buttonSmall, { color: config.color }]}>
                {Math.round(pct)}%
              </Text>
            </ProgressRing>
          </View>
        </View>

        <View style={[s.progressTrack, { backgroundColor: colors.bg.tertiary }]}>
          <View
            style={[
              s.progressFill,
              { width: `${Math.min(pct, 100)}%`, backgroundColor: config.color },
            ]}
          />
        </View>

        <View style={s.milestoneRow}>
          {MILESTONES.map((mp) => (
            <MilestoneDot
              key={mp}
              percentage={mp}
              reached={pct >= mp}
              color={config.color}
              onPress={() => handleMilestonePress(mp)}
            />
          ))}
        </View>

        <View style={[s.cardFooter, { borderTopColor: colors.border.subtle }]}>
          <View style={{ flex: 1 }}>
            <View style={s.footerRow}>
              <Text style={[typography.caption, { color: colors.text.tertiary }]}>Saved</Text>
              <Text style={[typography.amountSmall, { color: colors.text.primary, fontSize: 16 }]}>
                {fmt(saved)}
              </Text>
            </View>
            <View style={s.footerRow}>
              <Text style={[typography.caption, { color: colors.text.tertiary }]}>Target</Text>
              <Text style={[typography.body, { color: colors.text.secondary }]}>{fmt(target)}</Text>
            </View>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
            {daysLeft !== null && (
              <View style={s.footerBadge}>
                <AntDesign
                   name="calendar"
                  size={11}
                  color={daysLeft <= 30 ? colors.status.error : colors.text.tertiary}
                />
                <Text
                  style={[
                    typography.footnote,
                    {
                      color: daysLeft <= 30 ? colors.status.error : colors.text.secondary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {daysLeft > 0 ? `${daysLeft}d left` : 'Overdue'}
                </Text>
              </View>
            )}
            {monthly > 0 && (
              <View style={s.footerBadge}>
                <AntDesign  name="retweet" size={11} color={colors.text.tertiary} />
                <Text style={[typography.footnote, { color: colors.text.secondary }]}>
                  {fmt(monthly)}/mo
                </Text>
              </View>
            )}
            {prediction && (
              <View style={s.footerBadge}>
                <AntDesign  name="heart" size={11} color={paceColor} />
                <Text style={[typography.footnote, { color: paceColor, fontWeight: '700' }]}>
                  {prediction.currentPace}
                </Text>
              </View>
            )}
            <Text
              style={[
                typography.footnote,
                { color: prediction ? paceColor : colors.text.tertiary, marginTop: 2, textAlign: 'right' },
              ]}
              numberOfLines={1}
            >
              {estDate}
            </Text>
          </View>
        </View>

        {prediction?.improvementTip && (
          <View style={[s.taglineRow, { backgroundColor: colors.bg.tertiary }]}>
            <AntDesign  name="bulb1" size={13} color={config.color} />
            <Text style={[typography.footnote, { color: colors.text.secondary, flex: 1 }]} numberOfLines={2}>
              {prediction.improvementTip}
            </Text>
          </View>
        )}
        {!prediction?.improvementTip && (
          <View style={[s.taglineRow, { backgroundColor: 'transparent' }]}>
            <AntDesign  name="star" size={13} color={config.color} />
            <Text style={[typography.footnote, { color: config.color, fontWeight: '600' }]}>
              {tagline}
            </Text>
          </View>
        )}

        {flashMilestone !== null && (
          <View style={[StyleSheet.absoluteFill, s.celebrationFlash]}>
            <AntDesign  name="checkcircle" size={56} color={config.color} />
            <Text style={[typography.h4, { color: '#FFF', marginTop: 4 }]}>
              {flashMilestone}% Reached!
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function OverallProgressHeader({
  totalSaved,
  totalTarget,
  goalCount,
}: {
  totalSaved: number;
  totalTarget: number;
  goalCount: number;
}) {
  const { colors, typography } = useTheme();
  const pct = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0;

  return (
    <View
      style={[
        s.overallCard,
        { backgroundColor: colors.accent.primary, borderWidth: 0 },
      ]}
    >
      <View style={s.overallInner}>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              typography.footnote,
              {
                color: 'rgba(255,255,255,0.7)',
                textTransform: 'uppercase',
                letterSpacing: 1,
              },
            ]}
          >
            Overall Progress
          </Text>
          <Text style={[typography.amount, { color: '#FFF', marginTop: 4 }]}>
            {fmt(totalSaved)}
          </Text>
          <Text style={[typography.body, { color: 'rgba(255,255,255,0.7)', marginTop: 2 }]}>
            of {fmt(totalTarget)}
          </Text>
          <View
            style={[s.overallTrackBar, { backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 12 }]}
          >
            <View style={[s.overallTrackFill, { width: `${pct}%`, backgroundColor: '#FFF' }]} />
          </View>
        </View>

        <View style={{ alignItems: 'center' }}>
          <ProgressRing
            size={88}
            progress={pct}
            strokeWidth={6}
            color="#FFF"
            trackColor="rgba(255,255,255,0.2)"
          >
            <Text style={[typography.dashboardMetric, { color: '#FFF', fontSize: 22 }]}>
              {Math.round(pct)}%
            </Text>
          </ProgressRing>
          <View style={[s.goalBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={[typography.caption, { color: '#FFF', fontWeight: '700' }]}>
              {goalCount} {goalCount === 1 ? 'goal' : 'goals'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function GoalsSkeleton() {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const Block = ({ style }: any) => (
    <Animated.View
      style={[{ opacity: pulse, backgroundColor: colors.skeleton.base, borderRadius: 8 }, style]}
    />
  );

  return (
    <BaseScreen noPadding>
      <View style={{ paddingHorizontal: 16, gap: 16, paddingTop: 12 }}>
        <Block style={{ width: 100, height: 14, borderRadius: 6 }} />
        <Block style={{ width: '100%', height: 160, borderRadius: 20 }} />
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              width: '100%',
              borderRadius: 20,
              backgroundColor: colors.bg.secondary,
              padding: 16,
              gap: 14,
              borderWidth: 1,
              borderColor: colors.border.subtle,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Block style={{ width: 44, height: 44, borderRadius: 12 }} />
              <View style={{ flex: 1, gap: 6 }}>
                <Block style={{ width: '60%', height: 14 }} />
                <Block style={{ width: '35%', height: 10 }} />
              </View>
              <Block style={{ width: 64, height: 64, borderRadius: 32 }} />
            </View>
            <Block style={{ width: '100%', height: 6, borderRadius: 3 }} />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingHorizontal: 4,
              }}
            >
              {[0, 1, 2, 3].map((j) => (
                <View key={j} style={{ alignItems: 'center', gap: 3 }}>
                  <Block style={{ width: 24, height: 24, borderRadius: 12 }} />
                  <Block style={{ width: 28, height: 8 }} />
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Block style={{ flex: 1, height: 52 }} />
              <Block style={{ flex: 1, height: 52 }} />
            </View>
            <Block style={{ width: '75%', height: 30, borderRadius: 10, alignSelf: 'center' }} />
          </View>
        ))}
      </View>
    </BaseScreen>
  );
}

function GoalsEmptyState({
  onCreatePress,
  onSuggestionPress,
}: {
  onCreatePress: () => void;
  onSuggestionPress: (suggestion: { name: string; type: string; target: number }) => void;
}) {
  const { colors, typography } = useTheme();

  return (
    <View style={s.emptyWrap}>
      <EmptyState
        icon="flag"
        title="Set your first goal"
        message="Goals turn your dreams into a plan. Save for a vacation, build an emergency fund, or buy your dream home \u2014 Dabbu helps you track every step."
        actionLabel="Create Goal"
        onAction={onCreatePress}
      />
      <View style={{ marginTop: 12, gap: 10 }}>
        <Text
          style={[
            typography.footnote,
            {
              color: colors.text.tertiary,
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: 1.2,
            },
          ]}
        >
          Quick start with
        </Text>
        {SUGGESTED_GOALS.map((sg) => {
          const cfg = getGoalConfig(sg.type);
          return (
            <TouchableOpacity
              key={sg.type}
              style={[
                s.suggestionCard,
                {
                  backgroundColor: colors.bg.secondary,
                  borderColor: colors.border.default,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => onSuggestionPress(sg)}
            >
              <View style={[s.suggestionIcon, { borderRadius: 10 }]}>
                <AntDesign name={cfg.icon as any} size={20} color={cfg.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.h4, { color: colors.text.primary }]}>{sg.name}</Text>
                <Text style={[typography.footnote, { color: colors.text.tertiary }]}>
                  Target: {fmt(sg.target)}
                </Text>
              </View>
              <AntDesign  name="pluscircleo" size={24} color={colors.accent.primary} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

<<<<<<< Updated upstream
function CreateGoalModal({
  visible,
  onClose,
  onCreated,
  prefill,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  prefill: { name: string; type: string; target: number } | null;
}) {
  const { colors, typography } = useTheme();
  const { accessToken } = useAuth();
  const { showToast } = useToast();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [name, setName] = useState('');
  const [targetStr, setTargetStr] = useState('');
  const [type, setType] = useState('custom');
  const [deadline, setDeadline] = useState('');
  const [monthly, setMonthly] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (visible) {
      if (prefill) {
        setName(prefill.name);
        setTargetStr(String(prefill.target));
        setType(prefill.type);
      }
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 9,
        tension: 50,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(0);
      setName('');
      setTargetStr('');
      setType('custom');
      setDeadline('');
      setMonthly('');
      setNotes('');
    }
  }, [visible, prefill]);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a goal name');
      return;
    }
    const targetNum = parseFloat(targetStr);
    if (!targetNum || targetNum <= 0) {
      Alert.alert('Required', 'Target amount must be greater than 0');
      return;
    }
    setCreating(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const payload: any = {
        name: name.trim(),
        targetAmount: targetNum,
        type,
      };
      if (deadline.trim()) {
        payload.deadline = deadline.trim();
      }
      if (monthly.trim()) {
        payload.monthlyContribution = parseFloat(monthly);
      }
      if (notes.trim()) {
        payload.notes = notes.trim();
      }
      await api.post('/goals', payload);
      showToast('Goal created');
      onClose();
      onCreated();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create goal');
    } finally {
      setCreating(false);
    }
  };

  const goalTypes = Object.entries(GOAL_CONFIGS).map(([k, v]) => ({ key: k, ...v }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 40}
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
                        outputRange: [500, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
              >
                <View style={s.modalHandle}>
                  <View style={[s.handleBar, { backgroundColor: colors.border.default }]} />
                </View>

                <Text style={[typography.h2, { color: colors.text.primary, marginBottom: 20 }]}>
                  Create Goal
                </Text>

                <Text style={[s.fieldLabel, { color: colors.text.secondary }]}>Goal Name</Text>
                <TextInput
                  style={[
                    s.textInput,
                    {
                      backgroundColor: colors.bg.tertiary,
                      color: colors.text.primary,
                      borderColor: colors.border.subtle,
                      borderRadius: 10,
                    },
                  ]}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. My Dream Home"
                  placeholderTextColor={colors.text.tertiary}
                />

                <Text style={[s.fieldLabel, { color: colors.text.secondary, marginTop: 16 }]}>
                  Category
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: spacing.lg, paddingVertical: 2 }}
                >
                  {goalTypes.map((gt) => (
                    <TouchableOpacity
                      key={gt.key}
                      style={[
                        s.typeChip,
                        {
                          backgroundColor: type === gt.key ? gt.color + '20' : colors.bg.tertiary,
                          borderColor: type === gt.key ? gt.color : colors.border.subtle,
                        },
                      ]}
                      onPress={() => setType(gt.key)}
                      activeOpacity={0.7}
                    >
                      <AntDesign
                         name={gt.icon as any}
                        size={16}
                        color={type === gt.key ? gt.color : colors.text.secondary}
                      />
                      <Text
                        style={[
                          typography.footnote,
                          {
                            color: type === gt.key ? gt.color : colors.text.secondary,
                            fontWeight: '600',
                            textTransform: 'capitalize',
                          },
                        ]}
                      >
                        {gt.key}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={[s.fieldLabel, { color: colors.text.secondary, marginTop: 16 }]}>
                  Target Amount
                </Text>
                <View
                  style={[
                    s.amountRow,
                    {
                      backgroundColor: colors.bg.tertiary,
                      borderColor: colors.border.subtle,
                      borderRadius: 10,
                    },
                  ]}
                >
                  <Text style={[typography.h3, { color: colors.text.secondary }]}>₹</Text>
                  <TextInput
                    style={[s.amountInput, { color: colors.text.primary }]}
                    value={targetStr}
                    onChangeText={setTargetStr}
                    placeholder="5,00,000"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.fieldLabel, { color: colors.text.secondary }]}>Deadline</Text>
                    <TextInput
                      style={[
                        s.textInput,
                        {
                          backgroundColor: colors.bg.tertiary,
                          color: colors.text.primary,
                          borderColor: colors.border.subtle,
                          borderRadius: 10,
                        },
                      ]}
                      value={deadline}
                      onChangeText={setDeadline}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.text.tertiary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.fieldLabel, { color: colors.text.secondary }]}>Monthly</Text>
                    <TextInput
                      style={[
                        s.textInput,
                        {
                          backgroundColor: colors.bg.tertiary,
                          color: colors.text.primary,
                          borderColor: colors.border.subtle,
                          borderRadius: 10,
                        },
                      ]}
                      value={monthly}
                      onChangeText={setMonthly}
                      placeholder="₹/mo"
                      placeholderTextColor={colors.text.tertiary}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <Text style={[s.fieldLabel, { color: colors.text.secondary, marginTop: 16 }]}>
                  Notes
                </Text>
                <TextInput
                  style={[
                    s.textInput,
                    {
                      backgroundColor: colors.bg.tertiary,
                      color: colors.text.primary,
                      borderColor: colors.border.subtle,
                      borderRadius: 10,
                      height: 72,
                      textAlignVertical: 'top',
                    },
                  ]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Why this goal matters..."
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                />

                <View style={{ gap: 10, marginTop: 24 }}>
                  <TouchableOpacity
                    style={[
                      s.primaryBtn,
                      { backgroundColor: colors.accent.primary, borderRadius: 12 },
                    ]}
                    onPress={handleCreate}
                    disabled={creating}
                    activeOpacity={0.8}
                  >
                    {creating ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <AntDesign  name="star" size={18} color="#FFF" />
                        <Text style={[typography.button, { color: '#FFF' }]}>Create Goal</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      s.secondaryBtn,
                      { backgroundColor: colors.bg.tertiary, borderRadius: 12 },
                    ]}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Text style={[typography.button, { color: colors.text.secondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

=======
>>>>>>> Stashed changes
export function GoalsListScreen() {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [goals, setGoals] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [prefill, setPrefill] = useState<{ name: string; type: string; target: number } | null>(
    null,
  );
  const [rebalanceData, setRebalanceData] = useState<any[]>([]);

  const loadGoals = useCallback(async () => {
    try {
      if (accessToken) setAccessToken(accessToken);
      const res = await api.get<any>('/goals');
      const goalList = Array.isArray(res) ? res : [];
      setGoals(goalList);

      const predictionMap: Record<string, any> = {};
      await Promise.allSettled(
        goalList.map(async (g: any) => {
          try {
            const predRes = await api.get<any>(`/ai/goals/${g.id}/prediction`);
            if (predRes?.data) predictionMap[g.id] = predRes.data;
          } catch {}
        }),
      );
      setPredictions(predictionMap);

      try {
        const rebalRes = await api.get<any>('/ai/goals/rebalance');
        setRebalanceData(rebalRes?.data?.suggestions || []);
      } catch {}
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
      loadGoals();
    }
  }, [accessToken, loadGoals]);

  const totalSaved = goals.reduce((s, g) => s + Number(g.saved || g.currentAmount || 0), 0);
  const totalTarget = goals.reduce((s, g) => s + Number(g.target || g.targetAmount || 0), 0);

  const openCreate = () => {
    setPrefill(null);
    setShowCreate(true);
  };

  const openCreateWithSuggestion = (sg: { name: string; type: string; target: number }) => {
    setPrefill(sg);
    setShowCreate(true);
  };

  const keyExtractor = useCallback((g: any) => g.id, []);

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <GoalCard
        item={item}
        index={index}
        prediction={predictions[item.id]}
        onNavigate={() =>
          navigation.navigate('GoalDetail', { goalId: item.id, goalName: item.name })
        }
      />
    ),
    [navigation, predictions],
  );

  if (loading) {
    return <GoalsSkeleton />;
  }

  return (
    <>
      <BaseScreen noPadding>
        <FlatList
          data={goals}
          keyExtractor={keyExtractor}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadGoals();
              }}
              tintColor={colors.accent.primary}
            />
          }
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
          ListHeaderComponent={
            <Animated.View>
              <PageHeader
                title="Goals"
                subtitle="Family Finance"
                rightAction={
                  <TouchableOpacity
                    onPress={openCreate}
                    style={[s.addBtn, { backgroundColor: colors.accent.primary + '20' }]}
                    activeOpacity={0.7}
                  >
                    <AntDesign  name="plus" size={22} color={colors.accent.primary} />
                  </TouchableOpacity>
                }
              />
              {goals.length > 0 && (
                <OverallProgressHeader
                  totalSaved={totalSaved}
                  totalTarget={totalTarget}
                  goalCount={goals.length}
                />
              )}
              {rebalanceData.length > 0 && (
                <View style={{ marginTop: 8, marginBottom: 4 }}>
                  <View style={[s.rebalCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                       <AntDesign  name="swap" size={16} color={colors.accent.primary} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.primary }}>AI Rebalance Suggestions</Text>
                    </View>
                    {rebalanceData.slice(0, 3).map((s: any) => (
                      <View key={s.goalId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border.subtle }}>
                        <View style={{ width: 24, height: 24, borderRadius: borderRadius.sm, backgroundColor: (s.goalColor || colors.accent.primary) + '20', alignItems: 'center', justifyContent: 'center' }}>
                          <AntDesign name={s.goalIcon as any} size={12} color={s.goalColor || colors.accent.primary} />
                        </View>
                        <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: colors.text.primary }} numberOfLines={1}>{s.goalName}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: s.action === 'increase' ? colors.status.success : colors.status.error }}>
                          {s.action === 'increase' ? '+' : '-'}₹{s.diff.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    ))}
                    <Text style={{ fontSize: 10, fontWeight: '500', color: colors.text.tertiary, marginTop: 6, textAlign: 'center' }}>Based on your income, deadlines, and progress</Text>
                  </View>
                </View>
              )}
            </Animated.View>
          }
          renderItem={renderItem}
          ListEmptyComponent={
            <GoalsEmptyState
              onCreatePress={openCreate}
              onSuggestionPress={openCreateWithSuggestion}
            />
          }
          windowSize={10}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
        />
      </BaseScreen>

      <CreateGoalModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={loadGoals}
        prefill={prefill}
      />

      {/*
      TODO: Add CelebrationOverlay for milestone celebrations
      <CelebrationOverlay
        visible={celebrationVisible}
        onDismiss={() => setCelebrationVisible(false)}
        title="Milestone Reached!"
        subtitle="Keep up the great work!"
      />
      */}
    </>
  );
}

const s = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius['3xl'],
    padding: spacing.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.lg,
  },
  cardIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  rebalCard: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
  },
  progressTrack: {
    height: 5,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginTop: spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    marginTop: spacing.md,
    gap: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: 10,
  },
  celebrationFlash: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: borderRadius['3xl'],
  },
  overallCard: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius['3xl'],
    padding: 18,
  },
  overallInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  overallTrackBar: {
    height: 6,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  overallTrackFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  goalBadge: {
    marginTop: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: 14,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
  },
  suggestionIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
<<<<<<< Updated upstream
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius['4xl'],
    borderTopRightRadius: borderRadius['4xl'],
    padding: spacing.xl,
    paddingBottom: spacing['4xl'],
    maxHeight: '85%',
  },
  modalHandle: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  handleBar: {
    width: 36,
    height: spacing.xs,
    borderRadius: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    borderWidth: 1,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    gap: spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    paddingVertical: spacing.xs,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.full,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 15,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 15,
  },
=======
>>>>>>> Stashed changes
});
