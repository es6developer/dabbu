import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemeContext, ThemeMode } from '../../theme';

const THEME_OPTIONS: Array<{ mode: ThemeMode; icon: keyof typeof Ionicons.glyphMap; label: string; desc: string }> = [
  { mode: 'dark', icon: 'moon', label: 'Dark', desc: 'Dark mode — easy on the eyes' },
  { mode: 'light', icon: 'sunny', label: 'Light', desc: 'Bright and clean interface' },
  { mode: 'system', icon: 'settings', label: 'System', desc: 'Follow your device settings' },
];

export function ThemeScreen() {
  const { colors } = useTheme();
  const { themeMode, setThemeMode } = useThemeContext();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text.primary }]}>Theme</Text>
      <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>Choose your preferred appearance</Text>

      {THEME_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.mode}
          style={[styles.card, { backgroundColor: colors.bg.secondary, borderColor: themeMode === opt.mode ? colors.accent.primary : colors.border.subtle }]}
          onPress={() => setThemeMode(opt.mode)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${colors.accent.primary}15` }]}>
            <Ionicons name={opt.icon} size={24} color={colors.accent.primary} />
          </View>
          <View style={styles.info}>
            <Text style={[styles.label, { color: colors.text.primary }]}>{opt.label}</Text>
            <Text style={[styles.desc, { color: colors.text.tertiary }]}>{opt.desc}</Text>
          </View>
          {themeMode === opt.mode && (
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
  card: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 16, marginBottom: 12, borderWidth: 1.5 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  info: { flex: 1 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  desc: { fontSize: 13 },
});
