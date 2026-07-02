import React, { useRef, useMemo } from 'react';
import { Text, TouchableOpacity, Animated, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme';
import { palette } from '../../theme/colors';

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  testID?: string;
}

function createStyles(colors: typeof palette.dark, isDark: boolean) {
  return StyleSheet.create({
    wrapper: {
      width: '100%',
      marginBottom: 0,
    },
    button: {
      height: 54,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    primary: {
      backgroundColor: colors.brand.primary,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.border.default,
    },
    disabled: {
      opacity: 0.5,
    },
    text: {
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    textPrimary: {
      color: colors.text.inverse,
    },
    textSecondary: {
      color: colors.text.primary,
    },
  });
}

export function AuthButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  testID,
}: AuthButtonProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const isPrimary = variant === 'primary';

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        testID={testID}
        style={[
          styles.button,
          isPrimary ? styles.primary : styles.secondary,
          (disabled || loading) && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={isPrimary ? colors.text.inverse : colors.text.primary} size="small" />
        ) : (
          <Text style={[styles.text, isPrimary ? styles.textPrimary : styles.textSecondary]}>
            {title}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
