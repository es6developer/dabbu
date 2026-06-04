import React, { ReactNode, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme, spacing, borderRadius } from '../../theme';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  optional?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  containerStyle?: any;
}

export function FormField({
  label,
  error,
  optional = false,
  prefix,
  suffix,
  containerStyle,
  ...inputProps
}: FormFieldProps) {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Text style={[styles.label, { color: colors.text.secondary }]}>
        {label}
        {optional ? ' (optional)' : ''}
      </Text>
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.bg.tertiary,
            borderColor: error ? colors.status.error : colors.border.subtle,
          },
        ]}
      >
        {prefix && <View style={styles.prefix}>{prefix}</View>}
        <TextInput
          ref={inputRef}
          placeholderTextColor={colors.text.tertiary}
          style={[
            styles.input,
            { color: colors.text.primary },
            prefix ? styles.inputWithPrefix : undefined,
            suffix ? styles.inputWithSuffix : undefined,
          ]}
          {...inputProps}
        />
        {suffix && <View style={styles.suffix}>{suffix}</View>}
      </View>
      {error && <Text style={[styles.error, { color: colors.status.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  inputWithPrefix: {
    marginLeft: spacing.sm,
  },
  inputWithSuffix: {
    marginRight: spacing.sm,
  },
  prefix: {
    marginRight: spacing.xs,
  },
  suffix: {
    marginLeft: spacing.xs,
  },
  error: {
    fontSize: 12,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
});
