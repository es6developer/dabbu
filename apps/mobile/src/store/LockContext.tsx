import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';

interface LockContextType {
  isLocked: boolean;
  lockApp: () => void;
  unlockApp: () => void;
}

const LockContext = createContext<LockContextType | undefined>(undefined);

export function LockProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);

  const lockApp = useCallback(() => {
    setIsLocked(true);
  }, []);

  const unlockApp = useCallback(() => {
    setIsLocked(false);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        SecureStore.getItemAsync('appPin').then((pin) => {
          if (pin) {
            setIsLocked(true);
          }
        });
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <LockContext.Provider value={{ isLocked, lockApp, unlockApp }}>{children}</LockContext.Provider>
  );
}

export function useAppLock(): LockContextType {
  const ctx = useContext(LockContext);
  if (!ctx) {
    throw new Error('useAppLock must be used within LockProvider');
  }
  return ctx;
}
