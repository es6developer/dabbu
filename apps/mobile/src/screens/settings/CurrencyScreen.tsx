import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

export function CurrencyScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.accent.primary}15` }]}>
          <Ionicons name="cash-outline" size={40} color={colors.accent.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text.primary }]}>Indian Rupee (INR)</Text>
        <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
          Dabbu uses INR as the default currency across all spaces, expenses, and goals.
          Multi-currency support is coming soon.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  iconWrap: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
