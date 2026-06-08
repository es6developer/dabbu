import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { BaseScreen } from '../../components/ui/BaseScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
// TODO: Import CelebrationOverlay when navigator is ready
// import { CelebrationOverlay } from '../../components/ui/CelebrationOverlay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type GoalConfig = {
  icon: string;
  color: string;
};

const GOAL_CONFIGS: Record<string, GoalConfig> = {
  emergency: { icon: 'shield-checkmark', color: '#FF6B6B' },
  vacation: { icon: 'airplane', color: '#00B894' },
  education: { icon: 'school', color: '#4F6EF7' },
  home: { icon: 'home', color: '#F97316' },
  car: { icon: 'car-sport', color: '#FF6B00' },
  wedding: { icon: 'heart', color: '#FF6B9D' },
  retirement: { icon: 'umbrella', color: '#247BA0' },
  custom: { icon: 'trophy', color: '#FF6B00' },
};

const SUGGESTED_GOALS = [
  { name: 'Emergency Fund', type: 'emergency', target: 200000 },
  { name: 'Dream Vacation', type: 'vacation', target: 300000 },
  { name: 'New Home', type: 'home', target: 5000000 },
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
                borderRadius: 14,
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
              <Ionicons name="checkmark" size={14} color="#FFF" />
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
          fontFamily: 'Inter-Bold',
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
  onNavigate,
}: {
  item: any;
  index: number;
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
  const estDate = getEstimatedCompletion(saved, target, monthly, item.deadline || item.targetDate);

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
            <View style={[s.cardIcon, { borderRadius: 12 }]}>
              <Ionicons name={config.icon as any} size={22} color={config.color} />
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
                <Ionicons
                  name="calendar-outline"
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
                <Ionicons name="repeat-outline" size={11} color={colors.text.tertiary} />
                <Text style={[typography.footnote, { color: colors.text.secondary }]}>
                  {fmt(monthly)}/mo
                </Text>
              </View>
            )}
            <Text
              style={[
                typography.footnote,
                { color: colors.text.tertiary, marginTop: 2, textAlign: 'right' },
              ]}
              numberOfLines={1}
            >
              {estDate}
            </Text>
          </View>
        </View>

        <View style={[s.taglineRow, { backgroundColor: 'transparent' }]}>
          <Ionicons name="sparkles" size={13} color={config.color} />
          <Text style={[typography.footnote, { color: config.color, fontWeight: '600' }]}>
            {tagline}
          </Text>
        </View>

        {flashMilestone !== null && (
          <View style={[StyleSheet.absoluteFill, s.celebrationFlash]}>
            <Ionicons name="checkmark-circle" size={56} color={config.color} />
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
        { backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border.default },
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
        icon="trophy-outline"
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
                <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.h4, { color: colors.text.primary }]}>{sg.name}</Text>
                <Text style={[typography.footnote, { color: colors.text.tertiary }]}>
                  Target: {fmt(sg.target)}
                </Text>
              </View>
              <Ionicons name="add-circle" size={24} color={colors.accent.primary} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

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
                  contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
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
                      <Ionicons
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
                        <Ionicons name="sparkles" size={18} color="#FFF" />
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

export function GoalsListScreen() {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [prefill, setPrefill] = useState<{ name: string; type: string; target: number } | null>(
    null,
  );

  const loadGoals = useCallback(async () => {
    try {
      const res = await api.get<any>('/goals');
      setGoals(Array.isArray(res) ? res : []);
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
        onNavigate={() =>
          navigation.navigate('GoalDetail', { goalId: item.id, goalName: item.name })
        }
      />
    ),
    [navigation],
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
          contentContainerStyle={
            goals.length === 0
              ? { flexGrow: 1, paddingBottom: insets.bottom + 100 }
              : { paddingBottom: insets.bottom + 100, paddingHorizontal: 16 }
          }
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
                    <Ionicons name="add" size={22} color={colors.accent.primary} />
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
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  cardIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: 12,
    gap: 12,
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
    gap: 4,
    marginBottom: 2,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  celebrationFlash: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
  },
  overallCard: {
    marginBottom: 16,
    borderRadius: 20,
    padding: 18,
  },
  overallInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  overallTrackBar: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  overallTrackFill: {
    height: '100%',
    borderRadius: 999,
  },
  goalBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggestionIcon: {
    width: 42,
    height: 42,
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
    maxHeight: '85%',
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
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    gap: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    paddingVertical: 4,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 999,
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
