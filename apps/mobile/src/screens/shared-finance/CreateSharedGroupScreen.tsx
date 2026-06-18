import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import {
  FormScreen,
  FormSection,
  FormField,
  FormTextArea,
  FormFooter,
  FormError,
  FormSelect,
} from '../../components/forms';

const GROUP_TYPES = [
  { label: 'Friends', value: 'friends', icon: 'people', color: '#34C759' },
  { label: 'Trip', value: 'trip', icon: 'planner', color: '#14B8A6' },
  { label: 'Family', value: 'family', icon: 'home', color: '#14B8A6' },
  { label: 'Couple', value: 'couple', icon: 'heart', color: '#FF6B9D' },
  { label: 'Roommates', value: 'roommates', icon: 'business', color: '#4F6EF7' },
  { label: 'Office', value: 'office', icon: 'briefcase', color: '#14B8A6' },
  { label: 'Event', value: 'event', icon: 'calendar', color: '#FF6B6B' },
  { label: 'Sports', value: 'sports', icon: 'football', color: '#FF6B6B' },
  { label: 'Apartment', value: 'apartment', icon: 'home', color: '#14B8A6' },
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
    if (!name.trim()) { setError('Group name is required'); return; }
    if (type === 'couple' && !partnerPhone.trim()) { setError('Partner phone number is required for couple spaces'); return; }
    setError('');
    setSaving(true);
    try {
      if (accessToken) setAccessToken(accessToken);
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
      setError(e?.message || 'Failed to create group');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormScreen
      title="Create Space"
      subtitle="Split expenses with friends, family, and more"
      icon="earth"
      footer={
        <FormFooter title="Create Space" icon="people" loading={saving} onPress={handleCreate} />
      }
    >
      <FormError message={error} />

      <FormSection title="Space Details">
        <FormField
          label="Space Name"
          icon="text"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Goa Trip 2025"
          required
        />
        <FormSelect
          label="Type"
          icon="appstore-o"
          value={type}
          options={GROUP_TYPES}
          onChange={setType}
        />
        <FormTextArea
          label="Description"
          icon="document-text"
          value={description}
          onChangeText={setDescription}
          placeholder="What's this space for?"
        />
      </FormSection>

      {showPartnerInput && (
        <FormSection title="Partner Details">
          <FormField
            label="Partner Phone"
            icon="user"
            value={partnerPhone}
            onChangeText={(t) => setPartnerPhone(t.replace(/[^0-9]/g, '').slice(0, 10))}
            placeholder="9876543210"
            keyboardType="phone-pad"
          />
        </FormSection>
      )}

      {showUpi && (
        <FormSection title="Payment Details">
          <FormField
            label="Your UPI ID"
            icon="wallet"
            value={upiId}
            onChangeText={(t) => {
              setUpiId(t);
              if (UPI_PATTERN.test(t.trim())) setUpiStatus('valid');
              else setUpiStatus('idle');
            }}
            onBlur={() => validateUpiDebounced(upiId)}
            placeholder="e.g. user@paytm"
            autoCapitalize="none"
            right={
              upiStatus === 'valid' ? <AntDesign name="checkcircleo" size={20} color="#34C759" /> :
              upiStatus === 'invalid' ? <AntDesign name="exclamationcircle" size={20} color="#FF4D4F" /> :
              upiStatus === 'checking' ? <AntDesign name="sync" size={18} color={colors.text.tertiary} /> :
              null
            }
          />
          {upiStatus === 'invalid' && (
            <Text style={{ fontSize: 11, color: '#FF4D4F', marginTop: 2 }}>Enter a valid UPI ID (e.g. user@paytm)</Text>
          )}
        </FormSection>
      )}
    </FormScreen>
  );
}
