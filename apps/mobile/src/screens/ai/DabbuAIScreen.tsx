import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';

function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const TABS = ['Insights', 'Savings', 'Goals', 'Ask Dabbu'] as const;

export function DabbuAIScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Insights');
  const [insights, setInsights] = useState<any[]>([]);
  const [healthScore, setHealthScore] = useState<any>(null);
  const [savingsOpps, setSavingsOpps] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: string; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const indicatorPos = useRef(new Animated.Value(0)).current;
  const tabW = 80;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [insRes, healthRes, saveRes, predRes] = await Promise.all([
        api.get('/ai/insights?section=dashboard').catch(() => ({})),
        api.get('/ai/health-score').catch(() => ({})),
        api.get('/ai/savings-opportunities').catch(() => ({})),
        api.get('/ai/predictions').catch(() => ({})),
      ]);
      const ires = insRes as any;
      setInsights(Array.isArray(ires?.data) ? ires.data : []);
      setHealthScore((healthRes as any)?.data || healthRes);
      const sres = saveRes as any;
      setSavingsOpps(Array.isArray(sres?.data) ? sres.data : []);
      setPredictions((predRes as any)?.data || predRes);
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const switchTab = (tab: typeof TABS[number], idx: number) => {
    setActiveTab(tab);
    Animated.spring(indicatorPos, { toValue: idx * tabW, tension: 120, friction: 10, useNativeDriver: true }).start();
  };

  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatLoading(true);
    try {
      const res = await api.post('/ai/chat', { prompt: msg });
      const r = res as any;
      const reply = r?.data?.response || r?.data?.text || r?.data?.message || 'Could not process your request.';
      setChatMessages(prev => [...prev, { role: 'assistant', text: typeof reply === 'string' ? reply : JSON.stringify(reply) }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I encountered an error.' }]);
    }
    setChatLoading(false);
  };

  const overallScore = healthScore?.overallScore || 0;
  const level = healthScore?.financialLevel || '';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={[styles.greeting, { color: colors.text.tertiary }]}>AI Intelligence</Text>
        <Text style={[styles.title, { color: colors.text.primary }]}>Dabbu AI</Text>
      </View>

      <View style={[styles.tabBar, { backgroundColor: colors.bg.tertiary }]}>
        {TABS.map((tab, idx) => (
          <TouchableOpacity key={tab} style={styles.tab} onPress={() => switchTab(tab, idx)}>
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.text.primary : colors.text.tertiary, fontWeight: activeTab === tab ? '600' : '400' }]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {activeTab === 'Insights' && (
          <>
            {healthScore && (
              <TouchableOpacity
                style={[styles.healthCard, { backgroundColor: colors.card.balance }]}
                onPress={() => navigation.navigate('Home', { screen: 'HomeMain', params: { section: 'healthScore' } })}
              >
                <View>
                  <Text style={[styles.healthLabel, { color: colors.text.secondary }]}>Dabbu Health Score</Text>
                  <Text style={[styles.healthScore, { color: colors.text.primary }]}>{overallScore}/100</Text>
                  <Text style={[styles.healthLevel, { color: colors.text.tertiary }]}>{level}</Text>
                </View>
                <View style={[styles.healthRing, {
                  borderColor: overallScore >= 70 ? colors.status.success : overallScore >= 40 ? colors.status.warning : colors.status.error,
                }]}>
                  <Text style={[styles.healthRingText, {
                    color: overallScore >= 70 ? colors.status.success : overallScore >= 40 ? colors.status.warning : colors.status.error,
                  }]}>{overallScore}</Text>
                </View>
              </TouchableOpacity>
            )}

            {insights.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Ionicons name="bulb-outline" size={32} color={colors.text.tertiary} />
                <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                  Add more transactions to get personalized insights.
                </Text>
              </View>
            )}

            {insights.map((insight: any, i: number) => (
              <View key={i} style={[styles.insightCard, { backgroundColor: colors.bg.card }]}>
                <View style={[styles.insightDot, { backgroundColor: insight.type === 'warning' ? colors.status.error : colors.accent.primary }]} />
                <View style={styles.insightContent}>
                  <Text style={[styles.insightTitle, { color: colors.text.primary }]}>{insight.title || 'Insight'}</Text>
                  <Text style={[styles.insightDesc, { color: colors.text.secondary }]}>{insight.description || insight.message || insight.text}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {activeTab === 'Savings' && (
          <>
            {predictions?.endOfMonthBalance && (
              <View style={[styles.predictCard, { backgroundColor: colors.card.income }]}>
                <Ionicons name="trending-up" size={20} color={colors.status.success} />
                <View style={styles.predictInfo}>
                  <Text style={[styles.predictLabel, { color: colors.text.secondary }]}>Projected Month End</Text>
                  <Text style={[styles.predictValue, { color: colors.status.success }]}>
                    {fmt(predictions.endOfMonthBalance)}
                  </Text>
                </View>
              </View>
            )}

            {savingsOpps.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Ionicons name="wallet-outline" size={32} color={colors.text.tertiary} />
                <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                  No savings opportunities found yet. Keep tracking expenses!
                </Text>
              </View>
            )}

            {savingsOpps.map((opp: any, i: number) => (
              <View key={i} style={[styles.savingCard, { backgroundColor: colors.bg.card }]}>
                <Ionicons name="pricetag-outline" size={18} color={colors.status.success} />
                <View style={styles.savingInfo}>
                  <Text style={[styles.savingTitle, { color: colors.text.primary }]}>{opp.title || opp.category || 'Opportunity'}</Text>
                  <Text style={[styles.savingDesc, { color: colors.text.secondary }]}>
                    Save up to {opp.potentialSavings ? fmt(opp.potentialSavings) : 'more'} per month
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {activeTab === 'Goals' && (
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={32} color={colors.text.tertiary} />
            <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
              AI-powered goal coaching coming soon. Set a goal to get started.
            </Text>
          </View>
        )}

        {(activeTab === 'Ask Dabbu') && (
          <View style={styles.chatContainer}>
            <ScrollView style={styles.chatScroll} contentContainerStyle={styles.chatScrollInner}>
              {chatMessages.length === 0 && (
                <View style={styles.chatEmpty}>
                  <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.text.tertiary} />
                  <Text style={[styles.chatEmptyTitle, { color: colors.text.primary }]}>Ask Dabbu anything</Text>
                  <Text style={[styles.chatEmptyDesc, { color: colors.text.tertiary }]}>
                    Try: "How much did I spend on food this month?" or "Create a budget for groceries"
                  </Text>
                </View>
              )}
              {chatMessages.map((msg, i) => (
                <View key={i} style={[styles.chatMsg, { alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }]}>
                  <View style={[styles.chatBubble, {
                    backgroundColor: msg.role === 'user' ? colors.accent.primary : colors.bg.tertiary,
                  }]}>
                    <Text style={[styles.chatText, { color: msg.role === 'user' ? '#FFF' : colors.text.primary }]}>
                      {msg.text}
                    </Text>
                  </View>
                </View>
              ))}
              {chatLoading && (
                <View style={[styles.chatMsg, { alignSelf: 'flex-start' }]}>
                  <View style={[styles.chatBubble, { backgroundColor: colors.bg.tertiary }]}>
                    <Text style={[{ color: colors.text.tertiary }]}>Thinking...</Text>
                  </View>
                </View>
              )}
            </ScrollView>
            <View style={[styles.chatInputRow, { backgroundColor: colors.bg.primary, borderTopColor: colors.border.subtle }]}>
              <TextInput
                style={[styles.chatInput, { backgroundColor: colors.bg.tertiary, color: colors.text.primary }]}
                placeholder="Ask Dabbu..."
                placeholderTextColor={colors.text.tertiary}
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
              />
              <TouchableOpacity onPress={sendMessage} disabled={chatLoading || !chatInput.trim()}>
                <Ionicons name="send" size={20} color={chatInput.trim() ? colors.accent.primary : colors.text.tertiary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  greeting: { fontSize: 13, fontWeight: '500', letterSpacing: 0.3 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginTop: 2 },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    padding: 3,
    marginBottom: spacing.md,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  tabText: { fontSize: 13, letterSpacing: 0.2 },
  content: { flex: 1 },
  contentInner: { padding: spacing.xl, paddingBottom: 100 },
  healthCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: borderRadius['3xl'],
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  healthLabel: { fontSize: 12, fontWeight: '500' },
  healthScore: { fontSize: 24, fontWeight: '700', marginTop: 2 },
  healthLevel: { fontSize: 13, marginTop: 1, textTransform: 'capitalize' },
  healthRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  healthRingText: { fontSize: 18, fontWeight: '800' },
  insightCard: { flexDirection: 'row', borderRadius: borderRadius['2xl'], padding: spacing.lg, marginBottom: spacing.sm, gap: spacing.md },
  insightDot: { width: 4, borderRadius: 2, marginTop: 4 },
  insightContent: { flex: 1 },
  insightTitle: { fontSize: 14, fontWeight: '600' },
  insightDesc: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  predictCard: { flexDirection: 'row', borderRadius: borderRadius['2xl'], padding: spacing.lg, marginBottom: spacing.md, gap: spacing.md, alignItems: 'center' },
  predictInfo: { flex: 1 },
  predictLabel: { fontSize: 12 },
  predictValue: { fontSize: 20, fontWeight: '700', marginTop: 1 },
  savingCard: { flexDirection: 'row', borderRadius: borderRadius['2xl'], padding: spacing.lg, marginBottom: spacing.sm, gap: spacing.md, alignItems: 'center' },
  savingInfo: { flex: 1 },
  savingTitle: { fontSize: 14, fontWeight: '600' },
  savingDesc: { fontSize: 12, marginTop: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: spacing.md },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  chatContainer: { flex: 1, minHeight: 400 },
  chatScroll: { flex: 1 },
  chatScrollInner: { paddingBottom: spacing.md },
  chatEmpty: { alignItems: 'center', paddingVertical: 40, gap: spacing.md },
  chatEmptyTitle: { fontSize: 18, fontWeight: '600' },
  chatEmptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  chatMsg: { marginBottom: spacing.sm, maxWidth: '80%' },
  chatBubble: { borderRadius: borderRadius['2xl'], padding: spacing.md },
  chatText: { fontSize: 14, lineHeight: 20 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  chatInput: { flex: 1, borderRadius: borderRadius['2xl'], paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, fontSize: 14 },
});
