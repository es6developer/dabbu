import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import ReAnimated, {
  useSharedValue, useAnimatedProps, withTiming, withRepeat, withSequence, Easing, cancelAnimation,
  FadeInUp, FadeIn, SlideInRight,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const AnimatedCircle = ReAnimated.createAnimatedComponent(Circle);
const { width: SCREEN_W } = Dimensions.get('window');

// ─── COLORS ────────────────────────────────────────────
export const AI_COLORS = {
  bg: '#0F1115',
  card: '#171A21',
  border: '#262A33',
  primary: '#FF6B00',
  primaryLight: 'rgba(255, 107, 0, 0.15)',
  primaryGlow: 'rgba(255, 107, 0, 0.3)',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  success: '#16A34A',
  successLight: 'rgba(22, 163, 74, 0.15)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.15)',
  danger: '#EF4444',
  dangerLight: 'rgba(239, 68, 68, 0.15)',
  info: '#3B82F6',
  infoLight: 'rgba(59, 130, 246, 0.15)',
  purple: '#8B5CF6',
  purpleLight: 'rgba(139, 92, 246, 0.15)',
  cardAlt: '#1C2128',
};

// ─── ANIMATED PROGRESS RING ──────────────────────────
interface ProgressRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number;
  color?: string;
  bgColor?: string;
  children?: React.ReactNode;
}

export function AnimatedProgressRing({
  size = 120, strokeWidth = 8, progress, color = AI_COLORS.primary, bgColor = AI_COLORS.border, children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, { duration: 1200, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value / 100),
  }));

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={bgColor} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

// ─── ANIMATED NUMBER ─────────────────────────────────
interface AnimatedNumberProps {
  value: number;
  style?: any;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimal?: number;
}

export function AnimatedNumber({ value, style, prefix = '', suffix = '', duration = 1000, decimal = 0 }: AnimatedNumberProps) {
  const displayValue = useSharedValue(0);

  useEffect(() => {
    displayValue.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
  }, [value]);

  const formatted = value.toLocaleString('en-IN', { maximumFractionDigits: decimal });
  return <Text style={style}>{prefix}{formatted}{suffix}</Text>;
}

// ─── HEALTH SCORE CARD ───────────────────────────────
interface HealthScoreCardProps {
  score: number;
  trend?: number;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
}

export function HealthScoreCard({ score, trend, title, subtitle, onPress }: HealthScoreCardProps) {
  const ringColor = score >= 80 ? AI_COLORS.success : score >= 60 ? AI_COLORS.warning : AI_COLORS.danger;
  const card = (
    <View style={[as.healthCard, { borderColor: AI_COLORS.border }]}>
      <View style={{ flex: 1 }}>
        {title && <Text style={as.healthTitle}>{title}</Text>}
        {subtitle && <Text style={as.healthSub}>{subtitle}</Text>}
        {trend !== undefined && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Ionicons name={trend >= 0 ? 'trending-up' : 'trending-down'} size={14} color={trend >= 0 ? AI_COLORS.success : AI_COLORS.danger} />
            <Text style={[as.healthTrend, { color: trend >= 0 ? AI_COLORS.success : AI_COLORS.danger }]}>
              {trend >= 0 ? '+' : ''}{trend} points
            </Text>
          </View>
        )}
      </View>
      <AnimatedProgressRing size={88} strokeWidth={6} progress={score} color={ringColor}>
        <Text style={[as.healthScoreText, { color: ringColor }]}>{score}</Text>
      </AnimatedProgressRing>
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.8}>{card}</TouchableOpacity>;
  return card;
}

// ─── QUICK ACTION BUTTON ─────────────────────────────
interface QuickActionBtnProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  color?: string;
}

