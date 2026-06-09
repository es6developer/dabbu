import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import {
  PremiumFormScreen,
  PremiumInput,
  PremiumActionButton,
  PremiumError,
} from '../../components/ui/PremiumForm';

const GROUP_TYPES = [
  { key: 'friends', label: 'Friends', icon: 'people', color: '#34C759' },
  { key: 'trip', label: 'Trip', icon: 'airplane', color: '#14B8A6' },
  { key: 'family', label: 'Family', icon: 'home', color: '#14B8A6' },
  { key: 'couple', label: 'Couple', icon: 'heart', color: '#FF6B9D' },
  { key: 'roommates', label: 'Roommates', icon: 'business', color: '#4F6EF7' },
  { key: 'office', label: 'Office', icon: 'briefcase', color: '#14B8A6' },
  { key: 'event', label: 'Event', icon: 'calendar', color: '#FF6B6B' },
  { key: 'apartment', label: 'Apartment', icon: 'home', color: '#14B8A6' },
];

export function CreateSharedGroupScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [type, setType] = useState('friends');
  const [description, setDescription] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const showPartnerInput = type === 'couple';

  async function handleCreate() {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    setError('');
    setSaving(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.post<any>('/shared-finance/groups', {
        name: name.trim(),
        type: type.toLowerCase(),
        description: description.trim(),
        currency: 'INR',
      });
      const newGroupId = res?.id || res?._id;
      if (type === 'couple' && newGroupId && partnerPhone.trim()) {
        await api
          .post(`/shared-finance/groups/${newGroupId}/members/add-by-phone`, {
            phone: `+91${partnerPhone.trim()}`,
          })
          .catch(() => {});
      }
      if (newGroupId) {
        navigation.replace('SharedGroupDetail', { groupId: newGroupId, groupName: name.trim() });
      } else {
        navigation.goBack();
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create group');
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <View style={styles.footer}>
      <PremiumActionButton
        title="Create Space"
        icon="people"
        onPress={handleCreate}
        loading={saving}
      />
    </View>
  );

  return (
    <PremiumFormScreen
      title="Create Space"
      subtitle="Split expenses with friends, family, and more"
      icon="planet"
      footer={footer}
    >
      <PremiumError message={error} />

      <PremiumInput
        label="Space Name"
        icon="text"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Goa Trip 2025"
        required
      />

      <View style={styles.fieldBlock}>
        <Text style={[styles.label, { color: colors.text.tertiary }]}>Type</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeRow}
        >
          {GROUP_TYPES.map((t) => {
            const active = type === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.typeChip,
                  {
                    borderColor: active ? t.color : colors.border.default,
                    backgroundColor: active ? `${t.color}1A` : colors.bg.card,
                  },
                ]}
                onPress={() => setType(t.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={t.icon as any}
                  size={15}
                  color={active ? t.color : colors.text.tertiary}
                />
                <Text
                  style={[styles.typeChipText, { color: active ? t.color : colors.text.secondary }]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <PremiumInput
        label="Description (optional)"
        icon="document-text"
        value={description}
        onChangeText={setDescription}
        placeholder="What's this space for?"
        multiline
      />

      {showPartnerInput && (
        <View style={styles.fieldBlock}>
          <Text style={[styles.label, { color: colors.text.tertiary }]}>Partner Phone</Text>
          <View
            style={[
              styles.phoneRow,
              { backgroundColor: colors.bg.card, borderColor: colors.border.default },
            ]}
          >
            <Text style={[styles.countryCode, { color: colors.text.tertiary }]}>+91</Text>
            <TextInput
              style={[styles.phoneInput, { color: colors.text.primary }]}
              value={partnerPhone}
              onChangeText={(t) => setPartnerPhone(t.replace(/[^0-9]/g, '').slice(0, 10))}
              placeholder="9876543210"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
        </View>
      )}
    </PremiumFormScreen>
  );
}

const styles = StyleSheet.create({
  fieldBlock: {
    marginBottom: 15,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  typeRow: {
    gap: 8,
    paddingVertical: 4,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    paddingLeft: 14,
    minHeight: 54,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 13,
  },
  footer: {
    marginTop: 8,
  },
});
