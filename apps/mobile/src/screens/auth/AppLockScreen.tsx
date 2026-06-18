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
<<<<<<< Updated upstream
import { AntDesign } from '@expo/vector-icons';
=======
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
>>>>>>> Stashed changes
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../store/AuthContext';
import { ConfirmDialog } from '../../components/ui';
import { useTheme } from '../../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const KEY_SIZE = (SCREEN_W - 64) / 3;

interface Props {
  onUnlock: () => void;
}

export function AppLockScreen({ onUnlock }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
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
    <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.topSection}>
        <View style={[styles.iconRing, { backgroundColor: `${colors.accent.primary}12`, borderColor: `${colors.accent.primary}20` }]}>
          <AntDesign name="lock" size={28} color={colors.accent.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text.primary }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{user?.firstName || 'User'} · Enter PIN</Text>
      </View>

      <View style={styles.dotsSection}>
        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
          {Array.from({ length: pinLength }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: pin[i] ? colors.accent.primary : 'transparent',
                  borderColor: pin[i] ? colors.accent.primary : colors.border.subtle,
                  transform: pin[i] ? [{ scale: 1 }] : [{ scale: 0.85 }],
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
              <TouchableOpacity
                key={i}
                style={styles.keyBtn}
                onPress={handleDelete}
                activeOpacity={0.5}
              >
                <AntDesign name="arrowleft" size={22} color={colors.text.tertiary} />
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
              <View style={[styles.keyInner, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <Text style={[styles.keyText, { color: colors.text.primary }]}>{key}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.bottomSection}>
<<<<<<< Updated upstream
        <TouchableOpacity style={[styles.biometricBtn, { backgroundColor: `${colors.accent.primary}10` }]} onPress={handleBiometric} activeOpacity={0.7}>
          <AntDesign name="checkcircle" size={22} color={colors.accent.primary} />
          <Text style={[styles.biometricText, { color: colors.accent.primary }]}>Use Biometric</Text>
=======
        <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometric} activeOpacity={0.7}>
          <Ionicons  name="finger-print" size={22} color="#14B8A6" />
          <Text style={styles.biometricText}>Use Biometric</Text>
>>>>>>> Stashed changes
        </TouchableOpacity>
        <TouchableOpacity onPress={handleForgotPin} activeOpacity={0.6}>
          <Text style={[styles.forgotText, { color: colors.text.tertiary }]}>Forgot PIN?</Text>
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
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  biometricText: {
    fontSize: 15,
    fontWeight: '600',
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
