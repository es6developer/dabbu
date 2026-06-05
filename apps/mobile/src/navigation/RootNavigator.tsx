import React, { useState, useEffect, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';
import { AppLockScreen } from '../screens/auth/AppLockScreen';
import MaintenanceScreen from '../screens/auth/MaintenanceScreen';
import { useAuth } from '../store/AuthContext';
import { useAppLock } from '../store/LockContext';
import { API_URL } from '../config/api';

export function RootNavigator(): React.ReactElement | null {
  const { isAuthenticated, isLoading, isNewUser } = useAuth();
  const { isLocked, unlockApp } = useAppLock();
  const [phase, setPhase] = useState<'loading' | 'maintenance' | 'auth' | 'lock' | 'setup' | 'app'>(
    'loading',
  );
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | undefined>();
  const maintenanceChecked = useRef(false);

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
      if (isLocked) {
        setPhase('lock');
        return;
      }
      if (isNewUser) {
        setPhase('setup');
        return;
      }
      Promise.all([SecureStore.getItemAsync('appPin'), SecureStore.getItemAsync('appLockEnabled')])
        .then(([pin, enabled]) => {
          setPhase(pin && enabled === 'true' ? 'lock' : 'app');
        })
        .catch(() => {
          setPhase('app');
        });
    }
  }, [isAuthenticated, isLoading, isLocked, phase]);

  function handleUnlock() {
    unlockApp();
    setPhase('app');
  }

  if (phase === 'maintenance') {
    return <MaintenanceScreen message={maintenanceMessage} />;
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
  return <MainTabNavigator key="auth" />;
}
