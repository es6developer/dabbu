import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface AIInsightCardProps {
  insight: string;
  type?: 'tip' | 'warning' | 'forecast' | 'milestone';
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  source?: string;
  loading?: boolean;
}

const TYPE_CONFIG = {
  tip: { icon: 'bulb1', color: '#7C3AED', bg: '#7C3AED10' },
  warning: { icon: 'warning', color: '#F59E0B', bg: '#F59E0B10' },
  forecast: { icon: 'linechart', color: '#06B6D4', bg: '#06B6D410' },
  milestone: { icon: 'star', color: '#22C55E', bg: '#22C55E10' },
};

export function AIInsightCard({
  insight,
  type = 'tip',
  actionLabel,
  onAction,
  onDismiss,
  loading,
}: AIInsightCardProps) {
  const { colors } = useTheme();
  const cfg = TYPE_CONFIG[type];

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.bg.secondary }]}>
        <View style={styles.row}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: colors.skeleton.base },
            ]}
          />
          <View style={styles.content}>
            <View
              style={[
                styles.skeletonLine,
                { backgroundColor: colors.skeleton.base, width: '80%' },
              ]}
            />
            <View
              style={[
                styles.skeletonLine,
                { backgroundColor: colors.skeleton.base, width: '50%', marginTop: 6 },
              ]}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.bg.secondary, borderLeftColor: cfg.color }]}>
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
          <AntDesign name={cfg.icon as any} size={18} color={cfg.color} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.insight, { color: colors.text.secondary }]}>
            {insight}
          </Text>
          {actionLabel && onAction && (
            <TouchableOpacity onPress={onAction} activeOpacity={0.7} style={styles.actionBtn}>
              <Text style={[styles.actionText, { color: cfg.color }]}>
                {actionLabel}
              </Text>
              <AntDesign name="arrowright" size={12} color={cfg.color} />
            </TouchableOpacity>
          )}
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
            <AntDesign name="close" size={14} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', gap: 12 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  content: { flex: 1, gap: 8 },
  insight: { fontSize: 13, lineHeight: 18 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: { fontSize: 12, fontWeight: '700' },
  dismissBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonLine: { height: 12, borderRadius: 6 },
});
