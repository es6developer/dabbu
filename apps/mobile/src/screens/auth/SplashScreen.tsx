import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const SCALE = SCREEN_W < 390 ? 0.85 : 1;

interface SplashScreenProps {
  onFinish?: () => void;
}

interface Translation {
  text: string;
  lang: string;
}

const TRANSLATIONS: Translation[] = [
  { text: 'धन', lang: 'Hindi' },
  { text: 'お金', lang: 'Japanese' },
  { text: 'டப்பு', lang: 'Tamil' },
  { text: 'Dabbu', lang: 'English' },
  { text: 'డబ్బు', lang: 'Telugu' },
  { text: 'മണി', lang: 'Malayalam' },
  { text: 'ಹಣ', lang: 'Kannada' },
  { text: '钱', lang: 'Chinese' },
  { text: 'Geld', lang: 'German' },
  { text: 'Dinero', lang: 'Spanish' },
  { text: 'دبّو', lang: 'Arabic' },
];

const N = TRANSLATIONS.length;
const ANGLE_STEP = 360 / N;
const RADIUS = SCREEN_W * 0.4 * SCALE;
const RING_R = RADIUS * 0.52;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;
const CX = SCREEN_W / 2;
const CY = SCREEN_H / 2;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function TranslationItem({
  text,
  lang,
  angle,
  staggerOp,
  ringAngle,
}: {
  text: string;
  lang: string;
  angle: number;
  staggerOp: Animated.SharedValue<number>;
  ringAngle: Animated.SharedValue<number>;
}) {
  const rad = (angle * Math.PI) / 180;
  const x = CX + RADIUS * Math.cos(rad) - 25;
  const y = CY + RADIUS * Math.sin(rad) - 8;

  const animStyle = useAnimatedStyle(() => ({
    opacity: staggerOp.value,
    transform: [{ translateX: x }, { translateY: y }, { rotate: `${-ringAngle.value}deg` }],
  }));

  return (
    <Animated.View style={[s.translationWrap, animStyle]}>
      <Text
        style={[
          s.translation,
          lang === 'Chinese' && { fontSize: 16 },
          lang === 'Arabic' && { textAlign: 'right' },
        ]}
      >
        {text}
      </Text>
    </Animated.View>
  );
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const rootOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.9);
  const logoOpacity = useSharedValue(0);
  const progress = useSharedValue(0);
  const ringOpacityVal = useSharedValue(0);
  const ringAngle = useSharedValue(0);
  const fadeOut = useSharedValue(0);

  const staggerOps = TRANSLATIONS.map(() => useSharedValue(0));

  useEffect(() => {
    const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

    rootOpacity.value = withTiming(1, { duration: 500, easing: easeOut });
    logoOpacity.value = withTiming(1, { duration: 600, easing: easeOut });
    logoScale.value = withTiming(1, { duration: 700, easing: Easing.bezier(0.34, 1.56, 0.64, 1) });

    TRANSLATIONS.forEach((_, i) => {
      staggerOps[i].value = withDelay(
        400 + i * 50,
        withTiming(1, { duration: 350, easing: easeOut }),
      );
    });

    ringOpacityVal.value = withDelay(500, withTiming(1, { duration: 400, easing: easeOut }));
    progress.value = withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) });

    ringAngle.value = withRepeat(
      withTiming(360, { duration: 14000, easing: Easing.linear }),
      -1,
      false,
    );

    const timer = setTimeout(() => {
      fadeOut.value = withTiming(1, { duration: 400, easing: easeOut }, (finished) => {
        if (finished) {
          runOnJS(onFinish?.())!;
        }
      });
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  const rootAnim = useAnimatedStyle(() => ({
    opacity: interpolate(fadeOut.value, [0, 1], [1, 0]),
  }));

  const logoAnim = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const ringContainerAnim = useAnimatedStyle(() => ({
    opacity: ringOpacityVal.value,
    transform: [{ rotate: `${ringAngle.value}deg` }],
  }));

  const progressProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <View style={s.root}>
      <LinearGradient
        colors={['#050505', '#080808', '#0A0A0A', '#0D0D0D']}
        locations={[0, 0.25, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,107,0,0.035)', 'transparent', 'rgba(255,107,0,0.015)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[s.content, rootAnim]}>
        {/* Glowing Progress Ring */}
        <Animated.View style={[s.ringOuter, { opacity: ringOpacityVal.value }]}>
          <Svg width={RING_R * 2 + 16} height={RING_R * 2 + 16}>
            <Circle
              cx={RING_R + 8}
              cy={RING_R + 8}
              r={RING_R}
              stroke="rgba(255,107,0,0.06)"
              strokeWidth={1.5}
              fill="none"
            />
            <AnimatedCircle
              cx={RING_R + 8}
              cy={RING_R + 8}
              r={RING_R}
              stroke="#FF6B00"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={progressProps}
            />
          </Svg>
        </Animated.View>

        {/* Orbiting Translations */}
        <Animated.View style={[s.orbitContainer, ringContainerAnim]}>
          {TRANSLATIONS.map((t, i) => (
            <TranslationItem
              key={t.lang}
              text={t.text}
              lang={t.lang}
              angle={i * ANGLE_STEP}
              staggerOp={staggerOps[i]}
              ringAngle={ringAngle}
            />
          ))}
        </Animated.View>

        {/* Center Logo */}
        <Animated.View style={[s.logoWrap, logoAnim]}>
          <View style={s.logoInner}>
            <Text style={s.logoText}>D</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  translationWrap: {
    position: 'absolute',
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  translation: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255,107,0,0.12)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,107,0,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.08)',
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
});
