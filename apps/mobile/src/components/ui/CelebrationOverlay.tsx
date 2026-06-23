import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ParticleConfig {
  id: number;
  x: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  isCircle: boolean;
}

function generateParticles(accentColors: string[]): ParticleConfig[] {
  const particles: ParticleConfig[] = [];
  for (let i = 0; i < 12; i++) {
    particles.push({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      size: 4 + Math.random() * 6,
      color: accentColors[Math.floor(Math.random() * accentColors.length)],
      duration: 2500 + Math.random() * 1500,
      delay: Math.random() * 400,
      isCircle: Math.random() > 0.5,
    });
  }
  return particles;
}

interface CelebrationOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  subtitle?: string;
  icon?: string;
}

export function CelebrationOverlay({
  visible,
  onDismiss,
  title,
  subtitle,
  icon = 'checkcircle',
}: CelebrationOverlayProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  const particles = useMemo(
    () =>
      generateParticles([
        colors.accent.primary,
        colors.accent.secondary,
        colors.status.success,
        colors.status.warning,
        colors.brand.primary,
      ]),
    [],
  );

  const particleYs = useRef(particles.map(() => new Animated.Value(-50))).current;
  const particleOps = useRef(particles.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();

      particles.forEach((p, i) => {
        Animated.timing(particleYs[i], {
          toValue: SCREEN_HEIGHT + 50,
          duration: p.duration,
          delay: p.delay,
          useNativeDriver: true,
        }).start();
      });

      const timer = setTimeout(() => {
        handleDismiss();
      }, 2500);

      return () => clearTimeout(timer);
    } else {
      opacity.setValue(0);
      checkScale.setValue(0);
      particleYs.forEach((y) => y.setValue(-50));
      particleOps.forEach((o) => o.setValue(1));
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      checkScale.setValue(0);
      onDismiss();
    });
  };

  if (!visible) {return null;}

  return (
    <TouchableWithoutFeedback onPress={handleDismiss}>
      <Animated.View style={[styles.overlay, { backgroundColor: colors.bg.overlay, opacity }]}>
        <View style={styles.content}>
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: checkScale }] }]}>
            <AntDesign name={icon as any} size={80} color={colors.status.success} />
          </Animated.View>
          <Animated.Text
            style={[
              styles.title,
              {
                color: colors.text.primary,
                opacity,
                transform: [
                  {
                    translateY: opacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {title}
          </Animated.Text>
          {subtitle && (
            <Animated.Text
              style={[
                styles.subtitle,
                {
                  color: colors.text.secondary,
                  opacity,
                  transform: [
                    {
                      translateY: opacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {subtitle}
            </Animated.Text>
          )}
        </View>

        {particles.map((p, i) => (
          <Animated.View
            key={p.id}
            style={[
              p.isCircle ? styles.particleCircle : styles.particleSquare,
              {
                left: p.x,
                width: p.size,
                height: p.size,
                borderRadius: p.isCircle ? p.size / 2 : 2,
                backgroundColor: p.color,
                opacity: particleOps[i],
                transform: [{ translateY: particleYs[i] }],
              },
            ]}
          />
        ))}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 12,
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  particleCircle: {
    position: 'absolute',
    top: 0,
  },
  particleSquare: {
    position: 'absolute',
    top: 0,
  },
});
