import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';

type IconName = string;
type FieldState = 'idle' | 'focused' | 'filled' | 'error' | 'success';

interface FormTextAreaProps extends TextInputProps {
  label: string;
  icon?: IconName;
  required?: boolean;
  error?: string;
  success?: boolean;
  maxLength?: number;
}

export function FormTextArea({
  label,
  icon,
  style,
  required,
  error,
  success,
  maxLength,
  ...props
}: FormTextAreaProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const hasValue = props.value ? props.value.length > 0 : false;
  const fieldState: FieldState = error ? 'error' : success ? 'success' : focused ? 'focused' : hasValue ? 'filled' : 'idle';
  const charCount = props.value ? props.value.length : 0;

  const borderColor = fieldState === 'error'
    ? colors.status.error
    : fieldState === 'success'
      ? colors.status.success
      : fieldState === 'focused'
        ? colors.accent.primary
        : colors.border.default;

  const handleFocus = useCallback(() => {
    setFocused(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const handleBlur = useCallback(() => {
    setFocused(false);
  }, []);

  return (
    <Animated.View style={[styles.fieldBlock, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()}>
        <View style={styles.labelRow}>
          <Text
            style={[
              styles.label,
              {
                color: fieldState === 'error'
                  ? colors.status.error
                  : fieldState === 'success'
                    ? colors.status.success
                    : colors.text.tertiary,
              },
            ]}
          >
            {label}
            {required && <Text style={{ color: '#FF6B6B' }}> *</Text>}
          </Text>
          {maxLength && (
            <Text style={[styles.charCount, { color: colors.text.tertiary }]}>
              {charCount}/{maxLength}
            </Text>
          )}
        </View>
        <View
          style={[
            styles.inputShell,
            {
              backgroundColor: colors.bg.card,
              borderColor,
            },

          ]}
        >
          {icon ? (
            <AntDesign
              name={icon as any}
              size={18}
              color={fieldState === 'error' ? colors.status.error : fieldState === 'success' ? colors.status.success : focused ? colors.accent.primary : colors.text.tertiary}
              style={styles.icon}
            />
          ) : null}
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.text.primary }, style]}
            placeholderTextColor={colors.text.tertiary}
            multiline
            textAlignVertical="top"
            onFocus={handleFocus}
            onBlur={handleBlur}
            maxLength={maxLength}
            selectionColor={colors.accent.primary}
            {...props}
          />
        </View>
      </TouchableOpacity>
      {fieldState === 'error' && error ? (
        <View style={styles.errorRow}>
          <AntDesign name="exclamationcircle" size={12} color={colors.status.error} />
          <Text style={[styles.errorHint, { color: colors.status.error }]}>{error}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fieldBlock: {
    marginBottom: 0,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  charCount: {
    fontSize: 10,
    fontWeight: '600',
  },
  inputShell: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    flexDirection: 'row',
    minHeight: 120,
    paddingTop: 14,
  },
  icon: {
    marginRight: 10,
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    paddingBottom: 14,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    marginLeft: 2,
  },
  errorHint: {
    fontSize: 11,
    fontWeight: '600',
  },
});
