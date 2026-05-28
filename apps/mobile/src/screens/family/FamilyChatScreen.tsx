import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme';
import io from 'socket.io-client';
import { useAuth } from '../../store/AuthContext';

const SOCKET_URL = 'wss://backend-es6developers-projects.vercel.app';

export function FamilyChatScreen() {
  const { colors } = useTheme();
  const { accessToken, user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<any>(null);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const socket = io(`${SOCKET_URL}/ws/chat`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('message:new', (msg: any) => {
      setMessages((prev) => [...prev, msg]);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

  function sendMessage() {
    if (!text.trim() || !socketRef.current) {
      return;
    }
    socketRef.current.emit('message:send', {
      chatId: 'family',
      content: text.trim(),
    });
    setText('');
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.statusBar, { borderBottomColor: colors.border.subtle }]}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: connected ? colors.status.success : colors.status.error },
          ]}
        />
        <Text style={[styles.statusText, { color: colors.text.tertiary }]}>
          {connected ? 'Connected' : 'Connecting...'}
        </Text>
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isMine = item.senderId === user?.id || item.sender?.id === user?.id;
          return (
            <View
              style={[
                styles.bubble,
                isMine
                  ? {
                      alignSelf: 'flex-end',
                      backgroundColor: colors.accent.primary,
                      borderBottomRightRadius: 4,
                    }
                  : {
                      alignSelf: 'flex-start',
                      backgroundColor: colors.bg.secondary,
                      borderBottomLeftRadius: 4,
                    },
              ]}
            >
              {!isMine && (
                <Text style={[styles.sender, { color: colors.text.tertiary }]}>
                  {item.sender?.firstName || item.senderName || 'User'}
                </Text>
              )}
              <Text style={[styles.bubbleText, { color: '#FFFFFF' }]}>
                {item.content || item.message}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.text.tertiary }]}>
            No messages yet. Say hello! 👋
          </Text>
        }
      />

      <View style={[styles.inputRow, { borderTopColor: colors.border.subtle }]}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.bg.secondary,
              color: colors.text.primary,
              borderColor: colors.border.subtle,
            },
          ]}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={colors.text.tertiary}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: colors.accent.primary },
            !text.trim() && { opacity: 0.4 },
          ]}
          onPress={sendMessage}
          disabled={!text.trim()}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 12 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  bubble: { maxWidth: '75%', padding: 14, borderRadius: 18, marginBottom: 8 },
  sender: { fontSize: 11, marginBottom: 4 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  empty: { textAlign: 'center', paddingTop: 60 },
  inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, alignItems: 'flex-end' },
  input: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    maxHeight: 80,
    borderWidth: 1,
  },
  sendBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 22, marginLeft: 8 },
  sendText: { color: '#FFFFFF', fontWeight: '600' },
});
