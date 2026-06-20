import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { spacing, borderRadius, shadows } from '../../../theme/design';

const categories = [
  { key: 'savingsAlignment', label: 'Savings', icon: 'save' },
  { key: 'expenseAlignment', label: 'Expenses', icon: 'shoppingcart' },
  { key: 'goalAlignment', label: 'Goals', icon: 'flag' },
  { key: 'emergencyFund', label: 'Emergency', icon: 'Safety' },
  { key: 'debtManagement', label: 'Debt', icon: 'creditcard' },
] as const;

function getColor(s: number) {
  if (s >= 70) return '#16A34A';
  if (s >= 40) return '#EAB308';
  return '#DC2626';
}

function getLabel(s: number) {
  if (s >= 80) return 'Excellent';
  if (s >= 60) return 'Good';
  if (s >= 40) return 'Fair';
  return 'Needs Work';
}

export function CoupleHealthWidget({ data, onPress }: { data: any; onPress?: () => void }) {
  const { colors, isDark } = useTheme();
  const { coupleHealth } = data || {};
  const score = Math.min(100, Math.max(0, Number(coupleHealth?.overallScore ?? coupleHealth?.score ?? 0)));
  const categoriesData = coupleHealth?.categories || {};
  const compatibility = Number(coupleHealth?.compatibilityScore || 0);
  const level = Number(coupleHealth?.level || 1);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
    >
      <LinearGradient
        colors={isDark ? ['#7C3AED0C', 'transparent'] : ['#7C3AED08', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: borderRadius['2xl'] }}
      />
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: colors.accent.primary + '15' }]}>
          <AntDesign name="heart" size={18} color={colors.accent.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text.primary }]}>Couple Financial Health</Text>
        <AntDesign name="right" size={14} color={colors.text.tertiary} />
      </View>

      <View style={styles.scoreRow}>
        <LinearGradient
          colors={[getColor(score) + '20', getColor(score) + '08']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.scoreCircle, { borderColor: getColor(score) }]}
        >
          <Text style={[styles.scoreNumber, { color: getColor(score) }]}>{score}</Text>
          <Text style={[styles.scoreLbl, { color: getColor(score) }]}>{getLabel(score)}</Text>
        </LinearGradient>
        <View style={styles.scoreMeta}>
          {compatibility > 0 && (
            <View style={[styles.metaBox, { backgroundColor: getColor(compatibility) + '10' }]}>
              <AntDesign name="hearto" size={12} color={getColor(compatibility)} />
              <Text style={[styles.metaLbl, { color: colors.text.tertiary }]}>Compatibility</Text>
              <Text style={[styles.metaVal, { color: getColor(compatibility) }]}>{compatibility}%</Text>
            </View>
          )}
          <View style={[styles.metaBox, { backgroundColor: colors.accent.primary + '10' }]}>
            <AntDesign name="star" size={12} color={colors.accent.primary} />
            <Text style={[styles.metaLbl, { color: colors.text.tertiary }]}>Level</Text>
            <Text style={[styles.metaVal, { color: colors.accent.primary }]}>{level}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

      <View style={styles.categoriesContainer}>
        {categories.map((cat) => {
          const val = Number(categoriesData[cat.key] || 0);
          return (
            <View key={cat.key} style={styles.catRow}>
              <View style={[styles.catIcon, { backgroundColor: getColor(val) + '15' }]}>
                <AntDesign name={cat.icon as any} size={11} color={getColor(val)} />
              </View>
              <Text style={[styles.catLabel, { color: colors.text.secondary }]}>{cat.label}</Text>
              <View style={[styles.catBarBg, { backgroundColor: colors.bg.tertiary }]}>
                <View
                  style={[styles.catBarFill, { width: `${Math.min(val, 100)}%`, backgroundColor: getColor(val) }]}
                />
              </View>
              <Text style={[styles.catValue, { color: getColor(val) }]}>{val}%</Text>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: borderRadius['2xl'], borderWidth: 1, padding: spacing.xl, ...shadows.md, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', flex: 1 },
  scoreRow: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 10 },
  scoreCircle: {
    width: 74, height: 74, borderRadius: 37, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreNumber: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  scoreLbl: { fontSize: 8, fontWeight: '700', letterSpacing: 0.3 },
  scoreMeta: { flex: 1, gap: 8 },
  metaBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
  },
  metaLbl: { fontSize: 11, fontWeight: '500', flex: 1 },
  metaVal: { fontSize: 13, fontWeight: '800' },
  divider: { height: 1, marginBottom: 10 },
  categoriesContainer: { gap: 8 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catIcon: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 11, fontWeight: '500', width: 65 },
  catBarBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 3 },
  catValue: { fontSize: 11, fontWeight: '700', width: 36, textAlign: 'right' },
});
