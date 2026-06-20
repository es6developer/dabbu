import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { spacing, borderRadius, shadows } from '../../../theme/design';

export function CoupleAIWidget({ data, onPress }: { data: any; onPress?: () => void }) {
  const { colors, isDark } = useTheme();
  const { coupleAI } = data || {};
  const insights = coupleAI?.insights || [];
  const hasContent = Array.isArray(insights) && insights.length > 0;
  const firstInsight = hasContent
    ? typeof insights[0] === 'string'
      ? insights[0]
      : insights[0]?.text || insights[0]?.title || ''
    : '';

  if (!hasContent && !coupleAI?.title && !coupleAI?.text) {
    return null;
  }

  const displayText = coupleAI?.text || coupleAI?.title || firstInsight;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
    >
      <LinearGradient
        colors={isDark ? ['#7C3AED08', 'transparent'] : ['#7C3AED06', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: borderRadius['2xl'],
        }}
      />
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: colors.accent.primary + '15' }]}>
          <AntDesign name="bulb1" size={18} color={colors.accent.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text.primary }]}>Couple AI Insight</Text>
      </View>
      <View
        style={[
          styles.insightBox,
          {
            backgroundColor: colors.accent.primary + '08',
            borderColor: colors.accent.primary + '15',
          },
        ]}
      >
        <AntDesign name="bulb1" size={14} color={colors.accent.primary} style={{ marginTop: 1 }} />
        <Text style={[styles.insightText, { color: colors.text.secondary }]} numberOfLines={3}>
          {displayText}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.xl,
    ...shadows.md,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '700' },
  insightBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  insightText: { fontSize: 13, fontWeight: '500', lineHeight: 19, flex: 1 },
});
