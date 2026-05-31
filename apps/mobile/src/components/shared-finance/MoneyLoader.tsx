import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

export function MoneyLoader() {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.65)).current;
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.65, duration: 650, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(lift, { toValue: -8, duration: 650, useNativeDriver: true }),
          Animated.timing(lift, { toValue: 0, duration: 650, useNativeDriver: true }),
        ]),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [lift, pulse]);

  return (
    <View style={styles.moneyLoader}>
      <Animated.View
        style={[
          styles.moneyCoin,
          {
            backgroundColor: colors.accent.primary,
            opacity: pulse,
            transform: [{ translateY: lift }],
          },
        ]}
      >
        <Text style={styles.moneyCoinText}>₹</Text>
      </Animated.View>
      <Text style={[styles.moneyLoadingTitle, { color: colors.text.primary }]}>
        Loading money moves
      </Text>
      <Text style={[styles.moneyLoadingText, { color: colors.text.tertiary }]}>
        Getting group expenses ready
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  moneyLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  moneyCoin: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  moneyCoinText: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '800',
  },
  moneyLoadingTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  moneyLoadingText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
