import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, StatusBar } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  cancelAnimation,
  interpolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

const CX = W / 2;
const CENTER_Y = H * 0.38;

const RING_R = 62;
const RING_SZ = (RING_R + 3) * 2;
const RING_C = 2 * Math.PI * RING_R;

const OUTER_R = 76;
const OUTER_SZ = (OUTER_R + 3) * 2;

const LOGO_SZ = 88;
const LOGO_IMG = 56;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function DecoCircle({
  size,
  left,
  top,
  color,
  delay,
  duration = 3000,
}: {
  size: number;
  left: number;
  top: number;
  color: string;
  delay: number;
  duration?: number;
}) {
  const opacity = useSharedValue(0.3);
  const scale = useSharedValue(1);

  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.sin) });
      scale.value = withTiming(1.15, { duration, easing: Easing.inOut(Easing.sin) });
    }, delay);
    return () => clearTimeout(t);
  }, []);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left,
          top,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0.3,
        },
        anim,
      ]}
    />
  );
}

export function SplashScreen({ onFinish }: { onFinish?: () => void }) {
  const progress = useSharedValue(0);
  const fadeOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(0);
  const brandScale = useSharedValue(0.8);
  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const brandOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0);

  useEffect(() => {
    const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
    const spring = Easing.bezier(0.34, 1.56, 0.64, 1);

    contentOpacity.value = withTiming(1, { duration: 400, easing: easeOut });
    glowScale.value = withTiming(1.5, { duration: 2000, easing: Easing.inOut(Easing.quad) });

    logoOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 500, easing: easeOut }),
    );
    logoScale.value = withDelay(
      200,
      withTiming(1, { duration: 700, easing: spring }),
    );
    ringOpacity.value = withDelay(
      350,
      withTiming(1, { duration: 400, easing: easeOut }),
    );
    progress.value = withDelay(
      350,
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
    );
    brandOpacity.value = withDelay(
      600,
      withTiming(1, { duration: 600, easing: easeOut }),
    );
    brandScale.value = withDelay(
      600,
      withTiming(1, { duration: 700, easing: spring }),
    );
    taglineOpacity.value = withDelay(
      900,
      withTiming(1, { duration: 500, easing: easeOut }),
    );

    const timer = setTimeout(() => {
      fadeOpacity.value = withTiming(0, { duration: 400, easing: easeOut }, (finished) => {
        if (finished && onFinish) {
          runOnJS(onFinish)();
        }
      });
    }, 2800);

    return () => {
      clearTimeout(timer);
      cancelAnimation(progress);
      cancelAnimation(fadeOpacity);
      cancelAnimation(contentOpacity);
      cancelAnimation(brandScale);
      cancelAnimation(logoScale);
    };
  }, []);

  const containerAnim = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
  }));

  const fadeInAnim = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const brandAnim = useAnimatedStyle(() => ({
    opacity: brandOpacity.value,
    transform: [{ scale: brandScale.value }],
  }));

  const logoAnim = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const ringFadeAnim = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
  }));

  const taglineAnim = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: interpolate(taglineOpacity.value, [0, 1], [8, 0]) }],
  }));

  const glowAnim = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: interpolate(glowScale.value, [1, 1.5], [0.4, 0]),
  }));

  const progressProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, [0, 1], [RING_C, 0]),
  }));

  const outerProgressProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(progress.value, [0, 1], [2 * Math.PI * OUTER_R, 0]),
  }));

  return (
    <Animated.View style={[styles.container, containerAnim]}>
      <StatusBar hidden translucent />

      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="splashBg" cx="50%" cy="40%" r="80%">
            <Stop offset="0%" stopColor="#F8F4FF" />
            <Stop offset="50%" stopColor="#F0E8FF" />
            <Stop offset="100%" stopColor="#E8DDFF" />
          </RadialGradient>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#C4B5FD" stopOpacity={0.3} />
            <Stop offset="100%" stopColor="#C4B5FD" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill="url(#splashBg)" />
      </Svg>

      <DecoCircle size={120} left={W * 0.08} top={H * 0.12} color="#DDD6FE" delay={200} />
      <DecoCircle size={80} left={W * 0.78} top={H * 0.2} color="#C4B5FD" delay={400} />
      <DecoCircle size={60} left={W * 0.72} top={H * 0.65} color="#DDD6FE" delay={600} />
      <DecoCircle size={100} left={W * 0.05} top={H * 0.72} color="#EDE9FE" delay={300} />

      <View
        style={{
          position: 'absolute',
          top: CENTER_Y - 120,
          left: CX - 120,
          width: 240,
          height: 240,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 240,
              height: 240,
              borderRadius: 120,
              backgroundColor: '#C4B5FD',
              opacity: 0.15,
            },
            glowAnim,
          ]}
        />
      </View>

      <View
        style={{
          position: 'absolute',
          top: CENTER_Y - OUTER_R - 3,
          left: CX - OUTER_R - 3,
          width: OUTER_SZ,
          height: OUTER_SZ,
        }}
      >
        <Animated.View style={[StyleSheet.absoluteFill, ringFadeAnim]}>
          <Svg width={OUTER_SZ} height={OUTER_SZ}>
            <AnimatedCircle
              cx={OUTER_R + 3}
              cy={OUTER_R + 3}
              r={OUTER_R}
              stroke="#C4B5FD"
              strokeWidth={0.8}
              fill="transparent"
              strokeDasharray={2 * Math.PI * OUTER_R * 0.15}
              strokeLinecap="round"
              animatedProps={outerProgressProps}
              transform={`rotate(-90, ${OUTER_R + 3}, ${OUTER_R + 3})`}
              opacity={0.4}
            />
          </Svg>
        </Animated.View>
      </View>

      <View
        style={{
          position: 'absolute',
          top: CENTER_Y - (RING_R + 3),
          left: CX - (RING_R + 3),
          width: RING_SZ,
          height: RING_SZ,
        }}
      >
        <Animated.View style={[StyleSheet.absoluteFill, ringFadeAnim]}>
          <Svg width={RING_SZ} height={RING_SZ}>
            <Circle
              cx={RING_R + 3}
              cy={RING_R + 3}
              r={RING_R}
              stroke="rgba(139,92,246,0.08)"
              strokeWidth={3}
              fill="transparent"
            />
            <AnimatedCircle
              cx={RING_R + 3}
              cy={RING_R + 3}
              r={RING_R}
              stroke="#8B5CF6"
              strokeWidth={3}
              fill="transparent"
              strokeDasharray={RING_C}
              strokeLinecap="round"
              animatedProps={progressProps}
              transform={`rotate(-90, ${RING_R + 3}, ${RING_R + 3})`}
              opacity={0.7}
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
          top: CENTER_Y + LOGO_SZ / 2 + 32,
          alignItems: 'center',
        }}
      >
        <Animated.View style={brandAnim}>
          <Text style={styles.brandName}>Dabbu</Text>
        </Animated.View>
        <Animated.View style={taglineAnim}>
          <Text style={styles.tagline}>Your Money. Your Life. Organized.</Text>
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
    backgroundColor: '#F5EEFF',
  },
  logoInner: {
    flex: 1,
    borderRadius: LOGO_SZ / 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.12)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  logoImg: {
    width: LOGO_IMG,
    height: LOGO_IMG,
  },
  brandName: {
    color: '#5B21B6',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: 6,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    textAlign: 'center',
  },
  tagline: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1.2,
    textAlign: 'center',
    opacity: 0.55,
  },
});
