import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: string;
  style?: ViewStyle;
}

export function FloatingActionButton({ onPress, icon = 'add', style }: FloatingActionButtonProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        {
          backgroundColor: colors.accent.primary,
          shadowColor: colors.accent.primary,
          bottom: insets.bottom + 80,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon as any} size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
});
