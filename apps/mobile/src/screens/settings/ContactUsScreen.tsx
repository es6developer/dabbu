import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';

const CONTACT_OPTIONS = [
  {
    icon: 'mail' as const,
    label: 'Email Us',
    value: 'support@dabbu.app',
    action: 'mailto:support@dabbu.app',
  },
  { icon: 'phone' as const, label: 'Call Us', value: '1800-123-4567', action: 'tel:18001234567' },
  { icon: 'earth' as const, label: 'Website', value: 'www.dabbu.app', action: 'https://dabbu.app' },
  {
    icon: 'twitter' as const,
    label: 'Twitter',
    value: '@dabbu_app',
    action: 'https://twitter.com/dabbu_app',
  },
];

export function ContactUsScreen() {
  const { colors } = useTheme();

  async function handleOpenUrl(url: string) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Not Available', `Cannot open ${url} on this device.`);
      }
    } catch {
      Alert.alert('Error', 'Unable to open this link. Please try again later.');
    }
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: colors.bg.secondary }]}>
          <AntDesign name="message1" size={40} color={colors.accent.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text.primary }]}>Get in Touch</Text>
        <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
          We'd love to hear from you
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Contact Options</Text>
      {CONTACT_OPTIONS.map((opt, i) => (
        <TouchableOpacity
          key={i}
          style={[
            styles.card,
            { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
          ]}
          activeOpacity={0.7}
          onPress={() => handleOpenUrl(opt.action)}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.bg.secondary }]}>
            <AntDesign name={opt.icon as any} size={22} color={colors.accent.primary} />
          </View>
          <View style={styles.info}>
            <Text style={[styles.label, { color: colors.text.primary }]}>{opt.label}</Text>
            <Text style={[styles.value, { color: colors.text.tertiary }]}>{opt.value}</Text>
          </View>
          <AntDesign name="export" size={18} color={colors.text.tertiary} />
        </TouchableOpacity>
      ))}

      <View
        style={[
          styles.responseCard,
          { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
        ]}
      >
        <AntDesign name="clockcircleo" size={20} color={colors.accent.primary} />
        <Text style={[styles.responseText, { color: colors.text.secondary }]}>
          We typically respond within 24 hours during business days.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 28, paddingBottom: 120 },
  hero: { alignItems: 'center', marginBottom: 36 },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 16 },
  sectionTitle: { fontSize: 19, fontWeight: '600', marginBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 22,
    borderRadius: 28,
    marginBottom: 8,
    borderWidth: 1.5,
  },
  iconWrap: {
    width: 44,
    height: 52,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  info: { flex: 1 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  value: { fontSize: 16 },
  responseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 22,
    borderRadius: 28,
    marginTop: 28,
    borderWidth: 1.5,
  },
  responseText: { flex: 1, fontSize: 16, lineHeight: 18 },
});
