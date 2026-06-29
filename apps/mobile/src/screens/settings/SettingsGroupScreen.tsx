import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { usePremium } from '../../store/PremiumContext';
import { useAppLock } from '../../store/LockContext';
import { borderRadius, PADDING } from '../../theme/design';

import { alertService } from '../../components/ui';
type GroupItem = {
  label: string;
  icon: string;
  screen: string;
  premium?: boolean;
  action?: 'lock';
};
type GroupData = { title: string; items: GroupItem[] };

const REGISTERED_SCREENS = [
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

export function SettingsGroupScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isPremium } = usePremium();
  const { lockApp } = useAppLock();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  let group: GroupData = { title: '', items: [] };
  try {
    group = JSON.parse(route.params?.group || '{}');
  } catch {
    group = { title: 'Settings', items: [] };
  }

  const handleNav = (screen: string, premium?: boolean, action?: 'lock') => {
    if (action === 'lock') {
      lockApp();
      return;
    }
    if (!REGISTERED_SCREENS.includes(screen)) {
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
      BudgetsList: { tab: 'HomeTab', screen: 'BudgetsList' },
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

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: PADDING }}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[s.backBtn, { backgroundColor: colors.bg.tertiary }]}
          >
            <AntDesign name="left" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[s.title, { color: colors.text.primary }]}>{group.title}</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: PADDING, paddingBottom: insets.bottom + 40 }}
      >
        <View style={[s.card, { backgroundColor: colors.bg.card }]}>
          {group.items.map((item, j) => (
            <TouchableOpacity
              key={j}
              style={[
                s.row,
                j < group.items.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border.subtle,
                },
              ]}
              onPress={() => handleNav(item.screen, item.premium, item.action)}
              activeOpacity={0.55}
            >
              <View style={[s.iconBox, { backgroundColor: `${colors.accent.primary}0F` }]}>
                <AntDesign name={item.icon as any} size={16} color={colors.accent.primary} />
              </View>
              <Text style={[s.label, { color: colors.text.primary }]}>{item.label}</Text>
              {item.premium && !isPremium && (
                <View style={[s.badge, { backgroundColor: `${colors.accent.primary}10` }]}>
                  <Text style={[s.badgeText, { color: colors.accent.primary }]}>Pro</Text>
                </View>
              )}
              <AntDesign name="right" size={14} color={colors.text.tertiary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  card: { borderRadius: borderRadius['2xl'], overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 15, fontWeight: '600' },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, marginRight: 4 },
  badgeText: { fontSize: 9, fontWeight: '800' },
});
