import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { useTheme } from '../theme';
import { MyWalletScreen } from '../screens/transactions/MyWalletScreen';
import { SharedCirclesScreen } from '../screens/transactions/SharedCirclesScreen';

const SEGMENTS = ['My Wallet', 'Shared Circles'];
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_W = (SCREEN_WIDTH - 48) / 2;

export function ExpenseTabNavigator() {
  const { colors, isDark } = useTheme();
  const [active, setActive] = useState(1);
  const [screen, setScreen] = useState<'MyWallet' | 'SharedCircles'>('SharedCircles');
  const slideAnim = useRef(new Animated.Value(1)).current;
  const contentFade = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const switchTo = useCallback(
    (index: number) => {
      if (index === active) {
        return;
      }
      const next = index === 0 ? ('MyWallet' as const) : ('SharedCircles' as const);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: index,
          tension: 80,
          friction: 12,
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.timing(contentFade, { toValue: 0, duration: 80, useNativeDriver: true }),
          Animated.timing(contentFade, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
      setTimeout(() => {
        setScreen(next);
        setActive(index);
      }, 60);
    },
    [active, slideAnim, contentFade, scaleAnim],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <Animated.View style={{ flex: 1, opacity: contentFade, transform: [{ scale: scaleAnim }] }}>
        {screen === 'MyWallet' ? <MyWalletScreen /> : <SharedCirclesScreen />}
      </Animated.View>
      <View
        style={[
          s.segWrapper,
          {
            backgroundColor: isDark ? 'rgba(26,26,38,0.95)' : 'rgba(240,240,245,0.95)',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <View style={s.segInner}>
          <Animated.View
            style={[
              s.segSlider,
              {
                transform: [
                  {
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [2, TAB_W + 2],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[s.segGradient, { backgroundColor: colors.accent.primary }]} />
          </Animated.View>
          {SEGMENTS.map((label, i) => (
            <TouchableOpacity
              key={label}
              style={s.segBtn}
              onPress={() => switchTo(i)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  s.segLabel,
                  {
                    color: i === active ? '#FFF' : colors.text.tertiary,
                    fontWeight: i === active ? '700' : '500',
                  },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  segWrapper: {
    marginHorizontal: 12,
    marginBottom: Platform.OS === 'ios' ? 80 : 72,
    borderRadius: 16,
    padding: 3,
    borderWidth: 1,
  },
  segInner: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    height: 44,
  },
  segSlider: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 0,
    width: TAB_W,
    borderRadius: 12,
    overflow: 'hidden',
  },
  segGradient: { flex: 1, borderRadius: 12 },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  segLabel: { fontSize: 14, letterSpacing: 0.3 },
});
