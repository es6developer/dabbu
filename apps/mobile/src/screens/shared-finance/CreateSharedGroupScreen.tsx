import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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
  const [partnerPhone, setPartnerPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiStatus, setUpiStatus] = useState<'idle' | 'valid' | 'invalid' | 'checking'>('idle');
  const upiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const UPI_PATTERN = /^[\w\.\-]+@[\w\-]+$/;
  const showPartnerInput = type === 'couple';
  const showUpi = type === 'sports';

  async function validateUpiDebounced(value: string) {
    if (upiTimer.current) clearTimeout(upiTimer.current);
    if (!value.trim()) { setUpiStatus('idle'); return; }
    if (!UPI_PATTERN.test(value.trim())) { setUpiStatus('invalid'); return; }
    setUpiStatus('checking');
    upiTimer.current = setTimeout(async () => {
      try {
        const res = await api.post<any>('/shared-finance/validate-upi', { upiId: value.trim() });
        setUpiStatus(res?.valid ? 'valid' : 'invalid');
      } catch { setUpiStatus('valid'); }
    }, 600);
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    if (type === 'couple' && !partnerPhone.trim()) {
      setError('Partner phone number is required for couple spaces');
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
        upiId: type === 'sports' ? upiId.trim() || undefined : undefined,
      });
      const newGroupId = res?.id || res?._id;
      if (type === 'couple' && newGroupId && partnerPhone.trim()) {
        try {
          await api.post(`/shared-finance/groups/${newGroupId}/members/add-by-phone`, {
            phone: partnerPhone.trim(),
          });
        } catch (addErr: any) {
          setSaving(false);
          setError('Space created, but could not add partner: ' + (addErr.message || 'Phone number may be invalid or the user may not be registered'));
          return;
        }
      }
      if (newGroupId) {
        navigation.replace('SharedGroupDetail', { groupId: newGroupId, groupName: name.trim() });
      } else {
        navigation.goBack();
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        setError(e.message || 'Failed to create group');
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

      {showPartnerInput && (
        <View style={styles.fieldBlock}>
          <Text style={[styles.label, { color: colors.text.tertiary }]}>Partner Phone</Text>
          <View
            style={[
              styles.phoneRow,
              { backgroundColor: colors.bg.card, borderColor: colors.border.default },
            ]}
          >
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

      {showUpi && (
        <View style={styles.fieldBlock}>
          <Text style={[styles.label, { color: colors.text.tertiary }]}>
            Your UPI ID{' '}
            <Text style={{ fontWeight: '400', color: colors.text.tertiary }}>(optional)</Text>
          </Text>
          <View
            style={[
              styles.phoneRow,
              {
                backgroundColor: colors.bg.card,
                borderColor: upiStatus === 'invalid' ? '#FF4D4F' : colors.border.default,
              },
            ]}
          >
            <TextInput
              style={[styles.phoneInput, { flex: 1, color: colors.text.primary }]}
              value={upiId}
              onChangeText={(t) => {
                setUpiId(t);
                if (UPI_PATTERN.test(t.trim())) setUpiStatus('valid');
                else setUpiStatus('idle');
              }}
              onBlur={() => validateUpiDebounced(upiId)}
              placeholder="e.g. user@paytm"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
            />
            {upiStatus === 'valid' && <AntDesign  name="checkcircleo" size={20} color="#34C759" style={{ marginRight: 10 }} />}
            {upiStatus === 'invalid' && <AntDesign  name="exclamationcircle" size={20} color="#FF4D4F" style={{ marginRight: 10 }} />}
            {upiStatus === 'checking' && <AntDesign  name="sync" size={18} color={colors.text.tertiary} style={{ marginRight: 10 }} />}
          </View>
          {upiStatus === 'invalid' && (
            <Text style={{ fontSize: 11, color: '#FF4D4F', marginTop: 4, marginLeft: 2 }}>
              Enter a valid UPI ID (e.g. user@paytm)
            </Text>
          )}
          {upiId.trim() && upiStatus === 'valid' && (
            <Text style={{ fontSize: 11, color: '#34C759', marginTop: 4, marginLeft: 2 }}>
              UPI ID verified
            </Text>
          )}
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
