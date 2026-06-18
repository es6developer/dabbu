import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { spacing, borderRadius } from '../../theme/design';

export function SupportScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'faq' | 'tickets' | 'new'>('faq');
  const [faqs, setFaqs] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/support/faq').then(r => setFaqs(r.data || [])).catch(() => {});
    api.get('/support/tickets').then(r => setTickets(r.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Required', 'Please fill in subject and message.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/support/tickets', { subject, message, category });
      Alert.alert('Submitted', 'Your ticket has been created. We will respond within 24 hours.');
      setSubject('');
      setMessage('');
      setActiveTab('tickets');
      const r = await api.get('/support/tickets');
      setTickets(r.data || []);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Support</Text>
        <View style={styles.tabs}>
          {(['faq', 'tickets', 'new'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && { backgroundColor: theme.primary + '20', borderBottomColor: theme.primary }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? theme.primary : theme.subtext }]}>
                {tab === 'faq' ? 'FAQ' : tab === 'tickets' ? 'My Tickets' : 'New Ticket'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        {activeTab === 'faq' && (
          <View>
            {faqs.map((faq: any) => (
              <TouchableOpacity
                key={faq.id}
                style={[styles.faqCard, { backgroundColor: theme.card }]}
                onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
              >
                <View style={styles.faqHeader}>
                  <Text style={[styles.faqQuestion, { color: theme.text }]}>{faq.question}</Text>
                  <Ionicons name={expandedFaq === faq.id ? 'chevron-up' : 'chevron-down'} size={20} color={theme.subtext} />
                </View>
                {expandedFaq === faq.id && (
                  <Text style={[styles.faqAnswer, { color: theme.subtext }]}>{faq.answer}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'tickets' && (
          tickets.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="ticket-outline" size={64} color={theme.muted} />
              <Text style={[styles.emptyText, { color: theme.muted }]}>No tickets yet</Text>
            </View>
          ) : (
            tickets.map((t: any) => (
              <View key={t.id} style={[styles.ticketCard, { backgroundColor: theme.card }]}>
                <View style={styles.ticketHeader}>
                  <Text style={[styles.ticketSubject, { color: theme.text }]}>{t.subject}</Text>
                  <View style={[styles.statusBadge, {
                    backgroundColor: t.status === 'open' ? '#22c55e20' : t.status === 'resolved' ? '#6366f120' : '#f9731620',
                  }]}>
                    <Text style={[styles.statusText, {
                      color: t.status === 'open' ? '#22c55e' : t.status === 'resolved' ? '#6366f1' : '#f97316',
                    }]}>{t.status}</Text>
                  </View>
                </View>
                <Text style={[styles.ticketCategory, { color: theme.muted }]}>{t.category} · {new Date(t.createdAt).toLocaleDateString()}</Text>
                {t.message ? <Text style={[styles.ticketMsg, { color: theme.subtext }]} numberOfLines={2}>{t.message}</Text> : null}
              </View>
            ))
          )
        )}

        {activeTab === 'new' && (
          <View style={[styles.formCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.formTitle, { color: theme.text }]}>Create Support Ticket</Text>

            <Text style={[styles.label, { color: theme.subtext }]}>Category</Text>
            <View style={styles.categoryRow}>
              {['general', 'technical', 'billing', 'bug', 'feature'].map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, {
                    backgroundColor: category === cat ? theme.primary + '20' : theme.border,
                    borderColor: category === cat ? theme.primary : 'transparent',
                  }]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={{
                    color: category === cat ? theme.primary : theme.subtext,
                    fontSize: 13,
                    fontWeight: '600',
                    textTransform: 'capitalize',
                  }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: theme.subtext }]}>Subject</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={subject}
              onChangeText={setSubject}
              placeholder="Brief subject"
              placeholderTextColor={theme.muted}
              maxLength={100}
            />

            <Text style={[styles.label, { color: theme.subtext }]}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your issue or question..."
              placeholderTextColor={theme.muted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: submitting ? 0.6 : 1 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>Submit Ticket</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  header: { paddingHorizontal: 20, paddingBottom: 0 },
  headerTitle: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  tabs: { flexDirection: 'row', gap: 4, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '600' },
  faqCard: { borderRadius: 12, padding: 16, marginBottom: 8 },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { fontSize: 15, fontWeight: '600', flex: 1 },
  faqAnswer: { fontSize: 14, lineHeight: 20, marginTop: 12 },
  ticketCard: { borderRadius: 12, padding: 16, marginBottom: 8 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketSubject: { fontSize: 15, fontWeight: '600', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  ticketCategory: { fontSize: 12, marginTop: 4 },
  ticketMsg: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  formCard: { borderRadius: 16, padding: 20 },
  formTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12, textTransform: 'uppercase' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15 },
  textArea: { minHeight: 120 },
  submitBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  submitText: { color: 'white', fontSize: 16, fontWeight: '700' },
  emptyText: { fontSize: 16, marginTop: 16 },
});
