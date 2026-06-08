import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish?: () => void;
}

interface LangNode {
  native: string;
  english: string;
  angle: number;
}

const LANG_NODES: LangNode[] = [
  { native: 'धन', english: 'Hindi', angle: -90 },
  { native: 'टप्पु', english: 'Tamil', angle: -54 },
  { native: 'డబ్బు', english: 'Telugu', angle: -18 },
  { native: 'മലയാളം', english: 'Malayalam', angle: 18 },
  { native: 'ಧಾತು', english: 'Kannada', angle: 54 },
  { native: 'دبّو', english: 'Arabic', angle: 90 },
  { native: 'Dinero', english: 'Spanish', angle: 126 },
  { native: 'Argent', english: 'French', angle: 162 },
  { native: 'Geld', english: 'German', angle: 198 },
  { native: 'お金', english: 'Japanese', angle: 234 },
];

const CENTER_X = width / 2;
const CENTER_Y = height / 2;
const R = Math.min(width, height) * 0.42;

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const rootOpacity = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const titleOp = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(16)).current;

  const nodeAnims = useRef(
    LANG_NODES.map(() => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.3),
    })),
  ).current;

  useEffect(() => {
    // Continuous spin
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Entrance sequence
    Animated.parallel([
      Animated.timing(rootOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(ringOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(ringScale, { toValue: 1, friction: 8, tension: 160, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, friction: 8, tension: 180, useNativeDriver: true }),
      Animated.timing(iconOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ...nodeAnims.map((n) =>
        Animated.parallel([
          Animated.spring(n.scale, {
            toValue: 1,
            friction: 8,
            tension: 180,
            useNativeDriver: true,
          }),
          Animated.timing(n.opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]),
      ),
      Animated.parallel([
        Animated.timing(titleOp, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.spring(titleSlide, { toValue: 0, friction: 12, useNativeDriver: true }),
      ]),
    ]).start();

    const timer = setTimeout(() => onFinish?.(), 3000);
    return () => clearTimeout(timer);
  }, []);

  const rotateInterpolation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.root, { backgroundColor: '#0F172A' }]}>
      <Animated.View style={[styles.inner, { opacity: rootOpacity }]}>
        {/* Language nodes */}
        {LANG_NODES.map((node, i) => {
          const rad = (node.angle * Math.PI) / 180;
          const x = CENTER_X + R * Math.cos(rad) - 40;
          const y = CENTER_Y + R * Math.sin(rad) - 18;
          const anim = nodeAnims[i];
          return (
            <Animated.View
              key={node.english}
              style={[
                styles.node,
                {
                  left: x,
                  top: y,
                  opacity: anim.opacity,
                  transform: [{ scale: anim.scale }],
                },
              ]}
            >
              <Text style={styles.native}>{node.native}</Text>
              <Text style={styles.english}>{node.english}</Text>
            </Animated.View>
          );
        })}

        {/* Spinning ring */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.spinnerBorder,
            {
              opacity: ringOpacity,
              transform: [{ scale: ringScale }, { rotate: rotateInterpolation }],
            },
          ]}
        />

        {/* Center icon */}
        <Animated.View
          style={[styles.iconWrap, { opacity: iconOpacity, transform: [{ scale: iconScale }] }]}
        >
          <Image
            source={require('../../assets/icon.png')}
            style={styles.iconImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Title */}
        <Animated.Text
          style={[styles.title, { opacity: titleOp, transform: [{ translateY: titleSlide }] }]}
        >
          Dabbu
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  node: {
    position: 'absolute',
    alignItems: 'center',
    width: 80,
  },
  native: {
    fontSize: 15,
    fontWeight: '700',
    color: '#14B8A6',
    marginBottom: 1,
  },
  english: {
    fontSize: 9,
    color: '#888',
    fontWeight: '500',
  },
  spinnerBorder: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: '#14B8A6',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,184,166,0.08)',
  },
  iconImage: {
    width: 90,
    height: 90,
  },
  title: {
    position: 'absolute',
    bottom: 80,
    fontSize: 28,
    fontWeight: '700',
    color: '#14B8A6',
    letterSpacing: -0.3,
  },
});
