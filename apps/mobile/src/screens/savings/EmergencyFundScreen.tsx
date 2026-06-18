import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';

function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function EmergencyFundScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [savedAmount, setSavedAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editSaved, setEditSaved] = useState('0');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/emergency-fund');
      const d = (res as any)?.data || res;
      setMonthlyExpense(d.monthlyExpense || 0);
      setSavedAmount(d.savedAmount || 0);
      setEditSaved(String(d.savedAmount || 0));
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const monthlyExp = Math.max(monthlyExpense, 1);
  const coverageMonths = savedAmount / monthlyExp;
  const targetMonths = 6;
  const progress = Math.min(coverageMonths / targetMonths, 1);
  const remaining = Math.max(0, monthlyExp * targetMonths - savedAmount);

  const save = async () => {
    const val = Number(editSaved) || 0;
    setSavedAmount(val);
    setEditing(false);
    try {
      const res = await api.patch('/emergency-fund', { savedAmount: val });
      const d = (res as any)?.data || res;
      setMonthlyExpense(d.monthlyExpense || monthlyExpense);
    } catch {}
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Emergency Fund</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.coverageCard, { backgroundColor: colors.card.balance }]}>
          <Text style={[styles.coverageLabel, { color: colors.text.secondary }]}>Current Coverage</Text>
          <Text style={[styles.coverageValue, { color: coverageMonths >= targetMonths ? colors.status.success : colors.status.warning }]}>
            {loading ? '-' : coverageMonths.toFixed(1)} months
          </Text>
          <Text style={[styles.targetLabel, { color: colors.text.tertiary }]}>Target: {targetMonths} months</Text>
          <View style={[styles.progressBar, { backgroundColor: colors.bg.tertiary, marginTop: spacing.lg }]}>
            <View style={[styles.progressFill, {
              width: `${Math.min(progress * 100, 100)}%`,
              backgroundColor: coverageMonths >= targetMonths ? colors.status.success : colors.accent.primary,
            }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.text.secondary }]}>
            {Math.round(progress * 100)}% of target
          </Text>
        </View>

        <View style={[styles.detailCard, { backgroundColor: colors.bg.card }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Monthly Expenses</Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]}>{fmt(monthlyExp)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Emergency Savings</Text>
            {editing ? (
              <TextInput
                style={[styles.editInput, { color: colors.text.primary, backgroundColor: colors.bg.tertiary }]}
                value={editSaved}
                onChangeText={(t) => setEditSaved(t.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
              />
            ) : (
              <Text style={[styles.detailValue, { color: colors.text.primary }]}>{fmt(savedAmount)}</Text>
            )}
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Still Needed</Text>
            <Text style={[styles.detailValue, { color: remaining > 0 ? colors.status.error : colors.status.success }]}>
              {remaining > 0 ? fmt(remaining) : 'Fully funded!'}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          {editing ? (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accent.primary }]} onPress={save}>
              <Text style={styles.actionBtnText}>Save</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accent.primary }]} onPress={() => setEditing(true)}>
              <Ionicons name="pencil" size={16} color="#FFF" />
              <Text style={styles.actionBtnText}>Update Savings</Text>
            </TouchableOpacity>
          )}
        </View>

        {remaining > 0 && (
          <View style={[styles.suggestionCard, { backgroundColor: colors.card.income }]}>
            <Ionicons name="bulb-outline" size={20} color={colors.status.success} />
            <View style={styles.suggestionContent}>
              <Text style={[styles.suggestionTitle, { color: colors.text.primary }]}>AI Suggestion</Text>
              <Text style={[styles.suggestionText, { color: colors.text.secondary }]}>
                Save ₹{Math.round(remaining / (targetMonths * 2)).toLocaleString('en-IN')} per month to reach your {targetMonths}-month goal in 6 months.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  scrollContent: { padding: spacing.xl, paddingBottom: 100 },
  coverageCard: { borderRadius: borderRadius['3xl'], padding: spacing['2xl'], alignItems: 'center', marginBottom: spacing.lg },
  coverageLabel: { fontSize: 13, fontWeight: '500' },
  coverageValue: { fontSize: 40, fontWeight: '800', letterSpacing: -1, marginTop: spacing.xs },
  targetLabel: { fontSize: 13, marginTop: spacing.xs },
  progressBar: { width: '100%', height: 8, borderRadius: 4 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, marginTop: spacing.sm },
  detailCard: { borderRadius: borderRadius['2xl'], padding: spacing.lg, marginBottom: spacing.lg },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 15, fontWeight: '700' },
  editInput: { fontSize: 15, fontWeight: '600', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, textAlign: 'right', minWidth: 100 },
  actions: { marginBottom: spacing.lg },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.md, borderRadius: borderRadius.xl, gap: spacing.sm },
  actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  suggestionCard: { flexDirection: 'row', borderRadius: borderRadius['2xl'], padding: spacing.lg, gap: spacing.md, alignItems: 'flex-start' },
  suggestionContent: { flex: 1 },
  suggestionTitle: { fontSize: 14, fontWeight: '600' },
  suggestionText: { fontSize: 13, marginTop: 2, lineHeight: 18 },
});
