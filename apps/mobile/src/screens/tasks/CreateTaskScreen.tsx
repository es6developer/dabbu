import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { DatePickerField } from '../../components/ui/DatePickerField';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const TASK_CATEGORIES = ['General', 'Grocery', 'Shopping', 'Custom'];

export function CreateTaskScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('General');
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadFamilyMembers();
  }, [accessToken]);

  async function loadFamilyMembers() {
    try {
      const res = await api.get<any>('/family');
      const families = Array.isArray(res.data) ? res.data : [];
      const members = families.flatMap((f: any) => f.members || []);
      setFamilyMembers(members);
    } catch (e) { /* ignore */ }
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return; }
    setError('');
    setSaving(true);
    if (accessToken) setAccessToken(accessToken);
    try {
      const data: any = {
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
        assignedTo: assignedTo || undefined,
        dueDate: dueDate || undefined,
      };
      await api.post('/family/tasks', data);
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  }

  function getPriorityColor(p: string) {
    switch (p) {
      case 'urgent': return colors.status.error;
      case 'high': return colors.status.warning;
      case 'medium': return colors.accent.primary;
      default: return colors.text.tertiary;
    }
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg.primary }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: colors.text.primary }]}>New Task</Text>
      {error ? <View style={[styles.errorBox, { backgroundColor: `${colors.status.error}18` }]}><Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text></View> : null}

      <Text style={[styles.label, { color: colors.text.secondary }]}>Title</Text>
      <TextInput style={[styles.input, { backgroundColor: colors.bg.secondary, color: colors.text.primary, borderColor: colors.border.subtle }]} value={title} onChangeText={setTitle} placeholder="Task title" placeholderTextColor={colors.text.tertiary} />

      <Text style={[styles.label, { color: colors.text.secondary }]}>Description</Text>
      <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.bg.secondary, color: colors.text.primary, borderColor: colors.border.subtle }]} value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor={colors.text.tertiary} multiline numberOfLines={4} />

      <Text style={[styles.label, { color: colors.text.secondary }]}>Category</Text>
      <View style={styles.chipRow}>
        {TASK_CATEGORIES.map((c) => (
          <TouchableOpacity key={c} style={[styles.chip, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }, category === c && { backgroundColor: `${colors.accent.primary}18`, borderColor: colors.accent.primary }]} onPress={() => setCategory(c)}>
            <Text style={[styles.chipText, { color: colors.text.tertiary }, category === c && { color: colors.accent.primary, fontWeight: '600' }]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text.secondary }]}>Priority</Text>
      <TouchableOpacity style={[styles.picker, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]} onPress={() => setShowPriorityPicker(!showPriorityPicker)}>
        <Text style={[styles.pickerText, { color: getPriorityColor(priority) }]}>
          {priority.charAt(0).toUpperCase() + priority.slice(1)}
        </Text>
        <Text style={[styles.pickerArrow, { color: colors.text.tertiary }]}>▼</Text>
      </TouchableOpacity>
      {showPriorityPicker && (
        <View style={[styles.pickerOptions, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity key={p} style={[styles.pickerOption, { borderBottomColor: colors.border.subtle }, priority === p && { backgroundColor: `${colors.accent.primary}18` }]} onPress={() => { setPriority(p); setShowPriorityPicker(false); }}>
              <Text style={[styles.pickerOptionText, { color: colors.text.primary }, priority === p && { color: colors.accent.primary }]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={[styles.label, { color: colors.text.secondary }]}>Assign To</Text>
      {familyMembers.length > 0 ? (
        <View style={styles.chipRow}>
          {familyMembers.map((m: any) => (
            <TouchableOpacity key={m.id || m.userId} style={[styles.chip, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }, assignedTo === (m.userId || m.id) && { backgroundColor: `${colors.accent.primary}18`, borderColor: colors.accent.primary }]} onPress={() => setAssignedTo(assignedTo === (m.userId || m.id) ? '' : (m.userId || m.id))}>
              <Text style={[styles.chipText, { color: colors.text.tertiary }, assignedTo === (m.userId || m.id) && { color: colors.accent.primary, fontWeight: '600' }]}>{m.firstName || m.name || m.user?.firstName || 'Member'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={[styles.noMembers, { color: colors.text.tertiary }]}>No family members found. Join a family first.</Text>
      )}

      <DatePickerField label="Due Date" value={dueDate} onChange={setDueDate} optional />

      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accent.primary }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Create Task</Text>}
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 18 },
  errorBox: { padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { fontSize: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { fontSize: 16, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, borderWidth: 1 },
  chipText: { fontSize: 13 },
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  pickerText: { fontSize: 16 },
  pickerArrow: { fontSize: 10 },
  pickerOptions: { borderRadius: 14, marginTop: 4, overflow: 'hidden', borderWidth: 1 },
  pickerOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  pickerOptionText: { fontSize: 15 },
  noMembers: { fontSize: 14, fontStyle: 'italic' },
  saveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
