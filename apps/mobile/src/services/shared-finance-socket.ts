import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

const SOCKET_URL = 'wss://backend-ochre-delta-80.vercel.app';

let socket: Socket | null = null;
const groupRooms: Set<string> = new Set();

type RealtimeEvent =
  | 'expense:created'
  | 'expense:updated'
  | 'expense:deleted'
  | 'settlement:created'
  | 'settlement:updated'
  | 'chat:message'
  | 'chat:typing'
  | 'member:joined'
  | 'member:left'
  | 'member:updated'
  | 'group:status_changed'
  | 'connect'
  | 'disconnect'
  | 'error';

type EventHandler = (data: any) => void;

const listeners = new Map<RealtimeEvent, Set<EventHandler>>();

export function connectSharedFinanceSocket(): Socket | null {
  const token = getAccessToken();
  if (!token) {
    return null;
  }
  if (socket?.connected) {
    return socket;
  }

  socket = io(`${SOCKET_URL}/shared-finance`, {
    auth: { token, userType: 'full' },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('Shared-finance socket connected:', socket?.id);
    emitToListeners('connect', {});
    for (const groupId of groupRooms) {
      socket?.emit('group:join', { groupId });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Shared-finance socket disconnected:', reason);
    emitToListeners('disconnect', { reason });
  });

  socket.on('error', (err) => {
    console.error('Shared-finance socket error:', err);
    emitToListeners('error', err);
  });

  socket.on('expense:created', (data) => emitToListeners('expense:created', data));
  socket.on('expense:updated', (data) => emitToListeners('expense:updated', data));
  socket.on('expense:deleted', (data) => emitToListeners('expense:deleted', data));
  socket.on('settlement:created', (data) => emitToListeners('settlement:created', data));
  socket.on('settlement:updated', (data) => emitToListeners('settlement:updated', data));
  socket.on('chat:message', (data) => emitToListeners('chat:message', data));
  socket.on('chat:typing', (data) => emitToListeners('chat:typing', data));
  socket.on('member:joined', (data) => emitToListeners('member:joined', data));
  socket.on('member:left', (data) => emitToListeners('member:left', data));
  socket.on('member:updated', (data) => emitToListeners('member:updated', data));
  socket.on('group:status_changed', (data) => emitToListeners('group:status_changed', data));

  return socket;
}

export function disconnectSharedFinanceSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  groupRooms.clear();
  listeners.clear();
}

export function joinGroupRoom(groupId: string) {
  groupRooms.add(groupId);
  socket?.emit('group:join', { groupId });
}

export function leaveGroupRoom(groupId: string) {
  groupRooms.delete(groupId);
  socket?.emit('group:leave', { groupId });
}

export function sendGroupChatMessage(groupId: string, content: string, replyToId?: string) {
  socket?.emit('chat:send', { groupId, content, replyToId });
}

export function sendGroupTyping(groupId: string) {
  socket?.emit('chat:typing', { groupId });
}

export function onEvent(event: RealtimeEvent, handler: EventHandler) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(handler);
  return () => {
    listeners.get(event)?.delete(handler);
  };
}

function emitToListeners(event: RealtimeEvent, data: any) {
  listeners.get(event)?.forEach((handler) => {
    try {
      handler(data);
    } catch (err) {
      console.error(`Error in ${event} handler:`, err);
    }
  });
}

export function getSharedFinanceSocket(): Socket | null {
  return socket;
}
