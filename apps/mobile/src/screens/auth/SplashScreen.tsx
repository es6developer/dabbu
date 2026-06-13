import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, StatusBar } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  cancelAnimation,
  interpolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CX = SCREEN_W / 2;

const BG = '#F5EEFF';
const BG_DEEP = '#EDE4FF';

const RING_R = 52;
const RING_SZ = (RING_R + 2) * 2;
const RING_C = 2 * Math.PI * RING_R;
const CENTER_Y = SCREEN_H * 0.38;

const LOGO_SZ = 72;
const LOGO_IMG = 44;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function SplashScreen({ onFinish }: { onFinish?: () => void }) {
  const progress = useSharedValue(0);
  const fadeOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(0);
  const brandScale = useSharedValue(0.85);
  const logoScale = useSharedValue(0.9);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

    contentOpacity.value = withTiming(1, { duration: 500, easing: easeOut });
    brandScale.value = withTiming(1, { duration: 700, easing: Easing.bezier(0.34, 1.56, 0.64, 1) });
    logoScale.value = withTiming(1, { duration: 600, easing: easeOut });
    ringOpacity.value = withTiming(1, { duration: 400, easing: easeOut });
    progress.value = withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) });

    const timer = setTimeout(() => {
      fadeOpacity.value = withTiming(0, { duration: 450, easing: easeOut }, (finished) => {
        if (finished && onFinish) {
          runOnJS(onFinish)();
        }
      });
    }, 2200);

    return () => {
      clearTimeout(timer);
      cancelAnimation(progress);
      cancelAnimation(fadeOpacity);
      cancelAnimation(contentOpacity);
      cancelAnimation(brandScale);
      cancelAnimation(logoScale);
      cancelAnimation(ringOpacity);
    };
  }, []);

  const containerAnim = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
  }));

  const fadeInAnim = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const brandAnim = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: brandScale.value }],
  }));

  const logoAnim = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const ringFadeAnim = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
  }));

  const progressProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, [0, 1], [RING_C, 0]),
  }));

  return (
    <Animated.View style={[styles.container, containerAnim]}>
      <StatusBar hidden translucent />

      <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="splashBg" cx="50%" cy="45%" r="75%">
            <Stop offset="0%" stopColor={BG} />
            <Stop offset="60%" stopColor={BG_DEEP} />
            <Stop offset="100%" stopColor="#E8DDFF" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={SCREEN_W} height={SCREEN_H} fill="url(#splashBg)" />
      </Svg>

      <View
        style={{
          position: 'absolute',
          top: CENTER_Y - (RING_R + 2),
          left: CX - (RING_R + 2),
          width: RING_SZ,
          height: RING_SZ,
        }}
      >
        <Animated.View style={[StyleSheet.absoluteFill, ringFadeAnim]}>
          <Svg width={RING_SZ} height={RING_SZ}>
            <Circle
              cx={RING_R + 2}
              cy={RING_R + 2}
              r={RING_R}
              stroke="rgba(139,92,246,0.12)"
              strokeWidth={2.5}
              fill="transparent"
            />
            <AnimatedCircle
              cx={RING_R + 2}
              cy={RING_R + 2}
              r={RING_R}
              stroke="#8B5CF6"
              strokeWidth={2.5}
              fill="transparent"
              strokeDasharray={RING_C}
              strokeLinecap="round"
              animatedProps={progressProps}
              transform={`rotate(-90, ${RING_R + 2}, ${RING_R + 2})`}
            />
          </Svg>
        </Animated.View>
      </View>

      <View
        style={{
          position: 'absolute',
          top: CENTER_Y - LOGO_SZ / 2,
          left: CX - LOGO_SZ / 2,
          width: LOGO_SZ,
          height: LOGO_SZ,
        }}
      >
        <Animated.View style={[StyleSheet.absoluteFill, logoAnim]}>
          <View style={styles.logoInner}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
        </Animated.View>
      </View>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: CENTER_Y + LOGO_SZ / 2 + 28,
          alignItems: 'center',
        }}
      >
        <Animated.View style={[styles.brandWrap, brandAnim]}>
          <Text style={styles.brandName}>Dabbu</Text>
          <Animated.View style={fadeInAnim}>
            <Text style={styles.tagline}>Your Money. Your Life. Organized.</Text>
          </Animated.View>
        </Animated.View>
      </View>
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
    backgroundColor: BG,
  },
  logoInner: {
    flex: 1,
    borderRadius: LOGO_SZ / 2,
    backgroundColor: 'rgba(139,92,246,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(139,92,246,0.1)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  logoImg: {
    width: LOGO_IMG,
    height: LOGO_IMG,
  },
  brandWrap: {
    alignItems: 'center',
  },
  brandName: {
    color: '#5B21B6',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 6,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    textAlign: 'center',
  },
  tagline: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.8,
    textAlign: 'center',
    opacity: 0.6,
  },
});
