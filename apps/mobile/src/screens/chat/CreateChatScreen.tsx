import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

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
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text.primary }]}>New Chat</Text>

          <Text style={[styles.label, { color: colors.text.tertiary }]}>Chat Name</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.bg.tertiary,
                color: colors.text.primary,
                borderColor: colors.border.subtle,
              },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter chat name"
            placeholderTextColor={colors.text.tertiary}
          />

          <TouchableOpacity
            style={[
              styles.createBtn,
              { backgroundColor: colors.accent.primary },
              saving && { opacity: 0.6 },
            ]}
            onPress={handleCreate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createBtnText}>Create Chat</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 32 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  createBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 32 },
  createBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
