import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface FormToggleProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  description?: string;
  disabled?: boolean;
}

export function FormToggle({ label, value, onValueChange, description, disabled }: FormToggleProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={[styles.label, { color: colors.text.primary }]}>{label}</Text>
        {description && (
          <Text style={[styles.description, { color: colors.text.tertiary }]}>{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border.default, true: `${colors.accent.primary}60` }}
        thumbColor={value ? colors.accent.primary : colors.text.tertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  textCol: {
    flex: 1,
    marginRight: 14,
    gap: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
});
