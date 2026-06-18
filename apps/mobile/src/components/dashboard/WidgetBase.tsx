import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function WidgetSkeleton({ height = 180 }: { height?: number }) {
  return (
    <View style={[styles.skeleton, { height }]}>
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, { width: '70%' }]} />
      <View style={[styles.skeletonLine, { width: '50%' }]} />
    </View>
  );
}

export function WidgetError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{message || 'Failed to load'}</Text>
      {onRetry && <Text style={styles.retryText} onPress={onRetry}>Tap to retry</Text>}
    </View>
  );
}

export function WidgetEmpty({ message, icon }: { message: string; icon?: string }) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { borderRadius: 16, padding: 20, backgroundColor: '#1C1C1E', gap: 12 },
  skeletonLine: { height: 14, borderRadius: 7, backgroundColor: '#27272A', width: '90%' },
  errorContainer: { borderRadius: 16, padding: 20, backgroundColor: '#2D0A0A', alignItems: 'center' },
  errorText: { color: '#F87171', fontSize: 14 },
  retryText: { color: '#A78BFA', fontSize: 13, marginTop: 8, fontWeight: '600' },
  emptyContainer: { borderRadius: 16, padding: 20, backgroundColor: '#1C1C1E', alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 14 },
});
