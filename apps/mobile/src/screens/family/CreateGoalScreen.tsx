import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';

const CATEGORIES = ['House', 'Education', 'Marriage', 'Vacation', 'Baby', 'Emergency', 'Vehicle', 'Investment'];

export function CreateGoalScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [category, setCategory] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Goal name is required');
      return;
    }
    if (!targetAmount.trim() || isNaN(Number(targetAmount)) || Number(targetAmount) <= 0) {
      Alert.alert('Validation', 'Enter a valid target amount');
      return;
    }
    setLoading(true);
    try {
      await api.post('/family-space/goals', {
        name: name.trim(),
        targetAmount: Number(targetAmount),
        category: category || undefined,
        deadline: deadline.trim() || undefined,
        assignedTo: assignedTo.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create goal');
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
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Create Goal</Text>
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
          <Text style={[styles.label, { color: colors.text.secondary }]}>Goal Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
            placeholder="e.g. New Car"
            placeholderTextColor={colors.text.tertiary}
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.label, { color: colors.text.secondary }]}>Target Amount (₹)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
            placeholder="e.g. 500000"
            placeholderTextColor={colors.text.tertiary}
            value={targetAmount}
            onChangeText={setTargetAmount}
            keyboardType="numeric"
          />

          <Text style={[styles.label, { color: colors.text.secondary }]}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.chip,
                  { backgroundColor: category === cat ? colors.accent.primary : colors.bg.tertiary, borderColor: colors.border.subtle },
                ]}
                onPress={() => setCategory(cat === category ? '' : cat)}
              >
                <Text style={[styles.chipText, { color: category === cat ? '#FFFFFF' : colors.text.primary }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text.secondary }]}>Deadline (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
            placeholder="e.g. 2026-12-31"
            placeholderTextColor={colors.text.tertiary}
            value={deadline}
            onChangeText={setDeadline}
          />

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
              <Text style={styles.createBtnText}>Create Goal</Text>
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
