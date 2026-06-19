import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useSpaceStore } from '../../store/spaceStore';
import { useAuth } from '../../store/AuthContext';

const SPACE_TYPES = [
  { type: 'COUPLE', label: 'Couple', icon: 'heart', color: '#7C3AED' },
  { type: 'FAMILY', label: 'Family', icon: 'team', color: '#2563EB' },
  { type: 'TRIP', label: 'Trip', icon: 'earth', color: '#0D9488' },
  { type: 'BUSINESS', label: 'Business', icon: 'briefcase', color: '#4F46E5' },
  { type: 'CUSTOM', label: 'Custom', icon: 'addfile', color: '#F97316' },
];

export function CreateSpaceScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [type, setType] = useState('COUPLE');
  const [saving, setSaving] = useState(false);
  const { createSpace } = useSpaceStore();
  const { accessToken } = useAuth();

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
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <AntDesign name="arrowleft" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary }}>Create Space</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.secondary, marginBottom: 8 }}>Space Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Our Home, Thailand Trip..."
            placeholderTextColor={colors.text.tertiary}
            style={{
              backgroundColor: colors.bg.card,
              padding: 16,
              borderRadius: 12,
              fontSize: 16,
              color: colors.text.primary,
            }}
          />
        </View>

        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.secondary, marginBottom: 8 }}>Space Type</Text>
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
                    gap: 6,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: selected ? st.color : colors.bg.card,
                    borderWidth: selected ? 0 : 1,
                    borderColor: colors.border.default,
                  }}
                >
                  <AntDesign name={st.icon as any} size={16} color={selected ? '#fff' : colors.text.secondary} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? '#fff' : colors.text.secondary }}>
                    {st.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleCreate}
          disabled={!name.trim() || saving}
          style={{
            backgroundColor: name.trim() ? colors.accent.primary : colors.bg.tertiary,
            paddingVertical: 16,
            borderRadius: 14,
            alignItems: 'center',
            marginTop: 20,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: name.trim() ? '#fff' : colors.text.tertiary }}>
              Create Space
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
});
