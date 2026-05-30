import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'wss://backend-ochre-delta-80.vercel.app';

let socket: Socket | null = null;

export function connectChat(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(`${SOCKET_URL}/ws/chat`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Chat connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Chat disconnected:', reason);
  });

  socket.on('error', (err) => {
    console.error('Chat error:', err);
  });

  return socket;
}

export function disconnectChat() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function sendMessage(chatId: string, content: string, replyToId?: string) {
  socket?.emit('message:send', { chatId, content, replyToId });
}

export function startTyping(chatId: string) {
  socket?.emit('typing:start', { chatId });
}

export function stopTyping(chatId: string) {
  socket?.emit('typing:stop', { chatId });
}

export function markMessagesRead(chatId: string, messageIds: string[]) {
  socket?.emit('messages:read', { chatId, messageIds });
}

export function subscribePresence(userIds: string[]) {
  socket?.emit('presence:subscribe', { userIds });
}
