import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function SectionHeader({ title, action, onAction, icon }: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon && (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: `${colors.accent.primary}15`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={icon} size={14} color={colors.accent.primary} />
          </View>
        )}
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: colors.text.secondary,
          }}
        >
          {title}
        </Text>
      </View>
      {action && onAction && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.7}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent.primary }}>
            {action}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.accent.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
