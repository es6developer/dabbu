import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

let socket: Socket | null = null;
let currentToken: string | null = null;

export function connectNotificationSocket(accessToken: string): Socket {
  if (socket?.connected && currentToken === accessToken) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  currentToken = accessToken;

  socket = io(`${SOCKET_URL}/ws/notifications`, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 3000,
  });

  socket.on('connect', () => {
    console.log('Notification socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Notification socket disconnected:', reason);
  });

  socket.on('error', (err) => {
    console.warn('Notification socket error:', err);
  });

  return socket;
}

export function disconnectNotificationSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}

export function getNotificationSocket(): Socket | null {
  return socket;
}
