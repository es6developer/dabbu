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
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { PADDING, borderRadius, shadows } from '../../theme/design';
import { onboardingIllustrations } from '../../components/OnboardingIllustrations';

const { width } = Dimensions.get('window');

const USER_TYPES = [
  { id: 'single', label: 'Single', icon: 'user', desc: 'Manage your personal finances' },
  { id: 'married', label: 'Married', icon: 'team', desc: 'Track finances as a couple' },
  { id: 'family', label: 'Family', icon: 'home', desc: 'Manage family finances together' },
  { id: 'friends', label: 'Friends', icon: 'addusergroup', desc: 'Split & share with friends' },
];

const SLIDES_BY_TYPE: Record<string, any[]> = {
  single: [
    { Illustration: onboardingIllustrations[0], title: 'Track Your Wealth', desc: 'Monitor net worth, savings, and investments — all in one dashboard.' },
    { Illustration: onboardingIllustrations[1], title: 'Smart Goal Planning', desc: 'Set savings goals, track progress, and let AI suggest the best way to reach each milestone faster.' },
    { Illustration: onboardingIllustrations[3], title: 'Your Financial Health', desc: 'Monitor your health score, get AI-powered insights, and earn achievements as you build better habits.' },
  ],
  married: [
    { Illustration: onboardingIllustrations[0], title: 'Build Wealth Together', desc: 'Track combined net worth, set shared goals, and grow your money as a couple.' },
    { Illustration: onboardingIllustrations[2], title: 'Shared Money. Shared Dreams.', desc: 'Create couple spaces, split expenses, track shared budgets, and align on financial priorities.' },
    { Illustration: onboardingIllustrations[3], title: 'Financial Compatibility', desc: 'Get your couple health score, compare spending habits, and plan your future together.' },
  ],
  family: [
    { Illustration: onboardingIllustrations[0], title: 'Family Wealth Hub', desc: 'Track net worth, budgets, and goals for the whole family in one place.' },
    { Illustration: onboardingIllustrations[2], title: 'Shared Family Finance', desc: 'Create family spaces, assign allowances, track kid expenses, and save together.' },
    { Illustration: onboardingIllustrations[3], title: 'Family Financial Health', desc: 'Monitor your family health score, get AI insights, and plan for major milestones.' },
  ],
  friends: [
    { Illustration: onboardingIllustrations[2], title: 'Split & Share Easily', desc: 'Create trip groups, split expenses, track shared budgets, and settle up seamlessly.' },
    { Illustration: onboardingIllustrations[1], title: 'Group Goals', desc: 'Set shared savings goals for trips, events, or group purchases with progress tracking.' },
    { Illustration: onboardingIllustrations[3], title: 'Fair & Transparent', desc: 'See who owes what, get spending insights, and keep everyone on the same page.' },
  ],
};

function SlideContent({
  item,
  isActive,
  colors,
}: {
  item: { Illustration: React.FC<{ size: number }>; title: string; desc: string };
  isActive: boolean;
  colors: any;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const { Illustration } = item;

  useEffect(() => {
    if (isActive) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [isActive]);

  return (
    <View style={{ width, alignItems: 'center', paddingHorizontal: PADDING }}>
      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}
      >
        <View style={{ marginBottom: 40 }}>
          <Illustration size={200} />
        </View>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '800',
            color: colors.text.primary,
            textAlign: 'center',
            letterSpacing: -0.5,
            lineHeight: 36,
            marginBottom: 12,
          }}
        >
          {item.title}
        </Text>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '500',
            color: colors.text.tertiary,
            textAlign: 'center',
            lineHeight: 24,
            paddingHorizontal: 16,
          }}
        >
          {item.desc}
        </Text>
      </Animated.View>
    </View>
  );
}

export function OnboardingScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'type' | 'slides'>('type');
  const [userType, setUserType] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const dotAnim = useRef(new Animated.Value(0)).current;
  const slides = userType ? SLIDES_BY_TYPE[userType] || SLIDES_BY_TYPE.single : [];

  useEffect(() => {
    const refCode = route?.params?.referralCode;
    if (refCode) {
      AsyncStorage.setItem('referralCode', refCode);
    }
  }, [route?.params?.referralCode]);

  async function markSeen() {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    if (userType) {
      await AsyncStorage.setItem('userType', userType);
    }
  }

  const handleNext = useCallback(async () => {
    if (index < slides.length - 1) {
      flatRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      await markSeen();
      navigation.replace('Login');
    }
  }, [index, slides.length, navigation, userType]);

  const handleSkip = useCallback(async () => {
    await markSeen();
    navigation.replace('Login');
  }, [navigation, userType]);

  const isLast = step === 'slides' && index === slides.length - 1;
  const isFirst = step === 'slides' && index === 0;

  const renderSlide = useCallback(
    ({ item, index: i }: { item: { Illustration: React.FC<{ size: number }>; title: string; desc: string }; index: number }) => (
      <SlideContent item={item} isActive={i === index} colors={colors} />
    ),
    [index, colors],
  );

  if (step === 'type') {
    return (
      <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
        <View style={{ paddingTop: insets.top + 12 }}>
          <TouchableOpacity onPress={handleSkip} style={{ alignSelf: 'flex-end', paddingHorizontal: PADDING, paddingVertical: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.tertiary }}>Skip</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: PADDING }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text.primary, textAlign: 'center', marginBottom: 8 }}>
            Who are you?
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text.tertiary, textAlign: 'center', marginBottom: 32 }}>
            Choose your experience so we can tailor Dabbu for you
          </Text>

          {USER_TYPES.map((t) => (
            <TouchableOpacity
              key={t.id}
              activeOpacity={0.8}
              onPress={() => { setUserType(t.id); setStep('slides'); }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.bg.card,
                borderRadius: borderRadius.xl,
                padding: 20,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: colors.border.subtle,
              }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent.primary + '20', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <AntDesign name={t.icon as any} size={22} color={colors.accent.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text.primary }}>{t.label}</Text>
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary, marginTop: 2 }}>{t.desc}</Text>
              </View>
              <AntDesign name="right" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <View style={{ paddingTop: insets.top + 12 }}>
        <TouchableOpacity onPress={handleSkip} style={{ alignSelf: 'flex-end', paddingHorizontal: PADDING, paddingVertical: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.tertiary }}>Skip</Text>
        </TouchableOpacity>
      </View>

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
        keyExtractor={(_, i) => String(i)}
        windowSize={3}
        maxToRenderPerBatch={3}
        initialNumToRender={3}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      />

      <View style={{
        paddingHorizontal: PADDING,
        paddingBottom: insets.bottom + 24,
        backgroundColor: colors.bg.primary,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
      }}>
        <View style={{
          flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
          gap: 8, marginBottom: 28,
        }}>
          {slides.map((_, i) => (
            <View key={i} style={{
              width: i === index ? 28 : 8, height: 8, borderRadius: 4,
              backgroundColor: i === index ? colors.accent.primary : colors.border.subtle,
            }} />
          ))}
        </View>

        {isLast && (
          <TouchableOpacity activeOpacity={0.85} onPress={handleNext} style={{
            backgroundColor: colors.accent.primary, paddingVertical: 16,
            borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center',
            ...shadows.md, shadowColor: colors.accent.primary,
          }}>
            <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '700' }}>Get Started</Text>
          </TouchableOpacity>
        )}

        {!isFirst && (
          <TouchableOpacity onPress={() => { setStep('type'); setIndex(0); }} style={{ alignItems: 'center', paddingVertical: 12, marginTop: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.tertiary }}>Change user type</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
});
