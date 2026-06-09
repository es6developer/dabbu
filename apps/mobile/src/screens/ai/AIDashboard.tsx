import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Clipboard,
  Share,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

const GOLD = '#FFD700';
const DARK_BG = '#0A0A0A';

type Message = {
  role: 'user' | 'assistant';
  text: string;
  action?: string;
  data?: any;
};

const PRESET_PROMPTS = [
  { icon: '💰', label: 'Summary', prompt: 'Summarize my last 30 days of expenses' },
  {
    icon: '📊',
    label: 'Groups',
    prompt: 'Create spending groups (Food, Transport, Entertainment, Bills)',
  },
  { icon: '🏷️', label: 'Space', prompt: 'Create a new space for Vacation Fund' },
  { icon: '➕', label: 'Expense', prompt: 'Add expense: Coffee $4.50' },
  { icon: '📅', label: 'Rent Group', prompt: 'Create group: Monthly Rent with Roommates' },
  { icon: '📈', label: 'Save', prompt: 'Show me where I can save money this month' },
  { icon: '🔔', label: 'Alert', prompt: 'Set budget alert for Dining when over $200' },
  { icon: '📎', label: 'Receipt', prompt: 'Attach receipt to last expense' },
];

const STORAGE_KEY_RECENT = '@dabbu_ai_recent_commands';

