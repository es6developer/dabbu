import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, spacing, borderRadius } from '../../theme';

interface FilterOption {
  key: string;
  label: string;
}

interface FilterSectionProps {
  options: FilterOption[];
  selected: string;
  onSelect: (key: string) => void;
}

export function FilterSection({ options, selected, onSelect }: FilterSectionProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {options.map((f) => (
        <TouchableOpacity
          key={f.key}
          style={[
            styles.chip,
            { backgroundColor: colors.bg.secondary, borderColor: colors.border.default },
            selected === f.key && {
              backgroundColor: colors.accent.primary,
              borderColor: colors.accent.primary,
            },
          ]}
          onPress={() => onSelect(f.key)}
        >
          <Text
            style={[
              styles.chipText,
              { color: colors.text.tertiary },
              selected === f.key && { color: '#FFFFFF' },
            ]}
          >
            {f.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 22,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
