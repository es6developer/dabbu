import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CoupleDashboard } from '../../components/ui/CoupleDashboard';

export function CoupleDashboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <CoupleDashboard />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
});
