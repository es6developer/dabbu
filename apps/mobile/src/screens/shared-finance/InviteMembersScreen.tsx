import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';

interface Member {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

interface PendingInvitation {
  id: string;
  email?: string;
  invitedEmail?: string;
  status: string;
  createdAt: string;
}

export function InviteMembersScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { groupId, groupName } = route.params || {};
  const mounted = useRef(true);

  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadData();
    return () => {
      mounted.current = false;
    };
  }, []);

  async function loadData() {
    try {
      const [groupRes, pendingRes] = await Promise.all([
        api.get<any>(`/shared-finance/groups/${groupId}`),
        api.get<any>('/shared-finance/invitations/pending'),
      ]);

      if (!mounted.current) {
        return;
      }

      const fullMembers: Member[] = (groupRes.members || groupRes.participants || []).map(
        (m: any) => ({
          id: m.user?.id || m.id || m.userId,
          name:
            [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ').trim() ||
            m.user?.email ||
            m.name ||
            'Unknown',
          email: m.user?.email || m.email,
          role: m.role,
        }),
      );

      const tempMembers: Member[] = (groupRes.tempMembers || []).map((tm: any) => ({
        id: tm.tempUser?.id || tm.id,
        name: tm.tempUser?.displayName || tm.nickname || tm.tempUser?.email || 'Invited',
        email: tm.tempUser?.email,
        role: tm.role || 'member',
      }));

      const pending = (Array.isArray(pendingRes) ? pendingRes : [])
        .filter((inv: any) => inv.groupId === groupId)
        .map((inv: any) => ({
          id: inv.id,
          email: inv.email || inv.invitedEmail,
          invitedEmail: inv.invitedEmail || inv.email,
          status: inv.status,
          createdAt: inv.createdAt,
        }));

      setMembers([...fullMembers, ...tempMembers]);
      setPendingInvitations(pending);
    } catch (e: any) {
      if (!mounted.current) {
        return;
      }
      Alert.alert('Error', e.message || 'Failed to load data');
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  async function handleSendInvitation() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Email Required', 'Please enter an email address.');
      return;
    }
    setSending(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.post(`/shared-finance/groups/${groupId}/invitations`, {
        email: trimmedEmail,
      });
      Alert.alert('Invitation Sent', `Invitation sent to ${trimmedEmail}`);
      setEmail('');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  }

  async function handleRevoke(invitationId: string) {
    try {
      await api.delete(`/shared-finance/invitations/${invitationId}`);
      setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to revoke invitation');
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
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
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Invite Members</Text>
        </View>

        <Text style={[styles.groupName, { color: colors.text.secondary }]}>
          {groupName || 'Group'}
        </Text>

        <View
          style={[
            styles.inviteCard,
            { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
          ]}
        >
          <View style={styles.inviteHeader}>
            <Ionicons name="mail-outline" size={18} color={colors.accent.primary} />
            <Text style={[styles.inviteTitle, { color: colors.text.primary }]}>
              Invite by Email
            </Text>
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
              styles.sendBtn,
              { backgroundColor: colors.accent.primary },
              (sending || !email.trim()) && { opacity: 0.6 },
            ]}
            onPress={handleSendInvitation}
            disabled={sending || !email.trim()}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="send-outline" size={16} color="#fff" />
                <Text style={styles.sendBtnText}>Send Invitation</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {pendingInvitations.length > 0 && (
          <>
            <View style={[styles.sectionDivider, { backgroundColor: colors.border.subtle }]} />
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
                <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
                  Pending Invitations ({pendingInvitations.length})
                </Text>
              </View>
              {pendingInvitations.map((inv) => (
                <View
                  key={inv.id}
                  style={[styles.pendingRow, { borderBottomColor: colors.border.subtle }]}
                >
                  <View style={styles.pendingInfo}>
                    <View
                      style={[
                        styles.pendingAvatar,
                        { backgroundColor: colors.status.warningLight },
                      ]}
                    >
                      <Ionicons
                        name="mail-unread-outline"
                        size={18}
                        color={colors.status.warning}
                      />
                    </View>
                    <View>
                      <Text style={[styles.pendingEmail, { color: colors.text.primary }]}>
                        {inv.invitedEmail || inv.email || 'Pending'}
                      </Text>
                      <Text style={[styles.pendingStatus, { color: colors.text.tertiary }]}>
                        Awaiting response
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.revokeBtn, { backgroundColor: colors.status.errorLight }]}
                    onPress={() => handleRevoke(inv.id)}
                  >
                    <Ionicons name="close" size={14} color={colors.status.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={[styles.sectionDivider, { backgroundColor: colors.border.subtle }]} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={16} color={colors.text.secondary} />
            <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
              Current Members ({members.length})
            </Text>
          </View>
          {members.map((m, i) => (
            <View
              key={m.id || i}
              style={[styles.memberRow, { borderBottomColor: colors.border.subtle }]}
            >
              <View
                style={[styles.memberAvatar, { backgroundColor: colors.accent.primary + '25' }]}
              >
                <Text style={[styles.memberAvatarText, { color: colors.accent.primary }]}>
                  {(m.name || '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.text.primary }]}>{m.name}</Text>
                {m.email && (
                  <Text style={[styles.memberEmail, { color: colors.text.tertiary }]}>
                    {m.email}
                  </Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
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
  inviteCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
  },
  inviteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  inviteTitle: { fontSize: 15, fontWeight: '600' },
  emailInput: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 10,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sectionDivider: { height: 1, marginHorizontal: 20, marginBottom: 16, marginTop: 4 },
  section: { paddingHorizontal: 20, marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pendingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  pendingAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingEmail: { fontSize: 14, fontWeight: '600' },
  pendingStatus: { fontSize: 11, marginTop: 1 },
  revokeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
