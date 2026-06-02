import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, spacing } from '../../theme';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export function PageHeader({ title, subtitle, rightAction, style }: PageHeaderProps) {
  const { colors, typography } = useTheme();

  return (
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
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textWrap: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  action: {
    marginLeft: spacing.md,
  },
});
