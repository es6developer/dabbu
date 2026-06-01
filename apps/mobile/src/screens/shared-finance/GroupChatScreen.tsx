import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';

function fmt(v: number) {
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return '';
  }
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) {
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (days === 1) {
    return 'Yesterday';
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function GroupChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { accessToken, user: currentUser } = useAuth();
  const { colors, isDark } = useTheme();
  const { groupId, groupName } = route.params || {};

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadMessages = useCallback(
    async (refresh = false) => {
      if (!groupId) {
        return;
      }
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        const res = await api.get<any>(`/shared-groups/${groupId}/messages`, ctrl.signal);
        if (ctrl.signal.aborted) {
          return;
        }
        const data = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setMessages(data);
      } catch (e: any) {
        if (!ctrl.signal.aborted && !refresh) {
          setMessages([]);
        }
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, groupId],
  );

  useFocusEffect(
    useCallback(() => {
      loadMessages();
      return () => abortRef.current?.abort();
    }, [loadMessages]),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      loadMessages(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  async function sendMessage() {
    if (!text.trim() || sending) {
      return;
    }
    setSending(true);
    const msgText = text.trim();
    setText('');
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.post<any>(`/shared-groups/${groupId}/messages`, {
        text: msgText,
      });
      const newMsg = res?.data || res;
      if (newMsg) {
        setMessages((prev) => [...prev, newMsg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      } else {
        loadMessages(true);
      }
    } catch (e: any) {
      // ignore
    } finally {
      setSending(false);
    }
  }

  function isSystemMessage(msg: any): boolean {
    return msg.type === 'system' || !!msg.system;
  }

  function isExpenseMessage(msg: any): boolean {
    return msg.type === 'expense' || !!msg.expenseId;
  }

  function renderMessage({ item }: { item: any }) {
    const isSystem = isSystemMessage(item);
    const isExpense = isExpenseMessage(item);
    const isMine = !isSystem && !isExpense && item.senderId === currentUser?.id;

    if (isSystem) {
      return (
        <View style={s.systemMsgWrap}>
          <View style={[s.systemMsg, { backgroundColor: colors.bg.tertiary }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.text.tertiary} />
            <Text style={[s.systemMsgText, { color: colors.text.tertiary }]}>{item.text}</Text>
          </View>
        </View>
      );
    }

    const senderName = item.senderName || item.sender?.firstName || item.sender?.email || 'Someone';
    const senderInitial = senderName[0]?.toUpperCase() || '?';

    return (
      <View style={[s.msgRow, isMine ? s.msgRowMine : s.msgRowOther]}>
        {!isMine && (
          <LinearGradient colors={[...colors.accent.gradient]} style={s.msgAvatar}>
            <Text style={s.msgAvatarText}>{senderInitial}</Text>
          </LinearGradient>
        )}
        <View
          style={[
            s.msgContent,
            isMine
              ? [s.msgContentMine, { backgroundColor: colors.accent.primary }]
              : [s.msgContentOther, { backgroundColor: colors.bg.secondary }],
          ]}
        >
          {!isMine && (
            <Text
              style={[
                s.msgSender,
                { color: isMine ? 'rgba(255,255,255,0.7)' : colors.accent.primary },
              ]}
            >
              {senderName}
            </Text>
          )}
          {isExpense ? (
            <TouchableOpacity
              onPress={() => {
                if (item.expenseId) {
                  navigation.navigate('SharedExpenseForm', {
                    groupId,
                    expenseId: item.expenseId,
                    edit: true,
                  });
                }
              }}
            >
              <Text style={[s.msgText, { color: isMine ? '#FFF' : colors.text.primary }]}>
                {item.text}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[s.msgText, { color: isMine ? '#FFF' : colors.text.primary }]}>
              {item.text}
            </Text>
          )}
          <Text
            style={[
              s.msgTime,
              {
                color: isMine ? 'rgba(255,255,255,0.6)' : colors.text.tertiary,
              },
            ]}
          >
            {formatTime(item.createdAt || item.timestamp)}
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View
          style={[
            s.header,
            {
              paddingTop: insets.top + 14,
              backgroundColor: colors.bg.primary,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[s.backBtn, { backgroundColor: colors.bg.glassLight }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerName, { color: colors.text.primary }]}>
              {groupName || 'Chat'}
            </Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.accent.primary} size="large" />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[s.screen, { backgroundColor: colors.bg.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          s.header,
          {
            paddingTop: insets.top + 14,
            backgroundColor: colors.bg.primary,
            borderBottomColor: colors.border.subtle,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[s.backBtn, { backgroundColor: colors.bg.glassLight }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => navigation.navigate('SharedGroupDetail', { groupId, groupName })}
        >
          <Text style={[s.headerName, { color: colors.text.primary }]}>{groupName || 'Chat'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id || Math.random().toString()}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        windowSize={10}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadMessages(true)}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={s.messagesList}
        renderItem={renderMessage}
        ListEmptyComponent={
          <View style={s.emptyChat}>
            <View style={[s.emptyIcon, { backgroundColor: `${colors.accent.primary}15` }]}>
              <Ionicons name="chatbubbles-outline" size={40} color={colors.accent.primary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No messages yet</Text>
            <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
              Start the conversation with your group
            </Text>
          </View>
        }
        onContentSizeChange={() =>
          messages.length > 0 && flatListRef.current?.scrollToEnd({ animated: false })
        }
      />

      <View
        style={[
          s.inputBar,
          {
            backgroundColor: colors.bg.primary,
            borderTopColor: colors.border.subtle,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <View
          style={[
            s.inputWrap,
            { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
          ]}
        >
          <TextInput
            style={[s.textInput, { color: colors.text.primary }]}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={colors.text.tertiary}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[
              s.sendBtn,
              {
                backgroundColor: text.trim() ? colors.accent.primary : colors.bg.tertiary,
              },
            ]}
            onPress={sendMessage}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={18} color={text.trim() ? '#FFF' : colors.text.tertiary} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: { fontSize: 17, fontWeight: '700' },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  msgRowMine: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  msgAvatarText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  msgContent: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  msgContentMine: {
    borderBottomRightRadius: 6,
  },
  msgContentOther: {
    borderBottomLeftRadius: 6,
  },
  msgSender: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 20,
  },
  msgTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  systemMsgWrap: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  systemMsgText: {
    fontSize: 12,
    textAlign: 'center',
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingTop: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 48 },
  inputBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 22,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
