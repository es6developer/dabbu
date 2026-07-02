import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';

export function FormError({ message }: { message?: string | null }) {
  const { colors } = useTheme();
  if (!message) return null;

  return (
    <View style={[styles.errorBox, { backgroundColor: `${colors.status.error}15` }]}>
      <AntDesign name="exclamationcircle" size={16} color={colors.status.error} />
      <Text style={[styles.errorText, { color: colors.status.error }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 30,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    fontSize: 16,
    flex: 1,
    fontWeight: '600',
  },
});
