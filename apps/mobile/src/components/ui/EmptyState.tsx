import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title = 'No activity yet', message, icon, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons
          name="document-text-outline"
          size={56}
          color={colors.accent.primary}
          style={{ opacity: 0.2, position: 'absolute', transform: [{ rotate: '-5deg' }] }}
        />
        <Ionicons name="receipt-outline" size={72} color={colors.text.tertiary} />
      </View>
      <Text style={[styles.title, { color: colors.text.secondary }]}>{title}</Text>
      {message && (
        <Text style={[styles.message, { color: colors.text.tertiary }]}>{message}</Text>
      )}
      {onAction && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.accent.primary }]}
          onPress={onAction}
          activeOpacity={0.7}
        >
          <Text style={styles.actionText}>{actionLabel || '+ Log First Expense'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  iconContainer: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
