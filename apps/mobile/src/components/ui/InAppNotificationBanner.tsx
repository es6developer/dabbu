import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { borderRadius, shadows } from '../../theme/design';

interface InAppNotificationBannerProps {
  title: string;
  body: string;
  type?: string;
  onPress?: () => void;
  onDismiss?: () => void;
}

const TYPE_ICONS: Record<string, string> = {
  expense: 'arrowdown',
  shared_finance: 'team',
  group_expense: 'team',
  goal: 'flag',
  settlement: 'swap',
  emi: 'creditcard',
  subscription: 'calendar',
  reminder: 'bells',
  monthly_report: 'filetext1',
  weekly_digest: 'filetext1',
  daily_digest: 'filetext1',
  couple_request: 'hearto',
  system: 'infocirlceo',
};

const TYPE_COLORS: Record<string, string> = {
  expense: '#EF4444',
  goal: '#22C55E',
  settlement: '#3B82F6',
  emi: '#F59E0B',
  subscription: '#8B5CF6',
  reminder: '#7C3AED',
};

export function InAppNotificationBanner({ title, body, type = 'system', onPress, onDismiss }: InAppNotificationBannerProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 18,
        stiffness: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    timerRef.current = setTimeout(() => {
      dismissBanner();
    }, 4000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const dismissBanner = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  const icon = TYPE_ICONS[type] || 'infocirlceo';
  const accent = TYPE_COLORS[type] || colors.accent.primary;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          borderColor: colors.border.subtle,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          ...shadows.lg,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
          dismissBanner();
          onPress?.();
        }}
        style={styles.touchable}
      >
        <View style={[styles.iconCircle, { backgroundColor: accent + '15' }]}>
          <AntDesign name={icon as any} size={18} color={accent} />
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: colors.text.primary }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.body, { color: colors.text.secondary }]} numberOfLines={2}>{body}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            dismissBanner();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <AntDesign name="close" size={16} color={colors.text.tertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
});
