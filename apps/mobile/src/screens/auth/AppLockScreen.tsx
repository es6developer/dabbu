import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../store/AuthContext';
import { ConfirmDialog } from '../../components/ui';

const { width: SCREEN_W } = Dimensions.get('window');
const KEY_SIZE = (SCREEN_W - 64) / 3;

interface Props {
  onUnlock: () => void;
}

export function AppLockScreen({ onUnlock }: Props) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [pin, setPin] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pinLength = 4;

  useEffect(() => {
    handleBiometric();
  }, []);

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
    try {
      const stored = await SecureStore.getItemAsync('appPin');
      if (entered !== stored) {
        triggerShake();
        setError('Incorrect PIN');
        setPin([]);
        return;
      }
      onUnlock();
    } catch {
      triggerShake();
      setError('Something went wrong');
      setPin([]);
    }
  }

  async function handleBiometric() {
    try {
      const [isEnrolled, biometricEnabled] = await Promise.all([
        LocalAuthentication.isEnrolledAsync(),
        SecureStore.getItemAsync('biometricEnabled'),
      ]);
      if (!isEnrolled || biometricEnabled !== 'true') {
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Dabbu',
        fallbackLabel: 'Enter PIN',
      });
      if (result.success) {
        onUnlock();
      }
    } catch {
      /* ignore */
    }
  }

  function handleForgotPin() {
    setShowLogoutDialog(true);
  }

  const dotProgress = pin.length / pinLength;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      <LinearGradient colors={['#131315', '#0A0A0F', '#070708']} style={StyleSheet.absoluteFill} />

      <View style={styles.topSection}>
        <View style={styles.iconRing}>
          <AntDesign  name="lock" size={28} color="#14B8A6" />
        </View>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>{user?.firstName || 'User'} · Enter PIN</Text>
      </View>

      <View style={styles.dotsSection}>
        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
          {Array.from({ length: pinLength }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: pin[i] ? '#14B8A6' : 'transparent',
                  borderColor: pin[i] ? '#14B8A6' : 'rgba(255,255,255,0.12)',
                  transform: pin[i] ? [{ scale: 1 }] : [{ scale: 0.85 }],
                },
              ]}
            />
          ))}
        </Animated.View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${dotProgress * 100}%` }]} />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={styles.keypadSection}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, i) => {
          if (key === '') {
            return <View key={i} style={styles.keyBtn} />;
          }
          if (key === 'del') {
            return (
              <TouchableOpacity
                key={i}
                style={styles.keyBtn}
                onPress={handleDelete}
                activeOpacity={0.5}
              >
                <AntDesign  name="back" size={22} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={i}
              style={styles.keyBtn}
              onPress={() => handlePress(key)}
              activeOpacity={0.6}
            >
              <View style={styles.keyInner}>
                <Text style={styles.keyText}>{key}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometric} activeOpacity={0.7}>
          <Ionicons  name="finger-print" size={22} color="#14B8A6" />
          <Text style={styles.biometricText}>Use Biometric</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleForgotPin} activeOpacity={0.6}>
          <Text style={styles.forgotText}>Forgot PIN?</Text>
        </TouchableOpacity>
      </View>

      <ConfirmDialog
        visible={showLogoutDialog}
        title="Reset PIN"
        message="You'll need to sign out and set a new PIN after logging back in."
        confirmLabel="Sign Out"
        destructive
        icon="logout"
        onConfirm={() => {
          setShowLogoutDialog(false);
          logout().catch(() => {});
        }}
        onCancel={() => setShowLogoutDialog(false)}
      />
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
    backgroundColor: 'rgba(20,184,166,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.2)',
    marginBottom: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#14B8A6',
    borderRadius: 2,
  },
  errorText: {
    color: '#FF4D4F',
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  keyText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '600',
  },
  bottomSection: {
    alignItems: 'center',
    gap: 12,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: 'rgba(20,184,166,0.1)',
  },
  biometricText: {
    color: '#14B8A6',
    fontSize: 15,
    fontWeight: '600',
  },
  forgotText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    fontWeight: '500',
  },
});
