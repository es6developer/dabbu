import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
  withDelay, cancelAnimation, Easing,
} from 'react-native-reanimated';

export function TypingIndicator() {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const bounce = (v: Animated.SharedValue<number>, delay: number) => {
      v.value = withRepeat(
        withSequence(
          withDelay(delay, withTiming(-6, { duration: 300, easing: Easing.inOut(Easing.quad) })),
          withTiming(0, { duration: 300, easing: Easing.inOut(Easing.quad) }),
        ),
        -1, true,
      );
    };
    bounce(dot1, 0);
    bounce(dot2, 200);
    bounce(dot3, 400);
    return () => { cancelAnimation(dot1); cancelAnimation(dot2); cancelAnimation(dot3); };
  }, []);

  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

  return (
    <View style={s.row}>
      <Animated.View style={[s.dot, s1]} />
      <Animated.View style={[s.dot, s2]} />
      <Animated.View style={[s.dot, s3]} />
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 2 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFD700', opacity: 0.6 },
});
