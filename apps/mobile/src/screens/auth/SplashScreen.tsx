import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, StatusBar } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Path,
  G,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

const { width: W, height: H } = Dimensions.get('window');
const LOGO_SZ = 80;
const LOGO_IMG = 52;

function Particle({ size, left, top, color, delay }: { size: number; left: number; top: number; color: string; delay: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(0.6, { duration: 1000 }));
    translateY.value = withDelay(delay, withTiming(-20, { duration: 1000 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
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
        animStyle,
      ]}
    />
  );
}

export function SplashScreen({ onFinish }: { onFinish?: () => void }) {
  const { colors } = useTheme();
  const fadeOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const brandOpacity = useSharedValue(0);
  const brandTranslate = useSharedValue(16);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslate = useSharedValue(10);

  useEffect(() => {
    const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

    contentOpacity.value = withTiming(1, { duration: 600, easing: easeOut });

    logoOpacity.value = withDelay(200, withTiming(1, { duration: 500, easing: easeOut }));
    logoScale.value = withDelay(200, withTiming(1, { duration: 800, easing: Easing.bezier(0.34, 1.56, 0.64, 1) }));

    brandOpacity.value = withDelay(600, withTiming(1, { duration: 600, easing: easeOut }));
    brandTranslate.value = withDelay(600, withTiming(0, { duration: 700, easing: easeOut }));

    taglineOpacity.value = withDelay(900, withTiming(1, { duration: 500, easing: easeOut }));
    taglineTranslate.value = withDelay(900, withTiming(0, { duration: 500, easing: easeOut }));

    setTimeout(() => {
      fadeOpacity.value = withTiming(0, { duration: 400, easing: easeOut }, (finished) => {
        if (finished && onFinish) runOnJS(onFinish)();
      });
    }, 3000);
  }, []);

  const containerAnim = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));
  const logoAnim = useAnimatedStyle(() => ({ opacity: logoOpacity.value, transform: [{ scale: logoScale.value }] }));
  const brandAnim = useAnimatedStyle(() => ({ opacity: brandOpacity.value, transform: [{ translateY: brandTranslate.value }] }));
  const taglineAnim = useAnimatedStyle(() => ({ opacity: taglineOpacity.value, transform: [{ translateY: taglineTranslate.value }] }));

  return (
    <Animated.View style={[s.container, { backgroundColor: colors.bg.primary }, containerAnim]}>
      <StatusBar hidden translucent />

      <Animated.View style={[s.logoWrap, logoAnim]}>
        <View style={[s.logoInner, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
          <Image source={require('../../../assets/logo.png')} style={s.logoImg} resizeMode="contain" />
        </View>
      </Animated.View>

      {/* Decorative finance illustration */}
      <View style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, opacity: 0.12 }} pointerEvents="none">
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <G opacity={0.5}>
            {/* Overlapping coins */}
            <Circle cx={W * 0.2} cy={H * 0.7} r={60} fill="#C4B5FD" opacity={0.3} />
            <Circle cx={W * 0.25} cy={H * 0.65} r={50} fill="#8B5CF6" opacity={0.2} />
            <Circle cx={W * 0.8} cy={H * 0.75} r={70} fill="#A78BFA" opacity={0.25} />
            <Circle cx={W * 0.85} cy={H * 0.68} r={45} fill="#C4B5FD" opacity={0.15} />
            {/* Growth curve */}
            <Path d={`M${W * 0.1} ${H * 0.85} Q${W * 0.3} ${H * 0.7} ${W * 0.5} ${H * 0.75} T${W * 0.9} ${H * 0.6}`} stroke="#C4B5FD" strokeWidth={2} fill="none" strokeLinecap="round" />
            <Path d={`M${W * 0.1} ${H * 0.88} Q${W * 0.35} ${H * 0.78} ${W * 0.5} ${H * 0.82} T${W * 0.9} ${H * 0.68}`} stroke="#8B5CF6" strokeWidth={1.5} fill="none" strokeLinecap="round" />
            {/* Small star/diamond accents */}
            <Circle cx={W * 0.5} cy={H * 0.73} r={3} fill="#DDD6FE" />
            <Circle cx={W * 0.75} cy={H * 0.65} r={2.5} fill="#C4B5FD" />
            <Circle cx={W * 0.35} cy={H * 0.76} r={2} fill="#A78BFA" />
          </G>
        </Svg>
      </View>

      {/* Decorative finance illustration */}
      <View style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, opacity: 0.12 }} pointerEvents="none">
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <G opacity={0.5}>
            {/* Overlapping coins */}
            <Circle cx={W * 0.2} cy={H * 0.7} r={60} fill="#C4B5FD" opacity={0.3} />
            <Circle cx={W * 0.25} cy={H * 0.65} r={50} fill="#8B5CF6" opacity={0.2} />
            <Circle cx={W * 0.8} cy={H * 0.75} r={70} fill="#A78BFA" opacity={0.25} />
            <Circle cx={W * 0.85} cy={H * 0.68} r={45} fill="#C4B5FD" opacity={0.15} />
            {/* Growth curve */}
            <Path d={`M${W * 0.1} ${H * 0.85} Q${W * 0.3} ${H * 0.7} ${W * 0.5} ${H * 0.75} T${W * 0.9} ${H * 0.6}`} stroke="#C4B5FD" strokeWidth={2} fill="none" strokeLinecap="round" />
            <Path d={`M${W * 0.1} ${H * 0.88} Q${W * 0.35} ${H * 0.78} ${W * 0.5} ${H * 0.82} T${W * 0.9} ${H * 0.68}`} stroke="#8B5CF6" strokeWidth={1.5} fill="none" strokeLinecap="round" />
            {/* Small star/diamond accents */}
            <Circle cx={W * 0.5} cy={H * 0.73} r={3} fill="#DDD6FE" />
            <Circle cx={W * 0.75} cy={H * 0.65} r={2.5} fill="#C4B5FD" />
            <Circle cx={W * 0.35} cy={H * 0.76} r={2} fill="#A78BFA" />
          </G>
        </Svg>
      </View>

      <Particle size={4} left={W * 0.15} top={H * 0.2} color="#A78BFA" delay={100} />
      <Particle size={3} left={W * 0.82} top={H * 0.15} color="#C4B5FD" delay={300} />
      <Particle size={5} left={W * 0.75} top={H * 0.7} color="#8B5CF6" delay={500} />
      <Particle size={3} left={W * 0.1} top={H * 0.78} color="#DDD6FE" delay={200} />
      <Particle size={4} left={W * 0.5} top={H * 0.08} color="#A78BFA" delay={400} />
      <Particle size={3} left={W * 0.88} top={H * 0.5} color="#C4B5FD" delay={600} />

      <Animated.View style={[s.taglineWrap, taglineAnim]}>
        <Text style={[s.tagline, { color: colors.text.tertiary }]}>
          Every Milestone. Every Rupee. Together.
        </Text>
      </Animated.View>

      <View style={s.footer}>
        <Text style={[s.footerText, { color: colors.text.tertiary }]}>Collaborative Finance</Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  logoWrap: { marginBottom: 24 },
  logoInner: { width: LOGO_SZ, height: LOGO_SZ, borderRadius: LOGO_SZ / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  logoImg: { width: LOGO_IMG, height: LOGO_IMG },
  brandWrap: { marginBottom: 8 },
  brandName: { fontSize: 28, fontWeight: '700', letterSpacing: 1 },
  taglineWrap: {},
  tagline: { fontSize: 13, fontWeight: '400', letterSpacing: 0.3 },
  footer: { position: 'absolute', bottom: 60 },
  footerText: { fontSize: 11, fontWeight: '500', letterSpacing: 1, opacity: 0.5, textTransform: 'uppercase' },
});
