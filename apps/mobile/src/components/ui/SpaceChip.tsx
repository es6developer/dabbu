import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';

interface SpaceChipProps {
  name: string;
  type: string;
  color: string;
  onPress?: () => void;
}

export function SpaceChip({ name, type, color, onPress }: SpaceChipProps) {
  const { colors } = useTheme();

  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${color}15`, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>{name}</Text>
      <Text style={{ fontSize: 11, color: colors.text.tertiary }}>{type}</Text>
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  }

  return content;
}
