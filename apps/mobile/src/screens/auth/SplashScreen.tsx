import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, StatusBar } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

const LOGO_SZ = 80;
const LOGO_IMG = 52;

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

      <Animated.View style={[s.brandWrap, brandAnim]}>
        <Text style={[s.brandName, { color: colors.text.primary }]}>Dabbu</Text>
      </Animated.View>

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
