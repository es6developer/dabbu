import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import {
  PremiumActionButton,
  PremiumFormScreen,
  PremiumInput,
} from '../../components/ui';

export function CreateChatScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim()) {
      Alert.alert('Error', 'Chat title is required');
      return;
    }
    setSaving(true);
    if (accessToken) {
      setAccessToken(accessToken);
    }
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
    <PremiumFormScreen
      title="New chat"
      subtitle="Create a focused conversation space for money decisions and quick coordination."
      icon="chatbubble-ellipses"
      accent={[colors.status.info, colors.accent.primary]}
    >
      <PremiumInput
        label="Chat name"
        icon="message1"
        value={title}
        onChangeText={setTitle}
        placeholder="Enter chat name"
      />
      <PremiumActionButton title="Create chat" onPress={handleCreate} loading={saving} icon="add" />
    </PremiumFormScreen>
  );
}
