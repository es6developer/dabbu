import React, { useRef, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';

type AmountType = 'expense' | 'income' | 'wallet' | 'arrowdown';

interface FormAmountFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  symbol?: string;
  type?: AmountType;
  onTypeChange?: (type: AmountType) => void;
  quickAmounts?: string[];
  error?: string;
  success?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export function FormAmountField({
  value,
  onChangeText,
  label = 'Amount',
  symbol = '₹',
  type,
  onTypeChange,
  quickAmounts,
  error,
  placeholder = '0',
  autoFocus,
}: FormAmountFieldProps) {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isExpense = type === undefined || type === 'expense' || type === 'wallet';
  const hasValue = value.length > 0;
  const fieldState = error ? 'error' : focused ? 'focused' : hasValue ? 'filled' : 'idle';

  const accentColor = fieldState === 'error'
    ? colors.status.error
    : isExpense
      ? colors.accent.primary
      : colors.status.success;

  const handleTypeChange = useCallback((t: AmountType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onTypeChange?.(t);
  }, [onTypeChange]);

  const handleAmountPress = useCallback(() => {
    inputRef.current?.focus();
    Animated.spring(scaleAnim, { toValue: 1.02, friction: 8, useNativeDriver: true }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const handleBlur = useCallback(() => {
    setFocused(false);
    Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }).start();
  }, []);

  const displayValue = value
    ? parseFloat(value).toLocaleString('en-IN', {
        minimumFractionDigits: value.includes('.') ? 2 : 0,
        maximumFractionDigits: 2,
      })
    : '';

  return (
    <View style={styles.fieldBlock}>
      {label ? (
        <Text style={[styles.label, { color: colors.text.tertiary }]}>
          {label}
        </Text>
      ) : null}

      {type !== undefined && onTypeChange ? (
        <View style={[styles.toggleRow, { backgroundColor: colors.bg.tertiary }]}>
          {(['expense', 'income'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              activeOpacity={0.8}
              onPress={() => handleTypeChange(t)}
              style={[
                styles.toggleBtn,
                {
                  backgroundColor:
                    type === t
                      ? t === 'income'
                        ? colors.status.success
                        : colors.accent.primary
                      : 'transparent',
                },
              ]}
            >
              <AntDesign
                name={(t === 'expense' ? 'shoppingcart' : 'caretup') as any}
                size={13}
                color={type === t ? '#FFF' : colors.text.secondary}
              />
              <Text
                style={[
                  styles.toggleText,
                  { color: type === t ? '#FFF' : colors.text.secondary },
                ]}
              >
                {t === 'expense' ? 'Expense' : 'Income'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <TouchableOpacity
        activeOpacity={1}
        onPress={handleAmountPress}
        style={[
          styles.amountCard,
          {
            backgroundColor: `${isExpense ? colors.accent.primary : colors.status.success}06`,
            borderColor: fieldState === 'error' ? colors.status.error : colors.border.subtle,
          },

        ]}
      >
        <View style={[styles.amountRow, (value.length > 6) && { gap: 0 }]}>
          <Text style={[styles.symbol, { color: colors.text.secondary }]}>{symbol}</Text>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.text.primary }]}
            value={value}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9.]/g, '');
              if (cleaned.split('.').length - 1 <= 1) {
                onChangeText(cleaned);
              }
            }}
            keyboardType="decimal-pad"
            placeholder={placeholder}
            placeholderTextColor={colors.text.tertiary}
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
            autoFocus={autoFocus}
            returnKeyType="done"
            selectionColor={accentColor}
          />
        </View>
        {hasValue && !focused && (
          <Text style={[styles.amountPreview, { color: colors.text.tertiary }]}>
            {symbol}{displayValue}
          </Text>
        )}
        {!hasValue && type !== undefined && (
          <Text style={[styles.hint, { color: colors.text.tertiary }]}>
            {isExpense !== false ? 'How much did you spend?' : 'How much did you receive?'}
          </Text>
        )}
      </TouchableOpacity>

      {fieldState === 'error' && error ? (
        <View style={[styles.errorRow, { backgroundColor: `${colors.status.error}10` }]}>
          <AntDesign name="exclamationcircle" size={14} color={colors.status.error} />
          <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
        </View>
      ) : null}

      {quickAmounts && quickAmounts.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}
        >
          {quickAmounts.map((val) => {
            const selected = value === val;
            const chipAccent = isExpense ? colors.accent.primary : colors.status.success;
            return (
              <TouchableOpacity
                key={val}
                activeOpacity={0.7}
                onPress={() => {
                  onChangeText(val);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }}
                style={[
                  styles.quickChip,
                  {
                    backgroundColor: selected ? chipAccent : colors.bg.tertiary,
                    borderWidth: 0,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    { color: selected ? '#FFF' : colors.text.secondary },
                  ]}
                >
                  {symbol}{val}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldBlock: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  toggleRow: {
    flexDirection: 'row',
    borderRadius: 26,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 26,
  },
  toggleText: { fontSize: 11, fontWeight: '700' },
  amountCard: {
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 4,
  },
  symbol: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 1,
  },
  input: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
    textAlign: 'center',
    minWidth: 80,
    paddingVertical: 0,
    height: 36,
    lineHeight: 36,
  },
  amountPreview: {
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 28,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  quickRow: {
    gap: 6,
    paddingVertical: 2,
  },
  quickChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 28,
    borderWidth: 1.5,
  },
  quickChipText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
