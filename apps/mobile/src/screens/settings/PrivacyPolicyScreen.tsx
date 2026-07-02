import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';

const SECTIONS = [
  { title: 'Information We Collect', content: 'We collect information you provide directly such as your name, email, phone number, and financial data you choose to link. We also collect SMS transaction data with your explicit permission to automatically categorize expenses.' },
  { title: 'How We Use Your Data', content: 'Your data is used to provide and improve our services including transaction categorization, spending insights, bill reminders, and family sharing features. We never sell your personal data to third parties.' },
  { title: 'Data Security', content: 'We implement industry-standard encryption and security measures. All data is encrypted at rest and in transit. We use token-based authentication and session management to protect your account.' },
  { title: 'SMS Data', content: 'SMS data is processed locally on your device where possible. When processed on our servers, it is encrypted and used solely for financial categorization. You can revoke SMS access at any time.' },
  { title: 'Third-Party Services', content: 'We may integrate with third-party services for bank linking and analytics. These services have their own privacy policies and data handling practices.' },
  { title: 'Your Rights', content: 'You can access, update, or delete your personal data at any time through your account settings. Contact us for data portability requests.' },
  { title: 'Contact', content: 'For privacy-related inquiries, contact us at privacy@dabbu.app' },
];

export function PrivacyPolicyScreen() {
  const { colors } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text.primary }]}>Privacy Policy</Text>
      <Text style={[styles.date, { color: colors.text.tertiary }]}>Last updated: May 2026</Text>

      <Text style={[styles.intro, { color: colors.text.secondary }]}>
        Your privacy is important to us. This policy outlines how Dabbu collects, uses, and protects your information.
      </Text>

      {SECTIONS.map((s, i) => (
        <View key={i} style={[styles.section, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{s.title}</Text>
          <Text style={[styles.sectionContent, { color: colors.text.secondary }]}>{s.content}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 120 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: spacing.xs },
  date: { fontSize: 16, marginBottom: spacing.xl },
  intro: { fontSize: 16, lineHeight: 24, marginBottom: spacing['2xl'] },
  section: { borderRadius: 28, padding: spacing.lg, borderWidth: 1.5, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  sectionContent: { fontSize: 16, lineHeight: 24 },
});
