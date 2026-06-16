import { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

type ToastType = 'error' | 'success' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  onDismiss?: () => void;
}

const iconMap: Record<ToastType, string> = {
  error: 'alert-circle',
  success: 'checkmark-circle',
  info: 'information-circle',
};

const bgMap: Record<ToastType, string> = {
  error: '#1F1415',
  success: '#141F17',
  info: '#1F1610',
};

const borderMap: Record<ToastType, string> = {
  error: 'rgba(255, 69, 69, 0.2)',
  success: 'rgba(52, 199, 89, 0.2)',
  info: 'rgba(20, 184, 166, 0.2)',
};

const colorMap: Record<ToastType, string> = {
  error: '#FF4545',
  success: '#34C759',
  info: '#14B8A6',
};

export function Toast({ visible, message, type = 'error', onDismiss }: ToastProps) {
  useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(-100);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onDismiss?.();
        });
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      translateY.setValue(-100);
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  const iconName = iconMap[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bgMap[type],
          borderColor: borderMap[type],
          top: insets.top + 8,
          transform: [{ translateY }],
        },
      ]}
    >
      <AntDesign name={iconName as any} size={18} color={colorMap[type]} style={styles.icon} />
      <Text style={[styles.text, { color: colorMap[type] }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 9999,
    elevation: 10,
  },
  icon: {
    marginRight: 10,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
