import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { createInviteLink } from '../../services/external-sharing';

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
  const { groupId, groupName, inviteCode: paramCode } = route.params || {};
  const mounted = useRef(true);

  const [inviteCode, setInviteCode] = useState(paramCode || '');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [copied, setCopied] = useState(false);
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
      if (!mounted.current) {
        return;
      }
      const raw = res.members || res.participants || [];
      setMembers(
        raw.map((m: any) => ({
          id: m.user?.id || m.id || m.userId,
          name:
            [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ').trim() ||
            m.user?.email ||
            m.name ||
            'Unknown',
          email: m.user?.email || m.email,
          role: m.role,
        })),
      );
      if (res.inviteCode && !inviteCode) {
        setInviteCode(res.inviteCode);
      }
    } catch (e: any) {
      if (!mounted.current) {
        return;
      }
      Alert.alert('Error', e.message || 'Failed to load group data');
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }

  async function handleGenerateCode() {
    setGenerating(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.post<any>(`/shared-finance/groups/${groupId}/invite`);
      if (res.inviteCode) {
        setInviteCode(res.inviteCode);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to generate invite code');
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    try {
      await Clipboard.setStringAsync(inviteCode);
    } catch {
      Alert.alert('Copy', inviteCode);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Join "${groupName || 'our group'}" on Dabbu with invite code: ${inviteCode}`,
        title: `Join ${groupName || 'group'} on Dabbu`,
      });
    } catch (e: any) {
      if (e?.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to share');
      }
    }
  }

  async function handleEmailInvite() {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter an email address.');
      return;
    }
    setSendingEmail(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await createInviteLink(groupId);
      const link = `https://external-web-es6developers-projects.vercel.app/invite/${res.token}`;
      await Share.share({
        subject: `Join "${groupName || 'our group'}" on Dabbu`,
        message: `${user?.firstName || 'Someone'} invited you to join "${groupName || 'our group'}" on Dabbu.\n\nTap the link to join:\n${link}\n\nDabbu makes it easy to split expenses and keep everyone on the same page.`,
        recipients: [email.trim()],
      });
      setEmail('');
    } catch (e: any) {
      if (e?.message !== 'User did not share') {
        Alert.alert('Error', e.message || 'Failed to create invite link');
      }
    } finally {
      setSendingEmail(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }

  const inviteLink = `dabbu://join?code=${inviteCode}`;

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
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Invite Members</Text>
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
          <Ionicons name="mail-outline" size={18} color={colors.accent.primary} />
          <Text style={[styles.emailTitle, { color: colors.text.primary }]}>Invite by Email</Text>
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
        />
        <TouchableOpacity
          style={[
            styles.emailBtn,
            { backgroundColor: colors.accent.primary },
            sendingEmail && { opacity: 0.6 },
          ]}
          onPress={handleEmailInvite}
          disabled={sendingEmail}
        >
          {sendingEmail ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="send-outline" size={16} color="#fff" />
              <Text style={styles.emailBtnText}>Send Invite</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.codeCard, { backgroundColor: colors.bg.tertiary }]}>
        <View
          style={[
            styles.qrPlaceholder,
            { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
          ]}
        >
          <View style={styles.qrGrid}>
            {[...Array(49)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.qrDot,
                  { backgroundColor: Math.random() > 0.4 ? colors.accent.primary : 'transparent' },
                ]}
              />
            ))}
          </View>
          <View style={[styles.qrOverlay, { backgroundColor: colors.bg.card }]}>
            <Ionicons name="people" size={24} color={colors.accent.primary} />
          </View>
        </View>

        <Text style={[styles.inviteLabel, { color: colors.text.tertiary }]}>Invite Code</Text>
        <View
          style={[
            styles.codeRow,
            { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
          ]}
        >
          <Text style={[styles.codeText, { color: colors.accent.primary }]}>
            {inviteCode || '------'}
          </Text>
        </View>

        <View style={styles.codeActions}>
          <TouchableOpacity
            style={[
              styles.codeActionBtn,
              {
                backgroundColor: copied ? colors.status.successLight : colors.bg.card,
                borderColor: colors.border.subtle,
              },
            ]}
            onPress={handleCopy}
          >
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={18}
              color={copied ? colors.status.success : colors.text.primary}
            />
            <Text
              style={[
                styles.codeActionText,
                { color: copied ? colors.status.success : colors.text.primary },
              ]}
            >
              {copied ? 'Copied' : 'Copy Code'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.codeActionBtn,
              { backgroundColor: colors.status.infoLight, borderColor: colors.border.subtle },
            ]}
            onPress={() => {
              Alert.alert('QR Code', `Share this invite code: ${inviteCode}\n\nScan to join.`);
            }}
          >
            <Ionicons name="qr-code-outline" size={18} color={colors.status.info} />
            <Text style={[styles.codeActionText, { color: colors.status.info }]}>QR Code</Text>
          </TouchableOpacity>
        </View>

        {generating ? (
          <ActivityIndicator color={colors.accent.primary} style={{ marginTop: 12 }} />
        ) : (
          <TouchableOpacity style={styles.generateRow} onPress={handleGenerateCode}>
            <Ionicons name="refresh-outline" size={16} color={colors.text.tertiary} />
            <Text style={[styles.generateText, { color: colors.text.tertiary }]}>
              Generate new code
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.shareBtn, { backgroundColor: colors.accent.primary }]}
        onPress={handleShare}
      >
        <Ionicons name="share-outline" size={20} color="#fff" />
        <Text style={styles.shareBtnText}>Share via...</Text>
      </TouchableOpacity>

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
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  emailBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  codeCard: {
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  qrGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 140,
    height: 140,
    alignContent: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  qrDot: { width: 16, height: 16, borderRadius: 3 },
  qrOverlay: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  codeRow: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  codeActions: { flexDirection: 'row', gap: 10, width: '100%' },
  codeActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  codeActionText: { fontSize: 13, fontWeight: '600' },
  generateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  generateText: { fontSize: 12, fontWeight: '500' },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    marginBottom: 20,
  },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
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
