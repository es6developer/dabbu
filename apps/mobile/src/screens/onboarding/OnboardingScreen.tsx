import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

function getSlides(primary: string): Array<{
  icon: string;
  gradient: [string, string];
  title: string;
  desc: string;
}> {
  return [
    {
      icon: 'wallet-outline',
      gradient: [primary, primary] as [string, string],
      title: 'Manage Money Together',
      desc: 'Track expenses, split bills and manage family finances in one place.',
    },
    {
      icon: 'stats-chart-outline',
      gradient: ['#F3D28F', '#FFB347'] as [string, string],
      title: 'Track Every Rupee',
      desc: 'Monitor groceries, rent, travel, subscriptions and more in real-time.',
    },
    {
      icon: 'people-outline',
      gradient: ['#34C759', '#5EE99D'] as [string, string],
      title: 'Create Circles',
      desc: 'Create private circles with your spouse, family or friends and split expenses instantly.',
    },
  ];
}

function SlideContent({
  item,
  index: slideIndex,
  isActive,
}: {
  item: { icon: string; gradient: [string, string]; title: string; desc: string };
  index: number;
  isActive: boolean;
}) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (isActive) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [isActive, fadeAnim, slideAnim]);

  return (
    <View style={styles.slide}>
      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}
      >
        {slideIndex === 0 && (
          <>
            <View style={[styles.logoWrap, { shadowColor: colors.accent.primary }]}>
              <Text style={styles.logoText}>D</Text>
            </View>
            <Text style={[styles.brandName, { color: colors.accent.primary }]}>Dabbu</Text>
          </>
        )}
        <View style={styles.illustrationWrap}>
          <Ionicons name={item.icon as any} size={56} color="#FFF" />
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.desc}>{item.desc}</Text>
      </Animated.View>
    </View>
  );
}

export function OnboardingScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const slides = useMemo(() => getSlides(colors.accent.primary), [colors.accent.primary]);

  useEffect(() => {
    const refCode = route?.params?.referralCode;
    if (refCode) {
      AsyncStorage.setItem('referralCode', refCode);
    }
  }, [route?.params?.referralCode]);

  async function markSeen() {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
  }

  const handleNext = useCallback(async () => {
    if (index < slides.length - 1) {
      flatRef.current?.scrollToOffset({ offset: width * (index + 1), animated: true });
    } else {
      await markSeen();
      navigation.replace('Login');
    }
  }, [index, navigation]);

  const handleSkip = useCallback(async () => {
    await markSeen();
    navigation.replace('Login');
  }, [navigation]);

  const isLast = index === slides.length - 1;

  const renderSlide = useCallback(
    ({
      item,
      index: i,
    }: {
      item: { icon: string; gradient: [string, string]; title: string; desc: string };
      index: number;
    }) => <SlideContent item={item} index={i} isActive={i === index} />,
    [index],
  );

  return (
    <View style={styles.root}>
      <View style={[styles.gradient, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.skip} onPress={handleSkip}>
          <Text style={[styles.skipText, { color: colors.accent.primary }]}>Skip</Text>
        </TouchableOpacity>

        <FlatList
          ref={flatRef}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={renderSlide}
          keyExtractor={(_, i) => String(i)}
          windowSize={3}
          maxToRenderPerBatch={3}
          initialNumToRender={3}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        />

        <View style={[styles.footer, { backgroundColor: isDark ? '#0D0D1A' : '#FFFFFF' }]}>
          <View style={styles.dots}>
            {slides.map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' },
                  i === index && { width: 28, backgroundColor: colors.accent.primary },
                ]}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.85}>
            <View style={styles.buttonGrad}>
              <Text style={[styles.buttonText, { color: colors.text.primary }]}>
                {isLast ? 'Get Started' : 'Next'}
              </Text>
              {!isLast && <Ionicons name="arrow-forward" size={18} color={colors.text.primary} />}
            </View>
          </TouchableOpacity>

          {!isLast && (
            <TouchableOpacity style={styles.getStarted} onPress={handleSkip}>
              <Text style={[styles.getStartedText, { color: colors.accent.primary }]}>
                Get Started
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gradient: { flex: 1 },
  skip: { alignSelf: 'flex-end', paddingHorizontal: 24, paddingVertical: 8, opacity: 0.7 },
  skipText: { fontSize: 14, fontWeight: '600' },
  slide: { width, alignItems: 'center', paddingHorizontal: 32, paddingTop: 20 },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: { color: '#FFF', fontSize: 28, fontWeight: '800' },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  illustrationWrap: {
    width: 200,
    height: 200,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
    color: '#1A1A2E',
  },
  desc: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    fontWeight: '400',
    color: '#666680',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 28 },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  button: { borderRadius: 16, overflow: 'hidden' },
  buttonGrad: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  getStarted: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  getStartedText: { fontSize: 14, fontWeight: '600' },
});
