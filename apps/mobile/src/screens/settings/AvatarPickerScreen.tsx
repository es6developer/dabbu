import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useAuth } from '../../store/AuthContext';
import { api } from '../../services/api';
import { useToast } from '../../store/ToastContext';
import { Avatar } from '../../components/ui/Avatar';
import { getAllAvatarXmls } from '../../assets/avatars';
import { spacing, borderRadius, shadows } from '../../theme/design';

import { alertService } from "../../components/ui";
const AVATAR_NAMES = [
  'Short Hair Glasses', 'Short Hair Beard', 'Long Hair Glasses', 'Curly Hair Smile',
  'Big Hair Glasses', 'Bald Beard', 'Short Hair Beanie', 'Straight Hair',
  'Angry Glasses', 'Ponytail Smile', 'Pixie Cut', 'Long Hair Straight',
];

export function AvatarPickerScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, completeProfileSetup } = useAuth();
  const { showToast } = useToast();

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 28,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 19,
      fontWeight: '700',
    },
    previewSection: {
      alignItems: 'center',
      marginBottom: 28,
    },
    previewName: {
      fontSize: 19,
      fontWeight: '700',
      marginTop: 14,
    },
    sectionLabel: {
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 14,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      paddingBottom: 44,
    },
    presetItem: {
      width: '47%',
      alignItems: 'center',
      padding: 22,
      borderRadius: borderRadius.xl,
      borderWidth: 2,
      ...shadows.sm,
    },
    presetName: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: 8,
    },
    checkBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 24,
      height: 24,
      borderRadius: 28,
      backgroundColor: colors.accent.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#FFF',
    },
  }), [colors]);

  const avatarXmls = useMemo(() => getAllAvatarXmls(), []);

  const currentAvatarUrl = user?.avatarUrl || null;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(() => {
    if (currentAvatarUrl) {
      const idx = AVATAR_NAMES.findIndex((_, i) => currentAvatarUrl === `local:${i}`);
      return idx >= 0 ? idx : null;
    }
    return null;
  });

  const selectAvatar = useCallback(
    async (index: number) => {
      setSelectedIndex(index);
      if (user) {
        completeProfileSetup({ avatarUrl: `local:${index}` });
      }
      try {
        await api.post('/auth/avatar/select', { avatarIndex: index });
      } catch {
        showToast('Avatar saved locally, but sync to server failed');
      }
      alertService.alert('Avatar Updated', `You selected "${AVATAR_NAMES[index]}"!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    [user, completeProfileSetup, navigation, showToast],
  );

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: spacing.xl, flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[s.backBtn, { backgroundColor: `${colors.accent.primary}10` }]}
          >
            <AntDesign name="left" size={20} color={colors.accent.primary} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text.primary }]}>Choose Avatar</Text>
          <View style={{ width: 40 }} />
        </View>

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

        <View style={{ flex: 1, marginTop: 28 }}>
          <Text style={[s.sectionLabel, { color: colors.text.secondary }]}>
            Choose from Avatars
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.grid}>
            {avatarXmls.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  s.presetItem,
                  {
                    backgroundColor: colors.bg.card,
                    borderColor:
                      selectedIndex === index ? colors.accent.primary : colors.border.subtle,
                  },
                ]}
                onPress={() => selectAvatar(index)}
                activeOpacity={0.7}
                disabled={selectedIndex === index}
              >
                <View style={{ position: 'relative' }}>
                  <Avatar
                    uri={`local:${index}`}
                    name={AVATAR_NAMES[index]}
                    size={64}
                  />
                  {selectedIndex === index && (
                    <View style={s.checkBadge}>
                      <AntDesign name="check" size={14} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <Text style={[s.presetName, { color: colors.text.secondary }]} numberOfLines={1}>
                  {AVATAR_NAMES[index]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
