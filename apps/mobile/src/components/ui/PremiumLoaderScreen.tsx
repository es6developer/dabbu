import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

interface PremiumLoaderScreenProps {
  progress: number;
  tip?: string;
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
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
  icon = 'layers-outline',
}: PremiumLoaderScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const displayTip = tip || TIPS[Math.floor(Math.random() * TIPS.length)];

  return (
    <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
      <View style={[s.content, { paddingTop: insets.top + 80 }]}>
        <View
          style={[s.iconWrap, { backgroundColor: `${colors.brand.primary}12` }]}
        >
          <Ionicons name={icon} size={40} color={colors.brand.primary} />
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
          <View
            style={[
              s.barFill,
              { backgroundColor: colors.brand.primary, width: `${progress}%` },
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
  content: { alignItems: 'center', paddingHorizontal: 40 },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tip: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  barTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    marginTop: 36,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  pct: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    fontVariant: ['tabular-nums'],
  },
});
