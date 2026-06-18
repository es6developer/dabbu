import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { FormBottomSheet } from './FormBottomSheet';

type IconName = string;

interface CategoryItem {
  name: string;
  icon: IconName;
  color: string;
}

interface FormCategoryPickerProps {
  label?: string;
  selected: string;
  categories: CategoryItem[];
  onChange: (name: string) => void;
  required?: boolean;
  columns?: number;
}

export function FormCategoryPicker({
  label = 'Category',
  selected,
  categories,
  onChange,
  required,
  columns = 4,
}: FormCategoryPickerProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const activeCat = categories.find((c) => c.name === selected);

  const handleSelect = useCallback((name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onChange(name);
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
          style={[styles.selectShell, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}
        >
          {activeCat ? (
            <View style={styles.selectedRow}>
              <View style={[styles.categoryDot, { backgroundColor: activeCat.color }]}>
                <AntDesign name={activeCat.icon as any} size={14} color="#FFF" />
              </View>
              <Text style={[styles.selectedText, { color: colors.text.primary }]}>{activeCat.name}</Text>
            </View>
          ) : (
            <Text style={[styles.placeholder, { color: colors.text.tertiary }]}>Select a category</Text>
          )}
          <AntDesign name="down" size={14} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>

      <FormBottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={styles.grid}>
          {categories.map((cat) => {
            const active = cat.name === selected;
            return (
              <TouchableOpacity
                key={cat.name}
                onPress={() => handleSelect(cat.name)}
                activeOpacity={0.7}
                style={[styles.gridItem, { width: `${100 / columns}%` }]}
              >
                <View
                  style={[
                    styles.gridIcon,
                    {
                      backgroundColor: active ? cat.color : `${cat.color}15`,
                      borderColor: active ? cat.color : 'transparent',
                    },
                  ]}
                >
                  <AntDesign name={cat.icon as any} size={22} color={active ? '#FFF' : cat.color} />
                </View>
                <Text
                  style={[
                    styles.gridLabel,
                    { color: active ? colors.text.primary : colors.text.secondary },
                    active && { fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
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
  selectedRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedText: { fontSize: 15, fontWeight: '600', flex: 1 },
  placeholder: { fontSize: 15, fontWeight: '500', flex: 1 },
  categoryDot: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { alignItems: 'center', paddingVertical: 12, gap: 6 },
  gridIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  gridLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
