import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
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
        backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : colors.brand.light,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(0, 122, 255, 0.20)' : 'rgba(0, 122, 255, 0.15)',
      }}
    >
      <AntDesign  name="gift" size={13} color={colors.brand.primary} />
      <Text
        className="ml-1.5 text-[12px] font-semibold tracking-tight"
        style={{ color: colors.brand.primary }}
      >
        Referral Invite
      </Text>
    </TouchableOpacity>
  );
}
