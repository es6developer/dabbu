import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';

type IconName = string;
type FieldState = 'idle' | 'focused' | 'filled' | 'error' | 'success';

interface FormFieldProps extends TextInputProps {
  label: string;
  icon?: IconName;
  right?: React.ReactNode;
  required?: boolean;
  error?: string;
  success?: boolean;
  charCount?: number;
  onRightPress?: () => void;
  state?: FieldState;
}

export function FormField({
  label,
  icon,
  right,
  style,
  required,
  error,
  success,
  charCount,
  onRightPress,
  ...props
}: FormFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const hasValue = props.value ? props.value.length > 0 : false;
  const fieldState: FieldState = error ? 'error' : success ? 'success' : focused ? 'focused' : hasValue ? 'filled' : 'idle';

  const borderColor = fieldState === 'error'
    ? colors.status.error
    : fieldState === 'success'
      ? colors.status.success
      : fieldState === 'focused'
        ? colors.accent.primary
        : colors.border.default;

  const handleFocus = useCallback(() => {
    setFocused(true);
    Animated.spring(scaleAnim, { toValue: 1.01, friction: 10, useNativeDriver: true }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const handleBlur = useCallback(() => {
    setFocused(false);
    Animated.spring(scaleAnim, { toValue: 1, friction: 10, useNativeDriver: true }).start();
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
          {charCount !== undefined && (
            <Text style={[styles.charCount, { color: colors.text.tertiary }]}>
              {charCount}
            </Text>
          )}
        </View>
        <View
          style={[
            styles.inputShell,
            props.multiline && styles.inputShellMultiline,
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
              style={styles.inputIcon}
            />
          ) : null}
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              props.multiline && styles.inputMultiline,
              { color: colors.text.primary },
              style,
            ]}
            placeholderTextColor={colors.text.tertiary}
            onFocus={handleFocus}
            onBlur={handleBlur}
            selectionColor={colors.accent.primary}
            {...props}
          />
          {fieldState === 'success' && !right && (
            <AntDesign name="checkcircle" size={18} color={colors.status.success} />
          )}
          {right ? (
            <TouchableOpacity onPress={onRightPress} disabled={!onRightPress}>
              {right}
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
      {fieldState === 'error' && error ? (
        <View style={styles.errorRow}>
          <AntDesign name="exclamationcircle" size={12} color={colors.status.error} />
          <Text style={[styles.errorHint, { color: colors.status.error }]}>{error}</Text>
        </View>
      ) : null}
      {fieldState === 'success' && !error ? (
        <Text style={[styles.successHint, { color: colors.status.success }]}>Looks good</Text>
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
    marginBottom: 4,
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
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputShellMultiline: {
    minHeight: 104,
    alignItems: 'flex-start',
    paddingTop: 14,
  },
  inputIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: 0,
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
  successHint: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 2,
  },
});
