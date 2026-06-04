import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { DatePickerField } from '../../components/ui/DatePickerField';
import {
  PremiumActionButton,
  PremiumChip,
  PremiumError,
  PremiumFormScreen,
  PremiumInput,
  premiumFormStyles,
} from '../../components/ui';

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

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadFamilyMembers();
  }, [accessToken]);

  async function loadFamilyMembers() {
    try {
      const res = await api.get<any>('/family');
      const families = Array.isArray(res) ? res : [];
      const members = families.flatMap((f: any) => f.members || []);
      setFamilyMembers(members);
    } catch (_e) {
      /* ignore */
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setError('');
    setSaving(true);
    if (accessToken) {
      setAccessToken(accessToken);
    }
    try {
      await api.post('/family/tasks', {
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
        assignedTo: assignedTo || undefined,
        dueDate: dueDate || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PremiumFormScreen
      title="New task"
      subtitle="Assign ownership, set priority, and keep family work moving without clutter."
      icon="checkbox"
      accent={[colors.accent.primary, colors.status.info]}
    >
      <PremiumError message={error} />
      <PremiumInput
        label="Title"
        icon="checkbox-outline"
        value={title}
        onChangeText={setTitle}
        placeholder="Task title"
      />
      <PremiumInput
        label="Description"
        icon="document-text-outline"
        value={description}
        onChangeText={setDescription}
        placeholder="Description"
        multiline
        numberOfLines={4}
      />
      <Text style={[local.label, { color: colors.text.tertiary }]}>Category</Text>
      <View style={premiumFormStyles.rowWrap}>
        {TASK_CATEGORIES.map((c) => (
          <PremiumChip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </View>
      <Text style={[local.label, { color: colors.text.tertiary }]}>Priority</Text>
      <View style={premiumFormStyles.rowWrap}>
        {PRIORITIES.map((p) => (
          <PremiumChip
            key={p}
            label={p.charAt(0).toUpperCase() + p.slice(1)}
            selected={priority === p}
            icon={p === 'urgent' ? 'flame' : p === 'high' ? 'alert-circle' : 'flag-outline'}
            onPress={() => setPriority(p)}
          />
        ))}
      </View>
      <Text style={[local.label, { color: colors.text.tertiary }]}>Assign To</Text>
      {familyMembers.length > 0 ? (
        <View style={premiumFormStyles.rowWrap}>
          {familyMembers.map((m: any) => {
            const memberId = m.userId || m.id;
            return (
              <PremiumChip
                key={memberId}
                label={m.firstName || m.name || m.user?.firstName || 'Member'}
                icon="person-outline"
                selected={assignedTo === memberId}
                onPress={() => setAssignedTo(assignedTo === memberId ? '' : memberId)}
              />
            );
          })}
        </View>
      ) : (
        <Text style={[local.empty, { color: colors.text.tertiary }]}>
          No family members found. Join a family first.
        </Text>
      )}
      <DatePickerField label="Due Date" value={dueDate} onChange={setDueDate} optional />
      <PremiumActionButton title="Create task" onPress={handleSave} loading={saving} icon="add" />
    </PremiumFormScreen>
  );
}

const local = {
  label: {
    fontSize: 12,
    fontWeight: '800' as const,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  empty: {
    fontSize: 14,
    fontStyle: 'italic' as const,
    marginBottom: 4,
  },
};
