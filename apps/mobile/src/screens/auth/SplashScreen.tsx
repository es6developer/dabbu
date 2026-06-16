import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, StatusBar } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  withRepeat,
  cancelAnimation,
  interpolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');
const CX = W / 2;
const CENTER_Y = H * 0.42;

const RING_R = 58;
const RING_SZ = (RING_R + 4) * 2;
const RING_C = 2 * Math.PI * RING_R;

const INNER_R = 44;
const INNER_SZ = (INNER_R + 4) * 2;

const LOGO_SZ = 96;
const LOGO_IMG = 60;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function Particle({
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
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withRepeat(
        withTiming(0.5, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
      translateY.value = withRepeat(
        withTiming(-12, { duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    }, delay);
    return () => clearTimeout(t);
  }, []);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
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
        },
        anim,
      ]}
    />
  );
}

export function SplashScreen({ onFinish }: { onFinish?: () => void }) {
  const fadeOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const logoRotate = useSharedValue(-20);
  const ringProgress = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const brandOpacity = useSharedValue(0);
  const brandTranslate = useSharedValue(20);
  const pulseScale = useSharedValue(0.8);
  const pulseOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslate = useSharedValue(12);

  useEffect(() => {
    const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
    const spring = Easing.bezier(0.34, 1.56, 0.64, 1);

    contentOpacity.value = withTiming(1, { duration: 500, easing: easeOut });

    logoOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 600, easing: easeOut }),
    );
    logoScale.value = withDelay(
      200,
      withTiming(1, { duration: 900, easing: spring }),
    );
    logoRotate.value = withDelay(
      200,
      withTiming(0, { duration: 800, easing: spring }),
    );

    pulseOpacity.value = withDelay(
      300,
      withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
    pulseScale.value = withDelay(
      300,
      withRepeat(
        withTiming(1.6, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );

    ringOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 500, easing: easeOut }),
    );
    ringProgress.value = withDelay(
      400,
      withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.quad) }),
    );


    brandOpacity.value = withDelay(
      700,
      withTiming(1, { duration: 600, easing: easeOut }),
    );
    brandTranslate.value = withDelay(
      700,
      withTiming(0, { duration: 800, easing: spring }),
    );

    taglineOpacity.value = withDelay(
      1000,
      withTiming(1, { duration: 500, easing: easeOut }),
    );
    taglineTranslate.value = withDelay(
      1000,
      withTiming(0, { duration: 600, easing: easeOut }),
    );

    const timer = setTimeout(() => {
      fadeOpacity.value = withTiming(0, { duration: 500, easing: easeOut }, (finished) => {
        if (finished && onFinish) {
          runOnJS(onFinish)();
        }
      });
    }, 3500);

    return () => {
      clearTimeout(timer);
      cancelAnimation(ringProgress);
      cancelAnimation(fadeOpacity);
      cancelAnimation(contentOpacity);
      cancelAnimation(pulseScale);
    };
  }, []);

  const containerAnim = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
  }));


  const logoAnim = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
  }));

  const ringFadeAnim = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
  }));

  const brandAnim = useAnimatedStyle(() => ({
    opacity: brandOpacity.value,
    transform: [{ translateY: brandTranslate.value }],
  }));

  const taglineAnim = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslate.value }],
  }));

  const pulseAnim = useAnimatedStyle(() => ({
    opacity: interpolate(pulseOpacity.value, [0, 1], [0.25, 0.08]),
    transform: [{ scale: pulseScale.value }],
  }));


  const progressProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(ringProgress.value, [0, 1], [RING_C, 0]),
  }));

  return (
    <Animated.View style={[styles.container, containerAnim]}>
      <StatusBar hidden translucent />

      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="splashBg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#0F0720" />
            <Stop offset="40%" stopColor="#1A0A2E" />
            <Stop offset="70%" stopColor="#12081E" />
            <Stop offset="100%" stopColor="#0A0514" />
          </LinearGradient>
          <RadialGradient id="centerGlow" cx="50%" cy="45%" r="60%">
            <Stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.15} />
            <Stop offset="50%" stopColor="#6D28D9" stopOpacity={0.06} />
            <Stop offset="100%" stopColor="#4C1D95" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#C4B5FD" stopOpacity={0.2} />
            <Stop offset="100%" stopColor="#C4B5FD" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill="url(#splashBg)" />
        <Rect x={0} y={0} width={W} height={H} fill="url(#centerGlow)" />
      </Svg>

      <Particle size={4} left={W * 0.15} top={H * 0.2} color="#A78BFA" delay={100} />
      <Particle size={3} left={W * 0.82} top={H * 0.15} color="#C4B5FD" delay={300} />
      <Particle size={5} left={W * 0.75} top={H * 0.7} color="#8B5CF6" delay={500} />
      <Particle size={3} left={W * 0.1} top={H * 0.78} color="#DDD6FE" delay={200} />
      <Particle size={4} left={W * 0.5} top={H * 0.08} color="#A78BFA" delay={400} />
      <Particle size={3} left={W * 0.88} top={H * 0.5} color="#C4B5FD" delay={600} />

      <View
        style={{
          position: 'absolute',
          top: CENTER_Y - 100,
          left: CX - 100,
          width: 200,
          height: 200,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: '#8B5CF6',
            },
            pulseAnim,
          ]}
        />
      </View>

      <View
        style={{
          position: 'absolute',
          top: CENTER_Y - INNER_R - 4,
          left: CX - INNER_R - 4,
          width: INNER_SZ,
          height: INNER_SZ,
        }}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: 0.3 }, ringFadeAnim]}>
          <Svg width={INNER_SZ} height={INNER_SZ}>
            <Circle
              cx={INNER_R + 4}
              cy={INNER_R + 4}
              r={INNER_R}
              stroke="#C4B5FD"
              strokeWidth={0.6}
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * INNER_R * 0.3} ${2 * Math.PI * INNER_R * 0.7}`}
              strokeLinecap="round"
              opacity={0.4}
            />
          </Svg>
        </Animated.View>
      </View>

      <View
        style={{
          position: 'absolute',
          top: CENTER_Y - RING_R - 4,
          left: CX - RING_R - 4,
          width: RING_SZ,
          height: RING_SZ,
        }}
      >
        <Animated.View style={[StyleSheet.absoluteFill, ringFadeAnim]}>
          <Svg width={RING_SZ} height={RING_SZ}>
            <Defs>
              <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="#8B5CF6" />
                <Stop offset="50%" stopColor="#C4B5FD" />
                <Stop offset="100%" stopColor="#8B5CF6" />
              </LinearGradient>
            </Defs>
            <Circle
              cx={RING_R + 4}
              cy={RING_R + 4}
              r={RING_R}
              stroke="rgba(139,92,246,0.08)"
              strokeWidth={3}
              fill="transparent"
            />
            <AnimatedCircle
              cx={RING_R + 4}
              cy={RING_R + 4}
              r={RING_R}
              stroke="url(#ringGrad)"
              strokeWidth={3}
              fill="transparent"
              strokeDasharray={RING_C}
              strokeLinecap="round"
              animatedProps={progressProps}
              transform={`rotate(-90, ${RING_R + 4}, ${RING_R + 4})`}
              opacity={0.8}
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
          top: CENTER_Y + LOGO_SZ / 2 + 36,
          alignItems: 'center',
        }}
      >
        <Animated.View style={brandAnim}>
          <Text style={styles.brandName}>Dabbu</Text>
        </Animated.View>
        <Animated.View style={taglineAnim}>
          <Text style={styles.tagline}>Every Milestone. Every Rupee. Together.</Text>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Animated.View style={[{ alignItems: 'center' }, taglineAnim]}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>Collaborative Finance</Text>
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
    backgroundColor: '#0F0720',
  },
  logoInner: {
    flex: 1,
    borderRadius: LOGO_SZ / 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 6,
  },
  logoImg: {
    width: LOGO_IMG,
    height: LOGO_IMG,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    textAlign: 'center',
  },
  tagline: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1.5,
    textAlign: 'center',
    opacity: 0.6,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerLine: {
    width: 24,
    height: 2,
    backgroundColor: '#8B5CF6',
    borderRadius: 1,
    marginBottom: 8,
    opacity: 0.4,
  },
  footerText: {
    color: '#8B5CF6',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    opacity: 0.35,
  },
});
