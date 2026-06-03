import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../../theme';
import { useAuth } from '../../store/AuthContext';

interface Props {
  onUnlock: () => void;
}

export function AppLockScreen({ onUnlock }: Props) {
  const { colors, isDark } = useTheme();
  const { user, logout } = useAuth();
  const [pin, setPin] = useState<string[]>([]);
  const [error, setError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const actualPin = storedPin || '1111';
  const pinLength = actualPin.length;

  useEffect(() => {
    SecureStore.getItemAsync('appPin').then(setStoredPin);
  }, []);

  function triggerShake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }

  function handlePress(digit: string) {
    if (error) {
      setError('');
    }
    const next = [...pin, digit];
    setPin(next);
    if (next.length === pinLength) {
      verifyPin(next.join(''));
    }
  }

  function handleDelete() {
    setPin((prev) => prev.slice(0, -1));
  }

  async function verifyPin(entered: string) {
    if (entered !== actualPin) {
      triggerShake();
      setError('Incorrect PIN');
      setPin([]);
      return;
    }
    onUnlock();
  }

  async function handleBiometric() {
    try {
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert('Not Available', 'Biometric authentication is not set up on this device');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Dabbu',
        fallbackLabel: 'Enter PIN',
      });
      if (result.success) {
        onUnlock();
      }
    } catch (_e) {
      /* ignore */
    }
  }

  function handleForgotPin() {
    Alert.alert(
      'Reset PIN',
      'Forgot PIN? You will need to log out and set a new PIN after logging back in.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => logout().catch(() => {}) },
      ],
    );
  }

  const isFull = pin.length === pinLength;

  return (
    <LinearGradient
      colors={isDark ? [colors.bg.secondary, colors.bg.primary] : ['#f8f4f0', colors.bg.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <View style={styles.topSection}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.accent.primary}18` }]}>
          <Ionicons name="lock-closed" size={32} color={colors.accent.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text.primary }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
          {user?.firstName || 'User'} • Enter PIN to unlock
        </Text>
      </View>

      <View style={styles.dotsWrap}>
        <Animated.View style={[styles.dots, { transform: [{ translateX: shakeAnim }] }]}>
          {Array.from({ length: pinLength }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: pin[i]
                    ? isFull
                      ? colors.status.success
                      : colors.accent.primary
                    : 'transparent',
                  borderColor: pin[i]
                    ? isFull
                      ? colors.status.success
                      : colors.accent.primary
                    : colors.border.subtle,
                },
              ]}
            />
          ))}
        </Animated.View>
        {error ? (
          <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
        ) : null}
      </View>

      <View style={styles.keypad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, i) => {
          if (key === '') {
            return <View key={i} style={styles.keypadKey} />;
          }
          if (key === 'del') {
            return (
              <TouchableOpacity
                key={i}
                style={styles.keypadKey}
                onPress={handleDelete}
                activeOpacity={0.4}
              >
                <Ionicons name="backspace-outline" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={i}
              style={[styles.keypadKey, { backgroundColor: colors.bg.tertiary }]}
              onPress={() => handlePress(key)}
              activeOpacity={0.6}
            >
              <Text style={[styles.keypadText, { color: colors.text.primary }]}>{key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometric} activeOpacity={0.6}>
          <Ionicons name="finger-print" size={24} color={colors.accent.primary} />
          <Text style={[styles.biometricText, { color: colors.accent.primary }]}>
            Unlock with Biometric
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPin} activeOpacity={0.6}>
          <Text style={[styles.forgotText, { color: colors.text.tertiary }]}>Forgot PIN?</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 100,
    paddingBottom: 50,
  },
  topSection: { alignItems: 'center' },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, fontWeight: '500' },
  dotsWrap: { alignItems: 'center', marginVertical: 40 },
  dots: { flexDirection: 'row', gap: 18 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  errorText: { fontSize: 13, marginTop: 16, fontWeight: '500' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: 280, gap: 14 },
  keypadKey: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadText: { fontSize: 28, fontWeight: '500' },
  bottomSection: { alignItems: 'center', gap: 16 },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  biometricText: { fontSize: 15, fontWeight: '600' },
  forgotBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  forgotText: { fontSize: 13, fontWeight: '500' },
});
