import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';

const EVENT_TYPES = ['Birthday', 'EMI', 'Bill Due', 'Insurance Renewal', 'School Fee', 'Goal Milestone', 'Reminder', 'Custom'];
const COLOR_OPTIONS = ['#6366F1', '#F59E0B', '#EF4444', '#10B981', '#EC4899', '#06B6D4'];

export function CreateCalendarEventScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [eventColor, setEventColor] = useState(COLOR_OPTIONS[0]);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Event title is required');
      return;
    }
    if (!startDate.trim()) {
      Alert.alert('Validation', 'Start date is required');
      return;
    }
    setLoading(true);
    try {
      await api.post('/family-space/calendar', {
        title: title.trim(),
        description: description.trim() || undefined,
        eventType: eventType || undefined,
        startDate: startDate.trim(),
        endDate: endDate.trim() || undefined,
        allDay,
        color: eventColor,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.subtle }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Create Event</Text>
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
            placeholder="e.g. Mom's Birthday"
            placeholderTextColor={colors.text.tertiary}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={[styles.label, { color: colors.text.secondary }]}>Description</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
            placeholder="Event details..."
            placeholderTextColor={colors.text.tertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />

          <Text style={[styles.label, { color: colors.text.secondary }]}>Event Type</Text>
          <View style={styles.chipRow}>
            {EVENT_TYPES.map((et) => (
              <TouchableOpacity
                key={et}
                style={[styles.chip, { backgroundColor: eventType === et ? colors.accent.primary : colors.bg.tertiary, borderColor: colors.border.subtle }]}
                onPress={() => setEventType(et === eventType ? '' : et)}
              >
                <Text style={[styles.chipText, { color: eventType === et ? '#FFFFFF' : colors.text.primary }]}>
                  {et}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text.secondary }]}>Start Date (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
            placeholder="e.g. 2026-07-20"
            placeholderTextColor={colors.text.tertiary}
            value={startDate}
            onChangeText={setStartDate}
          />

          <Text style={[styles.label, { color: colors.text.secondary }]}>End Date (YYYY-MM-DD) (optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.subtle }]}
            placeholder="e.g. 2026-07-21"
            placeholderTextColor={colors.text.tertiary}
            value={endDate}
            onChangeText={setEndDate}
          />

          <Text style={[styles.label, { color: colors.text.secondary }]}>All Day</Text>
          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: allDay ? colors.accent.primary : colors.bg.tertiary, borderColor: colors.border.subtle }]}
            onPress={() => setAllDay(!allDay)}
          >
            <Text style={[styles.toggleText, { color: allDay ? '#FFFFFF' : colors.text.primary }]}>
              {allDay ? 'Yes' : 'No'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.label, { color: colors.text.secondary }]}>Color</Text>
          <View style={styles.colorRow}>
            {COLOR_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c },
                  eventColor === c && { borderWidth: 3, borderColor: colors.text.primary },
                ]}
                onPress={() => setEventColor(c)}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.accent.primary, opacity: loading ? 0.6 : 1 }]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.createBtnText}>Create Event</Text>
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
  toggleBtn: { height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', width: 80 },
  toggleText: { fontSize: 15, fontWeight: '600' },
  colorRow: { flexDirection: 'row', gap: 12 },
  colorCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  createBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  createBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
