import React, { useState, useEffect, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { SplashScreen } from '../screens/auth/SplashScreen';

ExpoSplashScreen.preventAutoHideAsync().catch(() => {});
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';
import { PhoneScreen } from '../screens/auth/PhoneScreen';
import { AppLockScreen } from '../screens/auth/AppLockScreen';
import MaintenanceScreen from '../screens/auth/MaintenanceScreen';
import { useAuth } from '../store/AuthContext';
import { useAppLock } from '../store/LockContext';
import { api, setAccessToken } from '../services/api';
import { API_URL } from '../config/api';

export function RootNavigator(): React.ReactElement | null {
  const { isAuthenticated, isLoading, isNewUser, needsPhone, accessToken } = useAuth();
  const { isLocked, unlockApp } = useAppLock();
  const [phase, setPhase] = useState<'loading' | 'maintenance' | 'auth' | 'lock' | 'setup' | 'app'>('loading');
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | undefined>();
  const [splashDone, setSplashDone] = useState(false);
  const maintenanceChecked = useRef(false);
  const preFetchStarted = useRef(false);

  useEffect(() => {
    if (maintenanceChecked.current) return;
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
      if (isLoading) return;
      if (!isAuthenticated) { setPhase('auth'); return; }
      if (isLocked) { setPhase('lock'); return; }
      if (isNewUser) { setPhase('setup'); return; }
      Promise.all([SecureStore.getItemAsync('appPin'), SecureStore.getItemAsync('appLockEnabled')])
        .then(([pin, enabled]) => {
          setPhase(pin && enabled === 'true' ? 'lock' : 'app');
        })
        .catch(() => { setPhase('app'); });
    }
  }, [isAuthenticated, isLoading, isLocked, phase]);

  useEffect(() => {
    if (preFetchStarted.current || !accessToken) return;
    preFetchStarted.current = true;
    setAccessToken(accessToken);
    Promise.allSettled([
      api.get<any>('/expense-groups').catch(() => {}),
      api.get<any>('/transactions/recent?limit=10').catch(() => {}),
      api.get<any>('/accounts/summary').catch(() => {}),
      api.get<any>('/goals').catch(() => {}),
      api.get<any>('/shared-finance/groups').catch(() => {}),
      api.get<any>('/bills/upcoming').catch(() => {}),
    ]).catch(() => {});
  }, [accessToken]);

  function handleUnlock() {
    unlockApp();
    setPhase('app');
  }

  if (phase === 'maintenance') {
    return <MaintenanceScreen message={maintenanceMessage} />;
  }

  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  if (phase === 'loading' || isLoading) {
    return null;
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
  return <MainTabNavigator key="auth" />;
}
