import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, StatusBar, ImageSourcePropType } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { getLensLogo } from '../../utils/lensLogo';

const { width: W, height: H } = Dimensions.get('window');
const LOGO_SZ = 112;
const LOGO_IMG = 64;
const BRAND = 'dabbu';

export function SplashScreen({ onFinish }: { onFinish?: () => void }) {
  const { colors, isDark } = useTheme();
  const fadeOpacity = useSharedValue(1);
  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);
  const brandOpacity = useSharedValue(0);
  const brandTranslate = useSharedValue(20);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslate = useSharedValue(14);
  const footerOpacity = useSharedValue(0);
  const [logoSrc, setLogoSrc] = useState<ImageSourcePropType>(getLensLogo(null));

  useEffect(() => {
    AsyncStorage.getItem('dabbu-lens-storage').then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const lens = parsed?.state?.activeLens;
          if (lens) setLogoSrc(getLensLogo(lens));
        } catch {
          // ignore parse errors
        }
      }
    });
  }, []);

  useEffect(() => {
    const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
    const spring = Easing.bezier(0.34, 1.56, 0.64, 1);

    logoOpacity.value = withTiming(1, { duration: 400, easing: easeOut });
    logoScale.value = withTiming(1, { duration: 900, easing: spring });

    brandOpacity.value = withDelay(400, withTiming(1, { duration: 500, easing: easeOut }));
    brandTranslate.value = withDelay(400, withTiming(0, { duration: 600, easing: easeOut }));

    taglineOpacity.value = withDelay(700, withTiming(1, { duration: 500, easing: easeOut }));
    taglineTranslate.value = withDelay(700, withTiming(0, { duration: 500, easing: easeOut }));

    footerOpacity.value = withDelay(1000, withTiming(1, { duration: 400, easing: easeOut }));

    setTimeout(() => {
      fadeOpacity.value = withTiming(0, { duration: 350, easing: easeOut }, (finished) => {
        if (finished && onFinish) runOnJS(onFinish)();
      });
    }, 2800);
  }, []);

  const containerAnim = useAnimatedStyle(() => ({ opacity: fadeOpacity.value }));
  const logoAnim = useAnimatedStyle(() => ({ opacity: logoOpacity.value, transform: [{ scale: logoScale.value }] }));
  const brandAnim = useAnimatedStyle(() => ({ opacity: brandOpacity.value, transform: [{ translateY: brandTranslate.value }] }));
  const taglineAnim = useAnimatedStyle(() => ({ opacity: taglineOpacity.value, transform: [{ translateY: taglineTranslate.value }] }));
  const footerAnim = useAnimatedStyle(() => ({ opacity: footerOpacity.value }));

  const accentColor = colors.accent.primary;

  return (
    <Animated.View style={[s.container, { backgroundColor: colors.bg.primary }, containerAnim]}>
      <StatusBar hidden translucent />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={W} height={H}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="35%" r="60%">
              <Stop offset="0%" stopColor={accentColor} stopOpacity={isDark ? 0.18 : 0.10} />
              <Stop offset="60%" stopColor={accentColor} stopOpacity={isDark ? 0.06 : 0.03} />
              <Stop offset="100%" stopColor={accentColor} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="glow2" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={accentColor} stopOpacity={isDark ? 0.12 : 0.06} />
              <Stop offset="100%" stopColor={accentColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={W} height={H * 0.5} fill="url(#glow)" />
          <Circle cx={W / 2} cy={H * 0.38} r={W * 0.4} fill="url(#glow2)" />
        </Svg>
      </View>

      <View style={s.center}>
        <Animated.View style={[s.logoWrap, logoAnim]}>
          <LinearGradient
            colors={[colors.bg.secondary, colors.bg.card]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.logoInner, { borderColor: colors.border.subtle }]}
          >
            <Image source={logoSrc} style={s.logoImg} resizeMode="contain" />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[s.brandWrap, brandAnim]}>
          <Text style={[s.brandName, { color: colors.text.primary }]}>{BRAND}</Text>
        </Animated.View>

        <Animated.View style={[s.taglineWrap, taglineAnim]}>
          <Text style={[s.tagline, { color: colors.text.tertiary }]}>
            Every Milestone. Every Rupee. Together.
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[s.footer, footerAnim]}>
        <Text style={[s.footerText, { color: colors.text.tertiary }]}>Collaborative Finance</Text>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    marginBottom: 32,
  },
  logoInner: {
    width: LOGO_SZ,
    height: LOGO_SZ,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  logoImg: {
    width: LOGO_IMG,
    height: LOGO_IMG,
  },
  brandWrap: {
    marginBottom: 12,
  },
  brandName: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 2,
  },
  taglineWrap: {},
  tagline: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.4,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
    opacity: 0.45,
    textTransform: 'uppercase',
  },
});
