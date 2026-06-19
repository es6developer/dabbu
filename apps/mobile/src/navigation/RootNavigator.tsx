import React, { useState, useEffect, useRef } from 'react';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { MainTabNavigator } from './MainTabNavigator';
import { AuthNavigator } from './AuthNavigator';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';
import { PhoneScreen } from '../screens/auth/PhoneScreen';
import { AppLockScreen } from '../screens/auth/AppLockScreen';
import MaintenanceScreen from '../screens/auth/MaintenanceScreen';
import { useAuth } from '../store/AuthContext';
import { useAppLock } from '../store/LockContext';
import { useToast } from '../store/ToastContext';
import { setAccessToken } from '../services/api';
import { API_URL } from '../config/api';
import { startPreloading } from '../services/preload';
ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

export function RootNavigator(): React.ReactElement | null {
  const { isAuthenticated, isLoading, isNewUser, needsPhone, accessToken, logout } = useAuth();
  const { isLocked, unlockApp } = useAppLock();
  const { showToast } = useToast();
  const [phase, setPhase] = useState<'loading' | 'validating' | 'maintenance' | 'auth' | 'lock' | 'setup' | 'app'>(
    'loading',
  );
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | undefined>();
  const [splashDone, setSplashDone] = useState(false);
  const maintenanceChecked = useRef(false);
  const preFetchStarted = useRef(false);
  const validationDone = useRef(false);

  useEffect(() => {
    if (maintenanceChecked.current) {
      return;
    }
    maintenanceChecked.current = true;
    fetch(`${API_URL}/admin/maintenance`, { method: 'GET' })
      .then((r) => r.json())
      .then((json) => {
        if (json?.data?.maintenanceMode) {
          setMaintenanceMessage(json.data.maintenanceMessage || undefined);
          setPhase('maintenance');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (maintenanceChecked.current === true && phase !== 'maintenance') {
      if (isLoading) {
        return;
      }
      if (!isAuthenticated) {
        setPhase('auth');
        return;
      }
      if (phase === 'loading' || phase === 'auth') {
        validationDone.current = false;
        setPhase('validating');
        return;
      }
    }
  }, [isAuthenticated, isLoading, phase]);

  useEffect(() => {
    if (phase !== 'validating' || validationDone.current) {
      return;
    }
    validationDone.current = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    fetch(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(timer);
        if (res.ok) {
          if (isLocked) {
            setPhase('lock');
          } else if (isNewUser) {
            setPhase('setup');
          } else {
            setPhase('app');
          }
        } else if (res.status === 401) {
          showToast('Session expired. Please login again.', 'error');
          logout();
          setPhase('auth');
        } else {
          if (isLocked) {
            setPhase('lock');
          } else if (isNewUser) {
            setPhase('setup');
          } else {
            setPhase('app');
          }
        }
      })
      .catch(() => {
        clearTimeout(timer);
        if (isLocked) {
          setPhase('lock');
        } else if (isNewUser) {
          setPhase('setup');
        } else {
          setPhase('app');
        }
      });
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [phase, accessToken]);

  useEffect(() => {
    if (preFetchStarted.current || !accessToken) {
      return;
    }
    preFetchStarted.current = true;
    setAccessToken(accessToken);
    startPreloading();
  }, [accessToken]);

  function handleUnlock() {
    unlockApp();
    setPhase('app');
  }

  if (phase === 'maintenance') {
    return <MaintenanceScreen message={maintenanceMessage} />;
  }

  if (!splashDone || phase === 'loading' || isLoading) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }
  if (phase === 'validating') {
    return (
      <View style={splashStyles.container}>
        <ActivityIndicator size="large" color="#f7892c" />
        <Text style={splashStyles.text}>Verifying your session...</Text>
      </View>
    );
  }
  if (phase === 'auth') {
    return <AuthNavigator key="unauth" />;
  }
  if (phase === 'lock') {
    return <AppLockScreen onUnlock={handleUnlock} />;
  }
  if (phase === 'setup') {
    return <ProfileSetupScreen />;
  }
  if (needsPhone) {
    return <PhoneScreen />;
  }
  return (
    <MainTabNavigator />
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0A1A',
    gap: 16,
  },
  text: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
});
