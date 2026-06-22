import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from './AuthContext';

interface LockContextType {
  isLocked: boolean;
  lockApp: () => void;
  unlockApp: () => void;
}

const LockContext = createContext<LockContextType | undefined>(undefined);

function getKeys(userId?: string) {
  const prefix = userId ? `${userId}:` : '';
  return {
    appPin: `${prefix}appPin`,
    appLockEnabled: `${prefix}appLockEnabled`,
    biometricEnabled: `${prefix}biometricEnabled`,
  };
}

async function shouldLock(userId?: string): Promise<boolean> {
  try {
    const { appPin, appLockEnabled } = getKeys(userId);
    const [pin, enabled] = await Promise.all([
      SecureStore.getItemAsync(appPin),
      SecureStore.getItemAsync(appLockEnabled),
    ]);
    return !!pin && enabled === 'true';
  } catch {
    return false;
  }
}

export function LockProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [isLocked, setIsLocked] = useState(false);
  const isInitialMount = useRef(true);

  // Check lock on mount (cold start)
  useEffect(() => {
    isInitialMount.current = true;
    shouldLock(userId).then((locked) => {
      if (locked) {
        setIsLocked(true);
      }
      isInitialMount.current = false;
    });
  }, [userId]);

  // Check lock when app backgrounds
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        shouldLock(userId).then((locked) => {
          if (locked) {
            setIsLocked(true);
          }
        });
      }
    });
    return () => sub.remove();
  }, [userId]);

  const lockApp = useCallback(() => {
    setIsLocked(true);
  }, []);

  const unlockApp = useCallback(() => {
    setIsLocked(false);
  }, []);

  return (
    <LockContext.Provider value={{ isLocked, lockApp, unlockApp }}>
      {children}
    </LockContext.Provider>
  );
}

export function useAppLock(): LockContextType {
  const ctx = useContext(LockContext);
  if (!ctx) {
    throw new Error('useAppLock must be used within LockProvider');
  }
  return ctx;
}

export { getKeys as getLockKeys };
