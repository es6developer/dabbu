import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api } from '../../services/api';

const COLORS = ['#059669', '#22C55E', '#10B981', '#34D399', '#6EE7B7', '#F59E0B', '#F97316', '#EF4444'];

export function CreateFamilyWorkspaceScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverColor, setCoverColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const getFamilyId = useCallback(async () => {
    try {
      const families: any[] = await api.get('/family');
      return families?.[0]?.id || null;
    } catch {
      return null;
    }
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Enter a workspace name'); return; }
    setSaving(true);
    try {
      const familyId = await getFamilyId();
      if (!familyId) { Alert.alert('Error', 'No family found'); setSaving(false); return; }
      await api.post('/family/workspace', {
        familyId,
        name: name.trim(),
        description: description.trim() || undefined,
        coverColor,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create workspace');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.bg.card, alignItems: 'center', justifyContent: 'center' }}>
          <AntDesign name="arrowleft" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text.primary }}>Family Workspace</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, gap: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: 4 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: coverColor + '20', alignItems: 'center', justifyContent: 'center' }}>
            <AntDesign name="team" size={32} color={coverColor} />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text.primary, marginTop: 4 }}>Create Workspace</Text>
          <Text style={{ fontSize: 13, color: colors.text.tertiary, textAlign: 'center' }}>Set up your family workspace to manage expenses, bills, goals and more together.</Text>
        </View>

        <View>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: 6 }}>Workspace Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Our Home"
            placeholderTextColor={colors.text.tertiary}
            style={{ backgroundColor: colors.bg.card, paddingHorizontal: 18, paddingVertical: 16, borderRadius: 16, fontSize: 16, color: colors.text.primary }}
          />
        </View>

        <View>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: 6 }}>Description (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What's this workspace about?"
            placeholderTextColor={colors.text.tertiary}
            multiline
            numberOfLines={3}
            style={{ backgroundColor: colors.bg.card, paddingHorizontal: 18, paddingVertical: 16, borderRadius: 16, fontSize: 16, color: colors.text.primary, minHeight: 80, textAlignVertical: 'top' }}
          />
        </View>

        <View>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: 8 }}>Cover Color</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setCoverColor(c)}
                style={{
                  width: 36, height: 36, borderRadius: 18, backgroundColor: c,
                  borderWidth: coverColor === c ? 3 : 0,
                  borderColor: coverColor === c ? colors.text.primary : 'transparent',
                }}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleCreate}
          disabled={saving || !name.trim()}
          style={{
            backgroundColor: saving || !name.trim() ? colors.text.tertiary : '#059669',
            paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 12,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Create Workspace</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
