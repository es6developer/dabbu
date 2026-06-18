import React, { useState } from 'react';
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
  FormToggle,
  FormFooter,
  FormError,
} from '../../components/forms';

const REMINDER_TYPES = [
  { label: 'General', value: 'general', icon: 'appstore-o' },
  { label: 'Payment', value: 'payment', icon: 'wallet' },
  { label: 'Bill', value: 'bill', icon: 'receipt' },
  { label: 'Subscription', value: 'subscription', icon: 'sync' },
  { label: 'Goal', value: 'goal', icon: 'star' },
];

const PRIORITIES = [
  { label: 'Low', value: 'low', icon: 'flag' },
  { label: 'Medium', value: 'medium', icon: 'flag' },
  { label: 'High', value: 'high', icon: 'alert-circle' },
  { label: 'Urgent', value: 'urgent', icon: 'flame' },
];

const FREQUENCIES = [
  { label: 'Daily', value: 'daily', icon: 'calendar' },
  { label: 'Weekly', value: 'weekly', icon: 'calendar' },
  { label: 'Biweekly', value: 'biweekly', icon: 'calendar' },
  { label: 'Monthly', value: 'monthly', icon: 'calendar' },
  { label: 'Quarterly', value: 'quarterly', icon: 'calendar' },
  { label: 'Yearly', value: 'yearly', icon: 'calendar' },
];

const DAYS_OF_WEEK = [
  { label: 'Sun', value: '0' },
  { label: 'Mon', value: '1' },
  { label: 'Tue', value: '2' },
  { label: 'Wed', value: '3' },
  { label: 'Thu', value: '4' },
  { label: 'Fri', value: '5' },
  { label: 'Sat', value: '6' },
];

export function CreateReminderScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('weekly');
  const [interval, setInterval] = useState('1');
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return; }
    setError('');
    setSaving(true);
    if (accessToken) setAccessToken(accessToken);
    try {
      const data: any = {
        title: title.trim(),
        description: description.trim(),
        type, priority, startDate,
      };
      if (dueDate) data.dueDate = dueDate;
      if (isRecurring) {
        data.isRecurring = true;
        data.recurring = {
          frequency,
          interval: parseInt(interval, 10) || 1,
          daysOfWeek: [parseInt(dayOfWeek, 10)],
        };
      }
      await api.post('/reminders', data);
      showToast('Reminder created');
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Failed to create reminder');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormScreen
      title="New Reminder"
      subtitle="Design the reminder rhythm once, then let Dabbu keep it visible"
      icon="notifications"
      accent={[colors.status.warning, colors.accent.primary]}
      footer={
        <FormFooter title="Create Reminder" icon="add" loading={saving} onPress={handleSave} />
      }
    >
      <FormError message={error} />

      <FormSection title="Reminder Details">
        <FormField
          label="Title"
          icon="bells"
          value={title}
          onChangeText={setTitle}
          placeholder="Reminder title"
          required
        />
        <FormTextArea
          label="Description"
          icon="filetext1"
          value={description}
          onChangeText={setDescription}
          placeholder="Reminder description"
        />
      </FormSection>

      <FormSection title="Classification">
        <FormChipGroup label="Type" options={REMINDER_TYPES} selected={type} onSelect={setType} size="sm" />
        <FormChipGroup label="Priority" options={PRIORITIES} selected={priority} onSelect={setPriority} size="sm" />
        <FormField label="Category" icon="tag" value={category} onChangeText={setCategory} placeholder="e.g. Work, Personal" />
      </FormSection>

      <FormSection title="Schedule">
        <FormDatePicker label="Start Date" value={startDate} onChange={setStartDate} />
        <FormDatePicker label="Due Date" value={dueDate} onChange={setDueDate} optional />
        <FormToggle
          label="Recurring"
          value={isRecurring}
          onValueChange={setIsRecurring}
          description="Repeat this reminder automatically"
        />
        {isRecurring && (
          <>
            <FormChipGroup label="Frequency" options={FREQUENCIES} selected={frequency} onSelect={setFrequency} size="sm" />
            <FormField label="Interval" icon="retweet" value={interval} onChangeText={setInterval} placeholder="1" keyboardType="number-pad" />
            <FormChipGroup label="Day of Week" options={DAYS_OF_WEEK} selected={dayOfWeek} onSelect={setDayOfWeek} size="sm" />
          </>
        )}
      </FormSection>
    </FormScreen>
  );
}
