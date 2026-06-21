import React, { useState, useEffect } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useSpaceStore } from '../../store/spaceStore';
import { useAuth } from '../../store/AuthContext';

const SPACE_TYPES = [
  { type: 'COUPLE', label: 'Couple', icon: 'heart', color: '#F43F5E' },
  { type: 'FAMILY', label: 'Family', icon: 'team', color: '#059669' },
  { type: 'TRIP', label: 'Trip', icon: 'earth', color: '#0D9488' },
  { type: 'BUSINESS', label: 'Business', icon: 'briefcase', color: '#4F46E5' },
  { type: 'CUSTOM', label: 'Custom', icon: 'addfile', color: '#F97316' },
];

const TYPE_LABELS: Record<string, string> = {
  COUPLE: 'Create a shared space with your partner',
  FAMILY: 'Manage household finances together',
  TRIP: 'Plan and track trip expenses',
  BUSINESS: 'Separate business finances',
  CUSTOM: 'Create your own custom space',
};

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
  const description = TYPE_LABELS[type] || '';

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
        <View style={[s.selectedTypeBanner, { backgroundColor: selectedMeta.color + '15' }]}>
          <View style={[s.selectedTypeIcon, { backgroundColor: selectedMeta.color }]}>
            <AntDesign name={selectedMeta.icon as any} size={28} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: selectedMeta.color }}>
              {selectedMeta.label}
            </Text>
            <Text style={{ fontSize: 13, color: colors.text.secondary, marginTop: 2 }}>
              {description}
            </Text>
          </View>
        </View>

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
              borderWidth: 1,
              borderColor: colors.border.subtle,
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
            backgroundColor: name.trim() ? selectedMeta.color : colors.bg.tertiary,
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
              Create {selectedMeta.label} Space
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  selectedTypeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 16,
  },
  selectedTypeIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
