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
  { key: 'friends', label: 'Friends', icon: 'people', color: '#34C759' },
  { key: 'trip', label: 'Trip', icon: 'airplane', color: '#F3D28F' },
  { key: 'family', label: 'Family', icon: 'home', color: '#6C3EF4' },
  { key: 'couple', label: 'Couple', icon: 'heart', color: '#FF6B9D' },
  { key: 'roommates', label: 'Roommates', icon: 'business', color: '#4F6EF7' },
  { key: 'office', label: 'Office', icon: 'briefcase', color: '#6366F1' },
  { key: 'event', label: 'Event', icon: 'calendar', color: '#FF6B6B' },
  { key: 'apartment', label: 'Apartment', icon: 'home', color: '#8A5CF6' },
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
  const selType = GROUP_TYPES.find(t => t.key === type) || GROUP_TYPES[0];

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
      if (type === 'couple' && newGroupId && partnerPhone.trim()) {
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

          <View style={{ padding: 20, gap: 20 }}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: '#FF4D4F12' }]}>
                <Ionicons name="alert-circle" size={16} color="#FF4D4F" />
                <Text style={[styles.errorText, { color: '#FF4D4F' }]}>{error}</Text>
              </View>
            ) : null}

            <View>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Space Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
                value={name} onChangeText={setName}
                placeholder="e.g. Goa Trip 2025"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
                {GROUP_TYPES.map((t) => {
                  const active = type === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[
                        styles.typeChip,
                        {
                          borderColor: active ? t.color : colors.border.subtle,
                          backgroundColor: active ? `${t.color}20` : colors.bg.card,
                        },
                      ]}
                      onPress={() => setType(t.key)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={t.icon as any} size={16} color={active ? t.color : colors.text.tertiary} />
                      <Text style={[styles.typeChipText, { color: active ? t.color : colors.text.secondary }]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
                value={description} onChangeText={setDescription}
                placeholder="What's this space for?"
                placeholderTextColor={colors.text.tertiary}
                multiline
              />
            </View>

            {showPartnerInput && (
              <View>
                <Text style={[styles.label, { color: colors.text.secondary }]}>Partner Phone</Text>
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
              </View>
            )}

            <LinearGradient
              colors={['#6C3EF4', '#8B5CF6']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            >
              <TouchableOpacity
                onPress={handleCreate} disabled={saving} activeOpacity={0.85}
                style={styles.saveBtnInner}
              >
                {saving ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="people" size={18} color="#FFF" />
                    <Text style={styles.saveBtnText}>Create Space</Text>
                  </>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </ScrollView>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  errorBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, gap: 8 },
  errorText: { fontSize: 13, flex: 1 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { fontSize: 15, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  typeRow: { gap: 8, paddingBottom: 4 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  typeChipText: { fontSize: 13, fontWeight: '600' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingLeft: 14 },
  countryCode: { fontSize: 15, fontWeight: '600', marginRight: 8 },
  phoneInput: { flex: 1, fontSize: 15, paddingVertical: 14 },
  saveBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  saveBtnInner: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
