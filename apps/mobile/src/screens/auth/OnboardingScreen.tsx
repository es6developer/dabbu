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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PADDING, borderRadius, shadows } from '../../theme/design';

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: 'shield-checkmark-outline',
    title: 'Easy way to Secure money',
    desc: 'Track every transaction, set budgets, and reach your financial goals with smart tools designed for modern couples and families.',
  },
  {
    icon: 'people-outline',
    title: 'Shared Finance Made Simple',
    desc: 'Create shared spaces for trips, family, or roommates. Split expenses, track balances, and settle up seamlessly.',
  },
  {
    icon: 'trophy-outline',
    title: 'Goals That Keep You Going',
    desc: 'Set financial goals that matter. Save for a vacation, emergency fund, or your dream home with progress tracking.',
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
    <Animated.View
      style={{
        width,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        paddingHorizontal: PADDING,
      }}
    >
      <View
        style={{
          width: width * 0.55,
          height: width * 0.55,
          borderRadius: width * 0.27,
          backgroundColor: `${colors.accent.primary}08`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 48,
        }}
      >
        <View
          style={{
            width: width * 0.36,
            height: width * 0.36,
            borderRadius: width * 0.18,
            backgroundColor: `${colors.accent.primary}12`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={item.icon as any} size={68} color={colors.accent.primary} />
        </View>
      </View>
      <Text
        style={{
          fontSize: 30,
          fontWeight: '800',
          color: colors.text.primary,
          textAlign: 'center',
          letterSpacing: -0.5,
          lineHeight: 38,
          marginBottom: 14,
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
          paddingHorizontal: 8,
        }}
      >
        {item.desc}
      </Text>
    </Animated.View>
  );
}

export function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const flatRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const dotAnim = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      if (viewableItems.length > 0) {
        const idx = viewableItems[0].index ?? 0;
        setCurrentIndex(idx);
        Animated.spring(dotAnim, { toValue: idx, useNativeDriver: true, friction: 8 }).start();
      }
    },
    [dotAnim],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  const isLast = currentIndex === slides.length - 1;

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        ref={flatRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => (
          <SlideContent item={item} isActive={currentIndex === index} colors={colors} />
        )}
        keyExtractor={(_, i) => String(i)}
      />

      {/* Pagination Dots */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
          marginBottom: 32,
        }}
      >
        {slides.map((_, i) => {
          const isActive = currentIndex === i;
          return (
            <View
              key={i}
              style={{
                width: isActive ? 28 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: isActive ? colors.accent.primary : colors.border.subtle,
              }}
            />
          );
        })}
      </View>

      {/* Bottom Area */}
      <View style={{ paddingHorizontal: PADDING, paddingBottom: insets.bottom + 20 }}>
        {isLast ? (
          <>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.replace('MainTabs')}
              style={{
                backgroundColor: colors.accent.primary,
                paddingVertical: 16,
                borderRadius: borderRadius.xl,
                alignItems: 'center',
                marginBottom: 12,
                ...shadows.md,
                shadowColor: colors.accent.primary,
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 }}>
                Get Started
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.replace('Login')}
              style={{ paddingVertical: 8, alignItems: 'center' }}
            >
              <Text style={{ color: colors.accent.primary, fontSize: 14, fontWeight: '600' }}>
                Already have an account? Sign in
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                const next = currentIndex + 1;
                flatRef.current?.scrollToIndex({ index: next, animated: true });
              }}
              style={{
                backgroundColor: colors.accent.primary,
                paddingVertical: 16,
                borderRadius: borderRadius.xl,
                alignItems: 'center',
                marginBottom: 12,
                ...shadows.md,
                shadowColor: colors.accent.primary,
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 }}>
                Next
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.replace('Login')}
              style={{ paddingVertical: 8, alignItems: 'center' }}
            >
              <Text style={{ color: colors.accent.primary, fontSize: 14, fontWeight: '600' }}>
                Already have an account? Sign in
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center' },
});
