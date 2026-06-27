import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useAuth } from '../../store/AuthContext';
import { usePremium } from '../../store/PremiumContext';
import { Avatar } from '../../components/ui/Avatar';
import { CoupleModeToggle } from '../../components/ui/CoupleModeToggle';
import { useAppLock } from '../../store/LockContext';
import { ConfirmDialog } from '../../components/ui';
import { PADDING, borderRadius, shadows } from '../../theme/design';
import { COUPLE_COLORS } from '../../hooks/useCoupleMode';

import { alertService } from '../../components/ui';
type SectionItem = {
  label: string;
  icon: string;
  screen: string;
  premium?: boolean;
  action?: 'lock';
};

interface SectionConfig {
  title: string;
  items: SectionItem[];
}

const SECTIONS: SectionConfig[] = [
  {
    title: 'Wealth Tools',
    items: [
      { label: 'Financial Reports', icon: 'barschart', screen: 'Reports', premium: true },
      { label: 'Export Data', icon: 'download', screen: 'DataExport' },
      { label: 'Budgets', icon: 'piechart', screen: 'BudgetsList' },
    ],
  },
  {
    title: 'Progress',
    items: [
      { label: 'Streaks & Achievements', icon: 'star', screen: 'Streaks' },
      { label: 'Year in Review', icon: 'calendar', screen: 'YearlySummary' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', icon: 'user', screen: 'Profile' },
      { label: 'Partner Management', icon: 'hearto', screen: 'AddPartner' },
      { label: 'Favorite Contacts', icon: 'staro', screen: 'Favorites' },
      { label: 'Refer & Earn', icon: 'gift', screen: 'Referral' },
    ],
  },
  {
    title: 'Premium',
    items: [
      { label: 'Premium Plan', icon: 'star', screen: 'Premium' },
      { label: 'Couple Space', icon: 'hearto', screen: 'CoupleSpace' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { label: 'Theme', icon: 'skin', screen: 'Theme' },
      { label: 'Notifications', icon: 'bells', screen: 'NotificationSettings' },
      { label: 'Security', icon: 'Safety', screen: 'Security' },
      { label: 'Lock App', icon: 'lock', screen: 'Security', action: 'lock' },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Help Center', icon: 'questioncircleo', screen: 'HelpCenter' },
      { label: 'Contact Us', icon: 'message1', screen: 'Support' },
      { label: 'Privacy Policy', icon: 'filetext1', screen: 'Privacy' },
    ],
  },
];

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, logout, fetchCoupleRequests, approveCoupleRequest, rejectCoupleRequest } =
    useAuth();
  const { isPremium, loading, refresh } = usePremium();
  const { lockApp } = useAppLock();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.isCouple) {
      setPendingRequests([]);
    } else {
      fetchCoupleRequests()
        .then((res: any) => {
          const pending = (res?.received || []).filter((r: any) => r.status === 'pending');
          setPendingRequests(pending);
        })
        .catch(() => {});
    }
  }, [user?.isCouple, fetchCoupleRequests]);

  useSilentRefresh(
    React.useCallback(() => {
      if (!user?.isCouple) {
        fetchCoupleRequests()
          .then((res: any) => {
            const pending = (res?.received || []).filter((r: any) => r.status === 'pending');
            setPendingRequests(pending);
          })
          .catch(() => {});
      } else {
        setPendingRequests([]);
      }
    }, [user?.isCouple, fetchCoupleRequests]),
  );

  useEffect(() => {
    refresh();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const handleNav = (screen: string, premium?: boolean, action?: 'lock') => {
    if (action === 'lock') {
      lockApp();
      return;
    }
    const registered = [
      'Profile',
      'AddPartner',
      'Security',
      'Premium',
      'Theme',
      'CustomiseDashboard',
      'CustomiseBottomMenu',
      'HelpCenter',
      'ContactUs',
      'Privacy',
      'Analytics',
      'Reports',
      'BudgetsList',
      'NotificationSettings',
      'Favorites',
      'Referral',
      'CoupleSpace',
      'Streaks',
      'DataExport',
      'Support',
      'YearlySummary',
    ];
    if (!registered.includes(screen)) {
      alertService.alert('Coming Soon', `${screen} settings will be available soon`);
      return;
    }
    if (premium && !isPremium) {
      alertService.alert('Premium Feature', 'This feature is available on Premium plan.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Plans', onPress: () => navigation.navigate('SubscriptionCenter') },
      ]);
      return;
    }
    const crossTabMap: Record<string, { tab: string; screen: string }> = {
      Reports: { tab: 'LifeHubTab', screen: 'Analytics' },
      BudgetsList: { tab: 'WalletTab', screen: 'BillsList' },
      Streaks: { tab: 'HomeTab', screen: 'Streaks' },
      YearlySummary: { tab: 'HomeTab', screen: 'YearlySummary' },
      Analytics: { tab: 'WalletTab', screen: 'Analytics' },
    };
    const crossTab = crossTabMap[screen];
    if (crossTab) {
      navigation.navigate(crossTab.tab, { screen: crossTab.screen });
    } else {
      navigation.navigate(screen);
    }
  };

  const renderRow = (item: SectionItem, isLast: boolean) => (
    <TouchableOpacity
      key={item.label}
      style={[s.row, !isLast && s.rowBorder, { borderBottomColor: colors.border.subtle }]}
      onPress={() => handleNav(item.screen, item.premium, item.action)}
      activeOpacity={0.55}
    >
      <View style={[s.rowIcon, { backgroundColor: `${colors.accent.primary}0F` }]}>
        <AntDesign name={item.icon as any} size={17} color={colors.accent.primary} />
      </View>
      <Text style={[s.rowLabel, { color: colors.text.primary }]}>{item.label}</Text>
      {item.premium && !isPremium && (
        <View style={[s.badge, { backgroundColor: `${colors.accent.primary}10` }]}>
          <Text style={[s.badgeText, { color: colors.accent.primary }]}>Pro</Text>
        </View>
      )}
      <AntDesign name="right" size={14} color={colors.text.tertiary} />
    </TouchableOpacity>
  );

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                refresh();
                fetchCoupleRequests().catch(() => {});
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor={colors.accent?.primary || colors.brand?.primary}
          />
        }
      >
        {/* ── Profile Header ── */}
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: PADDING, paddingBottom: 8 }}>
          <TouchableOpacity
            style={[s.profileCard, { backgroundColor: colors.bg.card }]}
            onPress={() => handleNav('Profile')}
            activeOpacity={0.7}
          >
            <Avatar
              uri={user?.avatarUrl}
              name={`${user?.firstName || ''} ${user?.lastName || ''}`}
              size={52}
            />
            <View style={s.profileInfo}>
              <Text style={[s.profileName, { color: colors.text.primary }]} numberOfLines={1}>
                {user?.firstName || 'User'} {user?.lastName || ''}
              </Text>
              <Text style={[s.profileEmail, { color: colors.text.tertiary }]} numberOfLines={1}>
                {user?.email || 'No email'}
              </Text>
            </View>
            <View style={[s.profileChevron, { backgroundColor: `${colors.accent.primary}0F` }]}>
              <AntDesign name="right" size={16} color={colors.accent.primary} />
            </View>
          </TouchableOpacity>

          <View style={s.badgeRow}>
            <View
              style={[
                s.pill,
                { backgroundColor: isPremium ? `${colors.accent.primary}12` : colors.bg.tertiary },
              ]}
            >
              <AntDesign
                name={isPremium ? 'star' : 'user'}
                size={12}
                color={isPremium ? colors.accent.primary : colors.text.tertiary}
              />
              <Text
                style={[
                  s.pillText,
                  { color: isPremium ? colors.accent.primary : colors.text.tertiary },
                ]}
              >
                {isPremium ? 'Premium' : 'Free'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Security')}
              style={[s.pill, { backgroundColor: colors.bg.tertiary }]}
            >
              <AntDesign name="checkcircle" size={12} color={colors.text.tertiary} />
              <Text style={[s.pillText, { color: colors.text.tertiary }]}>Security</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
          {/* ── Pending Couple Requests ── */}
          {pendingRequests.length > 0 && (
            <View style={{ paddingHorizontal: PADDING, marginBottom: 20 }}>
              <View
                style={[
                  s.coupleCard,
                  { backgroundColor: COUPLE_COLORS.bg, borderColor: COUPLE_COLORS.border },
                ]}
              >
                <View style={[s.coupleHeader, { borderBottomColor: COUPLE_COLORS.border }]}>
                  <AntDesign name="hearto" size={16} color={COUPLE_COLORS.primary} />
                  <Text style={[s.coupleTitle, { color: COUPLE_COLORS.text }]}>
                    Couple Request{pendingRequests.length > 1 ? 's' : ''}
                  </Text>
                  <Text style={[s.coupleCount, { color: COUPLE_COLORS.primary }]}>
                    {pendingRequests.length}
                  </Text>
                </View>
                {pendingRequests.map((req: any) => (
                  <View
                    key={req.id}
                    style={[s.coupleRow, { borderBottomColor: COUPLE_COLORS.border }]}
                  >
                    <View
                      style={[s.coupleAvatar, { backgroundColor: `${COUPLE_COLORS.primary}15` }]}
                    >
                      <AntDesign name="user" size={16} color={COUPLE_COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.coupleName, { color: COUPLE_COLORS.text }]}>
                        {req.sender?.firstName || 'Someone'} wants to connect
                      </Text>
                      <Text style={[s.coupleDetail, { color: COUPLE_COLORS.textSecondary }]}>
                        {req.sender?.phone || req.sender?.email || ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={s.approveBtn}
                      disabled={processingReqId === req.id}
                      onPress={async () => {
                        setProcessingReqId(req.id);
                        try {
                          const result = await approveCoupleRequest(req.id);
                          if (result?.user) {
                            setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
                            alertService.alert(
                              'Connected!',
                              "You're in a couple! Couple Mode is active.",
                              [
                                {
                                  text: 'Go to Home',
                                  onPress: () => navigation.navigate('HomeTab'),
                                },
                              ],
                            );
                          }
                        } catch (e: any) {
                          alertService.alert('Error', e?.message || 'Failed to approve');
                        } finally {
                          setProcessingReqId(null);
                        }
                      }}
                    >
                      {processingReqId === req.id ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <AntDesign name="check" size={14} color="#FFF" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.rejectBtn}
                      onPress={async () => {
                        try {
                          await rejectCoupleRequest(req.id);
                          setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
                        } catch {
                          /* silent */
                        }
                      }}
                    >
                      <AntDesign name="close" size={14} color="#FF4757" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Upgrade Banner ── */}
          {!loading && !isPremium && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Premium')}
              activeOpacity={0.8}
              style={[
                s.upgradeCard,
                {
                  backgroundColor: isDark ? '#1E1B4B' : '#F5F3FF',
                  borderColor: isDark ? '#2E1065' : '#E9D5FF',
                },
              ]}
            >
              <View style={s.upgradeAccent} />
              <View style={s.upgradeContent}>
                <View style={s.upgradeIcon}>
                  <AntDesign name="star" size={20} color="#0A0A0A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.upgradeTitle, { color: colors.text.primary }]}>
                    Upgrade to Premium
                  </Text>
                  <Text style={[s.upgradeDesc, { color: colors.text.tertiary }]}>
                    Unlock reports, analytics & exclusive features
                  </Text>
                </View>
                <View style={s.upgradeBtn}>
                  <Text style={s.upgradeBtnText}>Upgrade</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Couple Mode Toggle ── */}
          <View style={{ paddingHorizontal: PADDING }}>
            <CoupleModeToggle />
          </View>

          {/* ── Settings Sections ── */}
          <View style={{ paddingHorizontal: PADDING, marginTop: 24, gap: 24 }}>
            {SECTIONS.map((section, i) => (
              <View key={i}>
                <Text style={[s.sectionTitle, { color: colors.text.tertiary }]}>
                  {section.title}
                </Text>
                <View style={[s.sectionCard, { backgroundColor: colors.bg.card }]}>
                  {section.items.map((item, j) => renderRow(item, j === section.items.length - 1))}
                </View>
              </View>
            ))}
          </View>

          {/* ── Sign Out ── */}
          <TouchableOpacity
            style={[s.logoutCard, { backgroundColor: colors.bg.card }]}
            onPress={() => setShowLogoutDialog(true)}
            activeOpacity={0.6}
          >
            <View style={[s.logoutIcon, { backgroundColor: `${colors.status.error}0F` }]}>
              <AntDesign name="logout" size={16} color={colors.status.error} />
            </View>
            <Text style={[s.logoutText, { color: colors.status.error }]}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={[s.version, { color: colors.text.tertiary }]}>Dabbu v1.0.0</Text>
        </Animated.View>
      </ScrollView>

      <ConfirmDialog
        visible={showLogoutDialog}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign Out"
        destructive
        icon="logout"
        onConfirm={() => {
          setShowLogoutDialog(false);
          logout().catch(() => {});
        }}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: borderRadius['2xl'],
    gap: 14,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  profileEmail: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  profileChevron: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, marginTop: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pillText: { fontSize: 12, fontWeight: '700' },

  coupleCard: { borderRadius: borderRadius['2xl'], borderWidth: 1, overflow: 'hidden' },
  coupleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  coupleTitle: { fontSize: 14, fontWeight: '800', flex: 1 },
  coupleCount: { fontSize: 12, fontWeight: '700' },
  coupleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  coupleAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coupleName: { fontSize: 13, fontWeight: '700' },
  coupleDetail: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  approveBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#FF475720',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF475740',
  },

  upgradeCard: {
    marginHorizontal: PADDING,
    marginBottom: 20,
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
  },
  upgradeAccent: { height: 3, backgroundColor: '#FFD700' },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  upgradeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  upgradeDesc: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  upgradeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFD700',
  },
  upgradeBtnText: { fontSize: 12, fontWeight: '800', color: '#0A0A0A' },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCard: { borderRadius: borderRadius['2xl'], overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginRight: 4,
  },
  badgeText: { fontSize: 9, fontWeight: '800' },

  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: PADDING,
    marginTop: 24,
    padding: 16,
    borderRadius: borderRadius['2xl'],
  },
  logoutIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { fontSize: 15, fontWeight: '700' },

  version: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 24,
    marginBottom: 8,
  },
});
