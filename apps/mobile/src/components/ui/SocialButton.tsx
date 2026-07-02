import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { palette } from '../../theme/colors';

interface SocialButtonProps {
  provider: 'google' | 'apple';
  onPress: () => void;
  disabled?: boolean;
}

function createStyles(colors: typeof palette.dark, isDark: boolean) {
  return StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 54,
      borderRadius: 16,
      backgroundColor: colors.bg.secondary,
      borderWidth: 1.5,
      borderColor: colors.border.default,
      gap: 10,
    },
    disabled: {
      opacity: 0.5,
    },
    iconContainer: {
      width: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text.primary,
    },
  });
}

export function SocialButton({ provider, onPress, disabled }: SocialButtonProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const isGoogle = provider === 'google';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled && styles.disabled]}
    >
      <View style={styles.iconContainer}>
        {isGoogle ? (
          <AntDesign name="google" size={18} color="#4285F4" />
        ) : (
          <AntDesign name="apple1" size={20} color={colors.text.primary} />
        )}
      </View>
      <Text style={styles.text}>Continue with {isGoogle ? 'Google' : 'Apple'}</Text>
    </TouchableOpacity>
  );
}
