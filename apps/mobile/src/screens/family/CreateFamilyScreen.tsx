import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import {
  PremiumActionButton,
  PremiumError,
  PremiumFormScreen,
  PremiumInput,
} from '../../components/ui';

export function CreateFamilyScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!name.trim()) {
      setError('Family name is required');
      return;
    }
    setError('');
    setSaving(true);
    if (accessToken) {
      setAccessToken(accessToken);
    }
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
    <PremiumFormScreen
      title="Create family"
      subtitle="Build a private space for household money, reminders, goals, and shared decisions."
      icon="people"
      accent={[colors.status.success, colors.accent.primary]}
    >
      <PremiumError message={error} />
      <PremiumInput
        label="Family name"
        icon="home-outline"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Sharma Family"
      />
      <PremiumInput
        label="Description"
        icon="document-text-outline"
        value={description}
        onChangeText={setDescription}
        placeholder="A short description..."
        multiline
        numberOfLines={3}
      />
      <PremiumActionButton title="Create family" onPress={handleCreate} loading={saving} icon="add" />
    </PremiumFormScreen>
  );
}
