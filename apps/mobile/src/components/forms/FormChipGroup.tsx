import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { FormChip } from './FormChip';

type IconName = string;

interface ChipOption {
  label: string;
  value: string;
  icon?: IconName;
  color?: string;
}

interface FormChipGroupProps {
  label?: string;
  options: ChipOption[];
  selected: string | string[];
  onSelect: (value: string) => void;
  multi?: boolean;
  size?: 'sm' | 'md';
}

export function FormChipGroup({
  label,
  options,
  selected,
  onSelect,
  multi,
  size,
}: FormChipGroupProps) {
  const { colors } = useTheme();
  const selectedArr = Array.isArray(selected) ? selected : [selected];

  return (
    <View>
      {label && (
        <Text style={[styles.label, { color: colors.text.tertiary }]}>
          {label}
        </Text>
      )}
      <View style={styles.rowWrap}>
        {options.map((opt) => (
          <FormChip
            key={opt.value}
            label={opt.label}
            icon={opt.icon}
            color={opt.color}
            selected={selectedArr.includes(opt.value)}
            onPress={() => {
              if (multi && Array.isArray(selected)) {
                const next = selectedArr.includes(opt.value)
                  ? selectedArr.filter((v) => v !== opt.value)
                  : [...selectedArr, opt.value];
                onSelect(next as any);
              } else {
                onSelect(opt.value);
              }
            }}
            size={size}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
