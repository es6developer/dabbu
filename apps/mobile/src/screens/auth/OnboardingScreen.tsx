import React, { useRef, useState, useEffect, useCallback } from 'react';
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
import { useAnalytics } from '../../hooks/useAnalytics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: 'receipt-outline',
    title: 'Expense Tracking',
    desc: 'Track every expense in seconds. Scan bills, split with friends, and know exactly where your money goes.',
  },
  {
    icon: 'people-outline',
    title: 'Shared Finance',
    desc: 'Create shared spaces for trips, family, or roommates. Split expenses, track balances, and settle up seamlessly.',
  },
  {
    icon: 'trophy-outline',
    title: 'Goals',
    desc: 'Set financial goals that matter. Save for a vacation, emergency fund, or your dream home — with progress tracking that keeps you motivated.',
  },
  {
    icon: 'alarm-outline',
    title: 'Smart Reminders',
    desc: 'Never miss a bill or payment. Set smart reminders for recurring expenses, subscriptions, and due dates.',
  },
  {
    icon: 'swap-horizontal-outline',
    title: 'Settlements',
    desc: 'Settle debts with a tap. UPI integration makes paying back friends and family instant and hassle-free.',
  },
];

function SlideContent({
  item,
  index: slideIndex,
  isActive,
  colors,
  typography,
}: {
  item: (typeof slides)[0];
  index: number;
  isActive: boolean;
  colors: any;
  typography: any;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (isActive) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive, fadeAnim, slideAnim]);

  const isBrand = slideIndex === 0;

  return (
    <View style={styles.slide}>
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          alignItems: 'center',
        }}
      >
        {isBrand && (
          <Text style={[{ color: colors.accent.primary, ...typography.hero }, styles.brandName]}>
            Dabbu
          </Text>
        )}
        {isBrand && (
          <Text style={[{ color: colors.text.tertiary, ...typography.body }, styles.tagline]}>
            Your financial life, simplified
          </Text>
        )}
        <View
          
          
          
          style={styles.iconWrap}
        >
          <Ionicons name={item.icon as any} size={40} color="#FFFFFF" />
        </View>
        <Text style={[{ color: colors.text.primary, ...typography.sectionHeader }, styles.title]}>
          {item.title}
        </Text>
        <Text style={[{ color: colors.text.secondary, ...typography.body }, styles.desc]}>
          {item.desc}
        </Text>
      </Animated.View>
    </View>
  );
}

export function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const { colors, typography, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const { trackFeature } = useAnalytics();

  async function markSeen() {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
  }

  const handleNext = useCallback(async () => {
    if (index < slides.length - 1) {
      flatRef.current?.scrollToOffset({ offset: width * (index + 1), animated: true });
    } else {
      trackFeature('Onboarding', 'complete');
      await markSeen();
      navigation.replace('Login');
    }
  }, [index, trackFeature, navigation]);

  const handleSkip = useCallback(async () => {
    trackFeature('Onboarding', 'skip');
    await markSeen();
    navigation.replace('Login');
  }, [trackFeature, navigation]);

  const isLast = index === slides.length - 1;

  const renderSlide = useCallback(
    ({ item, index: i }: { item: (typeof slides)[0]; index: number }) => (
      <SlideContent
        item={item}
        index={i}
        isActive={i === index}
        colors={colors}
        typography={typography}
      />
    ),
    [index, colors, typography],
  );

  return (
    <View style={styles.root}>
      <View
        
        
        
        style={[styles.gradient, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity style={styles.skip} onPress={handleSkip}>
          <Text style={[{ color: colors.text.tertiary }, typography.subhead]}>Skip</Text>
        </TouchableOpacity>

        <FlatList
          ref={flatRef}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
          }
          renderItem={renderSlide}
          keyExtractor={(_, i) => String(i)}
          windowSize={3}
          maxToRenderPerBatch={3}
          initialNumToRender={3}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        />

        <View style={[styles.footer, { backgroundColor: colors.bg.primary }]}>
          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: colors.text.tertiary },
                  i === index && { width: 28, backgroundColor: colors.accent.primary },
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent.primary }]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonText, typography.button]}>
              {isLast ? 'Get Started' : 'Next'}
            </Text>
            {!isLast && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
          </TouchableOpacity>

          {!isLast && (
            <TouchableOpacity style={styles.getStarted} onPress={handleSkip}>
              <Text style={[{ color: colors.text.tertiary }, typography.subhead]}>
                Get started
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
  slide: { width, alignItems: 'center', paddingHorizontal: 32, paddingTop: 40 },
  brandName: { marginBottom: 4, fontSize: 36 },
  tagline: { marginBottom: 32 },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 22, textAlign: 'center', marginBottom: 10 },
  desc: { textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 28 },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  button: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: { color: '#FFFFFF' },
  getStarted: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
});