export function AIDashboard() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { accessToken } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const pulse = useSharedValue(1);

  useEffect(() => {
    loadRecentCommands();
  }, []);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, []);

  const pulseAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  async function loadRecentCommands() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_RECENT);
      if (stored) {
        setRecentCommands(JSON.parse(stored));
      }
    } catch {
      /* ignore */
    }
  }

  async function saveRecentCommand(cmd: string) {
    try {
      const updated = [cmd, ...recentCommands.filter((c) => c !== cmd)].slice(0, 5);
      setRecentCommands(updated);
      await AsyncStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  }

  function scrollToBottom() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  }

  async function handleSend(prompt?: string) {
    const text = (prompt || input).trim();
    if (!text || loading) {
      return;
    }
    setInput('');
    setShowRecent(false);

    const userMsg: Message = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    scrollToBottom();
    saveRecentCommand(text);

    setLoading(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.post<any>('/ai/chat', { prompt: text });
      const response = res?.data || res;
      const assistantMsg: Message = {
        role: 'assistant',
        text: response.message || 'I processed your request.',
        action: response.action,
        data: response.data,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `⚠️ ${e.message || 'Something went wrong. Try again.'}` },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  function formatResponse(text: string): React.ReactNode[] {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={i} style={{ fontWeight: '800', color: GOLD }}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      return <Text key={i}>{part}</Text>;
    });
  }

  function renderMessage(msg: Message, i: number) {
    const isUser = msg.role === 'user';
    return (
      <View key={i} style={[s.msgRow, isUser ? s.msgRowUser : s.msgRowAI]}>
        {!isUser && (
          <View style={s.aiAvatar}>
            <Ionicons name="sparkles" size={16} color={DARK_BG} />
          </View>
        )}
        <View
          style={[
            s.msgBubble,
            isUser
              ? [s.msgBubbleUser, { backgroundColor: `${colors.accent.primary}20` }]
              : [
                  s.msgBubbleAI,
                  { backgroundColor: colors.bg.card, borderColor: colors.border.default },
                ],
          ]}
        >
          {msg.action && !isUser && (
            <View style={[s.actionBadge, { backgroundColor: `${GOLD}20` }]}>
              <Ionicons name="flash" size={12} color={GOLD} />
              <Text style={s.actionBadgeText}>{msg.action.replace(/_/g, ' ')}</Text>
            </View>
          )}
          <Text
            style={[
              s.msgText,
              { color: isUser ? colors.accent.primary : colors.text.primary },
              isUser && { fontWeight: '600' },
            ]}
          >
            {formatResponse(msg.text)}
          </Text>
          {!isUser && (
            <View style={s.msgActions}>
              <TouchableOpacity
                onPress={() => Clipboard.setString(msg.text)}
                style={s.msgActionBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="copy-outline" size={14} color={colors.text.tertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Share.share({ message: msg.text })}
                style={s.msgActionBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="share-outline" size={14} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* ── Header ──────────────────────────── */}
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: colors.text.primary }]}>AI Money Assistant</Text>
            <Text style={[s.headerSub, { color: colors.text.tertiary }]}>Powered by DeepSeek</Text>
          </View>
          <Animated.View style={[s.deepSeekBadge, { backgroundColor: `${GOLD}18` }, pulseAnim]}>
            <Ionicons name="sparkles" size={14} color={GOLD} />
            <Text style={s.deepSeekBadgeText}>DeepSeek</Text>
          </Animated.View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              {/* ── Predefined Prompt Cards ────────── */}
              <Text style={[s.sectionLabel, { color: colors.text.secondary }]}>Try asking...</Text>
              <View style={s.promptGrid}>
                {PRESET_PROMPTS.map((p, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      s.promptCard,
                      { backgroundColor: colors.bg.card, borderColor: colors.border.default },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleSend(p.prompt)}
                  >
                    <Text style={s.promptIcon}>{p.icon}</Text>
                    <Text
                      style={[s.promptLabel, { color: colors.text.secondary }]}
                      numberOfLines={1}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Recent Commands ──────────────── */}
              {recentCommands.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <TouchableOpacity
                    style={[s.recentHeader, { borderColor: colors.border.default }]}
                    onPress={() => setShowRecent(!showRecent)}
                  >
                    <Ionicons name="time-outline" size={16} color={colors.text.tertiary} />
                    <Text style={[s.recentTitle, { color: colors.text.secondary }]}>Recent</Text>
                    <Ionicons
                      name={showRecent ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={colors.text.tertiary}
                    />
                  </TouchableOpacity>
                  {showRecent && (
                    <View style={{ marginTop: 8, gap: 6 }}>
                      {recentCommands.map((cmd, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[
                            s.recentItem,
                            { backgroundColor: colors.bg.card, borderColor: colors.border.default },
                          ]}
                          onPress={() => handleSend(cmd)}
                        >
                          <Ionicons name="sparkles" size={12} color={GOLD} />
                          <Text
                            style={[s.recentItemText, { color: colors.text.secondary }]}
                            numberOfLines={1}
                          >
                            {cmd}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 10 }}>
              {/* ── Show prompt suggestions after first response ── */}
              {messages.map(renderMessage)}
              {loading && (
                <View style={[s.msgRow, s.msgRowAI]}>
                  <View style={s.aiAvatar}>
                    <Ionicons name="sparkles" size={16} color={DARK_BG} />
                  </View>
                  <View
                    style={[
                      s.msgBubbleAI,
                      { backgroundColor: colors.bg.card, borderColor: colors.border.default },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={GOLD} />
                      <Text style={[s.msgText, { color: colors.text.tertiary, marginLeft: 4 }]}>
                        Thinking...
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* ── Suggested Follow-ups (after last response) ── */}
        {messages.length > 0 && !loading && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
            style={{ maxHeight: 44 }}
          >
            {['Follow up...', 'Explain more', 'Show details', 'What next?'].map((sug, i) => (
              <TouchableOpacity
                key={i}
                style={[s.suggestChip, { backgroundColor: `${GOLD}12`, borderColor: `${GOLD}25` }]}
                onPress={() => handleSend(sug)}
              >
                <Text style={s.suggestChipText}>{sug}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Input Area ───────────────────────── */}
        <View
          style={[
            s.inputArea,
            {
              backgroundColor: colors.bg.secondary,
              borderColor: colors.border.default,
              paddingBottom: Math.max(insets.bottom, 8),
            },
          ]}
        >
          <TouchableOpacity
            style={[s.voiceBtn, { backgroundColor: `${GOLD}12` }]}
            onPress={() => handleSend('Open voice input (coming soon)')}
          >
            <Ionicons name="mic-outline" size={20} color={GOLD} />
          </TouchableOpacity>
          <TextInput
            style={[
              s.textInput,
              {
                color: colors.text.primary,
                backgroundColor: colors.bg.tertiary,
                borderColor: '#ac99d7',
              },
            ]}
            placeholder="Type anything... e.g., 'Add dinner $25'"
            placeholderTextColor={colors.text.tertiary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
            blurOnSubmit
          />
          <TouchableOpacity
            style={[s.sendBtn, { backgroundColor: loading ? colors.text.tertiary : GOLD }]}
            onPress={() => handleSend()}
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color={DARK_BG} />
            ) : (
              <Ionicons name="send" size={18} color={DARK_BG} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  deepSeekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  deepSeekBadgeText: { fontSize: 11, fontWeight: '700', color: GOLD },

  sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 12, letterSpacing: 0.3 },

  promptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  promptCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  promptIcon: { fontSize: 22 },
  promptLabel: { fontSize: 12, fontWeight: '600', flex: 1 },

  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  recentTitle: { fontSize: 13, fontWeight: '600', flex: 1 },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  recentItemText: { fontSize: 13, fontWeight: '500', flex: 1 },

  msgRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start', gap: 8 },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  msgBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  msgBubbleUser: {
    borderBottomRightRadius: 4,
  },
  msgBubbleAI: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: GOLD,
    textTransform: 'capitalize',
  },
  msgActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  msgActionBtn: {
    padding: 2,
  },

  suggestChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggestChipText: { fontSize: 12, fontWeight: '600', color: GOLD },

  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  voiceBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
