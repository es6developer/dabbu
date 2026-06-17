import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';

const CONTACT_OPTIONS = [
  { icon: 'mail' as const, label: 'Email Us', value: 'support@dabbu.app', action: 'mailto:support@dabbu.app' },
  { icon: 'phone' as const, label: 'Call Us', value: '1800-123-4567', action: 'tel:18001234567' },
  { icon: 'earth' as const, label: 'Website', value: 'www.dabbu.app', action: 'https://dabbu.app' },
  { icon: 'twitter' as const, label: 'Twitter', value: '@dabbu_app', action: 'https://twitter.com/dabbu_app' },
];

export function ContactUsScreen() {
  const { colors } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
<View style={[styles.heroIcon, { backgroundColor: colors.bg.secondary }]}>
          <AntDesign  name="message1" size={40} color={colors.accent.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text.primary }]}>Get in Touch</Text>
        <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>We'd love to hear from you</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Contact Options</Text>
      {CONTACT_OPTIONS.map((opt, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.card, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.bg.secondary }]}>
            <AntDesign name={opt.icon as any} size={22} color={colors.accent.primary} />
          </View>
          <View style={styles.info}>
            <Text style={[styles.label, { color: colors.text.primary }]}>{opt.label}</Text>
            <Text style={[styles.value, { color: colors.text.tertiary }]}>{opt.value}</Text>
          </View>
          <AntDesign name="folder1" size={18} color={colors.text.tertiary} />
        </TouchableOpacity>
      ))}

      <View style={[styles.responseCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
        <AntDesign  name="clockcircleo" size={20} color={colors.accent.primary} />
        <Text style={[styles.responseText, { color: colors.text.secondary }]}>
          We typically respond within 24 hours during business days.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing['2xl'], paddingBottom: 120 },
  hero: { alignItems: 'center', marginBottom: spacing['3xl'] },
  heroIcon: { width: spacing['8xl'], height: spacing['8xl'], borderRadius: borderRadius['4xl'], alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: '700', marginBottom: spacing.xs },
  subtitle: { fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: spacing.lg },
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: 14, marginBottom: spacing.lg, borderWidth: 1 },
  iconWrap: { width: 44, height: 44, borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  info: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  value: { fontSize: 13 },
  responseCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: 14, marginTop: spacing['2xl'], borderWidth: 1 },
  responseText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
