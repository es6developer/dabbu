import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Member {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

export function InviteMembersScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { accessToken, user } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { groupId, groupName } = route.params || {};
  const mounted = useRef(true);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadData();
    const timeout = setTimeout(() => {
      if (mounted.current && loading) {
        setLoading(false);
        Alert.alert('Slow Connection', 'Taking longer than expected. Tap refresh to try again.');
      }
    }, 10000);
    return () => {
      mounted.current = false;
      clearTimeout(timeout);
    };
  }, []);

  async function loadData() {
    try {
      const res = await api.get<any>(`/shared-finance/groups/${groupId}`);
      if (!mounted.current) return;

      const fullMembers: Member[] = (res.members || res.participants || []).map((m: any) => ({
        id: m.user?.id || m.id || m.userId,
        name:
          [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ').trim() ||
          m.user?.email ||
          m.name ||
          'Unknown',
        email: m.user?.email || m.email,
        role: m.role,
      }));

      const tempMembers: Member[] = (res.tempMembers || []).map((tm: any) => ({
        id: tm.tempUser?.id || tm.id,
        name: tm.tempUser?.displayName || tm.nickname || tm.tempUser?.email || 'Invited',
        email: tm.tempUser?.email,
        role: tm.role || 'member',
      }));

      setMembers([...fullMembers, ...tempMembers]);
    } catch (e: any) {
      if (!mounted.current) return;
      Alert.alert('Error', e.message || 'Failed to load group data');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  async function handleAddMember() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Email Required', 'Please enter an email address.');
      return;
    }
    setAdding(true);
    try {
      if (accessToken) setAccessToken(accessToken);
      await api.post(`/shared-finance/groups/${groupId}/members/email`, {
        email: trimmedEmail,
      });
      Alert.alert('Member Added', `${trimmedEmail} has been added to "${groupName || 'the group'}".`);
      setEmail('');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backBtn,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
          ]}
        >
          <Ionicons name="close" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Add Member</Text>
      </View>

      <Text style={[styles.groupName, { color: colors.text.secondary }]}>
        {groupName || 'Group'}
      </Text>

      <View
        style={[
          styles.emailCard,
          { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
        ]}
      >
        <View style={styles.emailHeader}>
          <Ionicons name="person-add-outline" size={18} color={colors.accent.primary} />
          <Text style={[styles.emailTitle, { color: colors.text.primary }]}>Add by Email</Text>
        </View>
        <TextInput
          style={[
            styles.emailInput,
            {
              backgroundColor: colors.bg.card,
              borderColor: colors.border.subtle,
              color: colors.text.primary,
            },
          ]}
          placeholder="friend@example.com"
          placeholderTextColor={colors.text.tertiary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[
            styles.addBtn,
            { backgroundColor: colors.accent.primary },
            (adding || !email.trim()) && { opacity: 0.6 },
          ]}
          onPress={handleAddMember}
          disabled={adding || !email.trim()}
        >
          {adding ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Add to Group</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

      <View style={styles.membersSection}>
        <View style={styles.membersHeader}>
          <Text style={[styles.membersTitle, { color: colors.text.secondary }]}>
            Current Members ({members.length})
          </Text>
        </View>
        {members.map((m, i) => (
          <View
            key={m.id || i}
            style={[styles.memberRow, { borderBottomColor: colors.border.subtle }]}
          >
            <View style={[styles.memberAvatar, { backgroundColor: colors.accent.primary + '25' }]}>
              <Text style={[styles.memberAvatarText, { color: colors.accent.primary }]}>
                {(m.name || '?')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={[styles.memberName, { color: colors.text.primary }]}>{m.name}</Text>
              {m.email && (
                <Text style={[styles.memberEmail, { color: colors.text.tertiary }]}>{m.email}</Text>
              )}
            </View>
            {m.role && (
              <View style={[styles.roleBadge, { backgroundColor: colors.bg.card }]}>
                <Text style={[styles.roleText, { color: colors.text.tertiary }]}>{m.role}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={{ height: insets.bottom + 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  groupName: { fontSize: 14, textAlign: 'center', marginBottom: 20, marginTop: -8 },
  emailCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
  },
  emailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  emailTitle: { fontSize: 15, fontWeight: '600' },
  emailInput: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 10,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  divider: { height: 1, marginHorizontal: 20, marginBottom: 20 },
  membersSection: { paddingHorizontal: 20 },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  membersTitle: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAvatarText: { fontSize: 16, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600' },
  memberEmail: { fontSize: 12, marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleText: { fontSize: 11, fontWeight: '500' },
});
