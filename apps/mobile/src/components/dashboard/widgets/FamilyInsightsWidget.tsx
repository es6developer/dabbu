import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

export function FamilyInsightsWidget({ data }: { data: any }) {
  const { colors } = useTheme();
  const { familyInsights } = data || {};

  if (!familyInsights?.text && !familyInsights?.title) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <AntDesign name="bulb1" size={18} color={colors.accent.primary}  />
          <Text style={[styles.title, { color: colors.text.primary }]}>Family Insights</Text>
        </View>
        <Text style={[styles.empty, { color: colors.text.secondary }]}>-</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accent.primary + '20' }]}>
          <AntDesign name="bulb1" size={16} color={colors.accent.primary}  />
        </View>
        <Text style={[styles.title, { color: colors.text.primary }]}>Family Insights</Text>
      </View>
      {familyInsights.title ? <Text style={[styles.insightTitle, { color: colors.text.primary }]}>{familyInsights.title}</Text> : null}
      {familyInsights.text ? <Text style={[styles.text, { color: colors.text.secondary }]}>{familyInsights.text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700' },
  iconWrap: { width: 28, height: 28, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  insightTitle: { fontSize: 13, fontWeight: '700' },
  text: { fontSize: 12, fontWeight: '500', lineHeight: 18 },
  empty: { fontSize: 14, fontWeight: '500' },
});
