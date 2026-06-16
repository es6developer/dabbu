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
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PADDING, borderRadius, shadows } from '../../theme/design';

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: 'wallet',
    title: 'Build Wealth Together',
    desc: 'Track net worth, set shared goals, and grow your money as a couple or family — all in one place.',
  },
  {
    icon: 'bar-chart',
    title: 'Smart Goal Planning',
    desc: 'Set savings goals, track progress, and let AI suggest the best way to reach each milestone faster.',
  },
  {
    icon: 'team',
    title: 'Shared Money. Shared Dreams.',
    desc: 'Create private spaces with your partner, split expenses, track shared budgets, and align on financial priorities.',
  },
  {
    icon: 'checkcircle',
    title: 'Your Financial Health',
    desc: 'Monitor your health score, get AI-powered insights, and earn achievements as you build better habits.',
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
  }, [isActive]);

  return (
    <View style={{ width, alignItems: 'center', paddingHorizontal: PADDING }}>
      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}
      >
        <View
          style={{
            width: 220,
            height: 220,
            borderRadius: 48,
            backgroundColor: `${colors.accent.primary}08`,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
          }}
        >
          <AntDesign name={item.icon as any} size={72} color={colors.accent.primary} />
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

  const handleNext = useCallback(async () => {
    if (index < slides.length - 1) {
      flatRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      await markSeen();
      navigation.replace('Login');
    }
  }, [index, navigation]);

  const handlePrev = useCallback(() => {
    if (index > 0) {
      flatRef.current?.scrollToIndex({ index: index - 1, animated: true });
    }
  }, [index]);

  const handleSkip = useCallback(async () => {
    await markSeen();
    navigation.replace('Login');
  }, [navigation]);

  const isLast = index === slides.length - 1;
  const isFirst = index === 0;

  const renderSlide = useCallback(
    ({ item, index: i }: { item: (typeof slides)[0]; index: number }) => (
      <SlideContent item={item} isActive={i === index} colors={colors} />
    ),
    [index, colors],
  );

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <View style={{ paddingTop: insets.top + 12 }}>
        <TouchableOpacity
          onPress={handleSkip}
          style={{ alignSelf: 'flex-end', paddingHorizontal: PADDING, paddingVertical: 8 }}
        >
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

      <View
        style={{
          paddingHorizontal: PADDING,
          paddingBottom: insets.bottom + 24,
          backgroundColor: colors.bg.primary,
          borderTopLeftRadius: borderRadius.xl,
          borderTopRightRadius: borderRadius.xl,
        }}
      >
        {/* Dots */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            marginBottom: 28,
          }}
        >
          {slides.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === index ? 28 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === index ? colors.accent.primary : colors.border.subtle,
              }}
            />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleNext}
          style={{
            backgroundColor: colors.accent.primary,
            paddingVertical: 16,
            borderRadius: borderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            ...shadows.md,
            shadowColor: colors.accent.primary,
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '700' }}>
            {isLast ? 'Get Started' : 'Next'}
          </Text>
          {!isLast && <AntDesign  name="arrowright" size={18} color="#FFF" />}
        </TouchableOpacity>

        {/* Back button - visible on all except first screen */}
        {!isFirst && (
          <TouchableOpacity
            onPress={handlePrev}
            style={{ alignItems: 'center', paddingVertical: 12, marginTop: 4 }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.tertiary }}>
              Back
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
});
