import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { Skeleton } from './AnimatedSkeleton';

const { width } = Dimensions.get('window');

const MONEY_QUOTES = [
  '"Do not save what is left after spending, but spend what is left after saving." — Warren Buffett',
  '"An investment in knowledge pays the best interest." — Benjamin Franklin',
  '"The habit of saving is itself an education; it fosters every virtue." — T. H. Huxley',
  '"Beware of little expenses; a small leak will sink a great ship." — Benjamin Franklin',
  '"Financial freedom is available to those who learn about it and work for it." — Robert Kiyosaki',
  '"A budget is telling your money where to go instead of wondering where it went." — John C. Maxwell',
  '"The stock market is filled with individuals who know the price of everything, but the value of nothing." — Philip Fisher',
  '"Every day is a good day to save money. Every day is a good day to plan for your future." — Suze Orman',
  '"Rich people have small TVs and big libraries; poor people have small libraries and big TVs." — Warren Buffett',
  '"Buy not what you want, but what you need." — Cato the Elder',
  '"The best time to plant a tree was 20 years ago. The second best time is now." — Chinese Proverb',
  '"Financial peace is not the acquisition of stuff. It is learning to live on less than you make." — Dave Ramsey',
  '"Compound interest is the eighth wonder of the world. He who understands it, earns it." — Albert Einstein',
  '"It is not how much you make, but how much you keep that matters." — Robert Kiyosaki',
  '"The secret to getting ahead is getting started." — Mark Twain',
];

interface LoadingScreenProps {
  skeleton?: React.ReactNode;
  quoteInterval?: number;
}

export function LoadingScreen({ skeleton, quoteInterval = 4000 }: LoadingScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [quoteIndex, setQuoteIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setQuoteIndex((prev) => (prev + 1) % MONEY_QUOTES.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, quoteInterval);
    return () => clearInterval(timer);
  }, [fadeAnim, quoteInterval]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.quoteContainer, { paddingTop: insets.top + 80 }]}>
        <Animated.Text style={[styles.quote, { color: colors.text.secondary, opacity: fadeAnim }]}>
          {MONEY_QUOTES[quoteIndex]}
        </Animated.Text>
      </View>
      <View style={styles.skeletonContainer}>{skeleton}</View>
    </View>
  );
}

export function DashboardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.skelWrap, { paddingHorizontal: 20 }]}>
      <Skeleton width={90} height={12} borderRadius={6} />
      <Skeleton width={170} height={26} style={{ marginTop: 4 }} borderRadius={6} />
      <Skeleton width="100%" height={180} style={{ marginTop: 16 }} borderRadius={20} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={100} borderRadius={16} />
        </View>
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={100} borderRadius={16} />
        </View>
      </View>
      <Skeleton width="100%" height={120} style={{ marginTop: 12 }} borderRadius={16} />
      <Skeleton width="100%" height={120} style={{ marginTop: 12 }} borderRadius={16} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} width={(width - 56) / 3} height={44} borderRadius={22} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  quoteContainer: {
    paddingHorizontal: 28,
    paddingBottom: 32,
    minHeight: 100,
    justifyContent: 'center',
  },
  quote: {
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
    textAlign: 'center',
  },
  skeletonContainer: {
    flex: 1,
  },
  skelWrap: {
    gap: 4,
  },
});
