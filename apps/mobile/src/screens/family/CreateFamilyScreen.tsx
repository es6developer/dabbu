import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

export function CreateFamilyScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!name.trim()) { setError('Family name is required'); return; }
    setError('');
    setSaving(true);
    if (accessToken) setAccessToken(accessToken);
    try {
      await api.post('/family', { name: name.trim(), description: description.trim() });
      Alert.alert('Success', 'Family group created successfully!');
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Failed to create family');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: `${colors.accent.primary}15` }]}>
          <Ionicons name="people" size={36} color={colors.accent.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text.primary }]}>Create Family</Text>
        <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>Share finances, reminders, and goals with your loved ones</Text>
      </View>

      {error ? <View style={[styles.errorBox, { backgroundColor: `${colors.status.error}18` }]}><Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text></View> : null}

      <Text style={[styles.label, { color: colors.text.secondary }]}>Family Name</Text>
      <TextInput style={[styles.input, { backgroundColor: colors.bg.secondary, color: colors.text.primary, borderColor: colors.border.subtle }]} value={name} onChangeText={setName} placeholder="e.g. Smith Family" placeholderTextColor={colors.text.tertiary} />

      <Text style={[styles.label, { color: colors.text.secondary }]}>Description (optional)</Text>
      <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.bg.secondary, color: colors.text.primary, borderColor: colors.border.subtle }]} value={description} onChangeText={setDescription} placeholder="A short description..." placeholderTextColor={colors.text.tertiary} multiline numberOfLines={3} />

      <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.accent.primary }, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFFFFF" /> : (
          <><Ionicons name="add-circle" size={20} color="#FFFFFF" /><Text style={styles.createBtnText}>Create Family</Text></>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  hero: { alignItems: 'center', marginBottom: 32, marginTop: 16 },
  heroIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  errorBox: { padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { fontSize: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { fontSize: 16, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 32 },
  createBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
