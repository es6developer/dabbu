import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useAuth } from '../../store/AuthContext';
import { useAppLock } from '../../store/LockContext';
import { api, setAccessToken, getAccessToken } from '../../services/api';
import { ConfirmDialog } from '../../components/ui';

type IconName = keyof typeof Ionicons.glyphMap;

interface SectionItem {
  label: string;
  icon: IconName;
  screen: string;
  premium?: boolean;
  action?: 'lock';
}

const SECTIONS: Array<{ title: string; items: SectionItem[] }> = [
  {
    title: 'Account',
    items: [
      { label: 'Profile', icon: 'person-circle', screen: 'Profile' },
      { label: 'Favorite Contacts', icon: 'star', screen: 'FavoriteContacts' },
      { label: 'Subscription', icon: 'diamond', screen: 'Premium' },
      { label: 'Refer & Earn', icon: 'gift', screen: 'Referral' },
      { label: 'Security', icon: 'shield-checkmark', screen: 'Security' },
      { label: 'Lock App', icon: 'lock-closed', screen: 'Security', action: 'lock' },
    ],
  },
  {
    title: 'Financial Tools',
    items: [
      { label: 'Reports & Analytics', icon: 'stats-chart', screen: 'Analytics', premium: true },
      { label: 'Couple Space', icon: 'heart', screen: 'CoupleSpace' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { label: 'Theme', icon: 'color-palette', screen: 'Theme' },
      { label: 'Notifications', icon: 'notifications', screen: 'NotificationSettings' },
      { label: 'Customise Dashboard', icon: 'apps', screen: 'CustomiseDashboard' },
      { label: 'Customise Bottom Menu', icon: 'menu', screen: 'CustomiseBottomMenu' },
    ],
  },
  {
    title: 'More',
    items: [
      { label: 'Help Center', icon: 'help-circle', screen: 'Help' },
      { label: 'Contact Us', icon: 'chatbubble-ellipses', screen: 'Contact' },
      { label: 'Privacy Policy', icon: 'document-text', screen: 'Privacy' },
    ],
  },
];

function getRowMeta(): Record<string, { icon: IconName }> {
  return {
    Profile: { icon: 'person' },
    Subscription: { icon: 'diamond' },
    'Favorite Contacts': { icon: 'star' },
    'Refer & Earn': { icon: 'gift' },
    Security: { icon: 'shield-checkmark' },
    'Lock App': { icon: 'lock-closed' },
    'Reports & Analytics': { icon: 'stats-chart' },
    'Couple Space': { icon: 'heart' },
    Theme: { icon: 'color-palette' },
    Notifications: { icon: 'notifications' },
    'Customise Dashboard': { icon: 'apps' },
    'Customise Bottom Menu': { icon: 'menu' },
    'Help Center': { icon: 'help-circle' },
    'Contact Us': { icon: 'chatbubble-ellipses' },
    'Privacy Policy': { icon: 'document-text' },
  };
}

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, logout, refreshPremiumStatus } = useAuth();
  const { lockApp } = useAppLock();
  const { colors, isDark } = useTheme();
  const ROW_META = useMemo(() => getRowMeta(), []);
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [subscription, setSubscription] = useState<any>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    loadSubscription();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  async function loadSubscription() {
    try {
      setAccessToken(getAccessToken());
      const res = await api.get<any>('/premium/current');
      setSubscription(res);
    } catch {
      setSubscription(null);
    }
    refreshPremiumStatus();
  }

  const isPremium = !!subscription && subscription.status === 'active';

  const handleNav = (screen: string, premium?: boolean, action?: 'lock') => {
    if (action === 'lock') {
      lockApp();
      return;
    }
    const registered = [
      'Profile',
      'Security',
      'Premium',
      'Theme',
      'CustomiseDashboard',
      'CustomiseBottomMenu',
      'Help',
      'Contact',
      'Privacy',
      'Analytics',
      'NotificationSettings',
      'FavoriteContacts',
      'Referral',
    ];
    if (!registered.includes(screen)) {
      Alert.alert('Coming Soon', `${screen} settings will be available soon`);
      return;
    }
    if (premium && !isPremium) {
      Alert.alert(
        'Premium Feature',
        'This feature is available on Premium plan. Upgrade to access it.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Plans', onPress: () => navigation.navigate('Subscription') },
        ],
      );
      return;
    }
    navigation.navigate(screen);
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <View style={[s.hero, { paddingTop: insets.top + 16, backgroundColor: '#0D1B2A' }]}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <TouchableOpacity
              style={s.heroBack}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 13,
                fontWeight: '600',
                letterSpacing: 1,
              }}
            >
              SETTINGS
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <TouchableOpacity
            onPress={() => handleNav('Profile')}
            activeOpacity={0.8}
            style={[s.heroProfile, { borderColor: colors.border.default }]}
          >
            <View style={[s.heroAvatar, { backgroundColor: colors.accent.primary }]}>
              <Text style={s.heroAvatarText}>{user?.firstName?.[0] || 'U'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.heroName} numberOfLines={1}>
                {user?.firstName || 'User'} {user?.lastName || ''}
              </Text>
              <Text style={s.heroEmail} numberOfLines={1}>
                {user?.email || 'No email'}
              </Text>
            </View>
            <View
              style={[
                s.heroPlanBadge,
                { backgroundColor: isPremium ? '#F3D28F20' : 'rgba(255,255,255,0.1)' },
              ]}
            >
              <Ionicons
                name={isPremium ? 'diamond' : 'person-outline'}
                size={12}
                color={isPremium ? '#F3D28F' : 'rgba(255,255,255,0.6)'}
              />
              <Text
                style={[s.heroPlanText, { color: isPremium ? '#F3D28F' : 'rgba(255,255,255,0.6)' }]}
              >
                {isPremium ? 'Premium' : 'Free'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
          {!isPremium && (
            <TouchableOpacity
              style={[
                s.upgradeBanner,
                { backgroundColor: colors.accent.primary, borderColor: colors.border.default },
              ]}
              onPress={() => navigation.navigate('Premium')}
              activeOpacity={0.85}
            >
              <View style={s.upgradeGrad}>
                <View style={{ flex: 1 }}>
                  <Text style={s.upgradeTitle}>Upgrade to Premium</Text>
                  <Text style={s.upgradeSub}>Unlock reports, analytics & more</Text>
                </View>
                <View style={s.upgradeArrow}>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </View>
              </View>
            </TouchableOpacity>
          )}

          {SECTIONS.map((section, i) => (
            <View key={i} style={s.section}>
              <Text style={[s.secTitle, { color: colors.text.tertiary }]}>{section.title}</Text>
              <View
                style={[
                  s.secCard,
                  { backgroundColor: colors.bg.secondary, borderColor: colors.border.default },
                ]}
              >
                {section.items.map((item, j) => {
                  const meta = ROW_META[item.label];
                  return (
                    <TouchableOpacity
                      key={j}
                      style={[
                        s.row,
                        j < section.items.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: colors.border.subtle,
                        },
                      ]}
                      onPress={() => handleNav(item.screen, item.premium, item.action)}
                      activeOpacity={0.6}
                    >
                      <View style={[s.rowIcon, { backgroundColor: colors.bg.tertiary }]}>
                        <Ionicons name={(meta?.icon as any) || item.icon} size={18} color="#FFF" />
                      </View>
                      <Text style={[s.rowLabel, { color: colors.text.primary }]}>{item.label}</Text>
                      <View style={s.rowRight}>
                        {item.premium && !isPremium && (
                          <View style={[s.premiumBadge, { backgroundColor: colors.bg.tertiary }]}>
                            <Ionicons name="lock-closed" size={9} color={colors.accent.primary} />
                            <Text style={[s.premiumLabel, { color: colors.accent.primary }]}>
                              Premium
                            </Text>
                          </View>
                        )}
                        <View style={[s.chevronBox, { backgroundColor: colors.bg.tertiary }]}>
                          <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[
              s.logoutRow,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.default },
            ]}
            onPress={() => setShowLogoutDialog(true)}
            activeOpacity={0.6}
          >
            <View style={[s.logoutIcon, { backgroundColor: colors.bg.tertiary }]}>
              <Ionicons name="log-out-outline" size={20} color="#FF4D4F" />
            </View>
            <Text style={s.logoutText}>Sign Out</Text>
            <View style={s.chevronBox}>
              <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
            </View>
          </TouchableOpacity>

          <Text style={[s.version, { color: colors.text.tertiary }]}>Dabbu v1.0.0</Text>
        </Animated.View>
      </ScrollView>

      <ConfirmDialog
        visible={showLogoutDialog}
        title="Sign Out"
        message="Are you sure you want to sign out? You'll need to log in again to access your account."
        confirmLabel="Sign Out"
        destructive
        icon="log-out-outline"
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
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroBack: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
  },
  heroAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  heroName: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  heroEmail: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500', marginTop: 1 },
  heroPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroPlanText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  upgradeBanner: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  upgradeGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  upgradeTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  upgradeSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500', marginTop: 2 },
  upgradeArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: { marginBottom: 28, paddingHorizontal: 20 },
  secTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 14,
    marginLeft: 4,
  },
  secCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chevronBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  premiumLabel: { fontSize: 10, fontWeight: '700' },

  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  logoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#FF4D4F' },

  version: { textAlign: 'center', fontSize: 12, fontWeight: '500', marginTop: 24 },
});
