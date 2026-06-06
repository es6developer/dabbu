import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { io, Socket } from 'socket.io-client';
import { api } from '../services/api';
import { refreshTempSession } from '../services/external-sharing';

const SESSION_CHECK_INTERVAL = 5 * 60 * 1000;
const SOCKET_URL = 'wss://dabbu-zmkh.onrender.com';

interface SessionValidityState {
  isValid: boolean;
  isLoading: boolean;
  isExpired: boolean;
  expiryTime?: string;
}

interface UseSessionValidityOptions {
  isTempUser: boolean;
  enabled?: boolean;
  onSessionExpired?: () => void;
}

export function useSessionValidity({
  isTempUser,
  enabled = true,
  onSessionExpired,
}: UseSessionValidityOptions) {
  const navigation = useNavigation<any>();
  const [state, setState] = useState<SessionValidityState>({
    isValid: true,
    isLoading: false,
    isExpired: false,
  });

  const socketRef = useRef<Socket | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const validateSession = useCallback(async () => {
    if (!enabled) {
      return;
    }
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      await api.get('/external-sharing/auth/me');
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, isValid: true, isExpired: false, isLoading: false }));
      }
    } catch (err: any) {
      if (!mountedRef.current) {
        return;
      }
      const isExpired =
        err?.message?.includes('401') ||
        err?.message?.includes('expired') ||
        err?.message?.includes('unauthorized');
      if (isExpired) {
        if (isTempUser) {
          try {
            await refreshTempSession();
            if (mountedRef.current) {
              setState((prev) => ({ ...prev, isValid: true, isExpired: false, isLoading: false }));
            }
            return;
          } catch (_e) {
            if (mountedRef.current) {
              setState((prev) => ({ ...prev, isValid: false, isExpired: true, isLoading: false }));
            }
            onSessionExpired?.();
          }
        } else {
          setState((prev) => ({ ...prev, isValid: false, isExpired: true, isLoading: false }));
          onSessionExpired?.();
        }
      } else {
        setState((prev) => ({ ...prev, isValid: true, isExpired: false, isLoading: false }));
      }
    }
  }, [enabled, isTempUser, onSessionExpired]);

  const handleExpiredSession = useCallback(() => {
    if (!mountedRef.current) {
      return;
    }
    setState((prev) => ({ ...prev, isValid: false, isExpired: true }));
    cleanup();
    onSessionExpired?.();
    navigation.navigate('MainTabs');
  }, [onSessionExpired, navigation]);

  const cleanup = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const setupSocket = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }
    try {
      const socket = io(SOCKET_URL, {
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        socket.emit('join_session_monitor');
      });

      socket.on('session_expired', handleExpiredSession);

      socket.on('disconnect', () => {});

      socketRef.current = socket;
    } catch (_e) {
      // polling fallback
    }
  }, [handleExpiredSession]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    validateSession();
    setupSocket();

    pollIntervalRef.current = setInterval(validateSession, SESSION_CHECK_INTERVAL);

    return cleanup;
  }, [enabled, validateSession, setupSocket, cleanup]);

  const reAuth = useCallback(async () => {
    if (isTempUser) {
      try {
        await refreshTempSession();
        if (mountedRef.current) {
          setState({ isValid: true, isLoading: false, isExpired: false });
        }
      } catch (_e) {
        // re-auth failed
      }
    } else {
      try {
        await api.post('/external-sharing/auth/refresh-token');
        if (mountedRef.current) {
          setState({ isValid: true, isLoading: false, isExpired: false });
        }
      } catch (_e) {
        // re-auth failed
      }
    }
  }, [isTempUser]);

  return {
    isValid: state.isValid,
    isLoading: state.isLoading,
    isExpired: state.isExpired,
    reAuth,
    validateSession,
  };
}
