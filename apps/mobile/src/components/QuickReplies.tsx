import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
}

export function QuickReplies({ options, onSelect, disabled }: Props) {
  if (options.length === 0) return null;

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        {options.map((opt, i) => (
          <TouchableOpacity
            key={i}
            style={[s.chip, disabled && s.chipDisabled]}
            activeOpacity={0.7}
            onPress={() => !disabled && onSelect(opt)}
          >
            <Text style={[s.text, disabled && s.textDisabled]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingVertical: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24,
    backgroundColor: 'rgba(255,215,0,0.12)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
  },
  chipDisabled: { opacity: 0.4 },
  text: { fontSize: 14, fontWeight: '600', color: '#FFD700' },
  textDisabled: { color: '#666' },
});
