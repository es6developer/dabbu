import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode | string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function EmptyState({
  title = 'No activity yet',
  message,
  icon,
  actionLabel = '+ Add',
  onAction,
  compact = false,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        paddingHorizontal: spacing['2xl'],
        paddingVertical: compact ? spacing['2xl'] : spacing['5xl'],
      }}
    >
      <View
        style={{
          height: compact ? 80 : 120,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.lg,
        }}
      >
        {typeof icon === 'string' ? (
          <AntDesign name={icon as any} size={compact ? 40 : 56} color={colors.accent.primary} />
        ) : (
          icon || (
            <>
              <AntDesign
                name="filetext1"
                size={compact ? 40 : 56}
                color={colors.accent.primary}
                style={{ opacity: 0.15, position: 'absolute', transform: [{ rotate: '-5deg' }] }}
              />
              <AntDesign name="filetext1" size={compact ? 52 : 72} color={colors.text.tertiary} />
            </>
          )
        )}
      </View>
      <Text
        style={{
          fontSize: compact ? 15 : 17,
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: spacing.xs,
          color: colors.text.secondary,
        }}
      >
        {title}
      </Text>
      {message && (
        <Text
          style={{
            fontSize: 16,
            textAlign: 'center',
            lineHeight: 18,
            color: colors.text.tertiary,
            paddingHorizontal: spacing.xl,
          }}
        >
          {message}
        </Text>
      )}
      {onAction && (
        <TouchableOpacity
          style={{
            marginTop: spacing.xl,
            paddingHorizontal: spacing['2xl'],
            paddingVertical: spacing.md,
            borderRadius: borderRadius.xl,
            backgroundColor: colors.accent.primary,
          }}
          onPress={onAction}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
