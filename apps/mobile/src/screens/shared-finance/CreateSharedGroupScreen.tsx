import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
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
  { key: 'friends', label: 'Friends', icon: 'team', color: '#34C759' },
  { key: 'trip', label: 'Trip', icon: 'earth', color: '#14B8A6' },
  { key: 'family', label: 'Family', icon: 'home', color: '#14B8A6' },
  { key: 'couple', label: 'Couple', icon: 'heart', color: '#FF6B9D' },
  { key: 'roommates', label: 'Roommates', icon: 'idcard', color: '#4F6EF7' },
  { key: 'office', label: 'Office', icon: 'solution1', color: '#14B8A6' },
  { key: 'event', label: 'Event', icon: 'calendar', color: '#FF6B6B' },
  { key: 'apartment', label: 'Apartment', icon: 'home', color: '#14B8A6' },
  { key: 'sports', label: 'Sports', icon: 'codesquareo', color: '#FF6B6B' },
];

export function CreateSharedGroupScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [type, setType] = useState('friends');
  const [description, setDescription] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiValidating, setUpiValidating] = useState(false);
  const [upiValid, setUpiValid] = useState<boolean | null>(null);
  const upiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const UPI_PATTERN = /^[\w.-]+@[\w.-]+$/;

  async function handleUpiBlur(value: string) {
    if (upiTimer.current) clearTimeout(upiTimer.current);
    if (!value.trim() || !UPI_PATTERN.test(value.trim())) return;
    setUpiValidating(true);
    try {
      const res = await api.get<any>(`/users/validate-upi?upiId=${encodeURIComponent(value.trim())}`);
      setUpiValid(res?.valid === true);
    } catch {
      setUpiValid(null);
    } finally {
      setUpiValidating(false);
    }
  }

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!name.trim()) {
      setError('Space name is required');
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
        upiId: upiId.trim() || undefined,
      });
      const newGroupId = res?.id || res?._id;
      if (newGroupId) {
        navigation.replace('SharedGroupDetail', { groupId: newGroupId, groupName: name.trim() });
      } else {
        navigation.goBack();
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        setError(e.message || 'Failed to create space');
      }
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <View style={styles.footer}>
      <PremiumActionButton
        title="Create Space"
        icon="team"
        onPress={handleCreate}
        loading={saving}
      />
    </View>
  );

  return (
    <PremiumFormScreen
      title="Create Space"
      subtitle="Split expenses with friends, family, and more"
      icon="earth"
      footer={footer}
    >
      <PremiumError message={error} />

      <PremiumInput
        label="Space Name"
        icon="filetext1"
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
                <AntDesign
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
        icon="filetext1"
        value={description}
        onChangeText={setDescription}
        placeholder="What's this space for?"
        multiline
      />

      <View style={styles.fieldBlock}>
        <Text style={[styles.label, { color: colors.text.tertiary }]}>
          Your UPI ID <Text style={{ fontWeight: '400' }}>(optional)</Text>
        </Text>
        <View style={{ position: 'relative' }}>
          <TextInput
            style={{
              fontSize: 15,
              paddingHorizontal: 16,
              paddingVertical: 14,
              paddingRight: 44,
              borderRadius: 15,
              borderWidth: 1,
              borderColor: upiValid === false ? colors.status.error : upiValid === true ? '#34C759' : colors.border.default,
              backgroundColor: colors.bg.card,
              color: colors.text.primary,
            }}
            value={upiId}
            onChangeText={(t) => {
              setUpiId(t);
              setUpiValid(null);
            }}
            onBlur={() => handleUpiBlur(upiId)}
            placeholder="example@upi"
            placeholderTextColor={colors.text.tertiary}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {upiValidating ? (
            <View style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}>
              <ActivityIndicator size="small" color={colors.accent.primary} />
            </View>
          ) : upiValid === true ? (
            <View style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}>
              <AntDesign name="checkcircle" size={18} color="#34C759" />
            </View>
          ) : upiValid === false && upiId.trim() ? (
            <View style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}>
              <AntDesign name="closecircle" size={18} color={colors.status.error} />
            </View>
          ) : null}
        </View>
      </View>
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
  footer: {
    marginTop: 8,
  },
});
