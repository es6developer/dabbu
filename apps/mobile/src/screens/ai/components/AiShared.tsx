import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import ReAnimated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
  FadeInUp,
  FadeIn,
  SlideInRight,
} from 'react-native-reanimated';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

const AnimatedCircle = ReAnimated.createAnimatedComponent(Circle);
const { width: SCREEN_W } = Dimensions.get('window');

// ─── AI THEME HOOK ──────────────────────────────────
export function useAiColors() {
  const { colors } = useTheme();
  return useMemo(
    () => ({
      bg: colors.bg.primary,
      card: colors.bg.card,
      border: colors.border.default,
      primary: colors.accent.primary,
      primaryLight: `${colors.accent.primary}18`,
      primaryGlow: `${colors.accent.primary}40`,
      text: colors.text.primary,
      textSecondary: colors.text.secondary,
      textTertiary: colors.text.tertiary,
      success: colors.status.success,
      successLight: colors.status.successLight,
      warning: colors.status.warning,
      warningLight: colors.status.warningLight,
      danger: colors.status.error,
      dangerLight: colors.status.errorLight,
      info: colors.status.info,
      infoLight: colors.status.infoLight,
      purple: colors.accent.primary,
      purpleLight: colors.brand.light,
      cardAlt: colors.bg.tertiary,
    }),
    [colors],
  );
}

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
  size = 120,
  strokeWidth = 8,
  progress,
  color,
  bgColor,
  children,
}: ProgressRingProps) {
  const c = useAiColors();
  const ringColor = color || c.primary;
  const ringBgColor = bgColor || c.border;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value / 100),
  }));

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringBgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
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

export function AnimatedNumber({
  value,
  style,
  prefix = '',
  suffix = '',
  duration = 1000,
  decimal = 0,
}: AnimatedNumberProps) {
  const displayValue = useSharedValue(0);

  useEffect(() => {
    displayValue.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
  }, [value]);

  const formatted = value.toLocaleString('en-IN', { maximumFractionDigits: decimal });
  return (
    <Text style={style}>
      {prefix}
      {formatted}
      {suffix}
    </Text>
  );
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
  const c = useAiColors();
  const { spacing: sp } = useTheme();
  const ringColor = score >= 80 ? c.success : score >= 60 ? c.warning : c.danger;
  const card = (
    <View style={[localStyles.healthCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={{ flex: 1 }}>
        {title && <Text style={[localStyles.healthTitle, { color: c.text }]}>{title}</Text>}
        {subtitle && (
          <Text style={[localStyles.healthSub, { color: c.textSecondary }]}>{subtitle}</Text>
        )}
        {trend !== undefined && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: sp.xs }}>
            <AntDesign
              name={(trend >= 0 ? 'caretup' : 'caretdown') as any}
              size={14}
              color={trend >= 0 ? c.success : c.danger}
            />
            <Text style={[localStyles.healthTrend, { color: trend >= 0 ? c.success : c.danger }]}>
              {trend >= 0 ? '+' : ''}
              {trend} points
            </Text>
          </View>
        )}
      </View>
      <AnimatedProgressRing size={88} strokeWidth={6} progress={score} color={ringColor}>
        <Text style={[localStyles.healthScoreText, { color: ringColor }]}>{score}</Text>
      </AnimatedProgressRing>
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {card}
      </TouchableOpacity>
    );
  }
  return card;
}

// ─── QUICK ACTION BUTTON ─────────────────────────────
interface QuickActionBtnProps {
  icon: string;
  label: string;
  onPress?: () => void;
  color?: string;
}

