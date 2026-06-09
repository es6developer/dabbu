import React, { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  interpolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CIRCLE_RADIUS = SCREEN_W * 0.35;
const RING_R = CIRCLE_RADIUS - 10;
const CENTER = SCREEN_W / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

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

interface SplashScreenProps {
  onFinish?: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const rotation = useSharedValue(0);
  const progress = useSharedValue(0);
  const fadeOut = useSharedValue(0);
  const circleOpacity = useSharedValue(0);
  const brandOpacity = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false,
    );

    circleOpacity.value = withTiming(1, { duration: 800 });
    brandOpacity.value = withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(1, { duration: 600 }),
    );

    progress.value = withTiming(1, { duration: 2000 }, (finished) => {
      if (finished) {
        fadeOut.value = withTiming(1, { duration: 500 }, (fDone) => {
          if (fDone && onFinish) {
            runOnJS(onFinish)();
          }
        });
      }
    });

    return () => {
      cancelAnimation(rotation);
      cancelAnimation(progress);
      cancelAnimation(fadeOut);
    };
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(fadeOut.value, [0, 1], [1, 0]),
  }));

  const brandStyle = useAnimatedStyle(() => ({
    opacity: brandOpacity.value,
    transform: [{ scale: interpolate(brandOpacity.value, [0, 1], [0.85, 1]) }],
  }));

  const progressProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  function getLanguagePosition(index: number) {
    const angle = (index * 360) / LANGUAGES.length;
    const radian = (angle * Math.PI) / 180;
    return {
      x: CENTER + CIRCLE_RADIUS * Math.cos(radian) - 40,
      y: SCREEN_H / 2 + CIRCLE_RADIUS * Math.sin(radian) - 12,
    };
  }

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <StatusBar hidden translucent />

      {/* Background */}
      <View style={styles.background}>
        <View style={styles.gradientTop} />
        <View style={styles.gradientBottom} />
      </View>

      {/* Rotating Language Circle */}
      <Animated.View
        style={[
          styles.ringContainer,
          { transform: [{ rotate: `${rotation.value}deg` }] },
        ]}
      >
        {LANGUAGES.map((lang, index) => {
          const pos = getLanguagePosition(index);
          return (
            <View
              key={index}
              style={[
                styles.languageItem,
                { left: pos.x, top: pos.y },
              ]}
            >
              <Text style={styles.languageText}>{lang.name}</Text>
              <Text style={styles.languageSub}>{lang.lang}</Text>
            </View>
          );
        })}
      </Animated.View>

      {/* Progress Ring */}
      <Animated.View style={[styles.progressContainer, { opacity: circleOpacity }]}>
        <Svg width={CIRCLE_RADIUS * 2 + 40} height={CIRCLE_RADIUS * 2 + 40}>
          <Circle
            cx={CIRCLE_RADIUS + 20}
            cy={CIRCLE_RADIUS + 20}
            r={RING_R}
            stroke="rgba(255,215,0,0.12)"
            strokeWidth={2}
            fill="none"
          />
          <AnimatedCircle
            cx={CIRCLE_RADIUS + 20}
            cy={CIRCLE_RADIUS + 20}
            r={RING_R}
            stroke="#FFD700"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={progressProps}
          />
        </Svg>
      </Animated.View>

      {/* Center Logo & Brand */}
      <Animated.View style={[styles.centerContent, brandStyle]}>
        <View style={styles.iconWrap}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.appIcon}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.brandName}>Dabbu</Text>
        <Text style={styles.tagline}>Your Money. Your Life. Organized.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_H * 0.4,
    backgroundColor: '#1A1A2E',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_H * 0.6,
    backgroundColor: '#0A0A0A',
  },
  ringContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  languageItem: {
    position: 'absolute',
    alignItems: 'center',
    width: 80,
  },
  languageText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(255, 215, 0, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  languageSub: {
    color: '#888',
    fontSize: 9,
    marginTop: 2,
  },
  progressContainer: {
    position: 'absolute',
    top: SCREEN_H / 2 - CIRCLE_RADIUS - 20,
    left: SCREEN_W / 2 - CIRCLE_RADIUS - 20,
  },
  centerContent: {
    position: 'absolute',
    top: SCREEN_H / 2 - 90,
    left: SCREEN_W / 2 - 80,
    width: 160,
    alignItems: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  appIcon: {
    width: 48,
    height: 48,
  },
  brandName: {
    color: '#FFD700',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  tagline: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
