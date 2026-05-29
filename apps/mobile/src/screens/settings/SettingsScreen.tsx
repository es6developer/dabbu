import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../store/AuthContext';
import { useAppLock } from '../../store/LockContext';
import { useTheme } from '../../theme';
import { api, setAccessToken, getAccessToken } from '../../services/api';

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
      { label: 'Subscription', icon: 'diamond', screen: 'Subscription' },
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
      { label: 'Currency', icon: 'cash', screen: 'Currency' },
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

const ROW_ICON_MAP: Record<string, { gradient: [string, string]; icon: IconName }> = {
  Profile: { gradient: ['#6366F1', '#8B5CF6'], icon: 'person' },
  Subscription: { gradient: ['#F59E0B', '#F97316'], icon: 'diamond' },
  Security: { gradient: ['#10B981', '#059669'], icon: 'shield-checkmark' },
  'Lock App': { gradient: ['#EF4444', '#DC2626'], icon: 'lock-closed' },
  'Reports & Analytics': { gradient: ['#8B5CF6', '#6D28D9'], icon: 'stats-chart' },
  Theme: { gradient: ['#EC4899', '#DB2777'], icon: 'color-palette' },
  Currency: { gradient: ['#06B6D4', '#0891B2'], icon: 'cash' },
  'Help Center': { gradient: ['#6366F1', '#4F46E5'], icon: 'help-circle' },
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
      const res = await api.get<any>('/subscription/current');
      setSubscription(res.data);
    } catch (_e) {
      setSubscription(null);
    }
  }

  const isPremium = Number(subscription?.plan?.price || 0) > 0;

  const handleNav = (screen: string, premium?: boolean, action?: 'lock') => {
    if (action === 'lock') {
      lockApp();
      return;
    }
    const registered = ['Profile', 'Subscription', 'Security', 'Theme', 'Currency', 'Help', 'Contact', 'Privacy', 'Analytics'];
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
        ]
      );
      return;
    }
    navigation.navigate(screen);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Settings</Text>
              <Text style={[styles.headerSub, { color: colors.text.tertiary }]}>Personalise your experience</Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleNav('Profile')}
          style={styles.profileWrap}
        >
          <LinearGradient
            colors={isDark ? ['rgba(99,102,241,0.2)', 'rgba(139,92,246,0.08)'] : ['rgba(99,102,241,0.12)', 'rgba(139,92,246,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.profileCard, { borderColor: isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.15)' }]}
          >
            <View style={styles.profileLeft}>
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{user?.firstName?.[0] || 'U'}</Text>
              </LinearGradient>
              <View style={styles.profileInfo}>
                <Text style={[styles.name, { color: colors.text.primary }]}>
                  {user?.firstName || 'User'} {user?.lastName || ''}
                </Text>
                <Text style={[styles.email, { color: colors.text.tertiary }]} numberOfLines={1}>{user?.email || ''}</Text>
                <View style={[styles.planBadge, { backgroundColor: isPremium ? `${colors.accent.primary}18` : `${colors.text.tertiary}18` }]}>
                  <View style={[styles.planDot, { backgroundColor: isPremium ? colors.accent.primary : colors.text.tertiary }]} />
                  <Text style={[styles.planLabel, { color: isPremium ? colors.accent.primary : colors.text.tertiary }]}>
                    {isPremium ? 'Premium Plan' : 'Free Plan'}
                  </Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text.disabled} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Sections */}
        {SECTIONS.map((section, i) => (
          <View key={i} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.disabled }]}>{section.title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              {section.items.map((item, j) => {
                const iconStyle = ROW_ICON_MAP[item.label];
                return (
                  <TouchableOpacity
                    key={j}
                    style={[
                      styles.row,
                      j < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
                    ]}
                    onPress={() => handleNav(item.screen, item.premium, item.action)}
                    activeOpacity={0.5}
                  >
                    <LinearGradient
                      colors={iconStyle?.gradient || ['#6366F1', '#8B5CF6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.rowIcon}
                    >
                      <Ionicons name={iconStyle?.icon as any || item.icon} size={16} color="#fff" />
                    </LinearGradient>
                    <Text style={[styles.rowLabel, { color: colors.text.primary }]}>{item.label}</Text>
                    <View style={styles.rowRight}>
                      {item.premium && !isPremium && (
                        <View style={[styles.premiumBadge, { backgroundColor: colors.accent.primary + '15' }]}>
                          <Ionicons name="lock-closed" size={9} color={colors.accent.primary} />
                          <Text style={[styles.premiumLabel, { color: colors.accent.primary }]}>Premium</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={15} color={colors.text.disabled} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutRow, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
          onPress={() => {
            Alert.alert('Logout', 'Are you sure you want to logout?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Logout', style: 'destructive', onPress: () => { logout().catch(() => {}); } },
            ]);
          }}
          activeOpacity={0.5}
        >
          <View style={[styles.logoutIcon, { backgroundColor: colors.status.error + '15' }]}>
            <Ionicons name="log-out-outline" size={18} color={colors.status.error} />
          </View>
          <Text style={[styles.logoutText, { color: colors.status.error }]}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={[styles.version, { color: colors.text.disabled }]}>Dabbu v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: { paddingHorizontal: 20, paddingBottom: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  headerSub: { fontSize: 14, marginTop: 2, fontWeight: '500' },
  closeBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },

  profileWrap: { marginHorizontal: 16, marginTop: 20, marginBottom: 28 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  profileLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileInfo: { marginLeft: 14, flex: 1 },
  name: { fontSize: 17, fontWeight: '700' },
  email: { fontSize: 12, marginTop: 1 },
  planBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, gap: 5, marginTop: 5 },
  planDot: { width: 5, height: 5, borderRadius: 3 },
  planLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  section: { marginBottom: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  rowIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  premiumLabel: { fontSize: 10, fontWeight: '700' },

  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  logoutIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  logoutText: { fontSize: 15, fontWeight: '600' },

  version: { textAlign: 'center', fontSize: 12, marginTop: 24, fontWeight: '500' },
});