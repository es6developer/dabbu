import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { io, Socket } from 'socket.io-client';
import {
  checkGroupAccessStatus,
  getGroupLifecycleEvents,
  GroupLifecycleStatus,
  GroupLifecycleEvent,
  GroupRestriction,
} from '../services/access-control';

const POLL_INTERVAL = 30 * 1000;
const SOCKET_URL = 'wss://backend-es6developers-projects.vercel.app';

interface GroupLifecycleState {
  status: GroupLifecycleStatus;
  events: GroupLifecycleEvent[];
  restrictions: GroupRestriction[];
  isLoading: boolean;
  accessRevoked: boolean;
  revocationReason?: string;
}

interface UseGroupLifecycleOptions {
  groupId: string;
  isTempUser?: boolean;
  onAccessRevoked?: (reason: string) => void;
  onStatusChanged?: (status: GroupLifecycleStatus) => void;
}

export function useGroupLifecycle({
  groupId,
  isTempUser = false,
  onAccessRevoked,
  onStatusChanged,
}: UseGroupLifecycleOptions) {
  const navigation = useNavigation<any>();
  const [state, setState] = useState<GroupLifecycleState>({
    status: 'active',
    events: [],
    restrictions: [],
    isLoading: true,
    accessRevoked: false,
  });

  const socketRef = useRef<Socket | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const previousStatusRef = useRef<GroupLifecycleStatus>('active');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!groupId) {
      return;
    }
    try {
      const statusData = await checkGroupAccessStatus(groupId);
      if (!mountedRef.current) {
        return;
      }

      setState((prev) => ({
        ...prev,
        status: statusData.status,
        restrictions: statusData.restrictions || prev.restrictions,
        isLoading: false,
      }));

      const prevStatus = previousStatusRef.current;
      previousStatusRef.current = statusData.status;

      if (statusData.status !== prevStatus) {
        onStatusChanged?.(statusData.status);
      }

      if (!statusData.hasAccess && statusData.revocationReason) {
        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            accessRevoked: true,
            revocationReason: statusData.revocationReason,
          }));
        }
        onAccessRevoked?.(statusData.revocationReason);
        cleanup();
        navigation.navigate('SharedFinanceHome');
      }
    } catch {
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    }
  }, [groupId, onAccessRevoked, onStatusChanged, navigation]);

  const fetchEvents = useCallback(async () => {
    if (!groupId) {
      return;
    }
    try {
      const events = await getGroupLifecycleEvents(groupId);
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, events }));
      }
    } catch {
      // silent
    }
  }, [groupId]);

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
        query: { groupId },
      });

      socket.on('connect', () => {
        socket.emit('join_group_lifecycle', { groupId });
      });

      socket.on('access_revoked', (data: { reason: string }) => {
        if (!mountedRef.current) {
          return;
        }
        setState((prev) => ({ ...prev, accessRevoked: true, revocationReason: data.reason }));
        cleanup();
        onAccessRevoked?.(data.reason);
        navigation.navigate('SharedFinanceHome');
      });

      socket.on('status_changed', (data: { status: GroupLifecycleStatus }) => {
        if (!mountedRef.current) {
          return;
        }
        setState((prev) => ({ ...prev, status: data.status }));
        onStatusChanged?.(data.status);
        fetchEvents();
      });

      socket.on('restrictions_updated', (data: { restrictions: GroupRestriction[] }) => {
        if (!mountedRef.current) {
          return;
        }
        setState((prev) => ({ ...prev, restrictions: data.restrictions }));
      });

      socket.on('disconnect', () => {
        // reconnection handled by socket.io
      });

      socketRef.current = socket;
    } catch {
      // polling will serve as fallback
    }
  }, [groupId, cleanup, onAccessRevoked, onStatusChanged, fetchEvents, navigation]);

  useEffect(() => {
    if (!groupId) {
      return;
    }

    fetchStatus();
    fetchEvents();
    setupSocket();

    pollIntervalRef.current = setInterval(() => {
      fetchStatus();
    }, POLL_INTERVAL);

    return cleanup;
  }, [groupId, fetchStatus, fetchEvents, setupSocket, cleanup]);

  const refresh = useCallback(() => {
    fetchStatus();
    fetchEvents();
  }, [fetchStatus, fetchEvents]);

  const hasRestriction = useCallback(
    (type: GroupRestriction['type']): boolean => {
      return state.restrictions.some((r) => r.type === type);
    },
    [state.restrictions],
  );

  const isReadOnly = state.status !== 'active' || state.accessRevoked;

  return {
    status: state.status,
    events: state.events,
    restrictions: state.restrictions,
    isLoading: state.isLoading,
    accessRevoked: state.accessRevoked,
    revocationReason: state.revocationReason,
    isReadOnly,
    hasRestriction,
    refresh,
  };
}
