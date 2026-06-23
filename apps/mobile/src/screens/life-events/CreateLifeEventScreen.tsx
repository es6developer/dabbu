import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useLifeEventStore, LifeEventType } from '../../store/lifeEventStore';

import { alertService } from "../../components/ui";
const EVENT_TYPES: { type: LifeEventType; emoji: string; label: string }[] = [
  { type: 'HOUSE', emoji: '🏠', label: 'House Purchase' },
  { type: 'BABY', emoji: '👶', label: 'Planning a Baby' },
  { type: 'WEDDING', emoji: '💍', label: 'Wedding' },
  { type: 'CAR', emoji: '🚗', label: 'Buying a Car' },
  { type: 'VACATION', emoji: '🌴', label: 'Vacation' },
  { type: 'EDUCATION', emoji: '🎓', label: 'Education' },
  { type: 'RETIREMENT', emoji: '📈', label: 'Retirement' },
  { type: 'BUSINESS', emoji: '💼', label: 'Business' },
  { type: 'MOVING', emoji: '📦', label: 'Moving Home' },
  { type: 'CUSTOM', emoji: '📌', label: 'Custom' },
];

export function CreateLifeEventScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [eventType, setEventType] = useState<LifeEventType>('HOUSE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const { createEvent } = useLifeEventStore();

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const event = await createEvent({
      eventType,
      title: title.trim(),
      description: description.trim() || undefined,
      source: 'user_created',
    });
    setSaving(false);
    if (event) {
      navigation?.goBack();
    } else {
      alertService.alert('Error', 'Failed to create life event');
    }
  };

  const selectedMeta = EVENT_TYPES.find((e) => e.type === eventType);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <AntDesign name="arrowleft" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text.primary }]}>New Life Event</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>What's happening?</Text>
        <View style={styles.typeGrid}>
          {EVENT_TYPES.map((et) => (
            <TouchableOpacity
              key={et.type}
              style={[
                styles.typeItem,
                {
                  backgroundColor: eventType === et.type ? colors.accent.primary : colors.bg.card,
                  borderColor: eventType === et.type ? colors.accent.primary : colors.border.default,
                },
              ]}
              onPress={() => {
                setEventType(et.type);
                if (!title) setTitle(`Planning a ${et.label}`);
              }}
            >
              <Text style={styles.typeEmoji}>{et.emoji}</Text>
              <Text
                style={[
                  styles.typeLabel,
                  { color: eventType === et.type ? '#FFF' : colors.text.secondary },
                ]}
              >
                {et.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Title</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bg.card, color: colors.text.primary }]}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Planning our wedding"
          placeholderTextColor={colors.text.tertiary}
        />

        <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.bg.card, color: colors.text.primary }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Any details about this life event..."
          placeholderTextColor={colors.text.tertiary}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: title.trim() ? colors.accent.primary : colors.bg.tertiary }]}
          onPress={handleCreate}
          disabled={!title.trim() || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={[styles.submitText, { color: title.trim() ? '#FFF' : colors.text.tertiary }]}>
              Create Event
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 100 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeEmoji: { fontSize: 16 },
  typeLabel: { fontSize: 13, fontWeight: '600' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, fontSize: 15, fontWeight: '500' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  submitBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 24 },
  submitText: { fontSize: 16, fontWeight: '700' },
});
