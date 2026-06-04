import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

export function FamilySettingsScreen() {
  const { colors } = useTheme();
  const { accessToken, user } = useAuth();
  const [family, setFamily] = useState<any>(null);
  const [familyName, setFamilyName] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadFamily();
  }, [accessToken]);

  async function loadFamily() {
    try {
      const res = await api.get<any>('/family');
      const data = Array.isArray(res) ? res[0] : res;
      setFamily(data);
      setFamilyName(data?.name || '');
      setMembers(data?.members || data?.users || []);
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  const currentUserMember = members.find((m) => m.userId === user?.id || m.id === user?.id);
  const userRole = currentUserMember?.role || currentUserMember?.membershipRole || 'member';
  const isOwner = userRole === 'owner';

  async function handleSaveName() {
    if (!familyName.trim()) {
      setError('Family name is required');
      return;
    }
    setError('');
    setSaving(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.patch(`/family/${family.id}`, { name: familyName.trim() });
      Alert.alert('Success', 'Family name updated');
    } catch (e: any) {
      setError(e.message || 'Failed to update family name');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    Alert.alert('Remove Member', `Remove ${memberName} from the family?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            if (accessToken) {
              setAccessToken(accessToken);
            }
            await api.delete(`/family/${family.id}/members/${memberId}`);
            setMembers((prev) => prev.filter((m) => (m.userId || m.id) !== memberId));
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to remove member');
          }
        },
      },
    ]);
  }

  function handleLeaveFamily() {
    Alert.alert('Leave Family', 'Are you sure you want to leave this family?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            if (accessToken) {
              setAccessToken(accessToken);
            }
            await api.post(`/family/${family.id}/leave`);
            loadFamily();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to leave family');
          }
        },
      },
    ]);
  }

  function handleDeleteFamily() {
    Alert.alert(
      'Delete Family',
      'This will permanently delete the family and all associated data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Confirm Deletion', 'Type DELETE to confirm', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'DELETE',
                style: 'destructive',
                onPress: async () => {
                  try {
                    if (accessToken) {
                      setAccessToken(accessToken);
                    }
                    await api.delete(`/family/${family.id}`);
                    Alert.alert('Deleted', 'Family has been deleted');
                    loadFamily();
                  } catch (e: any) {
                    Alert.alert('Error', e.message || 'Failed to delete family');
                  }
                },
              },
            ]);
          },
        },
      ],
    );
  }

  function getRoleBadge(role: string) {
    const r = role?.toLowerCase();
    if (r === 'owner') {
      return { bg: `${colors.accent.primary}26`, color: colors.accent.primary };
    }
    if (r === 'admin') {
      return { bg: `${colors.status.success}26`, color: colors.status.success };
    }
    return { bg: `${colors.text.tertiary}26`, color: colors.text.tertiary };
  }

  if (loading) {
    return (
      <PageContainer>
        <View
          style={[
            styles.loading,
            { backgroundColor: colors.bg.primary, paddingHorizontal: 24, gap: 16 },
          ]}
        >
          <Skeleton width={160} height={16} />
          <Skeleton width="100%" height={60} borderRadius={16} />
          <Skeleton width="100%" height={60} borderRadius={16} />
          <Skeleton width="100%" height={60} borderRadius={16} />
          <Skeleton width="80%" height={60} borderRadius={16} />
        </View>
      </PageContainer>
    );
  }
  if (!family) {
    return (
      <PageContainer>
        <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
          <Text style={[styles.errorText, { color: colors.status.error }]}>No family found</Text>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Family Settings</Text>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Family Name</Text>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: `${colors.status.error}18` }]}>
                <Text style={[styles.errorBoxText, { color: colors.status.error }]}>{error}</Text>
              </View>
            ) : null}
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bg.tertiary,
                  color: colors.text.primary,
                  borderColor: colors.border.subtle,
                },
              ]}
              value={familyName}
              onChangeText={setFamilyName}
              placeholder="Family name"
              placeholderTextColor={colors.text.tertiary}
            />
            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: colors.accent.primary },
                saving && { opacity: 0.6 },
              ]}
              onPress={handleSaveName}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Members ({members.length})
            </Text>
            {members.map((member) => {
              const memberId = member.userId || member.id;
              const memberName =
                member.firstName || member.name || member.user?.firstName || 'Unknown';
              const role = member.role || member.membershipRole || 'member';
              const badgeStyle = getRoleBadge(role);
              const isSelf = memberId === user?.id;
              return (
                <View
                  key={memberId}
                  style={[styles.memberRow, { borderBottomColor: colors.border.subtle }]}
                >
                  <View style={[styles.memberAvatar, { backgroundColor: colors.accent.primary }]}>
                    <Text style={styles.memberAvatarText}>
                      {memberName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.text.primary }]}>
                      {memberName} {isSelf ? '(You)' : ''}
                    </Text>
                    <View style={[styles.roleBadge, { backgroundColor: badgeStyle.bg }]}>
                      <Text style={[styles.roleText, { color: badgeStyle.color }]}>{role}</Text>
                    </View>
                  </View>
                  {isOwner && !isSelf && (
                    <TouchableOpacity
                      style={[styles.removeBtn, { backgroundColor: `${colors.status.error}18` }]}
                      onPress={() => handleRemoveMember(memberId, memberName)}
                    >
                      <Text style={[styles.removeBtnText, { color: colors.status.error }]}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.actionsSection}>
            {!isOwner && (
              <TouchableOpacity
                style={[
                  styles.leaveBtn,
                  {
                    backgroundColor: `${colors.status.error}18`,
                    borderColor: `${colors.status.error}40`,
                  },
                ]}
                onPress={handleLeaveFamily}
              >
                <Text style={[styles.leaveBtnText, { color: colors.status.error }]}>
                  Leave Family
                </Text>
              </TouchableOpacity>
            )}
            {isOwner && (
              <TouchableOpacity
                style={[styles.deleteFamilyBtn, { backgroundColor: colors.status.error }]}
                onPress={handleDeleteFamily}
              >
                <Text style={styles.deleteFamilyBtnText}>Delete Family</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  card: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16, paddingBottom: 12 },
  errorBox: { padding: 12, borderRadius: 12, marginBottom: 12 },
  errorBoxText: { fontSize: 14 },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  saveBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  removeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  removeBtnText: { fontSize: 12, fontWeight: '600' },
  actionsSection: { gap: 12, marginTop: 8 },
  leaveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  leaveBtnText: { fontSize: 16, fontWeight: '600' },
  deleteFamilyBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  deleteFamilyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
