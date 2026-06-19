import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const PRIORITY_COLORS: Record<string, string> = {
  Low: '#22C55E',
  Medium: '#F59E0B',
  High: '#EF4444',
  Urgent: '#DC2626',
};

export function CreateTaskScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Task title is required');
      return;
    }
    setLoading(true);
    try {
      await api.post('/family-space/tasks', {
        title: title.trim(),
        description: description.trim() || undefined,
        priority: priority || undefined,
        assignedTo: assignedTo.trim() || undefined,
        dueDate: dueDate.trim() || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create task');
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
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Create Task</Text>
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
          <Text style={[styles.label, { color: colors.text.secondary }]}>Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
            placeholder="e.g. Buy groceries"
            placeholderTextColor={colors.text.tertiary}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={[styles.label, { color: colors.text.secondary }]}>Description</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
            placeholder="Describe the task..."
            placeholderTextColor={colors.text.tertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />

          <Text style={[styles.label, { color: colors.text.secondary }]}>Priority</Text>
          <View style={styles.chipRow}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.chip,
                  {
                    backgroundColor: priority === p ? PRIORITY_COLORS[p] : colors.bg.tertiary,
                    borderColor: priority === p ? PRIORITY_COLORS[p] : colors.border.subtle,
                  },
                ]}
                onPress={() => setPriority(p === priority ? '' : p)}
              >
                <Text style={[styles.chipText, { color: priority === p ? '#FFFFFF' : colors.text.primary }]}>
                  {p}
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

          <Text style={[styles.label, { color: colors.text.secondary }]}>Due Date (YYYY-MM-DD) (optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
            placeholder="e.g. 2026-07-15"
            placeholderTextColor={colors.text.tertiary}
            value={dueDate}
            onChangeText={setDueDate}
          />

          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.accent.primary, opacity: loading ? 0.6 : 1 }]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.createBtnText}>Create Task</Text>
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
