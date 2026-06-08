import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Share,
} from 'react-native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

export function InviteMemberScreen() {
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const [family, setFamily] = useState<any>(null);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
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
      setInviteCode(data?.inviteCode || data?.invitationCode || '');
      setPendingInvites(data?.pendingInvitations || data?.pendingInvites || []);
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function handleShareCode() {
    const code = inviteCode;
    if (!code) {
      Alert.alert('No Code', 'No invite code available. Create a family first.');
      return;
    }
    try {
      await Share.share({
        message: `Join my family on Dabbu! Use invite code: ${code}`,
        title: 'Dabbu Family Invite',
      });
    } catch (e) {
      // user cancelled
    }
  }

  async function handleCopyCode() {
    if (inviteCode) {
      Alert.alert(
        'Invite Code',
        `Share this code: ${inviteCode}\n\nYour invite code is: ${inviteCode}`,
      );
    }
  }

  async function handleJoinFamily() {
    if (!joinCode.trim()) {
      setError('Please enter an invite code');
      return;
    }
    setError('');
    setJoining(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.post('/family/join', { inviteCode: joinCode.trim() });
      Alert.alert('Success', 'You have joined the family!');
      setJoinCode('');
      loadFamily();
    } catch (e: any) {
      setError(e.message || 'Failed to join family');
    } finally {
      setJoining(false);
    }
  }

  async function handleCancelInvite(inviteId: string) {
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.delete(`/family/invitations/${inviteId}`);
      setPendingInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to cancel invitation');
    }
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
          <Skeleton width={180} height={16} />
          <Skeleton width="100%" height={60} borderRadius={16} />
          <Skeleton width="100%" height={50} borderRadius={16} />
          <Skeleton width="100%" height={50} borderRadius={16} />
          <Skeleton width="75%" height={50} borderRadius={16} />
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Invite Members</Text>

          {family ? (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Your Family Invite Code
              </Text>
              <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
                Share this code with family members to join
              </Text>
              <TouchableOpacity
                style={[
                  styles.codeCard,
                  { backgroundColor: colors.bg.tertiary, borderColor: colors.accent.primary },
                ]}
                onPress={handleCopyCode}
              >
                <Text style={[styles.codeText, { color: colors.accent.primary }]}>
                  {inviteCode || 'N/A'}
                </Text>
                <Text style={[styles.copyHint, { color: colors.text.tertiary }]}>Tap to copy</Text>
              </TouchableOpacity>
              <View style={styles.shareRow}>
                <TouchableOpacity
                  style={[styles.shareBtn, { backgroundColor: colors.accent.primary }]}
                  onPress={handleShareCode}
                >
                  <Text style={styles.shareBtnText}>📤 Share Invite</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.copyBtn,
                    { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                  ]}
                  onPress={handleCopyCode}
                >
                  <Text style={[styles.copyBtnText, { color: colors.text.primary }]}>
                    📋 Copy Code
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.noFamilyCard,
                { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
              ]}
            >
              <Text style={[styles.noFamilyTitle, { color: colors.text.primary }]}>
                No Family Group
              </Text>
              <Text style={[styles.noFamilyDesc, { color: colors.text.tertiary }]}>
                Create a family first to get an invite code
              </Text>
            </View>
          )}

          <View
            style={[
              styles.card,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Join a Family</Text>
            <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
              Enter an invite code to join an existing family
            </Text>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: `${colors.status.error}18` }]}>
                <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
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
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder="Enter invite code"
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[
                styles.joinBtn,
                { backgroundColor: colors.status.success },
                joining && { opacity: 0.6 },
              ]}
              onPress={handleJoinFamily}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.joinBtnText}>Join Family</Text>
              )}
            </TouchableOpacity>
          </View>

          {pendingInvites.length > 0 && (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Pending Invitations
              </Text>
              {pendingInvites.map((invite) => (
                <View
                  key={invite.id}
                  style={[styles.inviteRow, { backgroundColor: colors.bg.tertiary }]}
                >
                  <View style={styles.inviteInfo}>
                    <Text style={[styles.inviteEmail, { color: colors.text.primary }]}>
                      {invite.email || invite.phone || 'Pending'}
                    </Text>
                    <Text style={[styles.inviteStatus, { color: colors.text.tertiary }]}>
                      Sent{' '}
                      {new Date(invite.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.cancelInviteBtn,
                      { backgroundColor: `${colors.status.error}18` },
                    ]}
                    onPress={() => handleCancelInvite(invite.id)}
                  >
                    <Text style={[styles.cancelInviteText, { color: colors.status.error }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  card: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  subtitle: { fontSize: 13, marginBottom: 16 },
  codeCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  codeText: { fontSize: 32, fontWeight: '700', letterSpacing: 4, marginBottom: 8 },
  copyHint: { fontSize: 12 },
  shareRow: { flexDirection: 'row', gap: 12 },
  shareBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  shareBtnText: { color: '#1A1528', fontSize: 15, fontWeight: '600' },
  copyBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  copyBtnText: { fontSize: 15, fontWeight: '600' },
  noFamilyCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  noFamilyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  noFamilyDesc: { fontSize: 13, textAlign: 'center' },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  joinBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  joinBtnText: { color: '#1A1528', fontSize: 17, fontWeight: '600' },
  inviteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  inviteInfo: { flex: 1 },
  inviteEmail: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  inviteStatus: { fontSize: 11 },
  cancelInviteBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  cancelInviteText: { fontSize: 12, fontWeight: '600' },
  errorBox: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: { fontSize: 13, fontWeight: '600' },
});
