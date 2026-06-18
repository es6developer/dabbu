import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import {
  FormScreen,
  FormSection,
  FormField,
  FormTextArea,
  FormFooter,
  FormError,
} from '../../components/forms';

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
    <FormScreen
      title="Create Family"
      subtitle="Build a private space for household money, reminders, goals, and shared decisions"
      icon="people"
      accent={[colors.status.success, colors.accent.primary]}
      footer={
        <FormFooter title="Create Family" icon='plus' loading={saving} onPress={handleCreate} />
      }
    >
      <FormError message={error} />
      <FormSection title="Family Details">
        <FormField
          label="Family Name"
          icon="home"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Sharma Family"
          required
        />
        <FormTextArea
          label="Description"
          icon="filetext1"
          value={description}
          onChangeText={setDescription}
          placeholder="A short description of your family group"
        />
      </FormSection>
    </FormScreen>
  );
}
