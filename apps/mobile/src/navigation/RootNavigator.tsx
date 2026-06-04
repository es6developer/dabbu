import React, { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { AppLockScreen } from '../screens/auth/AppLockScreen';
import { useAuth } from '../store/AuthContext';
import { useAppLock } from '../store/LockContext';

export function RootNavigator(): React.ReactElement | null {
  const { isAuthenticated, isLoading } = useAuth();
  const { isLocked, unlockApp } = useAppLock();
  const [phase, setPhase] = useState<'loading' | 'auth' | 'lock' | 'app'>('loading');

  useEffect(() => {
    if (isLoading) {return;}
    if (!isAuthenticated) { setPhase('auth'); return; }
    if (isLocked) { setPhase('lock'); return; }
    Promise.all([
      SecureStore.getItemAsync('appPin'),
      SecureStore.getItemAsync('appLockEnabled'),
    ]).then(([pin, enabled]) => {
      setPhase(pin && enabled === 'true' ? 'lock' : 'app');
    }).catch(() => {
      setPhase('app');
    });
  }, [isAuthenticated, isLoading, isLocked]);

  useEffect(() => {
    if (isLocked) {setPhase('lock');}
  }, [isLocked]);

  function handleUnlock() {
    unlockApp();
    setPhase('app');
  }

  if (phase === 'loading' || isLoading) {return null;}
  if (phase === 'auth') {return <AuthNavigator key="unauth" />;}
  if (phase === 'lock') {return <AppLockScreen onUnlock={handleUnlock} />;}
  return <MainTabNavigator key="auth" />;
}
