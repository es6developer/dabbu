import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useAuth } from '../../store/AuthContext';
import { api, setAccessToken, getAccessToken } from '../../services/api';
import { Avatar } from '../../components/ui/Avatar';
import { PADDING, borderRadius, shadows } from '../../theme/design';

interface Preset {
  seed: string;
  name: string;
  url: string;
}

export function AvatarPickerScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, accessToken, completeProfileSetup } = useAuth();

  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedSeed, setSelectedSeed] = useState<string | null>(null);

  useEffect(() => {
    loadPresets();
  }, []);

  async function loadPresets() {
    setLoading(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.get<any>('/auth/avatar/presets');
      const data = Array.isArray(res) ? res : res?.data || [];
      setPresets(data);
    } catch {
      setPresets([]);
    } finally {
      setLoading(false);
    }
  }

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.post<any>('/auth/avatar/regenerate');
      const avatarUrl = res?.data?.avatarUrl;
      if (avatarUrl && user) {
        completeProfileSetup({ avatarUrl });
      }
      Alert.alert('Avatar Updated', 'Your new avatar has been saved!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to regenerate avatar');
    } finally {
      setRegenerating(false);
    }
  }, [accessToken, user, completeProfileSetup, navigation]);

  const selectPreset = useCallback(
    async (preset: Preset) => {
      setSelectedSeed(preset.seed);
      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        await api.post('/auth/avatar/select', { seed: preset.seed });
        if (user) {
          completeProfileSetup({ avatarUrl: preset.url });
        }
        Alert.alert('Avatar Updated', `You selected "${preset.name}"!`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to select avatar');
        setSelectedSeed(null);
      }
    },
    [accessToken, user, completeProfileSetup, navigation],
  );

  const currentAvatarUrl = user?.avatarUrl || null;

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: PADDING, flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[s.backBtn, { backgroundColor: `${colors.accent.primary}10` }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.accent.primary} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text.primary }]}>Choose Avatar</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Current Avatar Preview */}
        <View style={s.previewSection}>
          <Avatar
            uri={currentAvatarUrl}
            name={`${user?.firstName || ''} ${user?.lastName || ''}`}
            size={100}
          />
          <Text style={[s.previewName, { color: colors.text.primary }]}>
            {user?.firstName || 'User'} {user?.lastName || ''}
          </Text>
        </View>

        {/* Regenerate Button */}
        <TouchableOpacity
          style={[s.regenerateBtn, { backgroundColor: colors.accent.primary }]}
          onPress={handleRegenerate}
          disabled={regenerating}
          activeOpacity={0.8}
        >
          {regenerating ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons name="shuffle" size={18} color="#FFF" />
              <Text style={s.regenerateText}>Generate Random Avatar</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Presets */}
        <View style={{ flex: 1, marginTop: 24 }}>
          <Text style={[s.sectionLabel, { color: colors.text.secondary }]}>
            Choose from Presets
          </Text>
          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="large" color={colors.accent.primary} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.grid}>
              {presets.map((preset) => (
                <TouchableOpacity
                  key={preset.seed}
                  style={[
                    s.presetItem,
                    {
                      backgroundColor: colors.bg.card,
                      borderColor:
                        selectedSeed === preset.seed ? colors.accent.primary : colors.border.subtle,
                    },
                  ]}
                  onPress={() => selectPreset(preset)}
                  activeOpacity={0.7}
                  disabled={selectedSeed === preset.seed}
                >
                  <Avatar uri={preset.url} name={preset.name} size={64} />
                  <Text style={[s.presetName, { color: colors.text.secondary }]} numberOfLines={1}>
                    {preset.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  previewSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    ...shadows.md,
  },
  regenerateText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 40,
  },
  presetItem: {
    width: '47%',
    alignItems: 'center',
    padding: 16,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    ...shadows.sm,
  },
  presetName: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
});
