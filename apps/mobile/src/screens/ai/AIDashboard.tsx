import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, typography } from '../../theme';
import { spacing, borderRadius } from '../../theme';
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
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W } = Dimensions.get('window');
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 72;

type Message = {
  role: 'user' | 'assistant';
  text: string;
  action?: string;
  data?: any;
};

const PRESET_PROMPTS = [
  {
    icon: 'wallet-outline',
    label: 'Summary',
    prompt: 'Summarize my last 30 days of expenses',
    color: '#34C759',
  },
  {
    icon: 'layers-outline',
    label: 'Groups',
    prompt: 'Create spending groups (Food, Transport, Entertainment, Bills)',
    color: '#8B5CF6',
  },
  {
    icon: 'add-circle-outline',
    label: 'Space',
    prompt: 'Create a new space for Vacation Fund',
    color: '#3B82F6',
  },
  { icon: 'cash-outline', label: 'Expense', prompt: 'Add expense: Coffee $4.50', color: '#F59E0B' },
  {
    icon: 'people-outline',
    label: 'Rent Group',
    prompt: 'Create group: Monthly Rent with Roommates',
    color: '#EC4899',
  },
  {
    icon: 'trending-down-outline',
    label: 'Save',
    prompt: 'Show me where I can save money this month',
    color: '#10B981',
  },
  {
    icon: 'notifications-outline',
    label: 'Alert',
    prompt: 'Set budget alert for Dining when over $200',
    color: '#FF4D4F',
  },
  {
    icon: 'camera-outline',
    label: 'Receipt',
    prompt: 'Attach receipt to last expense',
    color: '#6366F1',
  },
];

const STORAGE_KEY_RECENT = '@dabbu_ai_recent_commands';

