import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function PersonalDashboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <View style={s.content}>
        <Text style={[s.title, { color: colors.text.primary }]}>Personal Dashboard</Text>
        <Text style={[s.subtitle, { color: colors.text.tertiary }]}>Coming soon</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 14, fontWeight: '500', marginTop: 8 },
});
