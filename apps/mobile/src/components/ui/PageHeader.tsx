import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, spacing } from '../../theme';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
  gradient?: boolean;
  noPadding?: boolean;
}

export function PageHeader({ title, subtitle, rightAction, style, gradient, noPadding }: PageHeaderProps) {
  const { colors, isDark } = useTheme();

  const headerContent = (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        <View style={styles.textWrap}>
          {subtitle ? (
            <Text style={[styles.eyebrow, { color: colors.text.tertiary }]}>{subtitle}</Text>
          ) : null}
          <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
        </View>
        {rightAction ? <View style={styles.action}>{rightAction}</View> : null}
      </View>
    </View>
  );

  if (gradient) {
    return (
      <LinearGradient
        colors={isDark ? [colors.accent.primary + '1A', 'transparent'] : [colors.accent.primary + '0F', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingHorizontal: noPadding ? 0 : spacing['2xl'], paddingTop: spacing.md, paddingBottom: spacing['2xl'] }}
      >
        {headerContent}
      </LinearGradient>
    );
  }

  return (
    <View style={{ paddingHorizontal: noPadding ? 0 : spacing['2xl'] }}>
      {headerContent}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textWrap: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  action: {
    marginLeft: spacing.lg,
  },
});
