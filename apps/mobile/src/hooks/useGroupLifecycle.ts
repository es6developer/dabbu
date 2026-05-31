import { useState, useEffect, useCallback, useRef } from 'react';
import {
  checkGroupAccessStatus,
  getGroupLifecycleEvents,
  GroupLifecycleStatus,
  GroupLifecycleEvent,
  GroupRestriction,
} from '../services/access-control';

const POLL_INTERVAL = 30 * 1000;

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
  onAccessRevoked?: (reason: string) => void;
  onStatusChanged?: (status: GroupLifecycleStatus) => void;
}

export function useGroupLifecycle({
  groupId,
  onAccessRevoked,
  onStatusChanged,
}: UseGroupLifecycleOptions) {
  const [state, setState] = useState<GroupLifecycleState>({
    status: 'active',
    events: [],
    restrictions: [],
    isLoading: true,
    accessRevoked: false,
  });

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
      }
    } catch {
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    }
  }, [groupId, onAccessRevoked, onStatusChanged]);

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
  }, []);

  useEffect(() => {
    if (!groupId) {
      return;
    }

    fetchStatus();
    fetchEvents();

    pollIntervalRef.current = setInterval(() => {
      fetchStatus();
    }, POLL_INTERVAL);

    return cleanup;
  }, [groupId, fetchStatus, fetchEvents, cleanup]);

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
