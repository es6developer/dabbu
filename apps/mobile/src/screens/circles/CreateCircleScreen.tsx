import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

const CIRCLE_TYPES = [
  { key: 'couple', label: 'Couple', icon: 'heart' },
  { key: 'family', label: 'Family', icon: 'home' },
  { key: 'friends', label: 'Friends', icon: 'people' },
  { key: 'roommates', label: 'Roommates', icon: 'business' },
  { key: 'trip', label: 'Trip', icon: 'airplane' },
];

export function CreateCircleScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('couple');
  const [members, setMembers] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a circle name');
      return;
    }
    setLoading(true);
    try {
      if (accessToken) setAccessToken(accessToken);
      await api.post('/shared-finance/groups', {
        name: name.trim(),
        description: description.trim(),
        type,
        members,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create circle');
    } finally {
      setLoading(false);
    }
  }

  function addMember(name: string) {
    if (!members.includes(name)) {
      setMembers([...members, name]);
    }
    setSearchText('');
  }

  function removeMember(name: string) {
    setMembers(members.filter(m => m !== name));
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingContainer>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <LinearGradient
            colors={['#6C3EF4', '#8B5CF6']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ paddingTop: insets.top + 12, paddingBottom: 28, paddingHorizontal: 20 }}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Create Circle</Text>
              <View style={{ width: 32 }} />
            </View>
          </LinearGradient>

          <View style={{ padding: 20 }}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Circle Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
              placeholder="Enter circle name"
              placeholderTextColor={colors.text.tertiary}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.label, { color: colors.text.secondary, marginTop: 16 }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
              placeholder="Add a description (optional)"
              placeholderTextColor={colors.text.tertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.label, { color: colors.text.secondary, marginTop: 16 }]}>Category</Text>
            <View style={styles.typeRow}>
              {CIRCLE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeChip, { borderColor: type === t.key ? '#6C3EF4' : colors.border.subtle, backgroundColor: type === t.key ? '#6C3EF415' : colors.bg.card }]}
                  onPress={() => setType(t.key)}
                >
                  <Ionicons name={t.icon as any} size={16} color={type === t.key ? '#6C3EF4' : colors.text.tertiary} />
                  <Text style={[styles.typeLabel, { color: type === t.key ? '#6C3EF4' : colors.text.tertiary }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.text.secondary, marginTop: 16 }]}>Add Members</Text>
            <View style={[styles.searchRow, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <Ionicons name="search" size={18} color={colors.text.tertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text.primary }]}
                placeholder="Search by name or mobile"
                placeholderTextColor={colors.text.tertiary}
                value={searchText}
                onChangeText={setSearchText}
                onSubmitEditing={() => searchText.trim() && addMember(searchText.trim())}
              />
            </View>

            {members.length > 0 && (
              <View style={styles.memberList}>
                {members.map((m, i) => (
                  <View key={i} style={[styles.memberChip, { backgroundColor: '#6C3EF415' }]}>
                    <View style={[styles.memberAvatar, { backgroundColor: '#6C3EF4' }]}>
                      <Text style={styles.memberAvatarText}>{m[0]}</Text>
                    </View>
                    <Text style={[styles.memberName, { color: colors.text.primary }]}>{m}</Text>
                    <TouchableOpacity onPress={() => removeMember(m)}>
                      <Ionicons name="close-circle" size={18} color="#FF4D4F" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.createBtn, loading && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#6C3EF4', '#8B5CF6']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.createBtnGrad}
              >
                <Ionicons name="people" size={18} color="#FFF" />
                <Text style={styles.createBtnText}>Create Circle</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { fontSize: 15, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  typeLabel: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 12 },
  memberList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  memberChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  memberAvatar: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  memberName: { fontSize: 13, fontWeight: '600' },
  createBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 24 },
  createBtnGrad: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
