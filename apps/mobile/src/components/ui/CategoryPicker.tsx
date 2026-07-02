import React from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../config/categoryIcons';

const { width: SCREEN_W } = Dimensions.get('window');

interface CategoryConfig {
  name: string;
  icon: string;
  color: string;
}

interface CategoryPickerProps {
  value: string;
  onChange: (name: string) => void;
  type?: 'expense' | 'income' | 'wallet' | 'arrowdown';
  showLabel?: boolean;
}

export function CategoryPicker({ value, onChange, type = 'expense', showLabel = true }: CategoryPickerProps) {
  const { colors } = useTheme();
  const isExpense = type === 'expense' || type === 'wallet';
  const cats = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <View>
      {showLabel && (
        <Text style={[styles.label, { color: colors.text.secondary }]}>Category</Text>
      )}
      <View style={styles.grid}>
        {cats.map((cat: CategoryConfig) => {
          const selected = value === cat.name;
          return (
            <TouchableOpacity
              key={cat.name}
              activeOpacity={0.7}
              style={[
                styles.card,
                {
                  width: (SCREEN_W - 72) / 3,
                  borderColor: selected ? cat.color : colors.border.subtle,
                  backgroundColor: selected ? `${cat.color}12` : colors.bg.card,
                },
              ]}
              onPress={() => onChange(selected ? '' : cat.name)}
            >
              <View style={[styles.iconWrap, { backgroundColor: selected ? cat.color : `${cat.color}10` }]}>
                <AntDesign name={cat.icon as any} size={20} color={selected ? '#FFF' : cat.color} />
              </View>
              <Text style={[styles.name, { color: selected ? colors.text.primary : colors.text.secondary }]} numberOfLines={1}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    alignItems: 'center',
    gap: 6,
    borderRadius: 28,
    borderWidth: 1.5,
    paddingVertical: 18,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
