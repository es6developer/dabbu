import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
  Alert,
  Linking,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';


import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

const { width: SCREEN_W } = Dimensions.get('window');
const REFERRAL_REWARD = 100;
const REFEREE_REWARD = 50;
const SHARE_MESSAGE = `🎉 Join Dabbu and manage family expenses together!

Use my referral code: {REFERRAL_CODE}

Sign up and start tracking expenses with your family.

💰 Get rewards when you join.

Download here:
{REFERRAL_LINK}`;

function Confetti({ show }: { show: boolean }) {
  const particles = useRef(
    Array.from({ length: 30 }, (_, i) => ({
      key: i,
      x: new Animated.Value(Math.random() * SCREEN_W),
      y: new Animated.Value(-20),
      color: ['#FF6B6B', '#FDCB6E', '#00B894', '#74B9FF', '#FF914D', '#FD79A8'][i % 6],
      size: 6 + Math.random() * 8,
      rotation: new Animated.Value(0),
      delay: Math.random() * 500,
    })),
  ).current;

  useEffect(() => {
    if (show) {
      particles.forEach((p) => {
        p.x.setValue(Math.random() * SCREEN_W);
        p.y.setValue(-20);
        p.rotation.setValue(0);
        Animated.parallel([
          Animated.timing(p.y, {
            toValue: Dimensions.get('window').height + 50,
            duration: 2000 + Math.random() * 1500,
            delay: p.delay,
            useNativeDriver: true,
          }),
          Animated.timing(p.rotation, {
            toValue: Math.random() * 720 - 360,
            duration: 1500 + Math.random() * 1000,
            delay: p.delay,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [show]);

  if (!show) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <Animated.View
          key={p.key}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size * 1.5,
            backgroundColor: p.color,
            borderRadius: 2,
            transform: [
              {
                rotate: p.rotation.interpolate({
                  inputRange: [-360, 360],
                  outputRange: ['-360deg', '360deg'],
                }),
              },
            ],
            opacity: p.y.interpolate({
              inputRange: [
                -20,
                Dimensions.get('window').height * 0.3,
                Dimensions.get('window').height,
              ],
              outputRange: [1, 1, 0],
            }),
          }}
        />
      ))}
    </View>
  );
}

function ShareSheet({
  visible,
  onClose,
  referralCode,
  referralLink,
}: {
  visible: boolean;
  onClose: () => void;
  referralCode: string;
  referralLink: string;
}) {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      damping: 20,
    }).start();
  }, [visible]);

  const message = SHARE_MESSAGE.replace('{REFERRAL_CODE}', referralCode).replace(
    '{REFERRAL_LINK}',
    referralLink,
  );

  const shareOptions = [
    {
      label: 'WhatsApp',
      icon: 'logo-whatsapp',
      color: '#25D366',
      action: () => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`),
    },
    {
      label: 'SMS',
      icon: 'chatbubbles',
      color: '#3498DB',
      action: () => Linking.openURL(`sms:&body=${encodeURIComponent(message)}`),
    },
    {
      label: 'Telegram',
      icon: 'paper-plane',
      color: '#0088CC',
      action: () =>
        Linking.openURL(
          `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`,
        ),
    },
    {
      label: 'Copy Link',
      icon: 'link',
      color: '#FF6B00',
      action: () => {
        Share.share({ message }).catch(() => {});
      },
    },
    {
      label: 'More',
      icon: 'ellipsis-horizontal',
      color: '#636E72',
      action: () => {
        Share.share({ message, title: 'Invite friends to Dabbu' }).catch(() => {});
      },
    },
  ];

  if (!visible) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100 }]}
      activeOpacity={1}
      onPress={onClose}
    >
      <Animated.View
        style={[
          styles.shareSheet,
          {
            backgroundColor: colors.bg.secondary,
            transform: [
              { translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }) },
            ],
          },
        ]}
      >
        <View style={styles.shareHandle} />
        <Text style={[styles.shareTitle, { color: colors.text.primary }]}>Share via</Text>
        <View style={styles.shareGrid}>
          {shareOptions.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={styles.shareOption}
              onPress={() => {
                onClose();
                setTimeout(opt.action, 300);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.shareIconWrap, { backgroundColor: `${opt.color}18` }]}>
                <Ionicons name={opt.icon as any} size={24} color={opt.color} />
              </View>
              <Text style={[styles.shareLabel, { color: colors.text.secondary }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.shareCancel} onPress={onClose} activeOpacity={0.7}>
          <Text style={[styles.shareCancelText, { color: colors.text.tertiary }]}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function ReferralScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { accessToken } = useAuth();

  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const loadData = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        const [codeRes, dashboardRes] = await Promise.all([
          api.get<any>('/referral/code'),
          api.get<any>('/referral/dashboard'),
        ]);
        const code = codeRes?.code || codeRes?.data?.code || '';
        const link = codeRes?.link || codeRes?.data?.link || '';
        setReferralCode(code);
        setReferralLink(link);
        const dash = dashboardRes?.data || dashboardRes || {};
        setReferrals(dash.referrals || []);
        setRewards(dash.rewards || []);
        setStats(dash.stats || null);
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

  function getStatusInfo(status: string) {
    const map: Record<string, { label: string; color: string }> = {
      pending: { label: 'Pending', color: '#FDCB6E' },
      signed_up: { label: 'Signed Up', color: '#74B9FF' },
      converted: { label: 'Rewarded', color: '#00B894' },
      rejected: { label: 'Rejected', color: '#FF6B6B' },
    };
    return map[status] || { label: status, color: '#636E72' };
  }

  function getRewardTypeInfo(type: string) {
    if (type === 'referrer_bonus') {
      return { label: 'Referral Bonus', color: '#00B894' };
    }
    return { label: 'Welcome Bonus', color: '#FDCB6E' };
  }

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <View style={{ padding: 24, gap: 16 }}>
          <Skeleton width={140} height={14} />
          <Skeleton width="100%" height={180} borderRadius={24} />
          <Skeleton width="100%" height={90} borderRadius={16} />
          <Skeleton width="100%" height={90} borderRadius={16} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Confetti show={showConfetti} />
      <ShareSheet
        visible={showShare}
        onClose={() => setShowShare(false)}
        referralCode={referralCode}
        referralLink={referralLink}
      />
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.bg.primary }]}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top + 16, backgroundColor: '#0D1B2A' }]}>
          <Text style={styles.heroEyebrow}>REFER & EARN</Text>
          <Text style={styles.heroTitle}>Invite Friends, Earn Rewards</Text>
          <Text style={styles.heroSub}>
            Earn <Text style={{ fontWeight: '800' }}>₹{REFERRAL_REWARD}</Text> for each friend who
            joins
            {'\n'}They get <Text style={{ fontWeight: '800' }}>₹{REFEREE_REWARD}</Text> welcome
            bonus too!
          </Text>

          <TouchableOpacity
            style={styles.codeBox}
            activeOpacity={0.7}
            onPress={() => setShowShare(true)}
          >
            <Text style={styles.codeText}>{referralCode || 'LOADING...'}</Text>
            <View style={styles.codeShare}>
              <Ionicons name="share-outline" size={16} color="#FFF" />
              <Text style={styles.codeShareText}>Share</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Stats Card */}
        {stats && (
          <Animated.View
            style={[styles.statsCard, { backgroundColor: colors.bg.secondary, opacity: fadeAnim }]}
          >
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text.primary }]}>
                  {stats.total}
                </Text>
                <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Total</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border.subtle }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#00B894' }]}>{stats.converted}</Text>
                <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Successful</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border.subtle }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#FDCB6E' }]}>{stats.pending}</Text>
                <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Pending</Text>
              </View>
            </View>
            <View style={[styles.totalEarnedRow, { borderTopColor: colors.border.subtle }]}>
              <Text style={[styles.totalEarnedLabel, { color: colors.text.secondary }]}>
                Total Earned
              </Text>
              <Text style={[styles.totalEarnedValue, { color: colors.accent.primary }]}>
                ₹{stats.totalEarned?.toLocaleString?.('en-IN') || stats.totalEarned || 0}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Reward History */}
        {rewards.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Reward History
            </Text>
            {rewards.map((r: any) => {
              const typeInfo = getRewardTypeInfo(r.type);
              return (
                <View
                  key={r.id}
                  style={[styles.rewardCard, { backgroundColor: colors.bg.secondary }]}
                >
                  <View style={[styles.rewardIcon, { backgroundColor: `${typeInfo.color}18` }]}>
                    <Ionicons name="cash" size={20} color={typeInfo.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rewardTitle, { color: colors.text.primary }]}>
                      {typeInfo.label}
                    </Text>
                    <Text style={[styles.rewardSub, { color: colors.text.tertiary }]}>
                      {r.description || ''} ·{' '}
                      {new Date(r.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.rewardAmount,
                        { color: r.status === 'approved' ? '#00B894' : '#FDCB6E' },
                      ]}
                    >
                      +₹{Number(r.amount).toLocaleString('en-IN')}
                    </Text>
                    <Text
                      style={[
                        styles.rewardStatus,
                        { color: r.status === 'approved' ? '#00B894' : '#FDCB6E' },
                      ]}
                    >
                      {r.status === 'approved' ? 'Credited' : 'Pending'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Referral List */}
        {referrals.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Referral History
            </Text>
            {referrals.map((r: any) => {
              const statusInfo = getStatusInfo(r.status);
              const name = r.referee
                ? `${r.referee.firstName || ''} ${r.referee.lastName || ''}`.trim() || 'New User'
                : r.refereeEmail || 'Pending';
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.referralCard, { backgroundColor: colors.bg.secondary }]}
                  activeOpacity={0.7}
                >
                  <View
                    style={[styles.referralAvatar, { backgroundColor: `${statusInfo.color}18` }]}
                  >
                    <Text style={[styles.referralAvatarText, { color: statusInfo.color }]}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.referralName, { color: colors.text.primary }]}>
                      {name}
                    </Text>
                    <Text style={[styles.referralDate, { color: colors.text.tertiary }]}>
                      {new Date(r.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}18` }]}>
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Empty state */}
        {referrals.length === 0 && (
          <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
            <View
              style={[
                styles.emptyIconWrap,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
              ]}
            >
              <Ionicons name="gift-outline" size={48} color={colors.text.tertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              Start Referring!
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              Share your referral code with friends and family. Earn ₹{REFERRAL_REWARD} for every
              friend who joins!
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.accent.primary }]}
              onPress={() => setShowShare(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="share-outline" size={18} color="#FFF" />
              <Text style={styles.emptyBtnText}>Share Your Code</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>

      {/* Fixed Bottom Share Button */}
      {referralCode && (
        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: insets.bottom + 12,
              backgroundColor: colors.bg.primary,
              borderTopColor: colors.border.subtle,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: colors.accent.primary }]}
            onPress={() => setShowShare(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="share-social" size={20} color="#FFF" />
            <Text style={styles.shareBtnText}>Share Referral Code</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hero: { paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center' },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 24,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    gap: 12,
  },
  codeText: { flex: 1, fontSize: 18, fontWeight: '800', color: '#FFF', letterSpacing: 2 },
  codeShare: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  codeShareText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  statsCard: {
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statsRow: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  statDivider: { width: 1, height: 36, alignSelf: 'center' },
  totalEarnedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  totalEarnedLabel: { fontSize: 14, fontWeight: '600' },
  totalEarnedValue: { fontSize: 22, fontWeight: '800' },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    gap: 12,
  },
  rewardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardTitle: { fontSize: 14, fontWeight: '600' },
  rewardSub: { fontSize: 11, marginTop: 2 },
  rewardAmount: { fontSize: 16, fontWeight: '800' },
  rewardStatus: { fontSize: 10, fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    gap: 12,
  },
  referralAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralAvatarText: { fontSize: 16, fontWeight: '700' },
  referralName: { fontSize: 14, fontWeight: '600' },
  referralDate: { fontSize: 11, marginTop: 1 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  shareBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  shareSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  shareHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  shareTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  shareGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  shareOption: { alignItems: 'center', gap: 8 },
  shareIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLabel: { fontSize: 12, fontWeight: '600' },
  shareCancel: { alignItems: 'center', paddingVertical: 12 },
  shareCancelText: { fontSize: 15, fontWeight: '600' },
});
