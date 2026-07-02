import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, runOnJS, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import type { InAppNotification } from '../../hooks/useNotifications';

const { width: W } = Dimensions.get('window');
const BANNER_HEIGHT = 72;

const TYPE_ICONS: Record<string, keyof typeof AntDesign.glyphMap> = {
  expense: 'creditcard',
  shared_finance: 'team',
  group_expense: 'addusergroup',
  goal: 'flag',
  emi: 'filetext1',
  subscription: 'retweet',
  settlement: 'swap',
  system: 'bells',
  reminder: 'clockcircleo',
  monthly_report: 'barschart',
  weekly_digest: 'bulb1',
  daily_digest: 'bulb1',
};

const TYPE_COLORS: Record<string, string> = {
  expense: '#EF4444',
  shared_finance: '#3B82F6',
  group_expense: '#F59E0B',
  goal: '#10B981',
  emi: '#F43F5E',
  subscription: '#8B5CF6',
  settlement: '#22C55E',
  system: '#6B7280',
  reminder: '#F97316',
  monthly_report: '#14B8A6',
  weekly_digest: '#7C3AED',
  daily_digest: '#7C3AED',
};

export function InAppNotificationBanner({
  notification,
  onDismiss,
}: {
  notification: InAppNotification;
  onDismiss: () => void;
}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  const type = notification.type || 'system';
  const iconName = TYPE_ICONS[type] || 'bells';
  const accentColor = TYPE_COLORS[type] || colors.accent.primary;

  useEffect(() => {
    translateY.value = withSequence(
      withTiming(0, { duration: 400, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
      withDelay(3500, withTiming(-120, { duration: 300, easing: Easing.bezier(0.4, 0, 0.2, 1) }, (finished) => {
        if (finished) runOnJS(onDismiss)();
      })),
    );
    opacity.value = withTiming(1, { duration: 300 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[s.root, { paddingTop: insets.top + 6 }, animStyle]}>
      <TouchableOpacity
        style={[s.banner, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
        activeOpacity={0.85}
        onPress={onDismiss}
      >
        <View style={[s.iconWrap, { backgroundColor: accentColor + '18' }]}>
          <AntDesign name={iconName} size={18} color={accentColor} />
        </View>
        <View style={s.content}>
          <Text style={[s.title, { color: colors.text.primary }]} numberOfLines={1}>
            {notification.title || 'Dabbu'}
          </Text>
          <Text style={[s.body, { color: colors.text.secondary }]} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    gap: 14,
    minHeight: BANNER_HEIGHT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 18,
  },
});
