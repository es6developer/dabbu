import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, StatusBar } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withRepeat,
  cancelAnimation,
  interpolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CX = SCREEN_W / 2;
const CY = SCREEN_H / 2;

const LANG_RADIUS = Math.min(SCREEN_W, SCREEN_H) * 0.32;
const ITEM_W = 80;
const ITEM_H = 30;
const ORBIT_SZ = (LANG_RADIUS + ITEM_W / 2) * 2;
const O = ORBIT_SZ / 2;

const RING_R = 55;
const RING_SZ = (RING_R + 2) * 2;
const RING_C = 2 * Math.PI * RING_R;

const LANGUAGES = [
  { name: 'हिन्दी', lang: 'Hindi' },
  { name: 'தமிழ்', lang: 'Tamil' },
  { name: 'తెలుగు', lang: 'Telugu' },
  { name: 'മലയാളം', lang: 'Malayalam' },
  { name: 'ಕನ್ನಡ', lang: 'Kannada' },
  { name: '日本語', lang: 'Japanese' },
  { name: '中文', lang: 'Chinese' },
  { name: 'Deutsch', lang: 'German' },
  { name: 'Español', lang: 'Spanish' },
  { name: 'العربية', lang: 'Arabic' },
  { name: 'English', lang: 'English' },
  { name: 'Français', lang: 'French' },
];

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function LangItem({
  name,
  lang,
  left,
  top,
  rotation,
}: {
  name: string;
  lang: string;
  left: number;
  top: number;
  rotation: Animated.SharedValue<number>;
}) {
  const upright = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.langItem, { left, top }, upright]}>
      <Text style={styles.langName}>{name}</Text>
      <Text style={styles.langLabel}>{lang}</Text>
    </Animated.View>
  );
}

export function SplashScreen({ onFinish }: { onFinish?: () => void }) {
  const rotation = useSharedValue(0);
  const progress = useSharedValue(0);
  const fadeOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(0);
  const brandScale = useSharedValue(0.8);

  useEffect(() => {
    const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

    contentOpacity.value = withTiming(1, { duration: 500, easing: easeOut });
    brandScale.value = withTiming(1, { duration: 600, easing: Easing.bezier(0.34, 1.56, 0.64, 1) });
    rotation.value = withRepeat(
      withTiming(360, { duration: 15000, easing: Easing.linear }),
      -1,
      false,
    );
    progress.value = withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) });

    const timer = setTimeout(() => {
      fadeOpacity.value = withTiming(0, { duration: 500, easing: easeOut }, (finished) => {
        if (finished && onFinish) {
          runOnJS(onFinish)();
        }
      });
    }, 2000);

    return () => {
      clearTimeout(timer);
      cancelAnimation(rotation);
      cancelAnimation(progress);
      cancelAnimation(fadeOpacity);
      cancelAnimation(contentOpacity);
      cancelAnimation(brandScale);
    };
  }, []);

  const containerAnim = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
  }));

  const orbitAnim = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const fadeInAnim = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const brandAnim = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: brandScale.value }],
  }));

  const progressProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, [0, 1], [RING_C, 0]),
  }));

  return (
    <Animated.View style={[styles.container, containerAnim]}>
      <StatusBar hidden translucent />

      <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="bgGlow" cx="50%" cy="50%" r="60%">
            <Stop offset="0%" stopColor="#141418" />
            <Stop offset="50%" stopColor="#0D0D10" />
            <Stop offset="100%" stopColor="#0A0A0A" />
          </RadialGradient>
        </Defs>
        <Circle cx={CX} cy={CY} r={SCREEN_W * 0.7} fill="url(#bgGlow)" />
      </Svg>

      <Animated.View
        style={[
          styles.orbit,
          { width: ORBIT_SZ, height: ORBIT_SZ, top: CY - O, left: CX - O },
          orbitAnim,
        ]}
      >
        {LANGUAGES.map((lang, i) => {
          const deg = (i * 360) / LANGUAGES.length;
          const rad = (deg * Math.PI) / 180;
          const left = O + LANG_RADIUS * Math.cos(rad) - ITEM_W / 2;
          const top = O + LANG_RADIUS * Math.sin(rad) - ITEM_H / 2;
          return (
            <LangItem
              key={i}
              name={lang.name}
              lang={lang.lang}
              left={left}
              top={top}
              rotation={rotation}
            />
          );
        })}
      </Animated.View>

      <View
        style={{
          position: 'absolute',
          top: CY - RING_R - 2,
          left: CX - RING_R - 2,
          width: RING_SZ,
          height: RING_SZ,
        }}
      >
        <Svg width={RING_SZ} height={RING_SZ}>
          <Circle
            cx={RING_R + 2}
            cy={RING_R + 2}
            r={RING_R}
            stroke="rgba(255,215,0,0.12)"
            strokeWidth={2}
            fill="transparent"
          />
          <AnimatedCircle
            cx={RING_R + 2}
            cy={RING_R + 2}
            r={RING_R}
            stroke="#FFD700"
            strokeWidth={2}
            fill="transparent"
            strokeDasharray={RING_C}
            strokeLinecap="round"
            animatedProps={progressProps}
            transform={`rotate(-90, ${RING_R + 2}, ${RING_R + 2})`}
          />
        </Svg>
      </View>

      <Animated.View style={[styles.center, brandAnim]}>
        <View style={styles.iconShadow}>
          <View style={styles.iconWrap}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.iconImg}
              resizeMode="contain"
            />
          </View>
        </View>
        <Animated.View style={fadeInAnim}>
          <Text style={styles.brandName}>Dabbu</Text>
          <Text style={styles.tagline}>Your Money. Your Life. Organized.</Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A0A0A',
  },
  orbit: {
    position: 'absolute',
    overflow: 'visible',
  },
  langItem: {
    position: 'absolute',
    width: ITEM_W,
    alignItems: 'center',
  },
  langName: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(255, 215, 0, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  langLabel: {
    color: '#888',
    fontSize: 9,
    marginTop: 1,
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShadow: {
    marginBottom: 14,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    borderRadius: 40,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconImg: {
    width: 48,
    height: 48,
  },
  brandName: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 6,
    textShadowColor: 'rgba(255, 215, 0, 0.12)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    textAlign: 'center',
  },
  tagline: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
