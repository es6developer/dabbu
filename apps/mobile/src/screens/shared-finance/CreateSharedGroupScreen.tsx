import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

const GROUP_TYPES = [
  'Friends', 'Trip', 'Family', 'Couple', 'Roommates', 'Office', 'Event', 'Apartment',
] as const;

export function CreateSharedGroupScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [type, setType] = useState('Friends');
  const [description, setDescription] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const showPartnerInput = type === 'Couple';

  async function handleCreate() {
    if (!name.trim()) { setError('Group name is required'); return; }
    setError(''); setSaving(true);
    try {
      if (accessToken) setAccessToken(accessToken);
      const res = await api.post<any>('/shared-finance/groups', {
        name: name.trim(), type: type.toLowerCase(),
        description: description.trim(), currency: 'INR',
      });
      const newGroupId = res?.id || res?._id;
      if (type === 'Couple' && newGroupId && partnerPhone.trim()) {
        await api.post(`/shared-finance/groups/${newGroupId}/members/add-by-phone`, {
          phone: `+91${partnerPhone.trim()}`,
        }).catch(() => {});
      }
      if (newGroupId) {
        navigation.replace('SharedGroupDetail', { groupId: newGroupId, groupName: name.trim() });
      } else {
        navigation.goBack();
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create group');
    } finally { setSaving(false); }
  }

  return (
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <LinearGradient
            colors={['#6C3EF4', '#8B5CF6']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ paddingTop: 48, paddingBottom: 28, paddingHorizontal: 20 }}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Create Space</Text>
              <View style={{ width: 32 }} />
            </View>
            <Text style={styles.headerSub}>Split expenses with friends, family, and more</Text>
          </LinearGradient>

          <View style={{ padding: 20 }}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: '#FF4D4F12' }]}>
                <Ionicons name="alert-circle" size={16} color="#FF4D4F" />
                <Text style={[styles.errorText, { color: '#FF4D4F' }]}>{error}</Text>
              </View>
            ) : null}

            <Text style={[styles.label, { color: colors.text.secondary }]}>Space Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
              value={name} onChangeText={setName}
              placeholder="e.g. Goa Trip 2025"
              placeholderTextColor={colors.text.tertiary}
            />

            <Text style={[styles.label, { color: colors.text.secondary, marginTop: 16 }]}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {GROUP_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, { borderColor: type === t ? '#6C3EF4' : colors.border.subtle, backgroundColor: type === t ? '#6C3EF415' : colors.bg.card }]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.typeChipText, { color: type === t ? '#6C3EF4' : colors.text.secondary }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: colors.text.secondary, marginTop: 16 }]}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
              value={description} onChangeText={setDescription}
              placeholder="What's this space for?"
              placeholderTextColor={colors.text.tertiary}
              multiline
            />

            {showPartnerInput && (
              <>
                <Text style={[styles.label, { color: colors.text.secondary, marginTop: 16 }]}>Partner Phone</Text>
                <View style={[styles.phoneRow, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
                  <Text style={[styles.countryCode, { color: colors.text.secondary }]}>+91</Text>
                  <TextInput
                    style={[styles.phoneInput, { color: colors.text.primary }]}
                    value={partnerPhone} onChangeText={(t) => setPartnerPhone(t.replace(/[^0-9]/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="phone-pad" maxLength={10}
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleCreate} disabled={saving} activeOpacity={0.85}
            >
              <LinearGradient colors={['#6C3EF4', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveBtnGrad}>
                {saving ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="people" size={18} color="#FFF" />
                    <Text style={styles.saveBtnText}>Create Space</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  errorBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, marginBottom: 16, gap: 8 },
  errorText: { fontSize: 13, flex: 1 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { fontSize: 15, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  typeRow: { gap: 8, paddingBottom: 4 },
  typeChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  typeChipText: { fontSize: 14, fontWeight: '600' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingLeft: 14 },
  countryCode: { fontSize: 15, fontWeight: '600', marginRight: 8 },
  phoneInput: { flex: 1, fontSize: 15, paddingVertical: 14 },
  saveBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 28 },
  saveBtnGrad: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
