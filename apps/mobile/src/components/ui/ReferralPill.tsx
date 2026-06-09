import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface ReferralPillProps {
  onPress?: () => void;
}

export function ReferralPill({ onPress }: ReferralPillProps) {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center rounded-full px-3.5 py-1.5"
      style={{
        backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : colors.brand.light,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(167, 139, 250, 0.20)' : 'rgba(139, 92, 246, 0.15)',
      }}
    >
      <Ionicons name="gift-outline" size={13} color={colors.brand.primary} />
      <Text
        className="ml-1.5 text-[12px] font-semibold tracking-tight"
        style={{ color: colors.brand.primary }}
      >
        Referral Invite
      </Text>
    </TouchableOpacity>
  );
}
