import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import {
  FormScreen,
  FormSection,
  FormField,
  FormTextArea,
  FormSelect,
  FormFooter,
  FormError,
} from '../../components/forms';

const CIRCLE_TYPES = [
  { label: 'Couple', value: 'couple', icon: 'heart', color: '#FF6B9D' },
  { label: 'Family', value: 'family', icon: 'home', color: '#F97316' },
  { label: 'Friends', value: 'friends', icon: 'people', color: '#34C759' },
  { label: 'Roommates', value: 'roommates', icon: 'business', color: '#4F6EF7' },
  { label: 'Trip', value: 'trip', icon: 'planner', color: '#14B8A6' },
  { label: 'Sports', value: 'sports', icon: 'football', color: '#FF6B6B' },
];

const UPI_PATTERN = /^[\w\.\-]+@[\w\-]+$/;

export function CreateCircleScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('couple');
  const [members, setMembers] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiStatus, setUpiStatus] = useState<'idle' | 'valid' | 'invalid' | 'checking'>('idle');
  const upiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function addMember(name: string) {
    if (!members.includes(name)) setMembers([...members, name]);
    setSearchText('');
  }

  function removeMember(name: string) {
    setMembers(members.filter((m) => m !== name));
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Please enter a circle name'); return; }
    setError('');
    setLoading(true);
    try {
      if (accessToken) setAccessToken(accessToken);
      await api.post('/shared-finance/groups', {
        name: name.trim(),
        description: description.trim(),
        type,
        members,
        upiId: type === 'sports' ? upiId.trim() || undefined : undefined,
      });
      navigation.goBack();
      showToast('Circle created');
    } catch (e: any) {
      setError(e.message || 'Failed to create circle');
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormScreen
      title="Create Circle"
      subtitle="Start splitting expenses with your people"
      icon="team"
      accent={[colors.accent.primary, colors.status.info]}
      footer={
        <FormFooter title="Create Circle" icon="team" loading={loading} onPress={handleCreate} />
      }
    >
      <FormError message={error} />

      <FormSection title="Circle Details">
        <FormField
          label="Circle Name"
          icon="text"
          value={name}
          onChangeText={setName}
          placeholder="Enter circle name"
          required
        />
        <FormSelect
          label="Category"
          icon="appstore-o"
          value={type}
          options={CIRCLE_TYPES}
          onChange={setType}
        />
        <FormTextArea
          label="Description"
          icon="document-text"
          value={description}
          onChangeText={setDescription}
          placeholder="Add a description (optional)"
        />
      </FormSection>

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
        </FormSection>
      )}

      <FormSection title="Members">
        <View style={[styles.searchRow, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
          <AntDesign name="search1" size={18} color={colors.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="Search by name or mobile"
            placeholderTextColor={colors.text.tertiary}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={() => searchText.trim() && addMember(searchText.trim())}
            returnKeyType="done"
          />
        </View>

        {members.length > 0 && (
          <View style={styles.memberList}>
            {members.map((m, i) => (
              <View key={i} style={[styles.memberChip, { backgroundColor: `${colors.accent.primary}15` }]}>
                <View style={[styles.memberAvatar, { backgroundColor: colors.accent.primary }]}>
                  <Text style={styles.memberAvatarText}>{m[0]}</Text>
                </View>
                <Text style={[styles.memberName, { color: colors.text.primary }]}>{m}</Text>
                <TouchableOpacity onPress={() => removeMember(m)}>
                  <AntDesign name="closecircleo" size={18} color="#FF4D4F" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </FormSection>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  memberList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  memberAvatar: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  memberName: { fontSize: 13, fontWeight: '600' },
});
