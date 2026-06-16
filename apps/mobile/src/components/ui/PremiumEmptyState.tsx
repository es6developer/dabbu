import React from 'react';
import { View, Text } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { PremiumCard } from './PremiumCard';

interface PremiumEmptyStateProps {
  icon: string;
  title: string;
  message: string;
  action?: React.ReactNode;
}

export function PremiumEmptyState({ icon, title, message, action }: PremiumEmptyStateProps) {
  const { colors } = useTheme();

  return (
    <PremiumCard
      variant="default"
      style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: `${colors.accent.primary}10`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <AntDesign name={icon as any} size={28} color={`${colors.accent.primary}50`} />
      </View>
      <Text
        style={{
          fontSize: 17,
          fontWeight: '700',
          color: colors.text.primary,
          marginBottom: 6,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '400',
          color: colors.text.tertiary,
          textAlign: 'center',
          lineHeight: 20,
          marginBottom: action ? 20 : 0,
        }}
      >
        {message}
      </Text>
      {action}
    </PremiumCard>
  );
}
