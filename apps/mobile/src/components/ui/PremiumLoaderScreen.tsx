import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

interface PremiumLoaderScreenProps {
  progress: number;
  tip?: string;
  title?: string;
  icon?: string;
}

const TIPS = [
  'Analyzing your spending patterns...',
  'Calculating monthly trends...',
  'Checking upcoming bills...',
  'Syncing shared expenses...',
  'Preparing your insights...',
  'Reviewing budget health...',
  'Fetching recent transactions...',
  'Loading your financial data...',
  'Crunching the numbers...',
  'Almost there...',
];

export function PremiumLoaderScreen({
  progress,
  tip,
  title = 'Loading',
  icon = 'switcher',
}: PremiumLoaderScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const displayTip = tip || TIPS[Math.floor(Math.random() * TIPS.length)];
  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: progress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress, animWidth]);

  const barWidth = animWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <View style={[s.content, { paddingTop: insets.top + 80 }]}>
        <View
          style={[s.iconWrap, { backgroundColor: `${colors.brand.primary}12` }]}
        >
          <AntDesign name={icon as any} size={40} color={colors.brand.primary} />
        </View>

        <Text style={[s.title, { color: colors.text.primary }]}>
          {title}
        </Text>

        <Text style={[s.tip, { color: colors.text.tertiary }]}>
          {displayTip}
        </Text>

        <View
          style={[s.barTrack, { backgroundColor: `${colors.brand.primary}12` }]}
        >
          <Animated.View
            style={[
              s.barFill,
              { backgroundColor: colors.brand.primary, width: barWidth },
            ]}
          />
        </View>

        <Text style={[s.pct, { color: colors.text.tertiary }]}>
          {progress}%
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: { alignItems: 'center', paddingHorizontal: 44 },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tip: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  barTrack: {
    width: '100%',
    height: 6,
    borderRadius: 12,
    marginTop: 36,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 12,
  },
  pct: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    fontVariant: ['tabular-nums'],
  },
});
