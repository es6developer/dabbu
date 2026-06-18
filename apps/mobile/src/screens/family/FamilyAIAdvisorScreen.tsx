import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Insight {
  id: string;
  icon: keyof typeof AntDesign.glyphMap;
  title: string;
  description: string;
  type: 'warning' | 'success' | 'info';
}

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
}

const insights: Insight[] = [
  {
    id: '1',
    icon: 'warning',
    title: 'Spending Alert',
    description: 'Family spending is 15% above budget this month. Entertainment and dining out are the main drivers.',
    type: 'warning',
  },
  {
    id: '2',
    icon: 'checkcircle',
    title: 'Education Fund',
    description: "Education fund is on track. You are 40% towards your 30L target. Keep it up!",
    type: 'success',
  },
  {
    id: '3',
    icon: 'exclamationcircle',
    title: 'Emergency Fund Gap',
    description: "Emergency fund needs 2.5L more to reach the 6-month target. Consider increasing monthly contributions.",
    type: 'info',
  },
  {
    id: '4',
    icon: 'arrowup',
    title: 'Investment Opportunity',
    description: "Your equity portfolio returned 27.5% this year. Consider rebalancing to maintain optimal allocation.",
    type: 'success',
  },
  {
    id: '5',
    icon: 'Safety',
    title: 'Insurance Gap',
    description: "Your family life coverage is 1.2Cr, which is 60% of the recommended 2Cr. Consider additional term cover.",
    type: 'warning',
  },
];

const initialChats: ChatMessage[] = [
  {
    id: '1',
    text: "Hello! I am your Dabbu AI Financial Advisor. Ask me anything about your family finances!",
    isUser: false,
  },
  {
    id: '2',
    text: "How can I optimize my family budget?",
    isUser: true,
  },
  {
    id: '3',
    text: "Based on your spending patterns, I recommend allocating 50% to needs, 30% to wants, and 20% to savings. Your current split is 55-25-20. Consider reducing dining out and entertainment by 5% to optimize.",
    isUser: false,
  },
];

const typeConfig = {
  warning: { bgColor: '#EF444420', iconColor: '#EF4444', borderColor: '#EF444430' },
  success: { bgColor: '#10B98120', iconColor: '#10B981', borderColor: '#10B98130' },
  info: { bgColor: '#3B82F620', iconColor: '#3B82F6', borderColor: '#3B82F630' },
};

const InsightCard: React.FC<{ insight: Insight }> = ({ insight }) => {
  const config = typeConfig[insight.type];

  return (
    <View style={[styles.insightCard, { borderLeftColor: config.iconColor, backgroundColor: '#1C1C1E' }]}>
      <View style={styles.insightHeader}>
        <View style={[styles.insightIcon, { backgroundColor: config.bgColor }]}>
          <AntDesign name={insight.icon} size={18} color={config.iconColor} />
        </View>
        <Text style={styles.insightTitle}>{insight.title}</Text>
      </View>
      <Text style={styles.insightDescription}>{insight.description}</Text>
    </View>
  );
};

const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => (
  <View style={[styles.chatBubble, message.isUser ? styles.userChat : styles.aiChat]}>
    {!message.isUser && (
      <View style={styles.chatAvatar}>
        <AntDesign name="star" size={14} color="#10B981" />
      </View>
    )}
    <View style={[styles.chatContent, message.isUser ? styles.userChatContent : styles.aiChatContent]}>
      <Text style={[styles.chatText, message.isUser ? styles.userChatText : styles.aiChatText]}>
        {message.text}
      </Text>
    </View>
  </View>
);

export default function FamilyAIAdvisorScreen() {
  const insets = useSafeAreaInsets();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChats);
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
    };

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      text: "Thank you for your question! I am analyzing your family financial data. Based on your profile, I recommend reviewing your emergency fund allocation and considering increasing your monthly SIP contributions. Would you like me to prepare a detailed report?",
      isUser: false,
    };

    setChatMessages(prev => [...prev, userMsg, aiMsg]);
    setInputText('');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <AntDesign name="star" size={22} color="#0A0A0A" />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Financial Advisor</Text>
            <Text style={styles.headerSub}>Powered by Dabbu AI</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.premiumCard}>
            <View style={styles.premiumGradient}>
              <AntDesign name="star" size={32} color="#0A0A0A" />
              <Text style={styles.premiumTitle}>Dabbu AI Advisor</Text>
              <Text style={styles.premiumSubtitle}>
                Smart insights for your family financial health
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>AI Insights</Text>

          {insights.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}

          <Text style={styles.sectionTitle}>Chat with AI</Text>

          {chatMessages.map(msg => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.chatInput}
            placeholder="Ask your AI advisor..."
            placeholderTextColor="#6B7280"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <AntDesign name="message1" size={20} color={inputText.trim() ? '#0A0A0A' : '#6B7280'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  premiumCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  premiumGradient: {
    backgroundColor: '#10B981',
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  premiumTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0A0A0A',
  },
  premiumSubtitle: {
    fontSize: 14,
    color: '#0A0A0A',
    opacity: 0.8,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 12,
    marginTop: 4,
  },
  insightCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 3,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  insightDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  chatBubble: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userChat: {
    justifyContent: 'flex-end',
  },
  aiChat: {
    justifyContent: 'flex-start',
    gap: 8,
  },
  chatAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1A2E2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatContent: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  userChatContent: {
    backgroundColor: '#10B981',
    borderBottomRightRadius: 4,
  },
  aiChatContent: {
    backgroundColor: '#1C1C1E',
    borderBottomLeftRadius: 4,
  },
  chatText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userChatText: {
    color: '#0A0A0A',
  },
  aiChatText: {
    color: '#F9FAFB',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#1C1C1E',
    gap: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F9FAFB',
    maxHeight: 80,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#1C1C1E',
  },
});
