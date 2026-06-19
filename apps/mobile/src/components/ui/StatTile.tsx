import React from 'react';
import { View, Text } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface StatTileProps {
  label: string;
  value: string;
  color?: string;
  icon?: keyof typeof AntDesign.glyphMap;
}

export function StatTile({ label, value, color, icon }: StatTileProps) {
  const { colors } = useTheme();
  const accentColor = color || colors.accent.primary;

  return (
    <View style={{ backgroundColor: colors.bg.card, borderRadius: 16, padding: 16, flex: 1 }}>
      {icon ? (
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${accentColor}15`, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <AntDesign name={icon} size={16} color={accentColor} />
        </View>
      ) : null}
      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</Text>
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary, marginTop: 4 }}>{value}</Text>
    </View>
  );
}
