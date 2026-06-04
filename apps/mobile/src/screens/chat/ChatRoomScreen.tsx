import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { connectChat, disconnectChat, sendMessage, startTyping, stopTyping, markMessagesRead, getSocket } from '../../services/chat';

export function ChatRoomScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { accessToken, user } = useAuth();
  const { colors } = useTheme();
  const { chatId, title } = route.params || {};
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!accessToken || !chatId) return;
    setAccessToken(accessToken);
    loadMessages();
    const socket = connectChat(accessToken);

    socket.on('message:new', (msg: any) => {
      setMessages((prev) => [...prev, msg]);
      if (msg.senderId !== user?.id) {
        markMessagesRead(chatId, [msg.id]);
      }
    });

    socket.on('typing:update', (data: any) => {
      if (data.userId !== user?.id) {
        setTypingUsers((prev) => {
          if (data.isTyping) return prev.includes(data.userId) ? prev : [...prev, data.userId];
          return prev.filter((id) => id !== data.userId);
        });
      }
    });

    socket.emit('family:join', { chatId });

    return () => { disconnectChat(); };
  }, [accessToken, chatId]);

  useEffect(() => {
    navigation.setOptions({ title: title || 'Chat' });
  }, [title]);

  async function loadMessages() {
    try {
      const res = await api.get<any>(`/chat/${chatId}/messages`);
      setMessages(res?.messages || res || []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    setInput('');
    stopTyping(chatId);
    sendMessage(chatId, text);
    setSending(false);
  }

  function handleInputChange(text: string) {
    setInput(text);
    if (text.trim()) startTyping(chatId);
    else stopTyping(chatId);
  }

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
      <ActivityIndicator color={colors.accent.primary} size="large" />
    </View>
  );

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg.primary }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        renderItem={({ item }) => {
          const isMine = item.senderId === user?.id;
          return (
            <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}>
              {!isMine && (
                <View style={[styles.msgAvatar, { backgroundColor: colors.accent.primary }]}>
                  <Text style={styles.msgAvatarText}>{item.sender?.firstName?.[0] || '?'}</Text>
                </View>
              )}
              <View style={[styles.msgBubble, isMine ? { backgroundColor: colors.accent.primary, borderBottomRightRadius: 4 } : { backgroundColor: colors.bg.tertiary, borderBottomLeftRadius: 4 }]}>
                {!isMine && (
                  <Text style={[styles.msgSender, { color: colors.accent.primary }]}>{item.sender?.firstName || 'Unknown'}</Text>
                )}
                <Text style={[styles.msgText, { color: '#FFFFFF' }]}>{item.content}</Text>
                <Text style={styles.msgTime}>
                  {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubble-ellipses-outline" size={44} color={colors.text.tertiary} />
            <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>No messages yet</Text>
          </View>
        }
        windowSize={10}
        maxToRenderPerBatch={10}
      />
      {typingUsers.length > 0 && (
        <Text style={[styles.typingText, { color: colors.text.tertiary }]}>Someone is typing...</Text>
      )}
      <View style={[styles.inputBar, { backgroundColor: colors.bg.primary, borderTopColor: colors.border.subtle }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary }]}
          value={input}
          onChangeText={handleInputChange}
          placeholder="Type a message..."
          placeholderTextColor={colors.text.tertiary}
          multiline maxLength={500}
        />
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.accent.primary }, (!input.trim() || sending) && { opacity: 0.5 }]} onPress={handleSend} disabled={!input.trim() || sending}>
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  msgList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  msgAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  msgAvatarText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  msgBubble: { maxWidth: '78%', padding: 12, borderRadius: 16 },
  msgSender: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  msgText: { fontSize: 15, lineHeight: 20 },
  msgTime: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4, alignSelf: 'flex-end' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 14 },
  typingText: { fontSize: 11, fontStyle: 'italic', paddingHorizontal: 16, paddingBottom: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, fontSize: 15, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, maxHeight: 80, marginRight: 8 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
