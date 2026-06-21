import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { usePremium } from '../../store/PremiumContext';
import { useAppLock } from '../../store/LockContext';
import { borderRadius, shadows, PADDING } from '../../theme/design';

type GroupItem = {
  label: string;
  icon: string;
  screen: string;
  premium?: boolean;
  action?: 'lock';
};

type GroupData = {
  title: string;
  items: GroupItem[];
};

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
  'FavoriteContacts',
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
      Alert.alert('Coming Soon', `${screen} settings will be available soon`);
      return;
    }
    if (premium && !isPremium) {
      Alert.alert('Premium Feature', 'This feature is available on Premium plan.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Plans', onPress: () => navigation.navigate('SubscriptionCenter') },
      ]);
      return;
    }
    navigation.navigate(screen);
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: PADDING }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <AntDesign name="left" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[s.title, { color: colors.text.primary }]}>{group.title}</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: PADDING, paddingBottom: insets.bottom + 40 }}
      >
        <View
          style={{
            backgroundColor: colors.bg.card,
            borderRadius: borderRadius.xl,
            overflow: 'hidden',
            ...shadows.md,
          }}
        >
          {group.items.map((item, j) => (
            <TouchableOpacity
              key={j}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 15,
                paddingHorizontal: 18,
                gap: 14,
                borderBottomWidth: j < group.items.length - 1 ? 1 : 0,
                borderBottomColor: colors.border.subtle,
              }}
              onPress={() => handleNav(item.screen, item.premium, item.action)}
              activeOpacity={0.6}
            >
              <View style={[s.iconBox, { backgroundColor: `${colors.accent.primary}10` }]}>
                <AntDesign name={item.icon as any} size={18} color={colors.accent.primary} />
              </View>
              <Text
                style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.text.primary }}
              >
                {item.label}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {item.premium && !isPremium && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 3,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      backgroundColor: `${colors.accent.primary}10`,
                    }}
                  >
                    <AntDesign name="lock" size={10} color={colors.accent.primary} />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accent.primary }}>
                      Premium
                    </Text>
                  </View>
                )}
                <AntDesign name="right" size={16} color={colors.text.tertiary} />
              </View>
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
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
