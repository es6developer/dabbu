import { io, Socket } from 'socket.io-client';
import { api } from './api';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'wss://dabbu-zmkh.onrender.com';

let socket: Socket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

type EventHandler = (...args: unknown[]) => void;

const listeners: Map<string, Set<EventHandler>> = new Map();

function getToken(): string | null {
  return api.getTempToken();
}

export function connectToGroup(groupId: string): Socket {
  if (socket?.connected) {
    socket.emit('join:group', { groupId, token: getToken() });
    return socket;
  }

  const token = getToken();

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    socket?.emit('join:group', { groupId, token: getToken() });
    const handlerSet = listeners.get('connect');
    if (handlerSet) {
      handlerSet.forEach((fn) => fn());
    }
  });

  socket.on('disconnect', (reason) => {
    const handlerSet = listeners.get('disconnect');
    if (handlerSet) {
      handlerSet.forEach((fn) => fn(reason));
    }
  });

  socket.on('connect_error', (err) => {
    const handlerSet = listeners.get('error');
    if (handlerSet) {
      handlerSet.forEach((fn) => fn(err.message));
    }
  });

  socket.on('expense:new', (data) => {
    const handlerSet = listeners.get('expense:new');
    if (handlerSet) {
      handlerSet.forEach((fn) => fn(data));
    }
  });

  socket.on('expense:updated', (data) => {
    const handlerSet = listeners.get('expense:updated');
    if (handlerSet) {
      handlerSet.forEach((fn) => fn(data));
    }
  });

  socket.on('settlement:new', (data) => {
    const handlerSet = listeners.get('settlement:new');
    if (handlerSet) {
      handlerSet.forEach((fn) => fn(data));
    }
  });

  socket.on('settlement:updated', (data) => {
    const handlerSet = listeners.get('settlement:updated');
    if (handlerSet) {
      handlerSet.forEach((fn) => fn(data));
    }
  });

  socket.on('chat:message', (data) => {
    const handlerSet = listeners.get('chat:message');
    if (handlerSet) {
      handlerSet.forEach((fn) => fn(data));
    }
  });

  socket.on('member:joined', (data) => {
    const handlerSet = listeners.get('member:joined');
    if (handlerSet) {
      handlerSet.forEach((fn) => fn(data));
    }
  });

  socket.on('member:left', (data) => {
    const handlerSet = listeners.get('member:left');
    if (handlerSet) {
      handlerSet.forEach((fn) => fn(data));
    }
  });

  socket.on('member:updated', (data) => {
    const handlerSet = listeners.get('member:updated');
    if (handlerSet) {
      handlerSet.forEach((fn) => fn(data));
    }
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

export function onSocketEvent(event: string, handler: EventHandler): void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(handler);
}

export function offSocketEvent(event: string, handler: EventHandler): void {
  const handlerSet = listeners.get(event);
  if (handlerSet) {
    handlerSet.delete(handler);
    if (handlerSet.size === 0) {
      listeners.delete(event);
    }
  }
}

export function emitEvent(event: string, data?: Record<string, unknown>): void {
  if (socket?.connected) {
    socket.emit(event, data);
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function isConnected(): boolean {
  return socket?.connected ?? false;
}