export function AIDashboard() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { accessToken } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);

  const scrollRef = useRef<Animated.ScrollView>(null);
  const pulse = useSharedValue(1);

  useEffect(() => {
    loadRecentCommands();
  }, []);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
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
      // ignore
    }
  }

  async function saveRecentCommand(cmd: string) {
    try {
      const updated = [cmd, ...recentCommands.filter((c) => c !== cmd)].slice(0, 5);
      setRecentCommands(updated);
      await AsyncStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(updated));
    } catch {
      // ignore
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

    setMessages((prev) => [...prev, { role: 'user', text }]);
    scrollToBottom();
    saveRecentCommand(text);

    setLoading(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.post<any>('/ai/chat', { prompt: text });
      const response = res?.data || res;
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: response.message || 'I processed your request.',
          action: response.action,
          data: response.data,
        },
      ]);
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
          <Text key={i} style={{ fontWeight: '800', color: colors.accent.primary }}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      return <Text key={i}>{part}</Text>;
    });
  }

  function renderRichCard(msg: Message) {
    const { action, data } = msg;
    const d = data || {};

    if (action === 'create_group' || action === 'create_space') {
      const entity = d.groupName || d.name || d.group?.name || '';
      return (
        <View
          style={[
            s.actionCard,
            { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
          ]}
        >
          <View style={[s.actionCardAccent, { backgroundColor: colors.accent.primary }]} />
          <LinearGradient
            colors={[colors.accent.primary, colors.brand.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.actionCardIcon}
          >
            <Ionicons name="people-outline" size={18} color="#FFF" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[s.actionCardTitle, { color: colors.text.primary }]}>
              {entity || 'Group'} created
            </Text>
            <Text style={[s.actionCardDesc, { color: colors.text.tertiary }]} numberOfLines={2}>
              {msg.text || 'Your space is ready'}
            </Text>
            <TouchableOpacity
              style={[s.actionCardBtn, { backgroundColor: colors.accent.primary }]}
              onPress={() => {
                const id = d.groupId || d.id || d.group?.id;
                if (id) {
                  navigation.navigate('SharedGroupDetail', { groupId: id, groupName: entity });
                }
              }}
            >
              <Ionicons name="open-outline" size={14} color="#FFF" />
              <Text style={s.actionCardBtnText}>Open Space</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (action === 'add_expense') {
      const amt = d.amount || d.expense?.amount || 0;
      const label = d.description || d.expense?.description || 'Expense';
      return (
        <View
          style={[
            s.actionCard,
            { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
          ]}
        >
          <View style={[s.actionCardAccent, { backgroundColor: '#34C759' }]} />
          <View style={[s.actionCardIconSm, { backgroundColor: '#34C75918' }]}>
            <Ionicons name="cash-outline" size={18} color="#34C759" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.actionCardTitle, { color: colors.text.primary }]}>
              {'\u20B9' + Number(amt).toLocaleString('en-IN')}
            </Text>
            <Text style={[s.actionCardDesc, { color: colors.text.tertiary }]} numberOfLines={2}>
              {label}
            </Text>
          </View>
        </View>
      );
    }

    return null;
  }

  function renderMessage(msg: Message, i: number) {
    const isUser = msg.role === 'user';
    const rich = !isUser ? renderRichCard(msg) : null;
    return (
      <View key={i} style={[s.msgRow, isUser ? s.msgRowUser : s.msgRowAI]}>
        {!isUser && (
          <LinearGradient
            colors={[colors.accent.primary, colors.brand.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.aiAvatar]}
          >
            <Ionicons name="sparkles" size={14} color="#FFF" />
          </LinearGradient>
        )}
        <View
          style={[
            s.msgBubble,
            isUser
              ? [s.msgBubbleUser, { backgroundColor: `${colors.accent.primary}18` }]
              : [
                  s.msgBubbleAI,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  },
                ],
            rich && { paddingBottom: 6 },
          ]}
        >
          {msg.action && !isUser && (
            <View style={[s.actionBadge, { backgroundColor: `${colors.accent.primary}14` }]}>
              <Ionicons name="flash" size={11} color={colors.accent.primary} />
              <Text style={[s.actionBadgeText, { color: colors.accent.primary }]}>
                {msg.action.replace(/_/g, ' ')}
              </Text>
            </View>
          )}
          {rich || (
            <Text
              style={[
                s.msgText,
                { color: isUser ? colors.accent.primary : colors.text.primary },
                isUser && { fontWeight: '600' },
              ]}
            >
              {formatResponse(msg.text)}
            </Text>
          )}
          {rich}
          {!isUser && !rich && (
            <View style={s.msgActions}>
              <TouchableOpacity
                onPress={() => Share.share({ message: msg.text })}
                style={s.msgActionBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="share-outline" size={13} color={colors.text.tertiary} />
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
        {/* ── Glass Header ─────────────── */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 80 : 100}
          tint={isDark ? 'dark' : 'light'}
          style={[s.headerBlur, { paddingTop: insets.top + 8 }]}
        >
          <View style={s.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[s.backBtn, { backgroundColor: `${colors.text.primary}10` }]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 4 }}>
              <Text style={[s.headerTitle, { color: colors.text.primary }]}>AI Assistant</Text>
              <Text style={[s.headerSub, { color: colors.text.tertiary }]}>
                Powered by DeepSeek
              </Text>
            </View>
            <Animated.View style={[s.badgeWrap, pulseAnim]}>
              <LinearGradient
                colors={[colors.accent.primary, colors.brand.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.badgeGradient}
              >
                <Ionicons name="sparkles" size={12} color="#FFF" />
                <Text style={s.badgeText}>AI</Text>
              </LinearGradient>
            </Animated.View>
          </View>
        </BlurView>

        {/* ── Messages ─────────────────── */}
        <Animated.ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
              <View
                style={[
                  s.welcomeCard,
                  { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
                ]}
              >
                <LinearGradient
                  colors={[colors.accent.primary, colors.brand.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.welcomeIcon}
                >
                  <Ionicons name="sparkles" size={20} color="#FFF" />
                </LinearGradient>
                <Text style={[s.welcomeTitle, { color: colors.text.primary }]}>
                  What can I help with?
                </Text>
                <Text style={[s.welcomeSub, { color: colors.text.tertiary }]}>
                  Ask me anything about your finances
                </Text>
              </View>

              <Text style={[s.sectionLabel, { color: colors.text.secondary }]}>Try asking...</Text>
              <View style={s.promptGrid}>
                {PRESET_PROMPTS.map((p, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      s.promptCard,
                      { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleSend(p.prompt)}
                  >
                    <View style={[s.promptIconBox, { backgroundColor: `${p.color}14` }]}>
                      <Ionicons name={p.icon as any} size={18} color={p.color} />
                    </View>
                    <Text
                      style={[s.promptLabel, { color: colors.text.secondary }]}
                      numberOfLines={1}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {recentCommands.length > 0 && (
                <View style={{ marginTop: 24 }}>
                  <TouchableOpacity
                    style={[s.recentHeader, { borderColor: colors.border.subtle }]}
                    onPress={() => setShowRecent(!showRecent)}
                  >
                    <Ionicons name="time-outline" size={15} color={colors.text.tertiary} />
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
                            { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
                          ]}
                          onPress={() => handleSend(cmd)}
                        >
                          <View style={[s.recentDot, { backgroundColor: colors.accent.primary }]} />
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
            <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 8 }}>
              {messages.map(renderMessage)}
              {loading && (
                <View style={[s.msgRow, s.msgRowAI]}>
                  <LinearGradient
                    colors={[colors.accent.primary, colors.brand.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[s.aiAvatar]}
                  >
                    <Ionicons name="sparkles" size={14} color="#FFF" />
                  </LinearGradient>
                  <View
                    style={[
                      s.msgBubbleAI,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(255,255,255,0.8)',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={colors.accent.primary} />
                      <Text style={[s.msgText, { color: colors.text.tertiary }]}>Thinking...</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </Animated.ScrollView>

        {/* ── Suggested Follow-ups ──────── */}
        {messages.length > 0 && !loading && (
          <View style={[s.suggestBar, { borderColor: colors.border.subtle }]}>
            <Animated.ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
            >
              {['Follow up', 'Explain more', 'Show details', 'What next?'].map((sug, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.suggestChip,
                    {
                      backgroundColor: `${colors.accent.primary}10`,
                      borderColor: `${colors.accent.primary}20`,
                    },
                  ]}
                  onPress={() => handleSend(sug)}
                >
                  <Text style={[s.suggestChipText, { color: colors.accent.primary }]}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </Animated.ScrollView>
          </View>
        )}

        {/* ── Glass Input Area ──────────── */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 80 : 100}
          tint={isDark ? 'dark' : 'light'}
          style={[
            s.inputBlur,
            { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
          ]}
        >
          <View
            style={[s.inputRow, { paddingBottom: Math.max(insets.bottom, 4) + TAB_BAR_HEIGHT }]}
          >
            <TouchableOpacity
              style={[s.attachBtn, { backgroundColor: `${colors.text.primary}8` }]}
              onPress={() => handleSend('Open voice input (coming soon)')}
            >
              <Ionicons name="mic-outline" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
            <View
              style={[
                s.inputField,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                  borderColor: colors.border.subtle,
                },
              ]}
            >
              <TextInput
                style={[s.textInput, { color: colors.text.primary }]}
                placeholder="Ask anything..."
                placeholderTextColor={colors.text.tertiary}
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={() => handleSend()}
                blurOnSubmit
              />
            </View>
            <TouchableOpacity
              style={[
                s.sendBtn,
                {
                  backgroundColor: loading ? colors.text.tertiary : colors.accent.primary,
                  opacity: loading || !input.trim() ? 0.5 : 1,
                },
              ]}
              onPress={() => handleSend()}
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="send" size={16} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  headerBlur: {
    paddingBottom: 12,
    borderBottomWidth: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  headerSub: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  badgeWrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },

  welcomeCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
  },
  welcomeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  welcomeSub: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },

  sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10, letterSpacing: 0.3 },

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
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  promptIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptLabel: { fontSize: 12, fontWeight: '600', flex: 1 },

  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  recentTitle: { fontSize: 13, fontWeight: '600', flex: 1 },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  recentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  recentItemText: { fontSize: 13, fontWeight: '500', flex: 1 },

  msgRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start', gap: 8 },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    textTransform: 'capitalize',
  },
  msgActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    justifyContent: 'flex-end',
  },
  msgActionBtn: {
    padding: 2,
  },

  suggestBar: {
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  suggestChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggestChipText: { fontSize: 12, fontWeight: '600' },

  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  actionCardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  actionCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardIconSm: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionCardDesc: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  actionCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  actionCardBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },

  inputBlur: {
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  inputField: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
  },
  textInput: {
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 80,
    padding: 0,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
