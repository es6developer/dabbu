import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
  icon?: string;
}

export function SectionHeader({ title, action, onAction, icon }: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon && (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 30,
              backgroundColor: `${colors.accent.primary}15`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AntDesign name={icon as any} size={14} color={colors.accent.primary} />
          </View>
        )}
        <Text
          style={{
            fontSize: 16,
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
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.accent.primary }}>
            {action}
          </Text>
          <AntDesign  name="right" size={14} color={colors.accent.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
