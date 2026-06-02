import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, spacing, borderRadius } from '../../theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <LinearGradient
        colors={[`${colors.accent.primary}20`, `${colors.accent.secondary}20`]}
        style={[styles.iconWrap, compact && styles.iconWrapCompact]}
      >
        <Ionicons name={icon as any} size={compact ? 32 : 44} color={colors.accent.primary} />
      </LinearGradient>
      <Text style={[styles.title, compact && styles.titleCompact, { color: colors.text.primary }]}>
        {title}
      </Text>
      <Text
        style={[styles.message, compact && styles.messageCompact, { color: colors.text.tertiary }]}
      >
        {message}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.accent.primary }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['4xl'],
  },
  compact: {
    paddingVertical: spacing['2xl'],
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: borderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconWrapCompact: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 15,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageCompact: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
  },
  actionLabel: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
