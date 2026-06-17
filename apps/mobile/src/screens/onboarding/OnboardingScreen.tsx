import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
  Image,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, borderRadius, shadows } from '../../theme/design';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const IMG_H = height * 0.52;

const localImages = {
  track: require('../../../assets/onboarding/expense-tracking.png'),
  couple: require('../../../assets/onboarding/couple-space.png'),
  split: require('../../../assets/onboarding/payment-split.png'),
};

const slides = [
  {
    id: 'track',
    image: localImages.track,
    title: 'Track Every Rupee',
    tagline: 'I can track my money',
    subtitle: 'Know where your money goes with clear insights, budgets, and spending trends.',
  },
  {
    id: 'couple',
    image: localImages.couple,
    title: 'Build Wealth Together',
    tagline: 'I can manage finances with my partner',
    subtitle: 'Share goals, track expenses, and manage your finances as a couple.',
  },
  {
    id: 'split',
    image: localImages.split,
    title: 'Split Payments Easily',
    tagline: 'I can split and settle expenses easily',
    subtitle: 'Share bills, rent, trips, and group expenses without confusion.',
  },
];

function SlideContent({
  item,
  isActive,
  colors,
}: {
  item: (typeof slides)[0];
  isActive: boolean;
  colors: any;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const imgScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (isActive) {
      fadeAnim.setValue(0);
      slideAnim.setValue(24);
      imgScale.setValue(0.92);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.spring(imgScale, { toValue: 1, friction: 6, useNativeDriver: true }),
      ]).start();
    }
  }, [isActive]);

  return (
    <View style={{ width }}>
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        {/* Image */}
        <View style={s.imgSection}>
          <View style={s.imgGlow} />
          <Animated.Image
            source={item.image}
            style={[s.img, { transform: [{ scale: imgScale }] }]}
            resizeMode="contain"
          />
        </View>

        {/* Text card */}
        <View style={s.textCard}>
          <Text style={[s.tagline, { color: colors.accent.primary }]}>
            {item.tagline}
          </Text>
          <Text style={[s.title, { color: colors.text.primary }]}>
            {item.title}
          </Text>
          <Text style={[s.subtitle, { color: colors.text.secondary }]}>
            {item.subtitle}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

export function OnboardingScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const refCode = route?.params?.referralCode;
    if (refCode) {
      AsyncStorage.setItem('referralCode', refCode);
    }
  }, [route?.params?.referralCode]);

  async function markSeen() {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
  }

  const isLast = index === slides.length - 1;

  useEffect(() => {
    if (isLast) {
      const t = setTimeout(async () => {
        await markSeen();
        navigation.replace('Login');
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [isLast, navigation]);

  const renderSlide = useCallback(
    ({ item, index: i }: { item: (typeof slides)[0]; index: number }) => (
      <SlideContent item={item} isActive={i === index} colors={colors} />
    ),
    [index, colors],
  );

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      {/* Skip */}
      {!isLast && (
        <Text
          onPress={async () => {
            await markSeen();
            navigation.replace('Login');
          }}
          style={[s.skip, { color: colors.text.tertiary, top: insets.top + 12 }]}
        >
          Skip
        </Text>
      )}

      <FlatList
        ref={flatRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(idx);
          Animated.spring(dotAnim, { toValue: idx, useNativeDriver: true, friction: 8 }).start();
        }}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        windowSize={3}
        maxToRenderPerBatch={3}
        initialNumToRender={3}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        style={{ flex: 1 }}
      />

      {/* Bottom */}
      <View style={[s.bottom, { paddingBottom: insets.bottom + 28, backgroundColor: colors.bg.primary }]}>
        <View style={s.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                {
                  backgroundColor: i === index ? colors.accent.primary : colors.border.subtle,
                  width: i === index ? 28 : 8,
                },
              ]}
            />
          ))}
        </View>

        {isLast && (
          <Text
            onPress={async () => {
              await markSeen();
              navigation.replace('Login');
            }}
            style={[s.getStarted, { color: '#FFFFFF', backgroundColor: colors.accent.primary }]}
          >
            Get Started
          </Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  skip: {
    position: 'absolute',
    right: spacing.xl,
    zIndex: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  imgSection: {
    height: IMG_H,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: 20,
  },
  imgGlow: {
    position: 'absolute',
    width: IMG_H * 0.72,
    height: IMG_H * 0.72,
    borderRadius: IMG_H * 0.36,
    backgroundColor: 'rgba(139, 92, 246, 0.07)',
  },
  img: {
    width: IMG_H * 0.78,
    height: IMG_H * 0.78,
  },
  textCard: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingTop: 12,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 38,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 12,
  },
  bottom: {
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  getStarted: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
    letterSpacing: 0.3,
  },
});
