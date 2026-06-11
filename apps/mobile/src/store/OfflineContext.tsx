import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { setOnlineStatus, getOfflinePendingCount } from '../services/api';

interface OfflineContextType {
  isOnline: boolean;
  pendingCount: number;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  pendingCount: 0,
});

export function useOffline() {
  return useContext(OfflineContext);
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      NetInfo.fetch().then((state) => {
        const online = state.isConnected ?? true;
        setIsOnline(online);
        setOnlineStatus(online);
      });
    } catch {
      /* NetInfo not available */
    }

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? true;
      setIsOnline(online);
      setOnlineStatus(online);
    });

    intervalRef.current = setInterval(() => {
      setPendingCount(getOfflinePendingCount());
    }, 2000);

    return () => {
      unsubscribe();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount }}>{children}</OfflineContext.Provider>
  );
}
