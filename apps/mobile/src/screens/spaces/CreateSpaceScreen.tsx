import React, { useState, useEffect } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useSpaceStore } from '../../store/spaceStore';
import { useAuth } from '../../store/AuthContext';
import { shadows as sh } from '../../theme/design';

const SPACE_TYPES = [
  { type: 'COUPLE', label: 'Couple', icon: 'heart', color: '#F43F5E' },
  { type: 'FAMILY', label: 'Family', icon: 'team', color: '#059669' },
  { type: 'TRIP', label: 'Trip', icon: 'earth', color: '#0D9488' },
  { type: 'BUSINESS', label: 'Business', icon: 'solution1', color: '#4F46E5' },
  { type: 'CUSTOM', label: 'Custom', icon: 'addfile', color: '#F97316' },
];

export function CreateSpaceScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const preselectedType = route.params?.type || 'COUPLE';
  const [name, setName] = useState('');
  const [type, setType] = useState(preselectedType);
  const [saving, setSaving] = useState(false);
  const { createSpace } = useSpaceStore();
  const { accessToken } = useAuth();

  useEffect(() => {
    if (route.params?.type) {
      setType(route.params.type);
    }
  }, [route.params?.type]);

  const selectedMeta = SPACE_TYPES.find((st) => st.type === type) || SPACE_TYPES[0];

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const space = await createSpace(accessToken, { name: name.trim(), type });
    setSaving(false);
    if (space?.id) {
      navigation?.replace('SpaceDetail', { spaceId: space.id });
    } else {
      Alert.alert('Error', 'Failed to create space');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.bg.card, alignItems: 'center', justifyContent: 'center' }}>
          <AntDesign name="arrowleft" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text.primary }}>Create Space</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, gap: 28 }} keyboardShouldPersistTaps="handled">
        <View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Space name"
            placeholderTextColor={colors.text.tertiary}
            style={{
              backgroundColor: colors.bg.card,
              paddingHorizontal: 18,
              paddingVertical: 16,
              borderRadius: 16,
              fontSize: 17,
              fontWeight: '600',
              color: colors.text.primary,
              borderWidth: 1,
              borderColor: colors.border.subtle,
              ...sh.sm,
            }}
            autoFocus
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {SPACE_TYPES.map((st) => {
            const selected = type === st.type;
            return (
              <TouchableOpacity
                key={st.type}
                onPress={() => setType(st.type)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: selected ? st.color : colors.bg.card,
                  borderWidth: 1,
                  borderColor: selected ? st.color : colors.border.subtle,
                  ...(selected ? sh.sm : {}),
                }}
              >
                <AntDesign name={st.icon as any} size={16} color={selected ? '#fff' : colors.text.secondary} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: selected ? '#fff' : colors.text.secondary }}>
                  {st.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={handleCreate}
          disabled={!name.trim() || saving}
          activeOpacity={0.85}
          style={{
            borderRadius: 16,
            overflow: 'hidden',
            marginTop: 8,
            opacity: !name.trim() || saving ? 0.5 : 1,
            ...sh.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 16,
              backgroundColor: name.trim() ? selectedMeta.color : colors.bg.tertiary,
            }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <AntDesign name={selectedMeta.icon as any} size={18} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
                  Create {selectedMeta.label} Space
                </Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
