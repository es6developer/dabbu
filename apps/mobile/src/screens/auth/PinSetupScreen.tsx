import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');
const KEY_SIZE = (SCREEN_W - 64) / 3;

interface Props {
  onComplete: () => void;
}

export function PinSetupScreen({ onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { accessToken } = useAuth();
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState<string[]>([]);
  const [confirmPin, setConfirmPin] = useState<string[]>([]);
  const [error, setError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pinLength = 4;

  function triggerShake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }

  function handlePress(digit: string) {
    if (error) setError('');
    if (step === 'create') {
      const next = [...pin, digit];
      setPin(next);
      if (next.length === pinLength) {
        setTimeout(() => {
          setStep('confirm');
          setError('');
        }, 200);
      }
    } else {
      const next = [...confirmPin, digit];
      setConfirmPin(next);
      if (next.length === pinLength) {
        verifyAndSave(pin.join(''), next.join(''));
      }
    }
  }

  function handleDelete() {
    if (step === 'create') {
      setPin((prev) => prev.slice(0, -1));
    } else {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  }

  function handleBack() {
    if (step === 'confirm') {
      setStep('create');
      setConfirmPin([]);
      setError('');
    }
  }

  async function verifyAndSave(created: string, confirmed: string) {
    if (created !== confirmed) {
      triggerShake();
      setError('PINs do not match. Try again.');
      setConfirmPin([]);
      setStep('create');
      setPin([]);
      return;
    }
    try {
      await SecureStore.setItemAsync('appPin', created);
      await SecureStore.setItemAsync('appLockEnabled', 'true');
      if (accessToken) {
        setAccessToken(accessToken);
        api.post('/auth/lock', { pin: created }).catch(() => {});
      }
      onComplete();
    } catch {
      triggerShake();
      setError('Failed to save PIN. Try again.');
      setPin([]);
      setConfirmPin([]);
      setStep('create');
    }
  }

  const currentPin = step === 'create' ? pin : confirmPin;
  const dotProgress = currentPin.length / pinLength;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.topSection}>
        <View style={[styles.iconRing, { backgroundColor: `${colors.accent.primary}12`, borderColor: `${colors.accent.primary}20` }]}>
          <AntDesign name="lock" size={28} color={colors.accent.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          {step === 'create' ? 'Set App Lock PIN' : 'Confirm Your PIN'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          {step === 'create'
            ? 'Create a 4-digit PIN to secure your app'
            : 'Enter the same PIN again to confirm'}
        </Text>
      </View>

      <View style={styles.dotsSection}>
        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
          {Array.from({ length: pinLength }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: currentPin[i] ? colors.accent.primary : 'transparent',
                  borderColor: currentPin[i] ? colors.accent.primary : colors.border.subtle,
                  transform: currentPin[i] ? [{ scale: 1 }] : [{ scale: 0.85 }],
                },
              ]}
            />
          ))}
        </Animated.View>
        <View style={[styles.progressBar, { backgroundColor: colors.border.subtle }]}>
          <View style={[styles.progressFill, { width: `${dotProgress * 100}%`, backgroundColor: colors.accent.primary }]} />
        </View>
        {error ? <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text> : null}
      </View>

      <View style={styles.keypadSection}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, i) => {
          if (key === '') {
            return <View key={i} style={styles.keyBtn} />;
          }
          if (key === 'del') {
            return (
              <TouchableOpacity key={i} style={styles.keyBtn} onPress={handleDelete} activeOpacity={0.5}>
                <AntDesign name="arrowleft" size={22} color={colors.text.tertiary} />
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity key={i} style={styles.keyBtn} onPress={() => handlePress(key)} activeOpacity={0.6}>
              <View style={[styles.keyInner, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <Text style={[styles.keyText, { color: colors.text.primary }]}>{key}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.bottomSection}>
        {step === 'confirm' ? (
          <TouchableOpacity onPress={handleBack} activeOpacity={0.6}>
            <Text style={[styles.backText, { color: colors.text.tertiary }]}>Go back and re-enter PIN</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.hintText, { color: colors.text.tertiary }]}>
            Enter a 4-digit number
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 40,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  dotsSection: {
    alignItems: 'center',
    gap: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  progressBar: {
    width: 120,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  keypadSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: SCREEN_W - 48,
    gap: 8,
    justifyContent: 'center',
  },
  keyBtn: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyInner: {
    width: KEY_SIZE - 8,
    height: KEY_SIZE - 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  keyText: {
    fontSize: 26,
    fontWeight: '600',
  },
  bottomSection: {
    alignItems: 'center',
    gap: 12,
  },
  backText: {
    fontSize: 13,
    fontWeight: '500',
  },
  hintText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