export function QuickActionBtn({ icon, label, onPress, color }: QuickActionBtnProps) {
  const c = useAiColors();
  const btnColor = color || c.primary;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={localStyles.qaBtn}>
      <View style={[localStyles.qaIconWrap, { backgroundColor: `${btnColor}20` }]}>
        <AntDesign name={icon as any} size={22} color={btnColor} />
      </View>
      <Text style={[localStyles.qaLabel, { color: c.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── INSIGHT CARD ────────────────────────────────────
interface InsightCardProps {
  icon?: string;
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
  icon = 'bulb1',
  title,
  message,
  type = 'default',
  confidence,
  impact,
  actionLabel,
  onAction,
  onPress,
}: InsightCardProps) {
  const c = useAiColors();
  const colorMap = {
    critical: c.danger,
    warning: c.warning,
    success: c.success,
    info: c.info,
    default: c.textSecondary,
  };
  const lightMap = {
    critical: c.dangerLight,
    warning: c.warningLight,
    success: c.successLight,
    info: c.infoLight,
    default: 'transparent',
  };
  const badgeColor = colorMap[type];
  const badgeLight = lightMap[type];
  const card = (
    <View
      style={[
        localStyles.insightCard,
        { backgroundColor: c.card, borderColor: c.border, borderLeftColor: badgeColor },
      ]}
    >
      <View style={localStyles.insightRow}>
        <View style={[localStyles.insightIcon, { backgroundColor: badgeLight }]}>
          <AntDesign name={icon as any} size={18} color={badgeColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[localStyles.insightTitle, { color: c.text }]}>{title}</Text>
          <Text style={[localStyles.insightMsg, { color: c.textSecondary }]}>{message}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            {confidence !== undefined && (
              <View style={[localStyles.badge, { backgroundColor: badgeLight }]}>
                <Text style={[localStyles.badgeText, { color: badgeColor }]}>
                  {(confidence * 100).toFixed(0)}% confidence
                </Text>
              </View>
            )}
            {impact && (
              <View style={[localStyles.badge, { backgroundColor: badgeLight }]}>
                <Text style={[localStyles.badgeText, { color: badgeColor }]}>{impact} Impact</Text>
              </View>
            )}
          </View>
        </View>
        <AntDesign  name="right" size={16} color={c.textTertiary} />
      </View>
    </View>
  );

  return (
    <ReAnimated.View entering={FadeInUp.duration(400).springify()}>
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
          {card}
        </TouchableOpacity>
      ) : (
        card
      )}
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
  const c = useAiColors();
  return (
    <View style={localStyles.sectionHeader}>
      <View>
        <Text style={[localStyles.sectionTitle, { color: c.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[localStyles.sectionSub, { color: c.textSecondary }]}>{subtitle}</Text>
        )}
      </View>
      {action && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={[localStyles.sectionAction, { color: c.primary }]}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── SEVERITY BADGE ──────────────────────────────────
export function SeverityBadge({
  severity,
}: {
  severity: 'critical' | 'warning' | 'info' | 'success';
}) {
  const c = useAiColors();
  const colorMap = {
    critical: c.danger,
    warning: c.warning,
    info: c.info,
    success: c.success,
  };
  return (
    <View style={[localStyles.sevBadge, { backgroundColor: `${colorMap[severity]}20` }]}>
      <View style={[localStyles.sevDot, { backgroundColor: colorMap[severity] }]} />
      <Text style={[localStyles.sevText, { color: colorMap[severity] }]}>{severity}</Text>
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
  const c = useAiColors();
  const card = (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {card}
      </TouchableOpacity>
    );
  }
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
      ),
      -1,
      true,
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
  icon?: string;
}

export function MetricRow({ label, value, color, icon }: MetricRowProps) {
  const c = useAiColors();
  const valColor = color || c.textSecondary;
  return (
    <View style={[localStyles.metricRow, { borderBottomColor: c.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon && <AntDesign name={icon as any} size={14} color={valColor} />}
        <Text style={[localStyles.metricLabel, { color: c.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[localStyles.metricValue, { color: valColor }]}>{value}</Text>
    </View>
  );
}

// ─── RADAR CHART ─────────────────────────────────────
interface RadarChartProps {
  size?: number;
  data: { label: string; value: number; color?: string }[];
}

export function RadarChart({ size = 200, data }: RadarChartProps) {
  const c = useAiColors();
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
        return <Polygon key={l} points={pts} fill="none" stroke={c.border} strokeWidth={1} />;
      })}
      {data.map((_, i) => {
        const p = getPoint(i, 1, radius);
        return <Line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={c.border} strokeWidth={1} />;
      })}
      <Polygon points={polygonPoints} fill={`${c.primary}25`} stroke={c.primary} strokeWidth={2} />
      {data.map((d, i) => {
        const p = getPoint(i, d.value / 100, radius);
        return (
          <React.Fragment key={i}>
            <Circle cx={p.x} cy={p.y} r={4} fill={d.color || c.primary} />
            <SvgText
              x={p.x}
              y={p.y + (p.y < cy ? -14 : 18)}
              fontSize={10}
              fill={c.textSecondary}
              textAnchor="middle"
            >
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

export function GoalCard({
  emoji = 'flag',
  title,
  current,
  target,
  predictedDate,
  probability,
  onPress,
}: GoalCardProps) {
  const c = useAiColors();
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={[localStyles.goalCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <AntDesign name={emoji as any} size={28} color={c.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[localStyles.goalTitle, { color: c.text }]}>{title}</Text>
            <Text style={[localStyles.goalAmount, { color: c.textSecondary }]}>
              ₹{current.toLocaleString('en-IN')} / ₹{target.toLocaleString('en-IN')}
            </Text>
          </View>
          <Text style={[localStyles.goalPct, { color: pct >= 80 ? c.success : c.primary }]}>
            {pct}%
          </Text>
        </View>
        <View style={[localStyles.progressBarBg, { backgroundColor: c.border }]}>
          <View
            style={[
              localStyles.progressBarFill,
              { width: `${pct}%`, backgroundColor: pct >= 80 ? c.success : c.primary },
            ]}
          />
        </View>
        {probability !== undefined && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            {predictedDate && (
              <Text style={[localStyles.goalPred, { color: c.textTertiary }]}>
                By {predictedDate}
              </Text>
            )}
            <Text
              style={[localStyles.goalProb, { color: probability >= 80 ? c.success : c.warning }]}
            >
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
  const c = useAiColors();
  return (
    <View
      style={[localStyles.premiumBadge, { backgroundColor: premium ? c.primaryLight : c.border }]}
    >
      <AntDesign
        name={(premium ? 'star' : 'star') as any}
        size={10}
        color={premium ? c.primary : c.textTertiary}
      />
      <Text style={[localStyles.premiumBadgeText, { color: premium ? c.primary : c.textTertiary }]}>
        {premium ? 'PREMIUM' : 'FREE'}
      </Text>
    </View>
  );
}

// ─── LAYOUT-ONLY STYLES ─────────────────────────────
const localStyles = StyleSheet.create({
  healthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  healthTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  healthSub: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  healthTrend: { fontSize: 13, fontWeight: '600', marginLeft: 4 },
  healthScoreText: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },

  qaBtn: { alignItems: 'center', gap: 6, width: 72 },
  qaIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qaLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },

  insightCard: {
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    borderWidth: 1,
    marginBottom: 8,
  },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightTitle: { fontSize: 14, fontWeight: '700' },
  insightMsg: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  sectionSub: { fontSize: 12, marginTop: 2 },
  sectionAction: { fontSize: 13, fontWeight: '600' },

  sevBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  sevDot: { width: 6, height: 6, borderRadius: 3 },
  sevText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  metricLabel: { fontSize: 13, fontWeight: '500' },
  metricValue: { fontSize: 14, fontWeight: '700' },

  goalCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  goalTitle: { fontSize: 15, fontWeight: '700' },
  goalAmount: { fontSize: 12, marginTop: 2 },
  goalPct: { fontSize: 22, fontWeight: '800' },
  progressBarBg: { height: 4, borderRadius: 2, marginTop: 12, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 2 },
  goalPred: { fontSize: 11 },
  goalProb: { fontSize: 11, fontWeight: '600' },

  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  premiumBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
});
