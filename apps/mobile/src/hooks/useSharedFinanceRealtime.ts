import { useEffect, useRef, useCallback } from 'react';
import {
  connectSharedFinanceSocket,
  disconnectSharedFinanceSocket,
  joinGroupRoom,
  leaveGroupRoom,
  onEvent,
} from '../services/shared-finance-socket';

type UseRealtimeOptions = {
  groupId: string | undefined | null;
  onExpenseCreated?: (data: any) => void;
  onExpenseUpdated?: (data: any) => void;
  onExpenseDeleted?: (data: any) => void;
  onSettlementCreated?: (data: any) => void;
  onSettlementUpdated?: (data: any) => void;
  onChatMessage?: (data: any) => void;
  onMemberJoined?: (data: any) => void;
  onMemberLeft?: (data: any) => void;
  onGroupStatusChanged?: (data: any) => void;
};

export function useSharedFinanceRealtime(options: UseRealtimeOptions) {
  const {
    groupId,
    onExpenseCreated,
    onExpenseUpdated,
    onExpenseDeleted,
    onSettlementCreated,
    onSettlementUpdated,
    onChatMessage,
    onMemberJoined,
    onMemberLeft,
    onGroupStatusChanged,
  } = options;

  const stableCallbacks = useRef({
    onExpenseCreated,
    onExpenseUpdated,
    onExpenseDeleted,
    onSettlementCreated,
    onSettlementUpdated,
    onChatMessage,
    onMemberJoined,
    onMemberLeft,
    onGroupStatusChanged,
  });
  stableCallbacks.current = {
    onExpenseCreated,
    onExpenseUpdated,
    onExpenseDeleted,
    onSettlementCreated,
    onSettlementUpdated,
    onChatMessage,
    onMemberJoined,
    onMemberLeft,
    onGroupStatusChanged,
  };

  const joinedRef = useRef(false);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    if (onExpenseCreated) {
      unsubs.push(onEvent('expense:created', (d) => stableCallbacks.current.onExpenseCreated?.(d)));
    }
    if (onExpenseUpdated) {
      unsubs.push(onEvent('expense:updated', (d) => stableCallbacks.current.onExpenseUpdated?.(d)));
    }
    if (onExpenseDeleted) {
      unsubs.push(onEvent('expense:deleted', (d) => stableCallbacks.current.onExpenseDeleted?.(d)));
    }
    if (onSettlementCreated) {
      unsubs.push(
        onEvent('settlement:created', (d) => stableCallbacks.current.onSettlementCreated?.(d)),
      );
    }
    if (onSettlementUpdated) {
      unsubs.push(
        onEvent('settlement:updated', (d) => stableCallbacks.current.onSettlementUpdated?.(d)),
      );
    }
    if (onChatMessage) {
      unsubs.push(onEvent('chat:message', (d) => stableCallbacks.current.onChatMessage?.(d)));
    }
    if (onMemberJoined) {
      unsubs.push(onEvent('member:joined', (d) => stableCallbacks.current.onMemberJoined?.(d)));
    }
    if (onMemberLeft) {
      unsubs.push(onEvent('member:left', (d) => stableCallbacks.current.onMemberLeft?.(d)));
    }
    if (onGroupStatusChanged) {
      unsubs.push(
        onEvent('group:status_changed', (d) => stableCallbacks.current.onGroupStatusChanged?.(d)),
      );
    }

    return () => unsubs.forEach((fn) => fn());
  }, [
    !!onExpenseCreated,
    !!onExpenseUpdated,
    !!onExpenseDeleted,
    !!onSettlementCreated,
    !!onSettlementUpdated,
    !!onChatMessage,
    !!onMemberJoined,
    !!onMemberLeft,
    !!onGroupStatusChanged,
  ]);

  useEffect(() => {
    connectSharedFinanceSocket();

    if (groupId && !joinedRef.current) {
      joinGroupRoom(groupId);
      joinedRef.current = true;
    }

    return () => {
      if (groupId && joinedRef.current) {
        leaveGroupRoom(groupId);
        joinedRef.current = false;
      }
    };
  }, [groupId]);
}