export function QuickActionBtn({ icon, label, onPress, color = AI_COLORS.primary }: QuickActionBtnProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={as.qaBtn}>
      <View style={[as.qaIconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={as.qaLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── INSIGHT CARD ────────────────────────────────────
interface InsightCardProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  type?: 'critical' | 'warning' | 'success' | 'info' | 'default';
  confidence?: number;
  impact?: 'High' | 'Medium' | 'Low';
  actionLabel?: string;
  onAction?: () => void;
  onPress?: () => void;
}

export function InsightCard({
  icon = 'bulb', title, message, type = 'default', confidence, impact, actionLabel, onAction, onPress,
}: InsightCardProps) {
  const colorMap = {
    critical: AI_COLORS.danger,
    warning: AI_COLORS.warning,
    success: AI_COLORS.success,
    info: AI_COLORS.info,
    default: AI_COLORS.textSecondary,
  };
  const lightMap = {
    critical: AI_COLORS.dangerLight,
    warning: AI_COLORS.warningLight,
    success: AI_COLORS.successLight,
    info: AI_COLORS.infoLight,
    default: 'transparent',
  };
  const badgeColor = colorMap[type];
  const badgeLight = lightMap[type];
  const card = (
    <View style={[as.insightCard, { borderLeftColor: badgeColor }]}>
      <View style={as.insightRow}>
        <View style={[as.insightIcon, { backgroundColor: badgeLight }]}>
          <Ionicons name={icon} size={18} color={badgeColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={as.insightTitle}>{title}</Text>
          <Text style={as.insightMsg}>{message}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            {confidence !== undefined && (
              <View style={[as.badge, { backgroundColor: badgeLight }]}>
                <Text style={[as.badgeText, { color: badgeColor }]}>{(confidence * 100).toFixed(0)}% confidence</Text>
              </View>
            )}
            {impact && (
              <View style={[as.badge, { backgroundColor: badgeLight }]}>
                <Text style={[as.badgeText, { color: badgeColor }]}>{impact} Impact</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={AI_COLORS.textTertiary} />
      </View>
    </View>
  );

  return (
    <ReAnimated.View entering={FadeInUp.duration(400).springify()}>
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>{card}</TouchableOpacity>
      ) : card}
    </ReAnimated.View>
  );
}

// ─── SECTION HEADER ──────────────────────────────────
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, subtitle, action, onAction }: SectionHeaderProps) {
  return (
    <View style={as.sectionHeader}>
      <View>
        <Text style={as.sectionTitle}>{title}</Text>
        {subtitle && <Text style={as.sectionSub}>{subtitle}</Text>}
      </View>
      {action && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={as.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── SEVERITY BADGE ──────────────────────────────────
export function SeverityBadge({ severity }: { severity: 'critical' | 'warning' | 'info' | 'success' }) {
  const colorMap = {
    critical: AI_COLORS.danger,
    warning: AI_COLORS.warning,
    info: AI_COLORS.info,
    success: AI_COLORS.success,
  };
  return (
    <View style={[as.sevBadge, { backgroundColor: `${colorMap[severity]}20` }]}>
      <View style={[as.sevDot, { backgroundColor: colorMap[severity] }]} />
      <Text style={[as.sevText, { color: colorMap[severity] }]}>{severity}</Text>
    </View>
  );
}

// ─── AI CARD ─────────────────────────────────────────
interface AiCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  padding?: number;
  style?: any;
}

export function AiCard({ children, onPress, padding = 16, style }: AiCardProps) {
  const card = (
    <View style={[as.aiCard, { padding, borderColor: AI_COLORS.border }, style]}>
      {children}
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.8}>{card}</TouchableOpacity>;
  return card;
}

// ─── PULSE ANIMATION ─────────────────────────────────
export function PulseView({ children, style }: { children: React.ReactNode; style?: any }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      ), -1, true,
    );
    return () => cancelAnimation(pulse);
  }, []);
  const animStyle = { transform: [{ scale: pulse }] };
  return <ReAnimated.View style={[animStyle, style]}>{children}</ReAnimated.View>;
}

// ─── METRIC ROW ──────────────────────────────────────
interface MetricRowProps {
  label: string;
  value: string;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function MetricRow({ label, value, color = AI_COLORS.textSecondary, icon }: MetricRowProps) {
  return (
    <View style={as.metricRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon && <Ionicons name={icon} size={14} color={color} />}
        <Text style={[as.metricLabel, { color: AI_COLORS.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[as.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

// ─── RADAR CHART ─────────────────────────────────────
interface RadarChartProps {
  size?: number;
  data: { label: string; value: number; color?: string }[];
}

export function RadarChart({ size = 200, data }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const levels = 4;
  const angleStep = (2 * Math.PI) / data.length;

  const getPoint = (index: number, value: number, r: number) => {
    const angle = -Math.PI / 2 + index * angleStep;
    return { x: cx + r * value * Math.cos(angle), y: cy + r * value * Math.sin(angle) };
  };

  const polygonPoints = data
    .map((d, i) => {
      const p = getPoint(i, d.value / 100, radius);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  return (
    <Svg width={size} height={size}>
      {Array.from({ length: levels }).map((_, l) => {
        const levelRadius = (radius / levels) * (l + 1);
        const pts = data
          .map((_, i) => {
            const angle = -Math.PI / 2 + i * angleStep;
            return `${cx + levelRadius * Math.cos(angle)},${cy + levelRadius * Math.sin(angle)}`;
          })
          .join(' ');
        return <Polygon key={l} points={pts} fill="none" stroke={AI_COLORS.border} strokeWidth={1} />;
      })}
      {data.map((_, i) => {
        const p = getPoint(i, 1, radius);
        return <Line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={AI_COLORS.border} strokeWidth={1} />;
      })}
      <Polygon points={polygonPoints} fill={`${AI_COLORS.primary}25`} stroke={AI_COLORS.primary} strokeWidth={2} />
      {data.map((d, i) => {
        const p = getPoint(i, d.value / 100, radius);
        return (
          <React.Fragment key={i}>
            <Circle cx={p.x} cy={p.y} r={4} fill={d.color || AI_COLORS.primary} />
            <SvgText x={p.x} y={p.y + (p.y < cy ? -14 : 18)} fontSize={10} fill={AI_COLORS.textSecondary} textAnchor="middle">
              {d.label}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// ─── GOAL CARD ───────────────────────────────────────
interface GoalCardProps {
  emoji?: string;
  title: string;
  current: number;
  target: number;
  predictedDate?: string;
  probability?: number;
  onPress?: () => void;
}

export function GoalCard({ emoji = '🎯', title, current, target, predictedDate, probability, onPress }: GoalCardProps) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={[as.goalCard, { borderColor: AI_COLORS.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 28 }}>{emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={as.goalTitle}>{title}</Text>
            <Text style={as.goalAmount}>₹{current.toLocaleString('en-IN')} / ₹{target.toLocaleString('en-IN')}</Text>
          </View>
          <Text style={[as.goalPct, { color: pct >= 80 ? AI_COLORS.success : AI_COLORS.primary }]}>{pct}%</Text>
        </View>
        <View style={[as.progressBarBg, { backgroundColor: AI_COLORS.border }]}>
          <View style={[as.progressBarFill, { width: `${pct}%`, backgroundColor: pct >= 80 ? AI_COLORS.success : AI_COLORS.primary }]} />
        </View>
        {probability !== undefined && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            {predictedDate && <Text style={as.goalPred}>By {predictedDate}</Text>}
            <Text style={[as.goalProb, { color: probability >= 80 ? AI_COLORS.success : AI_COLORS.warning }]}>
              {probability}% success probability
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── FREE / PREMIUM BADGE ────────────────────────────
export function PremiumBadge({ premium = false }: { premium?: boolean }) {
  return (
    <View style={[as.premiumBadge, { backgroundColor: premium ? AI_COLORS.primaryLight : AI_COLORS.border }]}>
      <Ionicons name={premium ? 'diamond' : 'sparkles'} size={10} color={premium ? AI_COLORS.primary : AI_COLORS.textTertiary} />
      <Text style={[as.premiumBadgeText, { color: premium ? AI_COLORS.primary : AI_COLORS.textTertiary }]}>
        {premium ? 'PREMIUM' : 'FREE'}
      </Text>
    </View>
  );
}

const as = StyleSheet.create({
  healthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AI_COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: AI_COLORS.border,
  },
  healthTitle: { fontSize: 20, fontWeight: '700', color: AI_COLORS.text, letterSpacing: -0.3 },
  healthSub: { fontSize: 13, color: AI_COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
  healthTrend: { fontSize: 13, fontWeight: '600', marginLeft: 4 },
  healthScoreText: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },

  qaBtn: { alignItems: 'center', gap: 6, width: 72 },
  qaIconWrap: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  qaLabel: { fontSize: 11, fontWeight: '500', color: AI_COLORS.textSecondary, textAlign: 'center' },

  insightCard: {
    backgroundColor: AI_COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: AI_COLORS.border,
    borderLeftColor: undefined,
    marginBottom: 8,
  },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  insightIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  insightTitle: { fontSize: 14, fontWeight: '700', color: AI_COLORS.text },
  insightMsg: { fontSize: 12, color: AI_COLORS.textSecondary, marginTop: 2, lineHeight: 17 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    marginTop: 24, marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: AI_COLORS.text, letterSpacing: -0.2 },
  sectionSub: { fontSize: 12, color: AI_COLORS.textSecondary, marginTop: 2 },
  sectionAction: { fontSize: 13, fontWeight: '600', color: AI_COLORS.primary },

  sevBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start',
  },
  sevDot: { width: 6, height: 6, borderRadius: 3 },
  sevText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  aiCard: {
    backgroundColor: AI_COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: AI_COLORS.border,
  },

  metricRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: AI_COLORS.border,
  },
  metricLabel: { fontSize: 13, fontWeight: '500' },
  metricValue: { fontSize: 14, fontWeight: '700' },

  goalCard: {
    backgroundColor: AI_COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1,
    marginBottom: 10,
  },
  goalTitle: { fontSize: 15, fontWeight: '700', color: AI_COLORS.text },
  goalAmount: { fontSize: 12, color: AI_COLORS.textSecondary, marginTop: 2 },
  goalPct: { fontSize: 22, fontWeight: '800' },
  progressBarBg: { height: 4, borderRadius: 2, marginTop: 12, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 2 },
  goalPred: { fontSize: 11, color: AI_COLORS.textTertiary },
  goalProb: { fontSize: 11, fontWeight: '600' },

  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start',
  },
  premiumBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
});
