import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { HelpTip, HelpCard } from '../../components/ui';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

const CIRCLE_TYPES = [
  { key: 'couple', label: 'Couple', icon: 'heart', color: '#FF6B9D' },
  { key: 'family', label: 'Family', icon: 'home', color: '#F97316' },
  { key: 'friends', label: 'Friends', icon: 'people', color: '#34C759' },
  { key: 'roommates', label: 'Roommates', icon: 'business', color: '#4F6EF7' },
  { key: 'trip', label: 'Trip', icon: 'airplane', color: '#F3D28F' },
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

  const selType = CIRCLE_TYPES.find(t => t.key === type)!;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingContainer>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View
            
             
            style={{ paddingTop: insets.top + 12, paddingBottom: 28, paddingHorizontal: 20 }}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Create Circle</Text>
              <View style={{ width: 32 }} />
            </View>
            <Text style={styles.headerSub}>Start splitting expenses with your people</Text>
          </View>

          <View style={{ padding: 20, gap: 20 }}>
            <View>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Circle Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
                placeholder="Enter circle name"
                placeholderTextColor={colors.text.tertiary}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
                placeholder="Add a description (optional)"
                placeholderTextColor={colors.text.tertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View>
              <HelpTip
                text="Choose a group type that best describes your circle — Couple, Family, Friends, Roommates, or Trip."
                icon="information-circle-outline"
                color={colors.accent.primary}
              />
              <Text style={[styles.label, { color: colors.text.secondary }]}>Category</Text>
              <View style={styles.typeGrid}>
                {CIRCLE_TYPES.map((t) => {
                  const active = type === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[
                        styles.typeCard,
                        {
                          backgroundColor: colors.bg.card,
                          borderColor: active ? t.color : colors.border.subtle,
                        },
                      ]}
                      onPress={() => setType(t.key)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.typeIcon, { backgroundColor: active ? `${t.color}20` : colors.bg.tertiary }]}>
                        <Ionicons name={t.icon as any} size={20} color={active ? t.color : colors.text.tertiary} />
                      </View>
                      <Text style={[styles.typeLabel, { color: active ? t.color : colors.text.secondary }]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Add Members</Text>
              <View style={[styles.searchRow, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
                <Ionicons name="search" size={18} color={colors.text.tertiary} />
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
                    <View key={i} style={[styles.memberChip, { backgroundColor: `${selType.color}15` }]}>
                      <View style={[styles.memberAvatar, { backgroundColor: selType.color }]}>
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
            </View>

            <View
              
               
              style={[styles.createBtn, { opacity: loading ? 0.6 : 1 }]}
            >
              <TouchableOpacity
                onPress={handleCreate}
                disabled={loading}
                activeOpacity={0.85}
                style={styles.createBtnInner}
              >
                <Ionicons name="people" size={18} color="#FFF" />
                <Text style={styles.createBtnText}>Create Circle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { fontSize: 15, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: {
    width: '30.5%', alignItems: 'center', gap: 8, paddingVertical: 16,
    borderRadius: 16, borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  typeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 12, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 12 },
  memberList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  memberChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  memberAvatar: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  memberName: { fontSize: 13, fontWeight: '600' },
  createBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  createBtnInner: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
