import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../theme';
import { AntDesign } from '@expo/vector-icons';

interface TimelineItemProps {
  title: string;
  description?: string;
  time?: string;
  icon?: keyof typeof AntDesign.glyphMap;
  color?: string;
  isLast?: boolean;
}

export function TimelineItem({ title, description, time, icon = 'clockcircleo', color, isLast }: TimelineItemProps) {
  const { colors } = useTheme();
  const dotColor = color || colors.accent.primary;
  return (
    <View style={{ flexDirection: 'row', marginBottom: isLast ? 0 : 16 }}>
      <View style={{ alignItems: 'center', width: 28 }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dotColor }} />
        {!isLast && <View style={{ flex: 1, width: 1, backgroundColor: colors.border.subtle }} />}
      </View>
      <View style={{ flex: 1, marginLeft: 10, paddingBottom: isLast ? 0 : 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AntDesign name={icon} size={14} color={dotColor} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>{title}</Text>
        </View>
        {description && <Text style={{ fontSize: 13, color: colors.text.tertiary, marginTop: 4 }}>{description}</Text>}
        {time && <Text style={{ fontSize: 11, color: colors.text.tertiary, marginTop: 2 }}>{time}</Text>}
      </View>
    </View>
  );
}
