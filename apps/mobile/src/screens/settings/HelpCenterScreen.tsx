import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

const FAQS = [
  { q: 'How do I link a bank account?', a: 'Go to Accounts tab and tap the + button. Select your bank provider and authenticate.' },
  { q: 'How does SMS detection work?', a: 'We read financial SMS to automatically categorize transactions. SMS data stays on your device.' },
  { q: 'Can I set up recurring reminders?', a: 'Yes, create a reminder and enable Recurring option with your preferred frequency.' },
  { q: 'Is my data secure?', a: 'All data is encrypted in transit and at rest. We use bank-level security protocols.' },
];

export function HelpCenterScreen() {
  const { colors } = useTheme();
  const [expanded, setExpanded] = React.useState<number | null>(null);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text.primary }]}>Help Center</Text>
      <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>Find answers to common questions</Text>

      <TouchableOpacity style={[styles.supportBtn, { backgroundColor: colors.accent.primary }]} onPress={() => Linking.openURL('mailto:support@dabbu.app')}>
        <Ionicons name="mail" size={20} color="#FFFFFF" />
        <Text style={styles.supportBtnText}>Contact Support</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Frequently Asked Questions</Text>
      {FAQS.map((faq, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.faqCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}
          onPress={() => setExpanded(expanded === i ? null : i)}
          activeOpacity={0.7}
        >
          <View style={styles.faqHeader}>
            <Text style={[styles.faqQ, { color: colors.text.primary }]}>{faq.q}</Text>
            <Ionicons name={expanded === i ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text.tertiary} />
          </View>
          {expanded === i && (
            <Text style={[styles.faqA, { color: colors.text.secondary }]}>{faq.a}</Text>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  supportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginBottom: 28 },
  supportBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  faqCard: { padding: 16, borderRadius: 14, marginBottom: 8, borderWidth: 1 },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { fontSize: 15, fontWeight: '500', flex: 1, marginRight: 8 },
  faqA: { fontSize: 14, marginTop: 12, lineHeight: 20 },
});
