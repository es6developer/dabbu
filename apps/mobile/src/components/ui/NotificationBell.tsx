import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface NotificationBellProps {
  count?: number;
  onPress?: () => void;
}

export function NotificationBell({ count = 0, onPress }: NotificationBellProps) {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View
        className="w-10 h-10 rounded-full items-center justify-center"
        style={{
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.bg.tertiary,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border.subtle,
        }}
      >
        <Ionicons name="notifications-outline" size={20} color={colors.text.secondary} />
        {count > 0 && (
          <View
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full items-center justify-center px-1"
            style={{ backgroundColor: colors.status.error }}
          >
            <Text className="text-white text-[9px] font-bold">{count > 9 ? '9+' : count}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
