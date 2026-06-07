import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useAuth } from '../../store/AuthContext';
import { useAppLock } from '../../store/LockContext';
import { api, setAccessToken, getAccessToken } from '../../services/api';

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

const ROW_META: Record<string, { gradient: [string, string]; icon: IconName }> = {
  Profile: { gradient: ['#6C3EF4', '#8B5CF6'], icon: 'person' },
  Subscription: { gradient: ['#F3D28F', '#D4A84B'], icon: 'diamond' },
  'Refer & Earn': { gradient: ['#FF4D4F', '#FF6B6B'], icon: 'gift' },
  Security: { gradient: ['#34C759', '#059669'], icon: 'shield-checkmark' },
  'Lock App': { gradient: ['#6C3EF4', '#5B2ED6'], icon: 'lock-closed' },
  'Reports & Analytics': { gradient: ['#8B5CF6', '#6D28D9'], icon: 'stats-chart' },
  Theme: { gradient: ['#EC4899', '#BE185D'], icon: 'color-palette' },
  Notifications: { gradient: ['#6C3EF4', '#8B5CF6'], icon: 'notifications' },
  'Customise Dashboard': { gradient: ['#4F6EF7', '#6C5CE7'], icon: 'apps' },
  'Customise Bottom Menu': { gradient: ['#34C759', '#00A86B'], icon: 'menu' },
  'Help Center': { gradient: ['#6C3EF4', '#5B2ED6'], icon: 'help-circle' },
  'Contact Us': { gradient: ['#14B8A6', '#0D9488'], icon: 'chatbubble-ellipses' },
  'Privacy Policy': { gradient: ['#78716C', '#57534E'], icon: 'document-text' },
};

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { lockApp } = useAppLock();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    loadSubscription();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  async function loadSubscription() {
    try {
      setAccessToken(getAccessToken());
      const res = await api.get<any>('/premium/current');
      setSubscription(res);
    } catch { setSubscription(null); }
  }

  const isPremium = !!subscription && subscription.status === 'active';

  const handleNav = (screen: string, premium?: boolean, action?: 'lock') => {
    if (action === 'lock') { lockApp(); return; }
    const registered = [
      'Profile', 'Security', 'Premium', 'Theme', 'CustomiseDashboard',
      'CustomiseBottomMenu', 'Help', 'Contact', 'Privacy', 'Analytics',
      'NotificationSettings',
    ];
    if (!registered.includes(screen)) {
      Alert.alert('Coming Soon', `${screen} settings will be available soon`);
      return;
    }
    if (premium && !isPremium) {
      Alert.alert('Premium Feature', 'This feature is available on Premium plan. Upgrade to access it.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Plans', onPress: () => navigation.navigate('Subscription') },
      ]);
      return;
    }
    navigation.navigate(screen);
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <LinearGradient
          colors={['#1A1A3E', '#12121A']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[s.hero, { paddingTop: insets.top + 16 }]}
        >
          <TouchableOpacity style={s.heroBack} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleNav('Profile')} activeOpacity={0.8} style={s.heroProfile}>
            <LinearGradient colors={['#6C3EF4', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroAvatar}>
              <Text style={s.heroAvatarText}>{user?.firstName?.[0] || 'U'}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.heroName} numberOfLines={1}>{user?.firstName || 'User'} {user?.lastName || ''}</Text>
              <Text style={s.heroEmail} numberOfLines={1}>{user?.email || 'No email'}</Text>
            </View>
            <View style={[s.heroPlanBadge, { backgroundColor: isPremium ? '#F3D28F20' : 'rgba(255,255,255,0.1)' }]}>
              <Ionicons name={isPremium ? 'diamond' : 'person-outline'} size={12} color={isPremium ? '#F3D28F' : 'rgba(255,255,255,0.6)'} />
              <Text style={[s.heroPlanText, { color: isPremium ? '#F3D28F' : 'rgba(255,255,255,0.6)' }]}>
                {isPremium ? 'Premium' : 'Free'}
              </Text>
            </View>
          </TouchableOpacity>
        </LinearGradient>

        <Animated.View style={{ opacity: fadeAnim }}>
          {!isPremium && (
            <TouchableOpacity
              style={s.upgradeBanner}
              onPress={() => navigation.navigate('Premium')}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#F3D28F', '#D4A84B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.upgradeGrad}>
                <View style={{ flex: 1 }}>
                  <Text style={s.upgradeTitle}>Upgrade to Premium</Text>
                  <Text style={s.upgradeSub}>Unlock reports, analytics & more</Text>
                </View>
                <View style={s.upgradeArrow}>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {SECTIONS.map((section, i) => (
            <View key={i} style={s.section}>
              <Text style={[s.secTitle, { color: colors.text.tertiary }]}>{section.title}</Text>
              <View style={[s.secCard, { backgroundColor: colors.bg.secondary }]}>
                {section.items.map((item, j) => {
                  const meta = ROW_META[item.label];
                  return (
                    <TouchableOpacity
                      key={j}
                      style={[s.row, j < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle }]}
                      onPress={() => handleNav(item.screen, item.premium, item.action)}
                      activeOpacity={0.6}
                    >
                      <LinearGradient colors={meta?.gradient || ['#6C3EF4', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.rowIcon}>
                        <Ionicons name={(meta?.icon as any) || item.icon} size={18} color="#FFF" />
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.rowLabel, { color: colors.text.primary }]}>{item.label}</Text>
                      </View>
                      <View style={s.rowRight}>
                        {item.premium && !isPremium && (
                          <View style={s.premiumBadge}>
                            <Ionicons name="lock-closed" size={9} color="#6C3EF4" />
                            <Text style={s.premiumLabel}>Premium</Text>
                          </View>
                        )}
                        <View style={s.chevronBox}>
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
            style={[s.logoutRow, { backgroundColor: colors.bg.secondary }]}
            onPress={() => {
              Alert.alert('Logout', 'Are you sure you want to logout?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: () => logout().catch(() => {}) },
              ]);
            }}
            activeOpacity={0.6}
          >
            <View style={s.logoutIcon}>
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
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroBack: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  heroProfile: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 14,
  },
  heroAvatar: {
    width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  heroAvatarText: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  heroName: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  heroEmail: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500', marginTop: 1 },
  heroPlanBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  heroPlanText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  upgradeBanner: { marginHorizontal: 20, marginTop: 20, marginBottom: 24, borderRadius: 20, overflow: 'hidden' },
  upgradeGrad: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
  },
  upgradeTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  upgradeSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500', marginTop: 2 },
  upgradeArrow: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  section: { marginBottom: 20, paddingHorizontal: 20 },
  secTitle: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 10, marginLeft: 4,
  },
  secCard: { borderRadius: 20, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 15, paddingHorizontal: 16,
  },
  rowIcon: {
    width: 44, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chevronBox: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.03)', alignItems: 'center', justifyContent: 'center',
  },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: '#6C3EF410',
  },
  premiumLabel: { fontSize: 10, fontWeight: '700', color: '#6C3EF4' },

  logoutRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, padding: 16, borderRadius: 20,
  },
  logoutIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#FF4D4F12', alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  logoutText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#FF4D4F' },

  version: { textAlign: 'center', fontSize: 12, fontWeight: '500', marginTop: 24 },
});
