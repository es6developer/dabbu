import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';

const CATEGORIES = ['Rent', 'Electricity', 'Water', 'Internet', 'School Fees', 'Insurance', 'Loans', 'EMI', 'Subscriptions', 'Other'];
const FREQUENCIES = ['Monthly', 'Quarterly', 'Yearly', 'One-time'];

export function CreateBillScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');
  const [frequency, setFrequency] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Bill name is required');
      return;
    }
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Validation', 'Enter a valid amount');
      return;
    }
    if (!dueDate.trim()) {
      Alert.alert('Validation', 'Due date is required');
      return;
    }
    setLoading(true);
    try {
      await api.post('/family-space/bills', {
        name: name.trim(),
        amount: Number(amount),
        dueDate: dueDate.trim(),
        category: category || undefined,
        frequency: frequency || undefined,
        assignedTo: assignedTo.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.subtle }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <AntDesign name="arrowleft" size={22} color={colors.text.primary}  />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Create Bill</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.label, { color: colors.text.secondary }]}>Bill Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
            placeholder="e.g. Apartment Rent"
            placeholderTextColor={colors.text.tertiary}
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.label, { color: colors.text.secondary }]}>Amount (₹)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
            placeholder="e.g. 25000"
            placeholderTextColor={colors.text.tertiary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />

          <Text style={[styles.label, { color: colors.text.secondary }]}>Due Date (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
            placeholder="e.g. 2026-07-01"
            placeholderTextColor={colors.text.tertiary}
            value={dueDate}
            onChangeText={setDueDate}
          />

          <Text style={[styles.label, { color: colors.text.secondary }]}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, { backgroundColor: category === cat ? colors.accent.primary : colors.bg.tertiary, borderColor: colors.border.subtle }]}
                onPress={() => setCategory(cat === category ? '' : cat)}
              >
                <Text style={[styles.chipText, { color: category === cat ? '#FFFFFF' : colors.text.primary }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text.secondary }]}>Frequency</Text>
          <View style={styles.chipRow}>
            {FREQUENCIES.map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[styles.chip, { backgroundColor: frequency === freq ? colors.accent.primary : colors.bg.tertiary, borderColor: colors.border.subtle }]}
                onPress={() => setFrequency(freq === frequency ? '' : freq)}
              >
                <Text style={[styles.chipText, { color: frequency === freq ? '#FFFFFF' : colors.text.primary }]}>
                  {freq}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text.secondary }]}>Assigned To (optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
            placeholder="Member name"
            placeholderTextColor={colors.text.tertiary}
            value={assignedTo}
            onChangeText={setAssignedTo}
          />

          <Text style={[styles.label, { color: colors.text.secondary }]}>Notes</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
            placeholder="Additional notes..."
            placeholderTextColor={colors.text.tertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.accent.primary, opacity: loading ? 0.6 : 1 }]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.createBtnText}>Create Bill</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  content: { padding: 16, gap: 4 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
  textArea: { height: 100, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingTop: 12, fontSize: 15 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  createBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  createBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
