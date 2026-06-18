import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import {
  FormScreen,
  FormSection,
  FormField,
  FormTextArea,
  FormChipGroup,
  FormDatePicker,
  FormFooter,
  FormError,
} from '../../components/forms';

const PRIORITIES = [
  { label: 'Low', value: 'low', icon: 'flag' },
  { label: 'Medium', value: 'medium', icon: 'flag' },
  { label: 'High', value: 'high', icon: 'exclamationcircle' },
  { label: 'Urgent', value: 'urgent', icon: 'like2' },
];

const TASK_CATEGORIES = [
  { label: 'General', value: 'General', icon: 'appstore-o' },
  { label: 'Grocery', value: 'Grocery', icon: 'shoppingcart' },
  { label: 'Shopping', value: 'Shopping', icon: 'shoppingcart' },
  { label: 'Custom', value: 'Custom', icon: 'tag' },
];

export function CreateTaskScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { showToast } = useToast();
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
    if (accessToken) setAccessToken(accessToken);
    loadFamilyMembers();
  }, [accessToken]);

  async function loadFamilyMembers() {
    try {
      const res = await api.get<any>('/family');
      const families = Array.isArray(res) ? res : [];
      const members = families.flatMap((f: any) => f.members || []);
      setFamilyMembers(members);
    } catch { /* ignore */ }
  }

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return; }
    setError('');
    setSaving(true);
    if (accessToken) setAccessToken(accessToken);
    try {
      await api.post('/family/tasks', {
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
        assignedTo: assignedTo || undefined,
        dueDate: dueDate || undefined,
      });
      showToast('Task created');
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  }

  const memberOptions = familyMembers.map((m: any) => {
    const memberId = m.userId || m.id;
    return { label: m.firstName || m.name || m.user?.firstName || 'Member', value: memberId, icon: 'user' };
  });

  return (
    <FormScreen
      title="New Task"
      subtitle="Assign ownership, set priority, and keep family work moving"
      icon="checkbox"
      accent={[colors.accent.primary, colors.status.info]}
      footer={
        <FormFooter title="Create Task" icon='plus' loading={saving} onPress={handleSave} />
      }
    >
      <FormError message={error} />

      <FormSection title="Task Details">
        <FormField
          label="Title"
          icon="check"
          value={title}
          onChangeText={setTitle}
          placeholder="Task title"
          required
        />
        <FormTextArea
          label="Description"
          icon="filetext1"
          value={description}
          onChangeText={setDescription}
          placeholder="Task description"
        />
      </FormSection>

      <FormSection title="Classification">
        <FormChipGroup
          label="Category"
          options={TASK_CATEGORIES}
          selected={category}
          onSelect={setCategory}
          size="sm"
        />
        <FormChipGroup
          label="Priority"
          options={PRIORITIES}
          selected={priority}
          onSelect={setPriority}
          size="sm"
        />
      </FormSection>

      <FormSection title="Assignment">
        {familyMembers.length > 0 ? (
          <FormChipGroup
            label="Assign To"
            options={memberOptions}
            selected={assignedTo}
            onSelect={(v) => setAssignedTo(assignedTo === v ? '' : v)}
            size="sm"
          />
        ) : (
          <Text style={{ fontSize: 14, fontStyle: 'italic', color: colors.text.tertiary }}>
            No family members found. Join a family first.
          </Text>
        )}
        <FormDatePicker label="Due Date" value={dueDate} onChange={setDueDate} optional />
      </FormSection>
    </FormScreen>
  );
}
