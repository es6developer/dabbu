import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export function SplashScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(titleTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(dotsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={isDark ? [colors.bg.secondary, colors.bg.primary] : ['#f8f4f0', colors.bg.primary]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Animated.View style={[styles.logoContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <View style={[styles.logoWrap, { backgroundColor: `${colors.accent.primary}18` }]}>
          <Ionicons name="wallet" size={44} color={colors.accent.primary} />
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleTranslateY }], alignItems: 'center' }}>
        <Animated.Text style={[styles.title, { color: colors.text.primary }]}>Dabbu</Animated.Text>
        <Animated.Text style={[styles.subtitle, { color: colors.text.tertiary }]}>Smart Finance Manager</Animated.Text>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: dotsOpacity }]}>
        <View style={styles.brandBar}>
          {[colors.accent.primary, colors.accent.primary, colors.accent.secondary, colors.text.tertiary].map((color, i) => (
            <View key={i} style={[styles.brandDot, { backgroundColor: color, opacity: 1 - i * 0.2 }]} />
          ))}
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoContainer: { marginBottom: 20 },
  logoWrap: { width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 40, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  subtitle: { fontSize: 15, letterSpacing: 0.5 },
  footer: { position: 'absolute', bottom: 60, alignItems: 'center' },
  brandBar: { flexDirection: 'row', gap: 8 },
  brandDot: { width: 8, height: 8, borderRadius: 4 },
});
