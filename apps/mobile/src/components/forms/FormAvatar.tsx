import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { getAvatarByIndex } from '../../assets/avatars';

interface FormAvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  onPress?: () => void;
  editable?: boolean;
}

export function FormAvatar({ uri, name, size = 80, onPress, editable }: FormAvatarProps) {
  const { colors } = useTheme();
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const isLocal = !!uri && uri.startsWith('local:');
  const localIndex = isLocal ? parseInt(uri!.replace('local:', ''), 10) : -1;
  const localSvg = isLocal ? getAvatarByIndex(localIndex) : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!editable}
      activeOpacity={editable ? 0.8 : 1}
      style={styles.wrapper}
    >
      <View
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
        ]}
      >
        {localSvg ? (
          <SvgXml xml={localSvg} width={size} height={size} preserveAspectRatio="xMidYMid slice" />
        ) : uri && !isLocal ? (
          <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
          <Text style={[styles.initials, { color: colors.text.secondary, fontSize: size * 0.35 }]}>
            {initials}
          </Text>
        )}
      </View>
      {editable && (
        <View style={[styles.badge, { backgroundColor: colors.accent.primary }]}>
          <AntDesign name="camera" size={14} color="#FFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatar: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
});
