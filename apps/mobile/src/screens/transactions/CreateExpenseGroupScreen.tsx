import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';

export function CreateExpenseGroupScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { showToast } = useToast();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [members, setMembers] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState<{ [key: number]: any[] }>({});

  const inputsRef = useRef<(TextInput | null)[]>([]);

  const updateMember = useCallback((index: number, value: string) => {
    const digits = value.replace(/[^0-9]/g, '').slice(0, 10);
    setMembers((prev) => {
      const n = [...prev];
      n[index] = digits;
      return n;
    });
    if (digits.length >= 3) {
      setTimeout(async () => {
        try {
          const res = await api.get<any>(`/users/search?query=${digits}`);
          setSearchResults((prev) => ({ ...prev, [index]: Array.isArray(res) ? res : res?.data || [] }));
        } catch {
          setSearchResults((prev) => ({ ...prev, [index]: [] }));
        }
      }, 400);
    } else {
      setSearchResults((prev) => {
        const n = { ...prev };
        delete n[index];
        return n;
      });
    }
  }, []);

  const addRow = useCallback(() => {
    setMembers((prev) => [...prev, '']);
    setTimeout(() => inputsRef.current[inputsRef.current.length - 1]?.focus(), 150);
  }, []);

  const removeRow = useCallback((index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const selectUser = useCallback(
    (index: number, user: any) => {
      const phone = (user.phone || '').replace(/[^0-9]/g, '').slice(0, 10);
      setMembers((prev) => {
        const n = [...prev];
        n[index] = phone;
        return n;
      });
      setSearchResults((prev) => {
        const n = { ...prev };
        delete n[index];
        return n;
      });
      if (index + 1 >= members.length) addRow();
      else setTimeout(() => inputsRef.current[index + 1]?.focus(), 150);
    },
    [members.length],
  );

  async function handleCreate() {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    const validPhones = members.map((m) => m.trim()).filter(Boolean);
    const invalid = validPhones.filter((p) => p.length !== 10);
    if (invalid.length > 0) {
      setError(`Invalid phone${invalid.length > 1 ? 's' : ''}: ${invalid.join(', ')}`);
      return;
    }
    setError('');
    setSaving(true);
    if (accessToken) setAccessToken(accessToken);
    try {
      const payload: any = { name: name.trim(), currency: 'INR' };
      if (validPhones.length > 0) payload.memberPhones = validPhones;
      await api.post('/expense-groups', payload);
      showToast('Group created');
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Failed to create group');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12 }}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.closeBtn}>
            <AntDesign name="close" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text.primary }]}>Create Group</Text>
          <View style={{ width: 34 }} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <View style={[s.errorBox, { backgroundColor: `${colors.status.error}12` }]}>
            <AntDesign name="exclamationcircle" size={16} color={colors.status.error} />
            <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
          </View>
        ) : null}

        {/* Group Name */}
        <Text style={[s.label, { color: colors.text.secondary }]}>Group Name</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Goa Trip, Roommates"
          placeholderTextColor={colors.text.tertiary}
        />

        {/* Members */}
        <Text style={[s.label, { color: colors.text.secondary, marginTop: 24 }]}>
          Add Members (by phone)
        </Text>
        {members.map((phone, index) => (
          <View key={index} style={{ marginBottom: 8 }}>
            <View style={[s.memberRow, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <View style={[s.memberAvatar, { backgroundColor: `${colors.accent.primary}15` }]}>
                <Text style={{ color: colors.accent.primary, fontSize: 12, fontWeight: '700' }}>
                  {(phone || '?')[0]}
                </Text>
              </View>
              <TextInput
                ref={(ref) => { inputsRef.current[index] = ref; }}
                style={[s.memberInput, { color: colors.text.primary }]}
                value={phone}
                onChangeText={(v) => updateMember(index, v)}
                placeholder="9876543210"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="phone-pad"
                maxLength={10}
                returnKeyType="done"
                onSubmitEditing={() => {
                  index === members.length - 1 ? addRow() : inputsRef.current[index + 1]?.focus();
                }}
              />
              {phone.trim() ? (
                <TouchableOpacity onPress={() => removeRow(index)} style={{ padding: 4 }}>
                  <AntDesign name="closecircleo" size={18} color={colors.status.error} />
                </TouchableOpacity>
              ) : null}
            </View>
            {searchResults[index]?.length > 0 && (
              <View style={[s.suggestions, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
                {searchResults[index].map((user: any) => (
                  <TouchableOpacity
                    key={user.id}
                    style={[s.suggestionRow, { borderBottomColor: colors.border.subtle }]}
                    onPress={() => selectUser(index, user)}
                  >
                    <Avatar uri={user.avatarUrl} name={`${user.firstName || ''} ${user.lastName || ''}`.trim()} size={28} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.suggestionName, { color: colors.text.primary }]}>
                        {user.firstName || ''} {user.lastName || ''}
                      </Text>
                      <Text style={[s.suggestionDetail, { color: colors.text.tertiary }]}>
                        {user.phone || ''}
                      </Text>
                    </View>
                    <AntDesign name="pluscircleo" size={20} color={colors.accent.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
        <TouchableOpacity style={s.addMemberBtn} onPress={addRow} activeOpacity={0.7}>
          <AntDesign name="pluscircleo" size={18} color={colors.accent.primary} />
          <Text style={[s.addMemberText, { color: colors.accent.primary }]}>Add another member</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={{ padding: 20, paddingBottom: insets.bottom + 16 }}>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={saving}
          activeOpacity={0.85}
          style={[s.saveBtn, { backgroundColor: colors.accent.primary, opacity: saving ? 0.6 : 1 }]}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={s.saveText}>Create Group</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 8,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, flex: 1 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '500',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingRight: 8,
    minHeight: 54,
    gap: 6,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  memberInput: { flex: 1, fontSize: 15, fontWeight: '600', paddingVertical: 13 },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  addMemberText: { fontSize: 14, fontWeight: '600' },
  suggestions: { marginTop: 4, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionName: { fontSize: 14, fontWeight: '700' },
  suggestionDetail: { fontSize: 11, marginTop: 1, fontWeight: '500' },
  saveBtn: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    minHeight: 56,
  },
  saveText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
