import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { borderRadius, shadows } from '../../theme/design';

interface FinButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function FinButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = true,
}: FinButtonProps) {
  const { colors } = useTheme();

  const heightMap = { sm: 44, md: 52, lg: 60 };
  const height = heightMap[size];
  const iconSizeMap = { sm: 16, md: 18, lg: 20 };
  const iconSize = iconSizeMap[size];
  const fontMap = { sm: 14, md: 16, lg: 18 };
  const fontSize = fontMap[size];

  const bgColor =
    variant === 'primary'
      ? colors.accent.primary
      : variant === 'secondary'
        ? colors.bg.tertiary
        : variant === 'danger'
          ? colors.status.error
          : 'transparent';

  const txtColor = variant === 'ghost' ? colors.accent.primary : '#FFFFFF';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        {
          height,
          borderRadius: borderRadius.md,
          backgroundColor: bgColor,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: size === 'sm' ? 20 : 28,
          gap: 10,
          opacity: disabled ? 0.4 : 1,
        },
        variant === 'primary' && size === 'lg' && shadows.md,
        fullWidth && ({ width: '100%' } as any),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={txtColor} />
      ) : (
        <>
          {icon && <AntDesign name={icon as any} size={iconSize} color={txtColor} />}
          <Text
            style={[
              {
                color: txtColor,
                fontSize,
                fontWeight: '700',
                letterSpacing: 0.3,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
