import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';

interface MaintenanceScreenProps {
  message?: string;
}

export default function MaintenanceScreen({ message }: MaintenanceScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[s.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top + spacing['4xl'], paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={[s.iconContainer, { backgroundColor: `${colors.accent.primary}10` }]}>
        <AntDesign name="tool" size={48} color={colors.accent.primary} />
      </View>
      <Text style={[s.title, { color: colors.text.primary }]}>Under Maintenance</Text>
      <Text style={[s.subtitle, { color: colors.text.secondary }]}>
        {message || 'We are improving your experience. Please check back shortly.'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['3xl'] },
  iconContainer: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: spacing['3xl'] },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3, marginBottom: spacing.md, textAlign: 'center' },
  subtitle: { fontSize: 16, fontWeight: '400', textAlign: 'center', lineHeight: 24 },
});
