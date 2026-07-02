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
            { backgroundColor: selected === f.key ? colors.accent.primary : colors.bg.tertiary },
          ]}
          onPress={() => onSelect(f.key)}
        >
          <Text
            style={[
              styles.chipText,
              { color: selected === f.key ? '#FFF' : colors.text.secondary },
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
    gap: 8,
    paddingVertical: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 28,
  },
  chipText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
