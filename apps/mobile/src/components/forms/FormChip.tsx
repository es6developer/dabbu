import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';

type IconName = string;

interface FormChipProps {
  label: string;
  selected?: boolean;
  icon?: IconName;
  color?: string;
  onPress: () => void;
  size?: 'sm' | 'md';
}

export function FormChip({ label, selected, icon, color, onPress, size = 'md' }: FormChipProps) {
  const { colors } = useTheme();
  const chipColor = color || colors.accent.primary;
  const isSmall = size === 'sm';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.chip,
        isSmall && styles.chipSm,
        {
          backgroundColor: selected ? chipColor : colors.bg.tertiary,
        },
      ]}
    >
      {icon ? (
        <AntDesign
          name={icon as any}
          size={isSmall ? 12 : 14}
          color={selected ? '#FFF' : colors.text.tertiary}
        />
      ) : null}
      <Text
        style={[
          styles.chipText,
          isSmall && styles.chipTextSm,
          { color: selected ? '#FFF' : colors.text.secondary },
          selected && { fontWeight: '700' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 38,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipSm: {
    minHeight: 32,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  chipTextSm: {
    fontSize: 12,
  },
});
