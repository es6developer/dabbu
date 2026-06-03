import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

export function ReferralScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { accessToken } = useAuth();

  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);

  const loadData = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        if (accessToken) setAccessToken(accessToken);
        const [codeRes, referralsRes, statsRes] = await Promise.all([
          api.get<any>('/referral/code'),
          api.get<any>('/referral'),
          api.get<any>('/referral/stats'),
        ]);
        setReferralCode(codeRes?.code || codeRes?.data?.code || '');
        setReferrals(referralsRes || []);
        setStats(statsRes || null);
      } catch {
        /* noop */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on Dabbu — the smart family finance app! Use my referral code: ${referralCode}\n\nDownload: https://dabbu.app/download`,
        title: 'Invite friends to Dabbu',
      });
    } catch {
      /* noop */
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    setSending(true);
    try {
      if (accessToken) setAccessToken(accessToken);
      await api.post('/referral/invite', { refereeEmail: inviteEmail.trim() });
      Alert.alert('Invite Sent', `${inviteEmail} has been invited to Dabbu`);
      setInviteEmail('');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  const handleClaimAll = async () => {
    if (!stats?.pendingRewardDays) {
      Alert.alert('No Rewards', 'No pending rewards to claim');
      return;
    }
    try {
      if (accessToken) setAccessToken(accessToken);
      const res = await api.post<any>('/referral/claim-all');
      Alert.alert(
        'Rewards Claimed!',
        `You received ${res?.grantedDays || 0} premium day${(res?.grantedDays || 0) !== 1 ? 's' : ''}!`,
      );
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to claim rewards');
    }
  };

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <View style={{ padding: 24, gap: 16 }}>
          <Skeleton width={180} height={14} />
          <Skeleton width="100%" height={140} borderRadius={20} />
          <Skeleton width="100%" height={80} borderRadius={16} />
          <Skeleton width="100%" height={80} borderRadius={16} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: colors.bg.primary }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
          tintColor={colors.accent.primary}
        />
      }
    >
      {/* Hero */}
      <LinearGradient
        colors={['#2D1B4E', '#1A0A2E']}
        style={[s.hero, { paddingTop: insets.top + 16 }]}
      >
        <Text style={s.heroEyebrow}>Referral Program</Text>
        <Text style={s.heroTitle}>Invite Friends, Get Premium</Text>
        <Text style={s.heroSub}>
          Share your code and earn <Text style={{ fontWeight: '800' }}>30 premium days</Text> for
          each friend who signs up
        </Text>

        <TouchableOpacity style={s.codeBox} activeOpacity={0.7} onPress={handleShare}>
          <Text style={s.codeText}>{referralCode || 'DABBU-XXXXXXXX'}</Text>
          <View style={s.codeShare}>
            <Ionicons name="share-outline" size={16} color="#FFF" />
            <Text style={s.codeShareText}>Share</Text>
          </View>
        </TouchableOpacity>
      </LinearGradient>

      {/* Stats */}
      {stats && (
        <View style={[s.statsRow, { backgroundColor: colors.bg.secondary }]}>
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: colors.text.primary }]}>{stats.total}</Text>
            <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Invited</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border.subtle }]} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: '#00B894' }]}>{stats.signedUp}</Text>
            <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Joined</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border.subtle }]} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: colors.accent.primary }]}>{stats.pendingRewardDays}</Text>
            <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Reward Days</Text>
          </View>
        </View>
      )}

      {/* Claim Rewards */}
      {stats?.pendingRewardDays > 0 && (
        <TouchableOpacity
          style={[s.claimCard, { backgroundColor: colors.bg.secondary }]}
          activeOpacity={0.7}
          onPress={handleClaimAll}
        >
          <View style={[s.claimIcon, { backgroundColor: `${colors.accent.primary}18` }]}>
            <Ionicons name="gift" size={24} color={colors.accent.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.claimTitle, { color: colors.text.primary }]}>
              Claim Your Rewards
            </Text>
            <Text style={[s.claimDesc, { color: colors.text.tertiary }]}>
              You have {stats.pendingRewardDays} premium day{stats.pendingRewardDays !== 1 ? 's' : ''} ready to claim
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.accent.primary} />
        </TouchableOpacity>
      )}

      {/* Invite by Email */}
      <View style={[s.inviteSection, { backgroundColor: colors.bg.secondary }]}>
        <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Invite via Email</Text>
        <View style={s.inviteRow}>
          <TextInput
            style={[s.inviteInput, { backgroundColor: colors.bg.tertiary, color: colors.text.primary }]}
            value={inviteEmail}
            onChangeText={setInviteEmail}
            placeholder="friend@email.com"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[s.inviteBtn, { backgroundColor: colors.accent.primary }]}
            onPress={handleInvite}
            disabled={sending}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={16} color="#FFF" />
            <Text style={s.inviteBtnText}>{sending ? '...' : 'Invite'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Referral List */}
      {referrals.length > 0 ? (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text.primary, paddingHorizontal: 20 }]}>
            Invite History
          </Text>
          {referrals.map((r: any) => {
            const statusColors: Record<string, string> = {
              pending: '#FDCB6E',
              signed_up: '#00B894',
              converted: '#5B5FE8',
              expired: '#FF6B6B',
            };
            const statusLabels: Record<string, string> = {
              pending: 'Pending',
              signed_up: 'Signed Up',
              converted: 'Converted',
              expired: 'Expired',
            };
            return (
              <View key={r.id} style={[s.referralCard, { backgroundColor: colors.bg.secondary }]}>
                <View style={[s.statusDot, { backgroundColor: statusColors[r.status] || colors.text.tertiary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.referralEmail, { color: colors.text.primary }]}>{r.refereeEmail}</Text>
                  <Text style={[s.referralDate, { color: colors.text.tertiary }]}>
                    {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {' · '}
                    {r.rewardClaimed ? `${r.rewardDays} days claimed` : `${r.rewardDays} days pending`}
                  </Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: `${statusColors[r.status]}18` }]}>
                  <Text style={[s.statusText, { color: statusColors[r.status] }]}>
                    {statusLabels[r.status] || r.status}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={s.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.text.tertiary} />
          <Text style={[s.emptyTitle, { color: colors.text.primary }]}>No Invites Yet</Text>
          <Text style={[s.emptyDesc, { color: colors.text.tertiary }]}>
            Share your referral code with friends and family to earn premium days.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  hero: { paddingHorizontal: 24, paddingBottom: 28, alignItems: 'center' },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', textAlign: 'center' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 6, lineHeight: 18, marginBottom: 20 },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 14,
    width: '100%',
    gap: 12,
  },
  codeText: { flex: 1, fontSize: 16, fontWeight: '800', color: '#FFF', letterSpacing: 1.5 },
  codeShare: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  codeShareText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 16, padding: 16, marginTop: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  statDivider: { width: 1, height: 32 },
  claimCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  claimIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  claimTitle: { fontSize: 14, fontWeight: '700' },
  claimDesc: { fontSize: 12, marginTop: 2 },
  inviteSection: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  inviteRow: { flexDirection: 'row', gap: 8 },
  inviteInput: { flex: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontWeight: '500' },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: 10, gap: 6 },
  inviteBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  section: { marginTop: 20 },
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    marginBottom: 6,
    gap: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  referralEmail: { fontSize: 13, fontWeight: '600' },
  referralDate: { fontSize: 11, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
