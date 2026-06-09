import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Dimensions, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlobalLoading } from '../../services/loading-events';

const { width: SCREEN_W } = Dimensions.get('window');
const BAR_H = 3;
const DRAIN_MS = 400;

export function ApiProgressBar() {
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const shimmerX = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldHide = useRef(false);

  function startShimmer() {
    shimmerX.setValue(0);
    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerX, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(shimmerX, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loopRef.current.start();
  }

  function stopShimmer() {
    loopRef.current?.stop();
  }

  function showBar() {
    shouldHide.current = false;
    setVisible(true);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    startShimmer();
  }

  function hideBar() {
    shouldHide.current = true;
    stopShimmer();
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 300, delay: 120, useNativeDriver: true }),
    ]).start(() => {
      if (shouldHide.current) {
        setVisible(false);
      }
    });
  }

  useEffect(() => {
    const unsub = GlobalLoading.subscribe((count: number) => {
      if (count > 0) {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        shouldHide.current = false;
        if (!visible) {
          showBar();
        }
      } else if (count === 0) {
        hideTimerRef.current = setTimeout(() => {
          hideBar();
        }, DRAIN_MS);
      }
    });

    return () => {
      unsub();
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.bar, { opacity }]}>
        <LinearGradient
          colors={['#4F46E5', '#818CF8', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.shimmer,
            {
              transform: [
                {
                  translateX: shimmerX.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-120, SCREEN_W + 120],
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BAR_H,
    zIndex: 99999,
  },
  bar: {
    height: BAR_H,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
