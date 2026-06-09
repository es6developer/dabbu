import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import ReAnimated, { FadeInUp } from 'react-native-reanimated';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { AI_COLORS } from './components/AiShared';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTIONS = [
  'How can I save more this month?',
  'Analyze my spending',
  'Show family financial health',
  'Will I hit my vacation goal?',
  "Predict next month's expenses",
];

export function FinancialCopilotScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) {
      return;
    }
    setInput('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.post<any>('/ai/chat', { prompt: text });
      const reply = res?.data?.reply ?? res?.data?.message ?? res?.reply ?? res?.message ?? '';
      if (reply) {
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: 'assistant', text: reply },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            text: "I couldn't process that request. Please try again.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: "Sorry, I'm having trouble connecting right now. Please check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, accessToken]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    if (item.role === 'user') {
      return (
        <ReAnimated.View entering={FadeInUp.duration(300)} style={s.userMsgWrap}>
          <View style={s.userMsg}>
            <Text style={s.userMsgText}>{item.text}</Text>
          </View>
        </ReAnimated.View>
      );
    }
    return (
      <ReAnimated.View entering={FadeInUp.duration(400)} style={s.aiMsgWrap}>
        <View style={s.aiMsgRow}>
          <View style={s.aiAvatar}>
            <Ionicons name="sparkles" size={16} color={AI_COLORS.primary} />
          </View>
          <View style={[s.aiMsg, { borderColor: AI_COLORS.border }]}>
            <Text style={s.aiMsgText}>{item.text}</Text>
          </View>
        </View>
      </ReAnimated.View>
    );
  }, []);

  return (
    <View style={[s.screen, { backgroundColor: AI_COLORS.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={AI_COLORS.text} />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>Financial Copilot</Text>
            <Text style={s.headerSub}>AI-powered financial assistant</Text>
          </View>
          <TouchableOpacity onPress={() => setMessages([])} style={s.clearBtn}>
            <Ionicons name="refresh" size={20} color={AI_COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        ListEmptyComponent={
          <ReAnimated.View entering={FadeInUp.duration(500)} style={s.emptyWrap}>
            <View style={[s.welcomeCard, { borderColor: AI_COLORS.border }]}>
              <View style={s.welcomeIcon}>
                <Ionicons name="sparkles" size={36} color={AI_COLORS.primary} />
              </View>
              <Text style={s.welcomeTitle}>Hi, I'm Dabbu AI</Text>
              <Text style={s.welcomeDesc}>
                Your personal financial copilot. Ask me anything about your money.
              </Text>
            </View>
            <View style={{ gap: 8, paddingHorizontal: 16 }}>
              <Text style={s.sugTitle}>Try asking</Text>
              {SUGGESTIONS.map((sug, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.sugChip, { borderColor: AI_COLORS.border }]}
                  onPress={() => setInput(sug)}
                >
                  <Ionicons name="chatbubble-ellipses" size={14} color={AI_COLORS.primary} />
                  <Text style={s.sugText}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ReAnimated.View>
        }
        ListFooterComponent={
          loading ? (
            <ReAnimated.View entering={FadeInUp.duration(300)} style={s.aiMsgWrap}>
              <View style={s.aiMsgRow}>
                <View style={s.aiAvatar}>
                  <Ionicons name="sparkles" size={16} color={AI_COLORS.primary} />
                </View>
                <View style={[s.aiMsg, { borderColor: AI_COLORS.border }]}>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {[0, 1, 2].map((i) => (
                      <View key={i} style={s.typingDot} />
                    ))}
                  </View>
                </View>
              </View>
            </ReAnimated.View>
          ) : null
        }
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            s.inputWrap,
            { paddingBottom: Math.max(insets.bottom, 8) + (Platform.OS === 'ios' ? 88 : 72) },
          ]}
        >
          <View style={[s.inputRow, { borderColor: AI_COLORS.border }]}>
            <TextInput
              style={s.input}
              placeholder="Ask Dabbu AI..."
              placeholderTextColor={AI_COLORS.textTertiary}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit
            />
            <TouchableOpacity
              style={[
                s.sendBtn,
                { backgroundColor: input.trim() ? AI_COLORS.primary : AI_COLORS.border },
              ]}
              onPress={handleSend}
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="arrow-up" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: AI_COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AI_COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: AI_COLORS.text },
  headerSub: { fontSize: 11, color: AI_COLORS.textTertiary, marginTop: 1 },
  clearBtn: { marginLeft: 'auto', padding: 6 },
  emptyWrap: { paddingTop: 20, gap: 20 },
  welcomeCard: {
    marginHorizontal: 16,
    backgroundColor: AI_COLORS.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: `${AI_COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomeTitle: { fontSize: 20, fontWeight: '700', color: AI_COLORS.text },
  welcomeDesc: {
    fontSize: 13,
    color: AI_COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  sugTitle: { fontSize: 13, fontWeight: '600', color: AI_COLORS.textSecondary, marginBottom: 4 },
  sugChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: AI_COLORS.card,
  },
  sugText: { fontSize: 13, color: AI_COLORS.text, flex: 1 },
  userMsgWrap: { alignItems: 'flex-end', paddingRight: 16, paddingLeft: 60, marginBottom: 8 },
  userMsg: {
    backgroundColor: AI_COLORS.primary,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userMsgText: { fontSize: 14, color: '#FFF', lineHeight: 20 },
  aiMsgWrap: { paddingLeft: 16, paddingRight: 60, marginBottom: 8 },
  aiMsgRow: { flexDirection: 'row', gap: 8 },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${AI_COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  aiMsg: {
    flex: 1,
    backgroundColor: AI_COLORS.card,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    padding: 14,
    borderWidth: 1,
  },
  aiMsgText: { fontSize: 14, color: AI_COLORS.textSecondary, lineHeight: 20 },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: AI_COLORS.textTertiary },
  inputWrap: { paddingHorizontal: 16, paddingTop: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: AI_COLORS.card,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: AI_COLORS.text,
    maxHeight: 100,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
