import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish?: () => void;
}

const TRANSLATIONS = [
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

const HALF = Math.ceil(TRANSLATIONS.length / 2);
const LEFT_COL = TRANSLATIONS.slice(0, HALF);
const RIGHT_COL = TRANSLATIONS.slice(HALF);

function TranslationItem({ text, lang, delay }: { text: string; lang: string; delay: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 12, stiffness: 100 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.translationRow, style]}>
      <Text style={[styles.translation, lang === 'Arabic' && { textAlign: 'right' }]}>{text}</Text>
      <Text style={styles.lang}>{lang}</Text>
    </Animated.View>
  );
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const rootOpacity = useSharedValue(0);
  const logoS = useSharedValue(0.96);
  const logoY = useSharedValue(12);
  const loaderOpacity = useSharedValue(0);

  useEffect(() => {
    rootOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });
    logoS.value = withSpring(1, { damping: 12, stiffness: 100 });
    logoY.value = withSpring(0, { damping: 14, stiffness: 120 });
    loaderOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
    const timer = setTimeout(() => runOnJS(onFinish?.())!, 3200);
    return () => clearTimeout(timer);
  }, []);

  const rootStyle = useAnimatedStyle(() => ({ opacity: rootOpacity.value }));
  const logoAnim = useAnimatedStyle(() => ({
    transform: [{ scale: logoS.value }, { translateY: logoY.value }],
  }));
  const loaderAnim = useAnimatedStyle(() => ({ opacity: loaderOpacity.value }));

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#050505', '#0A0A0A', '#0D0D0D']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,107,0,0.035)', 'transparent', 'rgba(255,107,0,0.015)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.content, rootStyle]}>
        <View style={styles.centerGroup}>
          <Animated.Text style={[styles.title, logoAnim]}>Dabbu</Animated.Text>

          <View style={styles.grid}>
            <View style={styles.col}>
              {LEFT_COL.map((t, i) => (
                <TranslationItem key={t.lang} text={t.text} lang={t.lang} delay={500 + i * 40} />
              ))}
            </View>
            <View style={styles.col}>
              {RIGHT_COL.map((t, i) => (
                <TranslationItem
                  key={t.lang}
                  text={t.text}
                  lang={t.lang}
                  delay={500 + (HALF + i) * 40}
                />
              ))}
            </View>
          </View>
        </View>

        <Animated.View style={[styles.loaderWrap, loaderAnim]}>
          <View style={styles.pill}>
            <LinearGradient
              colors={['rgba(255,107,0,0.6)', '#FF6B00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.pillFill}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  centerGroup: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -40,
  },
  title: {
    fontSize: 52,
    fontWeight: '700',
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    letterSpacing: -1.2,
    marginBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    gap: 40,
  },
  col: {
    gap: 14,
  },
  translationRow: {
    alignItems: 'center',
    gap: 2,
  },
  translation: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.4,
  },
  lang: {
    fontSize: 9,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  loaderWrap: {
    position: 'absolute',
    bottom: 48,
    alignItems: 'center',
  },
  pill: {
    width: 120,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pillFill: {
    width: '40%',
    height: '100%',
    borderRadius: 1.5,
  },
});
