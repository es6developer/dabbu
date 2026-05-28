import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', locale: 'ar-SA' },
];

export function CurrencyScreen() {
  const { colors } = useTheme();
  const [selected, setSelected] = useState('INR');

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text.primary }]}>Currency</Text>
      <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>Select your preferred currency</Text>

      {CURRENCIES.map((c) => (
        <TouchableOpacity
          key={c.code}
          style={[styles.card, { backgroundColor: colors.bg.secondary, borderColor: selected === c.code ? colors.accent.primary : colors.border.subtle }]}
          onPress={() => setSelected(c.code)}
          activeOpacity={0.7}
        >
          <View style={[styles.symbolWrap, { backgroundColor: `${colors.accent.primary}15` }]}>
            <Text style={[styles.symbol, { color: colors.accent.primary }]}>{c.symbol}</Text>
          </View>
          <View style={styles.info}>
            <Text style={[styles.label, { color: colors.text.primary }]}>{c.name}</Text>
            <Text style={[styles.desc, { color: colors.text.tertiary }]}>{c.code} • {c.symbol}</Text>
          </View>
          {selected === c.code && (
            <Ionicons name="checkmark-circle" size={24} color={colors.accent.primary} />
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
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 8, borderWidth: 1.5 },
  symbolWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  symbol: { fontSize: 22, fontWeight: '700' },
  info: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  desc: { fontSize: 12 },
});
