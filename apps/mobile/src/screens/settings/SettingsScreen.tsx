import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useAuth } from '../../store/AuthContext';
import { Avatar } from '../../components/ui/Avatar';
import { CoupleModeToggle } from '../../components/ui/CoupleModeToggle';
import { useAppLock } from '../../store/LockContext';
import { usePreferences } from '../../store/PreferencesContext';
import { api, setAccessToken, getAccessToken } from '../../services/api';
import { ConfirmDialog } from '../../components/ui';
import { spacing, borderRadius, shadows, sectionHeader } from '../../theme/design';
import { COUPLE_COLORS } from '../../hooks/useCoupleMode';

type SectionItem = {
  label: string;
  icon: React.ComponentProps<typeof AntDesign>['name'];
  screen: string;
  premium?: boolean;
  action?: 'lock';
  subtitle?: string;
};

const SECTIONS: Array<{ title: string; items: SectionItem[] }> = [
  {
    title: 'Account',
    items: [
      { label: 'Profile', icon: 'user', screen: 'Profile' },
      { label: 'Partner Management', icon: 'heart', screen: 'AddPartner' },
      { label: 'Favorite Contacts', icon: 'star', screen: 'FavoriteContacts' },
      { label: 'Refer & Earn', icon: 'gift', screen: 'Referral' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { label: 'Theme', icon: 'skin', screen: 'Theme' },
      { label: 'Notifications', icon: 'bells', screen: 'NotificationSettings' },
      { label: 'Customise Bottom Menu', icon: 'menufold', screen: 'CustomiseBottomMenu' },
    ],
  },
  {
    title: 'Security',
    items: [
      { label: 'Security', icon: 'Safety', screen: 'Security' },
      { label: 'Lock App', icon: 'lock', screen: 'Security', action: 'lock' },
    ],
  },
  {
    title: 'Premium',
    items: [
      { label: 'Premium Plan', icon: 'star', screen: 'Premium' },
      { label: 'Couple Space', icon: 'heart', screen: 'CoupleSpace' },
    ],
  },
  {
    title: 'Wealth Tools',
    items: [
      { label: 'Financial Reports', icon: 'linechart', screen: 'Reports', premium: true },
      { label: 'Export Data', icon: 'download', screen: 'Analytics', premium: true },
      { label: 'Budgets', icon: 'piechart', screen: 'BudgetsList' },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Help Center', icon: 'questioncircle', screen: 'Help' },
      { label: 'Contact Us', icon: 'message1', screen: 'Contact' },
      { label: 'Privacy Policy', icon: 'filetext1', screen: 'Privacy' },
    ],
  },
];

const ROW_META: Record<string, string> = {
  Profile: 'user', 'Partner Management': 'heart', 'Premium Plan': 'star',
  'Favorite Contacts': 'star', 'Refer & Earn': 'gift', Security: 'Safety',
  'Lock App': 'lock', 'Financial Reports': 'linechart', 'Export Data': 'download',
  Budgets: 'piechart', 'Couple Space': 'heart', Theme: 'skin',
  Notifications: 'bells', 'Help Center': 'questioncircle',
  'Contact Us': 'message1', 'Privacy Policy': 'filetext1',
};

const REGISTERED_SCREENS = [
  'Profile', 'AddPartner', 'Security', 'Premium', 'Theme',
  'CustomiseDashboard', 'CustomiseBottomMenu', 'Help', 'Contact',
  'Privacy', 'Analytics', 'Reports', 'BudgetsList', 'NotificationSettings',
  'FavoriteContacts', 'Referral', 'CoupleSpace',
];

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const {
    user, logout, refreshPremiumStatus, fetchCoupleRequests,
    approveCoupleRequest, rejectCoupleRequest,
  } = useAuth();
  const { lockApp } = useAppLock();
  const { quickActionVisible, setQuickActionVisibility } = usePreferences();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [subscription, setSubscription] = useState<any | null>(undefined);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);

  useEffect(() => { Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }, []);

  const loadSubscription = useCallback(async () => {
    try {
      setAccessToken(getAccessToken());
      const res = await api.get<any>('/premium/current');
      setSubscription(res);
    } catch { setSubscription(null); }
    refreshPremiumStatus();
  }, [refreshPremiumStatus]);

  useEffect(() => { loadSubscription(); }, [loadSubscription]);

  const refreshRequests = useCallback(async () => {
    if (user?.isCouple) { setPendingRequests([]); return; }
    try {
      const res = await fetchCoupleRequests();
      setPendingRequests((res?.received || []).filter((r: any) => r.status === 'pending'));
    } catch { /* ignore */ }
  }, [user?.isCouple, fetchCoupleRequests]);

  useFocusEffect(useCallback(() => { refreshRequests(); }, [refreshRequests]));

  const isPremium = !!subscription && subscription.status === 'active';

  const handleNav = (screen: string, premium?: boolean, action?: 'lock') => {
    if (action === 'lock') { lockApp(); return; }
    if (!REGISTERED_SCREENS.includes(screen)) {
      Alert.alert('Coming Soon', `${screen} will be available soon`);
      return;
    }
    if (premium && !isPremium) {
      Alert.alert('Premium Feature', 'This feature is available on Premium plan.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Plans', onPress: () => navigation.navigate('Subscription') },
      ]);
      return;
    }
    navigation.navigate(screen);
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + spacing['5xl'] }}>

        {/* Profile Header */}
        <View style={{ paddingTop: insets.top + spacing.xl, paddingHorizontal: spacing.xl, paddingBottom: spacing['2xl'] }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleNav('Profile')}
            style={[s.profileCard, { backgroundColor: colors.bg.card }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
              <Avatar uri={user?.avatarUrl} name={`${user?.firstName || ''} ${user?.lastName || ''}`} size={52} />
              <View style={{ flex: 1 }}>
                <Text style={[s.profileName, { color: colors.text.primary }]}>
                  {user?.firstName || 'User'} {user?.lastName || ''}
                </Text>
                <Text style={[s.profileEmail, { color: colors.text.secondary }]}>{user?.email || ''}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: isPremium ? `${colors.accent.primary}12` : colors.bg.tertiary }]}>
                <AntDesign name={isPremium ? 'star' : 'user'} size={12} color={isPremium ? colors.accent.primary : colors.text.tertiary} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: isPremium ? colors.accent.primary : colors.text.tertiary }}>
                  {isPremium ? 'Premium' : 'Free'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Upgrade Banner */}
          {subscription !== undefined && !isPremium && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Premium')}
              activeOpacity={0.85}
              style={[s.upgradeBanner, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
            >
              <View style={[s.upgradeIcon, { backgroundColor: '#FCD34D' }]}>
                <AntDesign name="star" size={20} color="#0A0A0A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.upgradeTitle, { color: colors.text.primary }]}>Upgrade to Premium</Text>
                <Text style={[s.upgradeDesc, { color: colors.text.secondary }]}>Unlock reports, analytics & more</Text>
              </View>
              <Text style={s.upgradeBtn}>Upgrade</Text>
            </TouchableOpacity>
          )}

          {/* Couple Requests */}
          {pendingRequests.length > 0 && (
            <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing['2xl'] }}>
              <View style={[s.grouped, { backgroundColor: COUPLE_COLORS.bg, borderColor: COUPLE_COLORS.border }]}>
                <View style={[s.coupleHeader, { borderBottomColor: COUPLE_COLORS.border }]}>
                  <AntDesign name="heart" size={16} color={COUPLE_COLORS.primary} />
                  <Text style={[s.coupleHeaderText, { color: COUPLE_COLORS.text }]}>
                    Couple Request{pendingRequests.length > 1 ? 's' : ''}
                  </Text>
                  <Text style={[s.coupleBadge, { color: COUPLE_COLORS.primary }]}>{pendingRequests.length}</Text>
                </View>
                {pendingRequests.map((req: any) => (
                  <View key={req.id} style={[s.coupleRow, { borderBottomColor: COUPLE_COLORS.border }]}>
                    <Avatar name={req.sender?.firstName || ''} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.coupleName, { color: COUPLE_COLORS.text }]}>
                        {req.sender?.firstName || 'Someone'} wants to connect
                      </Text>
                      <Text style={[s.coupleContact, { color: COUPLE_COLORS.textSecondary }]}>
                        {req.sender?.phone || req.sender?.email || ''}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <TouchableOpacity style={s.approveBtn} disabled={processingReqId === req.id}
                        onPress={async () => {
                          setProcessingReqId(req.id);
                          try {
                            const result = await approveCoupleRequest(req.id);
                            if (result?.user) {
                              setPendingRequests(prev => prev.filter(r => r.id !== req.id));
                              Alert.alert('Connected!', "You're in a couple! Couple Mode is active.",
                                [{ text: 'Go to Home', onPress: () => navigation.navigate('Dashboard') }]);
                            }
                          } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
                          finally { setProcessingReqId(null); }
                        }}>
                        {processingReqId === req.id ? <ActivityIndicator size="small" color="#FFF" /> :
                          <AntDesign name="check" size={14} color="#FFF" />}
                      </TouchableOpacity>
                      <TouchableOpacity style={s.rejectBtn} onPress={async () => {
                        try { await rejectCoupleRequest(req.id); setPendingRequests(prev => prev.filter(r => r.id !== req.id)); } catch {}
                      }}>
                        <AntDesign name="close" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <TouchableOpacity style={s.coupleFooter} onPress={() => navigation.navigate('AddPartner')} activeOpacity={0.7}>
                  <Text style={[s.coupleFooterText, { color: COUPLE_COLORS.primary }]}>View All</Text>
                  <AntDesign name="right" size={12} color={COUPLE_COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Settings Sections */}
          {SECTIONS.map((section, i) => (
            <View key={i} style={{ paddingHorizontal: spacing.xl, marginBottom: spacing['2xl'] }}>
              <Text style={[sectionHeader, { color: colors.text.secondary }]}>{section.title}</Text>
              <View style={[s.grouped, { backgroundColor: colors.bg.card }]}>
                {section.items.map((item, j) => {
                  const iconName = (ROW_META[item.label] || item.icon) as any;
                  const isLast = j === section.items.length - 1;
                  return (
                    <TouchableOpacity key={j}
                      style={[s.row, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle }]}
                      onPress={() => handleNav(item.screen, item.premium, item.action)}
                      activeOpacity={0.6}>
                      <View style={[s.rowIcon, { backgroundColor: `${colors.accent.primary}0A` }]}>
                        <AntDesign name={iconName} size={16} color={colors.accent.primary} />
                      </View>
                      <Text style={[s.rowLabel, { color: colors.text.primary }]}>{item.label}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        {item.premium && !isPremium && (
                          <View style={[s.premiumBadge, { backgroundColor: `${colors.accent.primary}0A` }]}>
                            <Text style={[s.premiumText, { color: colors.accent.primary }]}>Premium</Text>
                          </View>
                        )}
                        <AntDesign name="right" size={14} color={colors.text.tertiary} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {section.title === 'Preferences' && (
                  <View style={[s.row, { borderBottomWidth: 0 }]}>
                    <View style={[s.rowIcon, { backgroundColor: `${colors.accent.primary}0A` }]}>
                      <AntDesign name="pluscircleo" size={16} color={colors.accent.primary} />
                    </View>
                    <Text style={[s.rowLabel, { color: colors.text.primary }]}>Quick Actions</Text>
                    <Switch
                      value={quickActionVisible} onValueChange={setQuickActionVisibility}
                      trackColor={{ false: colors.border.subtle, true: `${colors.accent.primary}50` }}
                      thumbColor={quickActionVisible ? colors.accent.primary : colors.text.tertiary}
                    />
                  </View>
                )}
              </View>
            </View>
          ))}

          {/* Admin */}
          <TouchableOpacity style={[s.extraRow, { backgroundColor: colors.bg.card }]} onPress={() => navigation.navigate('AdminLogin')} activeOpacity={0.6}>
            <View style={[s.rowIcon, { backgroundColor: `${colors.accent.primary}10` }]}>
              <AntDesign name="Safety" size={16} color={colors.accent.primary} />
            </View>
            <Text style={[s.rowLabel, { color: colors.accent.primary }]}>Admin Panel</Text>
            <AntDesign name="right" size={14} color={colors.text.tertiary} />
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity style={[s.extraRow, { backgroundColor: colors.bg.card }]} onPress={() => setShowLogoutDialog(true)} activeOpacity={0.6}>
            <View style={[s.rowIcon, { backgroundColor: `${colors.status.error}0A` }]}>
              <AntDesign name="logout" size={16} color={colors.status.error} />
            </View>
            <Text style={[s.rowLabel, { color: colors.status.error }]}>Sign Out</Text>
            <AntDesign name="right" size={14} color={colors.text.tertiary} />
          </TouchableOpacity>

          <Text style={[s.version, { color: colors.text.tertiary }]}>Dabbu v1.0.0</Text>
        </Animated.View>
      </ScrollView>

      <ConfirmDialog
        visible={showLogoutDialog}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign Out" destructive icon="logout"
        onConfirm={() => { setShowLogoutDialog(false); logout().catch(() => {}); }}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </View>
  );
}

function SettingsRow({ icon, label, colors, last, children }: { icon: string; label: string; colors: any; last?: boolean; children: React.ReactNode }) {
  return (
    <View style={[s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle }]}>
      <View style={[s.rowIcon, { backgroundColor: `${colors.accent.primary}0A` }]}>
        <AntDesign name={icon as any} size={16} color={colors.accent.primary} />
      </View>
      <Text style={[s.rowLabel, { color: colors.text.primary, flex: 1 }]}>{label}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  profileCard: {
    borderRadius: borderRadius['3xl'],
    padding: spacing.lg,
    ...shadows.md,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.05,
  },
  profileEmail: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing['2xl'],
    padding: spacing.lg,
    borderRadius: borderRadius['3xl'],
    borderWidth: 1,
    ...shadows.sm,
  },
  upgradeIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.05,
  },
  upgradeDesc: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
  },
  upgradeBtn: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0A0A0A',
    backgroundColor: '#FCD34D',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    overflow: 'hidden',
  },
  grouped: {
    borderRadius: borderRadius['3xl'],
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    ...shadows.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    minHeight: 48,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.03,
    flex: 1,
  },
  premiumBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '600',
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    borderRadius: borderRadius['3xl'],
    minHeight: 48,
    ...shadows.sm,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '400',
    marginTop: spacing['2xl'],
  },
  // Couple section
  coupleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  coupleHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  coupleBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  coupleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  coupleName: {
    fontSize: 13,
    fontWeight: '600',
  },
  coupleContact: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 1,
  },
  approveBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  coupleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.md,
  },
  coupleFooterText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
