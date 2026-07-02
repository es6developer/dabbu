import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../store/AuthContext';
import { getLockKeys } from '../../store/LockContext';
import { PinSetupScreen } from './PinSetupScreen';
import { ConfirmDialog } from '../../components/ui';
import { useTheme } from '../../theme';
import { palette } from '../../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const KEY_SIZE = (SCREEN_W - 64) / 3;

interface Props {
  onUnlock: () => void;
}

function createStyles(colors: typeof palette.dark, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 28,
    },
    topSection: {
      alignItems: 'center',
      paddingTop: 44,
    },
    iconRing: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: isDark ? 'rgba(20,184,166,0.12)' : colors.bg.highlight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(20,184,166,0.2)' : colors.border.active,
      marginBottom: 28,
    },
    title: {
      color: colors.text.primary,
      fontSize: 26,
      fontWeight: '800',
      marginBottom: 8,
    },
    subtitle: {
      color: colors.text.secondary,
      fontSize: 16,
      fontWeight: '500',
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    dotsSection: {
      alignItems: 'center',
      gap: 24,
    },
    dotsRow: {
      flexDirection: 'row',
      gap: 24,
    },
    dot: {
      width: 14,
      height: 14,
      borderRadius: 20,
      borderWidth: 2,
    },
    progressBar: {
      width: 120,
      height: 3,
      borderRadius: 4,
      backgroundColor: colors.border.subtle,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.accent.primary,
      borderRadius: 4,
    },
    errorText: {
      color: colors.status.error,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
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
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.bg.tertiary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border.subtle,
    },
    keyText: {
      color: colors.text.primary,
      fontSize: 26,
      fontWeight: '600',
    },
    bottomSection: {
      alignItems: 'center',
      gap: 14,
    },
    biometricBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 18,
      paddingHorizontal: 28,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(20,184,166,0.1)' : colors.bg.highlight,
    },
    biometricText: {
      color: colors.accent.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    forgotText: {
      color: colors.text.tertiary,
      fontSize: 16,
      fontWeight: '500',
    },
  });
}

export function AppLockScreen({ onUnlock }: Props) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { colors, isDark } = useTheme();
  const [pin, setPin] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pinLength = 4;

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    setAuthReady(true);
    checkPinExists();
  }, [user?.id]);

  async function checkPinExists() {
    const { appPin: appPinKey, appLockEnabled } = getLockKeys(user?.id);
    try {
      const [stored, lockEnabled] = await Promise.all([
        SecureStore.getItemAsync(appPinKey),
        SecureStore.getItemAsync(appLockEnabled),
      ]);
      if (!stored || lockEnabled !== 'true') {
        setNeedsSetup(true);
        return;
      }
      handleBiometric();
    } catch {
      setNeedsSetup(true);
    }
  }

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
      const { appPin } = getLockKeys(user?.id);
      const stored = await SecureStore.getItemAsync(appPin);
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
      const { biometricEnabled: biometricKey } = getLockKeys(user?.id);
      const [isEnrolled, biometricEnabled] = await Promise.all([
        LocalAuthentication.isEnrolledAsync(),
        SecureStore.getItemAsync(biometricKey),
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

  if (!authReady) {
    return (
      <View
        style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}
      >
        <LinearGradient
          colors={isDark ? ['#131315', '#0A0A0F', '#070708'] : [colors.bg.primary, colors.bg.secondary, colors.bg.primary]}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  if (needsSetup) {
    return <PinSetupScreen onComplete={onUnlock} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      <LinearGradient
        colors={isDark ? ['#131315', '#0A0A0F', '#070708'] : [colors.bg.primary, colors.bg.secondary, colors.bg.primary]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topSection}>
        <View style={styles.iconRing}>
          <AntDesign name="lock" size={28} color={colors.accent.primary} />
        </View>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          {user?.firstName || 'User'} · Enter your Dabbu app PIN (not phone PIN)
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
                  backgroundColor: pin[i] ? colors.accent.primary : 'transparent',
                  borderColor: pin[i] ? colors.accent.primary : colors.border.subtle,
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
                <AntDesign name="back" size={22} color={colors.text.tertiary} />
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
          <AntDesign name="Safety" size={22} color={colors.accent.primary} />
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
