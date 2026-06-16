import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface QuickActionBarProps {
  actions: Array<{
    icon: string;
    label: string;
    onPress: () => void;
  }>;
}

export function QuickActionBar({ actions }: QuickActionBarProps) {
  const { colors, isDark } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
    >
      {actions.map((action, i) => (
        <TouchableOpacity key={i} onPress={action.onPress} activeOpacity={0.7}>
          <View
            className="flex-row items-center rounded-full px-4 py-2.5"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.bg.secondary,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border.default,
            }}
          >
            <AntDesign name={action.icon} size={16} color={colors.brand.primary} />
            <Text className="ml-2 text-[13px] font-semibold" style={{ color: colors.text.primary }}>
              {action.label}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
