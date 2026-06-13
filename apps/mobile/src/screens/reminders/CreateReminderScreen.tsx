import React, { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import { DatePickerField } from '../../components/ui/DatePickerField';
import {
  PremiumActionButton,
  PremiumChip,
  PremiumError,
  PremiumFormScreen,
  PremiumInput,
  premiumFormStyles,
} from '../../components/ui';

const REMINDER_TYPES = ['general', 'payment', 'bill', 'subscription', 'goal'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];
const DAYS_OF_WEEK = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
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
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      const data: any = {
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        startDate,
      };
      if (dueDate) {
        data.dueDate = dueDate;
      }
      if (isRecurring) {
        data.isRecurring = true;
        data.recurring = {
          frequency,
          interval: parseInt(interval, 10) || 1,
          daysOfWeek: [dayOfWeek],
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
    <PremiumFormScreen
      title="New reminder"
      subtitle="Design the reminder rhythm once, then let Dabbu keep it visible."
      icon="notifications"
      accent={[colors.status.warning, colors.accent.primary]}
    >
      <PremiumError message={error} />
      <PremiumInput
        label="Title"
        icon="notifications-outline"
        value={title}
        onChangeText={setTitle}
        placeholder="Reminder title"
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
      <Text style={[local.label, { color: colors.text.tertiary }]}>Type</Text>
      <View style={premiumFormStyles.rowWrap}>
        {REMINDER_TYPES.map((t) => (
          <PremiumChip
            key={t}
            label={t.charAt(0).toUpperCase() + t.slice(1)}
            selected={type === t}
            onPress={() => setType(t)}
          />
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
      <DatePickerField label="Start Date" value={startDate} onChange={setStartDate} />
      <DatePickerField label="Due Date" value={dueDate} onChange={setDueDate} optional />
      <PremiumInput
        label="Category"
        icon="pricetag-outline"
        value={category}
        onChangeText={setCategory}
        placeholder="e.g. Work, Personal"
      />
      <View style={premiumFormStyles.splitRow}>
        <Text style={[local.label, { color: colors.text.tertiary, marginTop: 0 }]}>Recurring</Text>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          trackColor={{ false: colors.border.subtle, true: colors.accent.primary }}
          thumbColor={isRecurring ? '#FFFFFF' : colors.text.tertiary}
        />
      </View>
      {isRecurring ? (
        <>
          <Text style={[local.label, { color: colors.text.tertiary }]}>Frequency</Text>
          <View style={premiumFormStyles.rowWrap}>
            {FREQUENCIES.map((f) => (
              <PremiumChip
                key={f}
                label={f.charAt(0).toUpperCase() + f.slice(1)}
                selected={frequency === f}
                onPress={() => setFrequency(f)}
              />
            ))}
          </View>
          <PremiumInput
            label="Interval"
            icon="repeat-outline"
            value={interval}
            onChangeText={setInterval}
            placeholder="1"
            keyboardType="number-pad"
          />
          <Text style={[local.label, { color: colors.text.tertiary }]}>Day of Week</Text>
          <View style={premiumFormStyles.rowWrap}>
            {DAYS_OF_WEEK.map((d) => (
              <PremiumChip
                key={d.value}
                label={d.label}
                selected={dayOfWeek === d.value}
                onPress={() => setDayOfWeek(d.value)}
              />
            ))}
          </View>
        </>
      ) : null}
      <PremiumActionButton
        title="Create reminder"
        onPress={handleSave}
        loading={saving}
        icon="add"
      />
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
};
