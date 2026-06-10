import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { MessageBubble } from '../../components/MessageBubble';
import { QuickReplies } from '../../components/QuickReplies';
import { TypingIndicator } from '../../components/TypingIndicator';
import { useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { AIMessage } from '../../types';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 72;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function AIDashboard() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeOptions, setActiveOptions] = useState<{
    field: string;
    options: string[];
    context?: any;
  } | null>(null);
  const [input, setInput] = useState('');
  const flatRef = useRef<FlatList>(null);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) {
        return;
      }

      const userMsg: AIMessage = {
        id: generateId(),
        role: 'user',
        text: trimmed,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setActiveOptions(null);
      setLoading(true);

      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        const res = await api.post<any>('/ai/chat', { prompt: trimmed });
        const reply = res?.data?.reply ?? res?.data ?? res;

        const aiMsg: AIMessage = {
          id: generateId(),
          role: 'assistant',
          text: reply.message || reply.reply || reply.text || '',
          action: reply.action,
          data: reply.data,
          options: reply.options,
          field: reply.field,
          timestamp: Date.now(),
        };

        if (reply.action === 'ask' && reply.options?.length) {
          setActiveOptions({
            field: reply.field || '',
            options: reply.options,
            context: reply.data,
          });
        } else {
          setActiveOptions(null);
        }

        setMessages((prev) => [...prev, aiMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            text: "Sorry, I'm having trouble connecting. Please check your connection and try again.",
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setLoading(false);
        scrollToEnd();
      }
    },
    [accessToken, loading, scrollToEnd],
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || loading) {
      return;
    }
    setInput('');
    sendMessage(text);
  }, [input, loading, sendMessage]);

  const handleOptionTap = useCallback(
    (opt: string) => {
      setActiveOptions(null);
      sendMessage(opt);
    },
    [sendMessage],
  );

  const handleNavigate = useCallback(
    (id: string, name: string) => {
      navigation.navigate('SharedGroupDetail', { groupId: id, groupName: name });
    },
    [navigation],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setActiveOptions(null);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: AIMessage }) => (
      <MessageBubble
        text={item.text}
        isUser={item.role === 'user'}
        action={item.action}
        data={item.data}
        onNavigate={handleNavigate}
      />
    ),
    [handleNavigate],
  );

  const renderFooter = useCallback(() => {
    if (!loading) {
      return null;
    }
    return (
      <View style={s.typingRow}>
        <View style={s.typingBubble}>
          <TypingIndicator />
        </View>
      </View>
    );
  }, [loading]);

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Dabbu AI</Text>
            <Text style={s.headerSub}>Always here to help</Text>
          </View>
          <TouchableOpacity onPress={clearMessages} style={s.newChatBtn}>
            <Ionicons name="add-circle-outline" size={22} color="#FFD700" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyCard}>
              <Ionicons name="sparkles" size={32} color="#FFD700" />
              <Text style={s.emptyTitle}>How can I help you?</Text>
              <Text style={s.emptySub}>Ask me anything about your finances</Text>
            </View>
            <View style={s.suggestionRow}>
              {[
                'How much did I spend last month?',
                'Add ₹500 for dinner',
                'Show my top expenses',
                'Create a circle for Trip',
              ].map((sug, i) => (
                <TouchableOpacity
                  key={i}
                  style={s.sugChip}
                  onPress={() => {
                    setInput(sug);
                  }}
                >
                  <Text style={s.sugText}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollToEnd}
      />

      {activeOptions && !loading && (
        <Animated.View entering={FadeIn.duration(200)}>
          <QuickReplies options={activeOptions.options} onSelect={handleOptionTap} />
        </Animated.View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.inputWrap, { paddingBottom: Math.max(insets.bottom, 4) + TAB_BAR_HEIGHT }]}>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="Ask anything..."
              placeholderTextColor="#666"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit
            />
            <TouchableOpacity
              style={[s.sendBtn, { opacity: loading || !input.trim() ? 0.4 : 1 }]}
              onPress={handleSend}
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#0A0A0A" />
              ) : (
                <Ionicons name="arrow-up" size={20} color="#0A0A0A" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },

  header: {
    backgroundColor: '#0D0D0D',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, marginLeft: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  headerSub: { fontSize: 11, color: '#888', marginTop: 1 },
  newChatBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listContent: { paddingVertical: 12, flexGrow: 1 },

  emptyWrap: { paddingHorizontal: 16, paddingTop: 40, alignItems: 'center' },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#888', marginTop: 4 },
  suggestionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  sugChip: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sugText: { fontSize: 12, color: '#CCC' },

  typingRow: { paddingHorizontal: 16, marginBottom: 4 },
  typingBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  inputWrap: {
    backgroundColor: '#0D0D0D',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#FFF',
    maxHeight: 100,
    lineHeight: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
