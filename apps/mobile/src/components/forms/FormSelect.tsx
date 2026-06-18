import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { FormBottomSheet } from './FormBottomSheet';

type IconName = string;

interface SelectOption {
  label: string;
  value: string;
  icon?: IconName;
  color?: string;
  subtitle?: string;
}

interface FormSelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: IconName;
  required?: boolean;
}

export function FormSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  icon,
  required,
}: FormSelectProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  const handleSelect = useCallback((opt: SelectOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onChange(opt.value);
    setOpen(false);
  }, [onChange]);

  return (
    <>
      <View style={styles.fieldBlock}>
        <Text style={[styles.label, { color: colors.text.tertiary }]}>
          {label}
          {required && <Text style={{ color: '#FF6B6B' }}> *</Text>}
        </Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setOpen(true);
          }}
          activeOpacity={0.75}
          style={[
            styles.selectShell,
            { backgroundColor: colors.bg.card, borderColor: colors.border.default },
          ]}
        >
          {icon ? (
            <AntDesign name={icon as any} size={18} color={colors.text.tertiary} style={styles.prefixIcon} />
          ) : null}
          {selected ? (
            <View style={styles.selectedRow}>
              {selected.icon ? (
                <AntDesign name={selected.icon as any} size={16} color={selected.color || colors.text.primary} />
              ) : null}
              <Text style={[styles.selectedText, { color: colors.text.primary }]} numberOfLines={1}>
                {selected.label}
              </Text>
            </View>
          ) : (
            <Text style={[styles.placeholder, { color: colors.text.tertiary }]} numberOfLines={1}>
              {placeholder}
            </Text>
          )}
          <AntDesign name="down" size={14} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>

      <FormBottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={styles.optionList}>
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => handleSelect(opt)}
                activeOpacity={0.7}
                style={[
                  styles.option,
                  {
                    backgroundColor: active ? `${colors.accent.primary}10` : 'transparent',
                    borderColor: active ? colors.accent.primary : 'transparent',
                  },
                ]}
              >
                {opt.icon ? (
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: `${opt.color || colors.accent.primary}15` },
                    ]}
                  >
                    <AntDesign name={opt.icon as any} size={18} color={opt.color || colors.accent.primary} />
                  </View>
                ) : null}
                <View style={styles.optionTextCol}>
                  <Text style={[styles.optionLabel, { color: colors.text.primary }]}>
                    {opt.label}
                  </Text>
                  {opt.subtitle && (
                    <Text style={[styles.optionSub, { color: colors.text.tertiary }]}>
                      {opt.subtitle}
                    </Text>
                  )}
                </View>
                {active ? (
                  <AntDesign name="check" size={20} color={colors.accent.primary} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </FormBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  fieldBlock: { marginBottom: 0 },
  label: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  selectShell: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefixIcon: { marginRight: 10 },
  selectedRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedText: { fontSize: 15, fontWeight: '600', flex: 1 },
  placeholder: { fontSize: 15, fontWeight: '500', flex: 1 },
  optionList: { gap: 4 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextCol: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 15, fontWeight: '600' },
  optionSub: { fontSize: 12, fontWeight: '500' },
});
