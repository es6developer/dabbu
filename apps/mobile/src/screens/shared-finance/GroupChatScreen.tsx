import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';

export function GroupChatScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { accessToken, user } = useAuth();
  const { colors } = useTheme();
  const { groupId, groupName } = route.params || {};
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadMessages();
  }, [accessToken, groupId]);

  useEffect(() => {
    navigation.setOptions({ title: groupName || 'Chat' });
  }, [groupName]);

  async function loadMessages() {
    try {
      const res = await api.get<any>(`/shared-finance/groups/${groupId}/chat`);
      const data = Array.isArray(res.data) ? res.data : Array.isArray(res.messages) ? res.messages : [];
      setMessages(data);
    } catch (e) {
      console.error('GroupChat load error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    setInput('');
    try {
      const res = await api.post<any>(`/shared-finance/groups/${groupId}/chat`, { content: text });
      if (res.data) {
        setMessages((prev) => [...prev, res.data]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (e) {
      console.error('Failed to send message:', e);
    } finally {
      setSending(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  }

  function isSystemMessage(msg: any): boolean {
    return msg.type === 'system' || msg.type === 'action' || !!msg.isSystem;
  }

  function isExpenseMessage(msg: any): boolean {
    return msg.type === 'expense' || msg.type === 'settlement';
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg.primary }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.msgList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const isMine = item.senderId === user?.id || item.sender?.id === user?.id;

          if (isSystemMessage(item)) {
            return (
              <View style={styles.systemMsg}>
                <Text style={[styles.systemMsgText, { color: colors.text.tertiary }]}>{item.content}</Text>
              </View>
            );
          }

          if (isExpenseMessage(item)) {
            return (
              <View style={[styles.expenseCard, { backgroundColor: colors.bg.glass, borderColor: colors.border.subtle }]}>
                <View style={[styles.expenseIconWrap, { backgroundColor: item.type === 'settlement' ? colors.status.successLight : colors.status.errorLight }]}>
                  <Ionicons name={item.type === 'settlement' ? 'swap-horizontal' : 'receipt-outline'} size={18} color={item.type === 'settlement' ? colors.status.success : colors.status.error} />
                </View>
                <View style={styles.expenseCardInfo}>
                  <Text style={[styles.expenseCardTitle, { color: colors.text.primary }]}>{item.content || (item.type === 'settlement' ? 'Settlement' : 'Expense added')}</Text>
                  <Text style={[styles.expenseCardMeta, { color: colors.text.tertiary }]}>
                    {item.sender?.name || item.sender?.firstName || 'Someone'} · {formatTime(item.createdAt)}
                  </Text>
                </View>
                {item.amount && (
                  <Text style={[styles.expenseCardAmount, { color: item.type === 'settlement' ? colors.status.success : colors.status.error }]}>
                    {item.type === 'settlement' ? '' : '-'}₹{Number(item.amount).toLocaleString('en-IN')}
                  </Text>
                )}
              </View>
            );
          }

          return (
            <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}>
              {!isMine && (
                <LinearGradient colors={[colors.accent.primary, colors.accent.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.msgAvatar}>
                  <Text style={styles.msgAvatarText}>{item.sender?.firstName?.[0] || item.sender?.name?.[0] || '?'}</Text>
                </LinearGradient>
              )}
              <View style={[styles.msgBubble, isMine ? { backgroundColor: colors.accent.primary, borderBottomRightRadius: 4 } : { backgroundColor: colors.bg.tertiary, borderBottomLeftRadius: 4 }]}>
                {!isMine && (
                  <Text style={[styles.msgSender, { color: colors.accent.primary }]}>{item.sender?.firstName || item.sender?.name || 'Unknown'}</Text>
                )}
                <Text style={[styles.msgText, { color: '#FFFFFF' }]}>{item.content}</Text>
                <Text style={styles.msgTime}>{formatTime(item.createdAt)}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.bg.glass }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={44} color={colors.text.tertiary} />
            </View>
            <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>No messages yet</Text>
            <Text style={[styles.emptySub, { color: colors.text.tertiary }]}>Start the conversation</Text>
          </View>
        }
      />

      <View style={[styles.inputBar, { backgroundColor: colors.bg.primary, borderTopColor: colors.border.subtle }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary }]}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          placeholderTextColor={colors.text.tertiary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: colors.accent.primary }, (!input.trim() || sending) && { opacity: 0.5 }]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
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
  msgAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  msgAvatarText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  msgBubble: { maxWidth: '78%', padding: 12, borderRadius: 16 },
  msgSender: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  msgText: { fontSize: 15, lineHeight: 20 },
  msgTime: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4, alignSelf: 'flex-end' },
  systemMsg: { alignItems: 'center', marginVertical: 8 },
  systemMsgText: { fontSize: 11, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 24 },
  expenseCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, padding: 12, borderRadius: 14, borderWidth: 1, gap: 10 },
  expenseIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  expenseCardInfo: { flex: 1 },
  expenseCardTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  expenseCardMeta: { fontSize: 10, fontWeight: '500' },
  expenseCardAmount: { fontSize: 14, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptySub: { fontSize: 12 },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, fontSize: 15, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, maxHeight: 80, marginRight: 8 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
