import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useAuth } from '../../store/AuthContext';
import { useAppLock } from '../../store/LockContext';
import { api, setAccessToken, getAccessToken } from '../../services/api';

const { width: SCREEN_W } = Dimensions.get('window');

type IconName = keyof typeof Ionicons.glyphMap;

interface SectionItem {
  label: string;
  icon: IconName;
  screen: string;
  premium?: boolean;
  action?: 'lock';
  badge?: string;
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
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    try {
      setAccessToken(getAccessToken());
      const res = await api.get<any>('/premium/current');
      setSubscription(res);
    } catch {
      setSubscription(null);
    }
  }

  const isPremium = !!subscription && subscription.status === 'active';

  const handleNav = (screen: string, premium?: boolean, action?: 'lock') => {
    if (action === 'lock') {
      lockApp();
      return;
    }
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
        <LinearGradient
          colors={['#6C3EF4', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.hero, { paddingTop: insets.top + 20 }]}
        >
          <TouchableOpacity
            style={s.heroBack}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.heroTitle}>Settings</Text>
          <Text style={s.heroSub}>Personalise your experience</Text>
          <View style={s.heroGlow} />
        </LinearGradient>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleNav('Profile')}
          style={s.profileWrap}
        >
          <View style={[s.profileCard, { backgroundColor: colors.bg.card }]}>
            <LinearGradient
              colors={['#6C3EF4', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.avatar}
            >
              <Text style={s.avatarText}>{user?.firstName?.[0] || 'U'}</Text>
            </LinearGradient>
            <View style={s.profileBody}>
              <Text style={[s.name, { color: colors.text.primary }]} numberOfLines={1}>
                {user?.firstName || 'User'} {user?.lastName || ''}
              </Text>
              <Text style={[s.email, { color: colors.text.tertiary }]} numberOfLines={1}>
                {user?.email || 'No email'}
              </Text>
              <View style={[s.planBadge, { backgroundColor: isPremium ? '#6C3EF415' : '#F0F0F0' }]}>
                <View style={[s.planDot, { backgroundColor: isPremium ? '#6C3EF4' : '#9CA3AF' }]} />
                <Text style={[s.planLabel, { color: isPremium ? '#6C3EF4' : '#9CA3AF' }]}>
                  {isPremium ? 'Premium' : 'Free'}
                </Text>
              </View>
            </View>
            <View style={s.chevronWrap}>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </View>
          </View>
        </TouchableOpacity>

        {SECTIONS.map((section, i) => (
          <View key={i} style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.text.tertiary }]}>
              {section.title}
            </Text>
            <View style={[s.sectionCard, { backgroundColor: colors.bg.card }]}>
              {section.items.map((item, j) => {
                const meta = ROW_META[item.label];
                return (
                  <TouchableOpacity
                    key={j}
                    style={[
                      s.row,
                      j < section.items.length - 1 && s.rowBorder,
                    ]}
                    onPress={() => handleNav(item.screen, item.premium, item.action)}
                    activeOpacity={0.6}
                  >
                    <LinearGradient
                      colors={meta?.gradient || ['#6C3EF4', '#8B5CF6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={s.rowIcon}
                    >
                      <Ionicons
                        name={(meta?.icon as any) || item.icon}
                        size={16}
                        color="#FFF"
                      />
                    </LinearGradient>
                    <Text style={[s.rowLabel, { color: colors.text.primary }]}>
                      {item.label}
                    </Text>
                    <View style={s.rowRight}>
                      {item.premium && !isPremium && (
                        <View style={s.premiumBadge}>
                          <Ionicons name="lock-closed" size={9} color="#6C3EF4" />
                          <Text style={s.premiumLabel}>Premium</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[s.logoutRow, { backgroundColor: colors.bg.card }]}
          onPress={() => {
            Alert.alert('Logout', 'Are you sure you want to logout?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Logout',
                style: 'destructive',
                onPress: () => logout().catch(() => {}),
              },
            ]);
          }}
          activeOpacity={0.6}
        >
          <View style={s.logoutIcon}>
            <Ionicons name="log-out-outline" size={18} color="#FF4D4F" />
          </View>
          <Text style={s.logoutText}>Sign Out</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
        </TouchableOpacity>

        <Text style={[s.version, { color: colors.text.tertiary }]}>Dabbu v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  hero: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroBack: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(243,210,143,0.15)',
  },

  profileWrap: {
    paddingHorizontal: 20,
    marginTop: -24,
    marginBottom: 28,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#6C3EF4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  profileBody: { flex: 1, marginLeft: 14 },
  name: { fontSize: 17, fontWeight: '700' },
  email: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 5,
    marginTop: 6,
  },
  planDot: { width: 5, height: 5, borderRadius: 3 },
  planLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  chevronWrap: { marginLeft: 8 },

  section: { marginBottom: 20, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#6C3EF410',
  },
  premiumLabel: { fontSize: 10, fontWeight: '700', color: '#6C3EF4' },

  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FF4D4F12',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  logoutText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#FF4D4F' },

  version: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 24,
  },
});
