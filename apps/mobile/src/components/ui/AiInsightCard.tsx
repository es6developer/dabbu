import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface AiNarrative {
  summary: string;
  highlights: string[];
  recommendations: string[];
  riskFlags: string[];
}

interface AiInsightCardProps {
  narrative: AiNarrative | null;
  loading?: boolean;
  onReload?: () => void;
  type?: 'group' | 'split' | 'dashboard';
}

type ThemeColors = ReturnType<typeof useTheme>['colors'];

function getSeverityColors(colors: ThemeColors) {
  return {
    critical: { bg: colors.status.errorLight, text: colors.status.error, icon: 'warning' },
    warning: { bg: colors.status.warningLight, text: colors.status.warning, icon: 'exclamationcircle' },
    success: {
      bg: colors.status.successLight,
      text: colors.status.success,
      icon: 'checkcircle',
    },
    info: { bg: colors.status.infoLight, text: colors.status.info, icon: 'bulb1' },
  };
}

function NarrativePill({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: `${color}14`, borderColor: `${color}30` }]}>
      <AntDesign name={icon as any} size={12} color={color} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

function InsightBlock({
  title,
  items,
  icon,
  color,
  textColor,
}: {
  title: string;
  items: string[];
  icon: string;
  color: string;
  textColor?: string;
}) {
  if (!items.length) {
    return null;
  }
  return (
    <View style={styles.block}>
      <View style={styles.blockHeader}>
        <AntDesign name={icon as any} size={14} color={color} />
        <Text style={[styles.blockTitle, { color }]}>{title}</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={styles.blockItem}>
          <View style={[styles.blockDot, { backgroundColor: color }]} />
          <Text style={[styles.blockText, { color: textColor }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function AiInsightCard({
  narrative,
  loading,
  onReload,
  type = 'group',
}: AiInsightCardProps) {
  const { colors, isDark } = useTheme();
  const SEVERITY_COLORS = useMemo(() => getSeverityColors(colors), [colors]);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
        ]}
      >
        <View style={styles.loadingRow}>
          <View style={[styles.loadingDot, { backgroundColor: colors.bg.tertiary }]} />
          <View style={[styles.loadingLine, { backgroundColor: colors.bg.tertiary }]} />
        </View>
        <View
          style={[
            styles.loadingLine,
            { backgroundColor: colors.bg.tertiary, width: '80%', marginTop: 8 },
          ]}
        />
        <View
          style={[
            styles.loadingLine,
            { backgroundColor: colors.bg.tertiary, width: '60%', marginTop: 6 },
          ]}
        />
      </View>
    );
  }

  if (!narrative) {
    return null;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
      onLongPress={onReload}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.bg.card,
            borderColor: colors.border.subtle,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconBadge, { backgroundColor: SEVERITY_COLORS.info.bg }]}>
              <AntDesign  name="star" size={16} color={SEVERITY_COLORS.info.text} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
                {type === 'split'
                  ? 'Split Analysis'
                  : type === 'dashboard'
                    ? 'Dashboard Insights'
                    : 'Group Insights'}
              </Text>
              <Text style={[styles.headerSub, { color: colors.text.secondary }]}>
                AI-powered analysis
              </Text>
            </View>
          </View>
          <View style={[styles.aiBadge, { backgroundColor: SEVERITY_COLORS.info.bg }]}>
            <AntDesign  name="bulb1" size={10} color={SEVERITY_COLORS.info.text} />
            <Text style={[styles.aiBadgeText, { color: SEVERITY_COLORS.info.text }]}>AI</Text>
          </View>
        </View>

        {/* ─── Summary ─── */}
        {narrative.summary && (
          <Text style={[styles.summary, { color: colors.text.secondary }]}>
            {narrative.summary}
          </Text>
        )}

        {/* ─── Highlights ─── */}
        <InsightBlock
          title="Highlights"
          items={narrative.highlights}
          icon="bulb1"
          color={SEVERITY_COLORS.success.text}
          textColor={colors.text.secondary}
        />

        {/* ─── Recommendations ─── */}
        <InsightBlock
          title="Recommendations"
          items={narrative.recommendations}
          icon="checkcircle"
          color={SEVERITY_COLORS.info.text}
          textColor={colors.text.secondary}
        />

        {/* ─── Risk Flags ─── */}
        {narrative.riskFlags.length > 0 && (
          <InsightBlock
            title="Risk Flags"
            items={narrative.riskFlags}
            icon="warning"
            color={SEVERITY_COLORS.critical.text}
            textColor={colors.text.secondary}
          />
        )}

        {/* ─── Footer ─── */}
        {onReload && (
          <TouchableOpacity
            style={styles.reloadBtn}
            onPress={onReload}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AntDesign  name="reload1" size={12} color={colors.text.secondary} />
            <Text style={[styles.reloadText, { color: colors.text.secondary }]}>Refresh</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  headerSub: { fontSize: 10, fontWeight: '500', marginTop: 1 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  aiBadgeText: { fontSize: 9, fontWeight: '800' },
  summary: { fontSize: 13, fontWeight: '400', lineHeight: 19, marginBottom: 10 },
  block: { marginTop: 10 },
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  blockTitle: { fontSize: 12, fontWeight: '700' },
  blockItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 20,
    paddingVertical: 3,
  },
  blockDot: { width: 5, height: 5, borderRadius: 3, marginTop: 6 },
  blockText: { fontSize: 12, fontWeight: '400', flex: 1, lineHeight: 17 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillText: { fontSize: 10, fontWeight: '600' },
  reloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  reloadText: { fontSize: 10, fontWeight: '500' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingDot: { width: 32, height: 32, borderRadius: 10 },
  loadingLine: { height: 12, borderRadius: 6 },
});
