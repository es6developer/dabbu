import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';

const INCOME_SOURCES = [
  { key: 'salary', icon: 'briefcase-outline' as const, label: 'Salary' },
  { key: 'business', icon: 'storefront-outline' as const, label: 'Business' },
  { key: 'freelance', icon: 'laptop-outline' as const, label: 'Freelance' },
  { key: 'other', icon: 'ellipsis-horizontal-outline' as const, label: 'Other' },
];

const SOURCE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  salary: 'briefcase-outline',
  business: 'storefront-outline',
  freelance: 'laptop-outline',
  other: 'ellipsis-horizontal-outline',
};

export function AddIncomeScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { groupId, groupName } = route.params || {};

  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('other');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      const res = await api.get<any>(`/shared-finance/groups/${groupId}`);
      setMembers(res.members || []);
    } catch {}
  }

  async function handleSubmit() {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Validation', 'Please enter a description');
      return;
    }
    setSubmitting(true);
    try {
      if (accessToken) setAccessToken(accessToken);
      await api.post(`/shared-finance/groups/${groupId}/incomes`, {
        amount: parseFloat(amount),
        source,
        description: description.trim(),
        date,
        notes: notes.trim(),
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add income');
    } finally {
      setSubmitting(false);
    }
  }

  const totalAmount = parseFloat(amount) || 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
        >
          <Ionicons name="close" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Add Income</Text>
          <Text style={[styles.headerSub, { color: colors.text.tertiary }]}>
            {groupName || 'Group'}
          </Text>
        </View>
      </View>

      <View style={[styles.amountCard, { backgroundColor: colors.bg.tertiary }]}>
        <View style={[styles.glowRing, { backgroundColor: colors.status.success + '12' }]}>
          <View style={[styles.glowIcon, { backgroundColor: colors.status.success + '20' }]}>
            <Ionicons name="trending-up-outline" size={24} color={colors.status.success} />
          </View>
        </View>
        <View style={styles.amountInputRow}>
          <Text style={[styles.currencySymbol, { color: colors.text.secondary }]}>₹</Text>
          <TextInput
            style={[styles.amountInput, { color: colors.text.primary }]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
      </View>

      <View style={styles.section}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
          value={description}
          onChangeText={setDescription}
          placeholder="What was this income for?"
          placeholderTextColor={colors.text.tertiary}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Source</Text>
        <View style={styles.sourceRow}>
          {INCOME_SOURCES.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.sourceChip, {
                backgroundColor: source === s.key ? colors.status.success + '20' : colors.bg.card,
                borderColor: source === s.key ? colors.status.success : colors.border.subtle,
              }]}
              onPress={() => setSource(s.key)}
            >
              <Ionicons
                name={s.icon}
                size={16}
                color={source === s.key ? colors.status.success : colors.text.tertiary}
              />
              <Text style={[styles.sourceChipText, { color: source === s.key ? colors.status.success : colors.text.secondary }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Date</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.text.tertiary}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Notes (optional)</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes..."
          placeholderTextColor={colors.text.tertiary}
          multiline
          numberOfLines={3}
        />
      </View>

      {totalAmount > 0 && (
        <View style={[styles.previewCard, { backgroundColor: colors.bg.tertiary }]}>
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: colors.text.secondary }]}>Income Amount</Text>
            <Text style={[styles.previewValue, { color: colors.status.success }]}>+₹{totalAmount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={[styles.previewDivider, { backgroundColor: colors.border.subtle }]} />
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: colors.text.secondary }]}>Source</Text>
            <Text style={[styles.previewValue, { color: colors.text.primary }]}>
              {source.charAt(0).toUpperCase() + source.slice(1)}
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.status.success, opacity: submitting ? 0.6 : 1 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>Add Income</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: insets.bottom + 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSub: { fontSize: 13, marginTop: 2 },
  amountCard: {
    marginHorizontal: 20, marginBottom: 16, paddingVertical: 28, paddingHorizontal: 20,
    borderRadius: 24, alignItems: 'center',
  },
  glowRing: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  glowIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  currencySymbol: { fontSize: 32, fontWeight: '700', marginTop: -4 },
  amountInput: { fontSize: 40, fontWeight: '700', textAlign: 'center', minWidth: 120, letterSpacing: -1 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  input: { padding: 16, borderRadius: 14, fontSize: 15, borderWidth: 1, fontWeight: '500' },
  textArea: { padding: 16, borderRadius: 14, fontSize: 15, borderWidth: 1, minHeight: 80, textAlignVertical: 'top' },
  sourceRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  sourceChip: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 14, borderWidth: 1, gap: 6,
  },
  sourceChipText: { fontSize: 13, fontWeight: '600' },
  previewCard: { marginHorizontal: 20, marginBottom: 20, padding: 16, borderRadius: 20 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  previewDivider: { height: 1, marginVertical: 8 },
  previewLabel: { fontSize: 13, fontWeight: '500' },
  previewValue: { fontSize: 15, fontWeight: '700' },
  saveBtn: {
    flexDirection: 'row', marginHorizontal: 20, paddingVertical: 18, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 8,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
