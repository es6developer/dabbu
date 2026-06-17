import React, { ReactNode } from 'react';
import { View, Text, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';

interface WidgetCardProps {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'hero' | 'compact';
}

export function WidgetCard({ children, title, action, style, variant = 'default' }: WidgetCardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bg.card,
          borderColor: colors.border.subtle,
        },
        variant === 'hero' && styles.hero,
        variant === 'compact' && styles.compact,
        shadows.lg,
        style,
      ]}
    >
      {(title || action) && (
        <View style={styles.header}>
          {title && <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>}
          {action && <View style={styles.action}>{action}</View>}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  hero: {
    padding: spacing['2xl'],
    borderRadius: borderRadius['3xl'],
  },
  compact: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.02,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
