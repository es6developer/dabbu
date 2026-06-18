import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import {
  FormScreen,
  FormSection,
  FormField,
  FormFooter,
} from '../../components/forms';

export function CreateChatScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim()) { Alert.alert('Error', 'Chat title is required'); return; }
    setSaving(true);
    if (accessToken) setAccessToken(accessToken);
    try {
      await api.post('/chat', { title: title.trim(), type: 'direct', participantIds: [] });
      Alert.alert('Success', 'Chat created!');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create chat');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormScreen
      title="New Chat"
      subtitle="Create a focused conversation space for money decisions and quick coordination"
      icon="message1"
      accent={[colors.status.info, colors.accent.primary]}
      footer={
        <FormFooter title="Create Chat" icon='plus' loading={saving} onPress={handleCreate} />
      }
    >
      <FormSection title="Chat Details">
        <FormField
          label="Chat Name"
          icon="message1"
          value={title}
          onChangeText={setTitle}
          placeholder="Enter chat name"
          required
        />
      </FormSection>
    </FormScreen>
  );
}
