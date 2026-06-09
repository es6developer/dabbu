import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface ProfileBubbleProps {
  uri?: string;
  name?: string;
  size?: number;
  onPress?: () => void;
}

export function ProfileBubble({ uri, name, size = 40, onPress }: ProfileBubbleProps) {
  const { colors } = useTheme();
  const initial = name?.charAt(0).toUpperCase() || 'U';

  const bubble = (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        backgroundColor: uri ? 'transparent' : colors.brand.light,
        borderWidth: 2,
        borderColor: colors.border.default,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ color: colors.brand.primary, fontSize: size * 0.4, fontWeight: '700' }}>
          {initial}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{bubble}</TouchableOpacity>;
  }
  return bubble;
}
