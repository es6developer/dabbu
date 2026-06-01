import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { DatePickerField } from '../../components/ui/DatePickerField';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

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
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showFreqPicker, setShowFreqPicker] = useState(false);

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
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Failed to create reminder');
    } finally {
      setSaving(false);
    }
  }

  function getPriorityColor(p: string) {
    switch (p) {
      case 'urgent':
        return colors.status.error;
      case 'high':
        return colors.status.warning;
      case 'medium':
        return colors.accent.primary;
      default:
        return colors.text.tertiary;
    }
  }

  return (
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text.primary }]}>New Reminder</Text>
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: `${colors.status.error}18` }]}>
              <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
            </View>
          ) : null}

          <Text style={[styles.label, { color: colors.text.secondary }]}>Title</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.bg.secondary,
                color: colors.text.primary,
                borderColor: colors.border.subtle,
              },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder="Reminder title"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={[styles.label, { color: colors.text.secondary }]}>Description</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: colors.bg.secondary,
                color: colors.text.primary,
                borderColor: colors.border.subtle,
              },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
            placeholderTextColor={colors.text.tertiary}
            multiline
            numberOfLines={4}
          />

          <Text style={[styles.label, { color: colors.text.secondary }]}>Type</Text>
          <TouchableOpacity
            style={[
              styles.picker,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
            onPress={() => setShowTypePicker(!showTypePicker)}
          >
            <Text style={[styles.pickerText, { color: colors.text.primary }]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
            <Text style={[styles.pickerArrow, { color: colors.text.tertiary }]}>▼</Text>
          </TouchableOpacity>
          {showTypePicker && (
            <View
              style={[
                styles.pickerOptions,
                { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
              ]}
            >
              {REMINDER_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.pickerOption,
                    { borderBottomColor: colors.border.subtle },
                    type === t && { backgroundColor: `${colors.accent.primary}18` },
                  ]}
                  onPress={() => {
                    setType(t);
                    setShowTypePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      { color: colors.text.primary },
                      type === t && { color: colors.accent.primary },
                    ]}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.label, { color: colors.text.secondary }]}>Priority</Text>
          <TouchableOpacity
            style={[
              styles.picker,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
            onPress={() => setShowPriorityPicker(!showPriorityPicker)}
          >
            <Text style={[styles.pickerText, { color: getPriorityColor(priority) }]}>
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </Text>
            <Text style={[styles.pickerArrow, { color: colors.text.tertiary }]}>▼</Text>
          </TouchableOpacity>
          {showPriorityPicker && (
            <View
              style={[
                styles.pickerOptions,
                { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
              ]}
            >
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.pickerOption,
                    { borderBottomColor: colors.border.subtle },
                    priority === p && { backgroundColor: `${colors.accent.primary}18` },
                  ]}
                  onPress={() => {
                    setPriority(p);
                    setShowPriorityPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      { color: colors.text.primary },
                      priority === p && { color: colors.accent.primary },
                    ]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <DatePickerField label="Start Date" value={startDate} onChange={setStartDate} />

          <DatePickerField label="Due Date" value={dueDate} onChange={setDueDate} optional />

          <Text style={[styles.label, { color: colors.text.secondary }]}>Category</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.bg.secondary,
                color: colors.text.primary,
                borderColor: colors.border.subtle,
              },
            ]}
            value={category}
            onChangeText={setCategory}
            placeholder="e.g. Work, Personal"
            placeholderTextColor={colors.text.tertiary}
          />

          <View style={styles.switchRow}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Recurring</Text>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: colors.border.subtle, true: colors.accent.primary }}
              thumbColor={isRecurring ? '#FFFFFF' : colors.text.tertiary}
            />
          </View>

          {isRecurring && (
            <>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Frequency</Text>
              <TouchableOpacity
                style={[
                  styles.picker,
                  { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                ]}
                onPress={() => setShowFreqPicker(!showFreqPicker)}
              >
                <Text style={[styles.pickerText, { color: colors.text.primary }]}>
                  {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                </Text>
                <Text style={[styles.pickerArrow, { color: colors.text.tertiary }]}>▼</Text>
              </TouchableOpacity>
              {showFreqPicker && (
                <View
                  style={[
                    styles.pickerOptions,
                    { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                  ]}
                >
                  {FREQUENCIES.map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[
                        styles.pickerOption,
                        { borderBottomColor: colors.border.subtle },
                        frequency === f && { backgroundColor: `${colors.accent.primary}18` },
                      ]}
                      onPress={() => {
                        setFrequency(f);
                        setShowFreqPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          { color: colors.text.primary },
                          frequency === f && { color: colors.accent.primary },
                        ]}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.label, { color: colors.text.secondary }]}>Interval</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bg.secondary,
                    color: colors.text.primary,
                    borderColor: colors.border.subtle,
                  },
                ]}
                value={interval}
                onChangeText={setInterval}
                placeholder="1"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="number-pad"
              />

              <Text style={[styles.label, { color: colors.text.secondary }]}>Day of Week</Text>
              <View style={styles.dayRow}>
                {DAYS_OF_WEEK.map((d) => (
                  <TouchableOpacity
                    key={d.value}
                    style={[
                      styles.dayBtn,
                      { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                      dayOfWeek === d.value && {
                        backgroundColor: colors.accent.primary,
                        borderColor: colors.accent.primary,
                      },
                    ]}
                    onPress={() => setDayOfWeek(d.value)}
                  >
                    <Text
                      style={[
                        styles.dayBtnText,
                        { color: colors.text.tertiary },
                        dayOfWeek === d.value && { color: '#FFFFFF' },
                      ]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: colors.accent.primary },
              saving && { opacity: 0.6 },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Create Reminder</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 18 },
  errorBox: { padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { fontSize: 14 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  pickerText: { fontSize: 16 },
  pickerArrow: { fontSize: 10 },
  pickerOptions: { borderRadius: 14, marginTop: 4, overflow: 'hidden', borderWidth: 1 },
  pickerOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  pickerOptionText: { fontSize: 15 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  dayRow: { flexDirection: 'row', gap: 6 },
  dayBtn: {
    width: 40,
    height: 40,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  dayBtnText: { fontSize: 12, fontWeight: '600' },
  saveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
