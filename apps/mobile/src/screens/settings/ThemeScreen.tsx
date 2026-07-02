import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme, useThemeContext, ThemeMode } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';

const THEME_OPTIONS: Array<{ mode: ThemeMode; icon: string; label: string; desc: string }> = [
  { mode: 'dark', icon: 'star', label: 'Dark', desc: 'Dark mode — easy on the eyes' },
  { mode: 'light', icon: 'star', label: 'Light', desc: 'Bright and clean interface' },
  { mode: 'system', icon: 'setting', label: 'System', desc: 'Follow your device settings' },
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
            <AntDesign name={opt.icon as any} size={24} color={colors.accent.primary} />
          </View>
          <View style={styles.info}>
            <Text style={[styles.label, { color: colors.text.primary }]}>{opt.label}</Text>
            <Text style={[styles.desc, { color: colors.text.tertiary }]}>{opt.desc}</Text>
          </View>
          {themeMode === opt.mode && (
            <AntDesign  name="checkcircleo" size={24} color={colors.accent.primary} />
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing['2xl'], paddingBottom: 120 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: spacing.xs },
  subtitle: { fontSize: 16, marginBottom: spacing['2xl'] },
  card: { flexDirection: 'row', alignItems: 'center', padding: 22, borderRadius: borderRadius['2xl'], marginBottom: spacing.lg, borderWidth: 1.5 },
  iconWrap: { width: spacing['5xl'], height: spacing['5xl'], borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  info: { flex: 1 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  desc: { fontSize: 16 },
});
