import React, { useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { usePreferences } from '../store/PreferencesContext';
import { useLens } from '../hooks/useLens';
import { lensMiddleware } from './lensMiddleware';
import { HomeNavigator } from './HomeNavigator';
import { WalletNavigator } from './WalletNavigator';
import { SpacesNavigator } from './SpacesNavigator';
import { LifeHubNavigator } from './LifeHubNavigator';
import { SettingsNavigator } from './SettingsNavigator';
import { QuickActionSheet } from '../components/ui/QuickActionSheet';
import { PRESS_SPRING } from './animations';

const Tab = createBottomTabNavigator();

const ALL_TAB_CONFIGS = [
  { name: 'HomeTab', label: 'Home', icon: 'home', activeIcon: 'home', component: HomeNavigator, lensKey: 'dashboard' },
  {
    name: 'SpacesTab',
    label: 'Spaces',
    icon: 'team',
    activeIcon: 'team',
    component: SpacesNavigator,
    lensKey: 'spaces',
  },
  {
    name: 'WalletTab',
    label: 'Wallet',
    icon: 'wallet',
    activeIcon: 'wallet',
    component: WalletNavigator,
    lensKey: 'wallet',
  },
  {
    name: 'LifeHubTab',
    label: 'LifeHub',
    icon: 'calendar',
    activeIcon: 'calendar',
    component: LifeHubNavigator,
    lensKey: 'life_hub',
  },
  {
    name: 'ProfileTab',
    label: 'Settings',
    icon: 'setting',
    activeIcon: 'setting',
    component: SettingsNavigator,
    lensKey: 'settings',
  },
];

const FALLBACK_TABS = ['HomeTab', 'WalletTab', 'LifeHubTab', 'ProfileTab'];

const TAB_HOME_SCREENS: Record<string, string> = {
  HomeTab: 'Personal',
  WalletTab: 'WalletHome',
  LifeHubTab: 'LifeHubHome',
  SpacesTab: 'SpacesDashboard',
  ProfileTab: 'SettingsMain',
};

export function MainTabNavigator() {
  const theme = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const { bottomBarVisible, quickActionVisible } = usePreferences();
  const [showActions, setShowActions] = useState(false);
  const navigation = useNavigation<any>();

  const lens = useLens();
  const { activeLens, isTabVisible, quickActions: lensQuickActions } = lens;

  const tabLabels = useMemo(() => lensMiddleware.getTabLabels(activeLens), [activeLens]);
  const tabIcons = useMemo(() => lensMiddleware.getTabIcons(activeLens), [activeLens]);

  const visibleTabs = useMemo(() => {
    const tabs = ALL_TAB_CONFIGS.filter((t) => {
      if (lensMiddleware.getBlockedScreens(activeLens).includes(t.name)) return false;
      return isTabVisible(t.lensKey);
    });

    if (tabs.length === 0) {
      return ALL_TAB_CONFIGS.filter((t) => FALLBACK_TABS.includes(t.name));
    }

    return tabs.sort((a, b) => {
      const order = lensMiddleware.getTabOrder(activeLens);
      return (order[a.name] ?? 99) - (order[b.name] ?? 99);
    });
  }, [activeLens, isTabVisible]);

  const quickActions = useMemo(() => {
    if (lensQuickActions && lensQuickActions.length > 0) {
      return lensQuickActions.map((qa: any) => {
        const tabConfig = ALL_TAB_CONFIGS.find((t) => t.lensKey === qa.screen?.toLowerCase()?.replace('tab', ''));
        const targetTab = tabConfig?.name || 'WalletTab';
        return {
          label: qa.label,
          icon: qa.icon || 'pluscircle',
          color: qa.color || colors.accent?.primary || '#7C3AED',
          onPress: () => {
            const homeScreen = TAB_HOME_SCREENS[targetTab] || 'WalletHome';
            navigation.navigate(targetTab, { screen: qa.screen || homeScreen });
          },
        };
      });
    }

    const availableKeys = lensMiddleware.getAvailableQuickActions(activeLens);
    const allActions: Record<string, any> = {
      add_expense: {
        label: 'Add Expense',
        icon: 'addusergroup',
        color: '#DC2626',
        onPress: () => navigation.navigate('WalletTab', { screen: 'AddExpense' }),
      },
      add_income: {
        label: 'Add Income',
        icon: 'caretup',
        color: '#16A34A',
        onPress: () => navigation.navigate('WalletTab', { screen: 'AddExpense', params: { type: 'income' } }),
      },
      add_shared_expense: {
        label: 'Shared Expense',
        icon: 'addusergroup',
        color: '#F43F5E',
        onPress: () => navigation.navigate('WalletTab', { screen: 'AddExpense', params: { type: 'shared' } }),
      },
      add_personal_expense: {
        label: 'Personal Expense',
        icon: 'minuscircle',
        color: '#64748B',
        onPress: () => navigation.navigate('WalletTab', { screen: 'AddExpense' }),
      },
      add_family_expense: {
        label: 'Family Expense',
        icon: 'addusergroup',
        color: '#059669',
        onPress: () => navigation.navigate('WalletTab', { screen: 'AddExpense', params: { type: 'family' } }),
      },
      add_any_expense: {
        label: 'Add Expense',
        icon: 'pluscircle',
        color: '#7C3AED',
        onPress: () => navigation.navigate('WalletTab', { screen: 'AddExpense' }),
      },
      create_goal: {
        label: 'Create Goal',
        icon: 'flag',
        color: '#F59E0B',
        onPress: () => navigation.navigate('HomeTab', { screen: 'Personal', params: { screen: 'GoalsList' } }),
      },
      create_budget: {
        label: 'Create Budget',
        icon: 'wallet',
        color: '#3B82F6',
        onPress: () => navigation.navigate('WalletTab', { screen: 'Budgets' }),
      },
      create_couple_goal: {
        label: 'Couple Goal',
        icon: 'flag',
        color: '#F59E0B',
        onPress: () => navigation.navigate('HomeTab', { screen: 'Personal', params: { screen: 'CoupleGoals' } }),
      },
      add_family_goal: {
        label: 'Family Goal',
        icon: 'flag',
        color: '#3B82F6',
        onPress: () => navigation.navigate('HomeTab', { screen: 'Personal', params: { screen: 'FamilyGoals' } }),
      },
      add_bill: {
        label: 'Add Bill',
        icon: 'filetext',
        color: '#F59E0B',
        onPress: () => navigation.navigate('WalletTab', { screen: 'AddBill' }),
      },
      allowance: {
        label: 'Allowance',
        icon: 'gift',
        color: '#8B5CF6',
        onPress: () => navigation.navigate('HomeTab', { screen: 'Personal', params: { screen: 'Allowances' } }),
      },
      settle_balance: {
        label: 'Settle',
        icon: 'swap',
        color: '#22C55E',
        onPress: () => navigation.navigate('SpacesTab', { screen: 'Settlements' }),
      },
      switch_lens: {
        label: 'Switch Lens',
        icon: 'swap',
        color: '#D97706',
        onPress: () => setShowActions(true),
      },
      cross_lens_report: {
        label: 'Reports',
        icon: 'barschart',
        color: '#22C55E',
        onPress: () => navigation.navigate('HomeTab', { screen: 'Personal', params: { screen: 'Reports' } }),
      },
    };

    const fullActions: Record<string, any> = {
      ...allActions,
      add_goal: {
        label: 'Add Goal',
        icon: 'flag',
        color: '#F59E0B',
        onPress: () => navigation.navigate('HomeTab', { screen: 'CreateGoal' }),
      },
      create_budget: {
        label: 'Create Budget',
        icon: 'wallet',
        color: '#3B82F6',
        onPress: () => navigation.navigate('WalletTab', { screen: 'Budgets' }),
      },
      pay_bill: {
        label: 'Pay Bill',
        icon: 'filetext',
        color: '#7C3AED',
        onPress: () => navigation.navigate('WalletTab', { screen: 'BillsList' }),
      },
      add_shared_income: {
        label: 'Shared Income',
        icon: 'pluscircle',
        color: '#22C55E',
        onPress: () => navigation.navigate('WalletTab', { screen: 'AddExpense', params: { type: 'shared_income' } }),
      },
      contribute_goal: {
        label: 'Contribute Goal',
        icon: 'flag',
        color: '#F59E0B',
        onPress: () => navigation.navigate('HomeTab', { screen: 'CoupleGoals' }),
      },
      plan_expense: {
        label: 'Plan Expense',
        icon: 'calendar',
        color: '#7C3AED',
        onPress: () => navigation.navigate('LifeHubTab', { screen: 'LifeHubHome' }),
      },
      add_household_expense: {
        label: 'Household Expense',
        icon: 'minuscircle',
        color: '#059669',
        onPress: () => navigation.navigate('WalletTab', { screen: 'AddExpense', params: { type: 'family' } }),
      },
      record_allowance: {
        label: 'Allowance',
        icon: 'gift',
        color: '#8B5CF6',
        onPress: () => navigation.navigate('HomeTab', { screen: 'Allowances' }),
      },
      create_reminder: {
        label: 'Reminder',
        icon: 'bells',
        color: '#22C55E',
        onPress: () => navigation.navigate('HomeTab', { screen: 'CreateReminder' }),
      },
      create_space: {
        label: 'Create Space',
        icon: 'team',
        color: '#D97706',
        onPress: () => navigation.navigate('SpacesTab', { screen: 'CreateSpace' }),
      },
      export_report: {
        label: 'Export Report',
        icon: 'barschart',
        color: '#22C55E',
        onPress: () => navigation.navigate('HomeTab', { screen: 'Reports' }),
      },
      add_investment: {
        label: 'Add Investment',
        icon: 'linechart',
        color: '#3B82F6',
        onPress: () => navigation.navigate('WalletTab', { screen: 'AddInvestment' }),
      },
    };
    return availableKeys.map((key) => fullActions[key]).filter(Boolean);
  }, [activeLens, lensQuickActions, navigation, colors]);

  const isDark = theme.isDark;

  const handleFabPress = useCallback(() => {
    setShowActions(true);
  }, []);

  const handleFabLongPress = useCallback(() => {
    setShowActions(true);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => (
          <IOSTabBar
            {...props}
            colors={colors}
            isDark={isDark}
            showCenterButton={true}
            bottomBarVisible={bottomBarVisible}
            onCenterPress={handleFabPress}
            onCenterLongPress={handleFabLongPress}
            visibleTabs={visibleTabs}
          />
        )}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: colors.accent.primary,
          tabBarInactiveTintColor: colors.text.tertiary,
          tabBarStyle: { backgroundColor: colors.bg.primary, borderTopWidth: 0, elevation: 0 },
        }}
      >
        {ALL_TAB_CONFIGS.map((tab) => {
          const iconName = tabIcons[tab.name] || tab.icon;
          const activeIconName = tabIcons[tab.name] || tab.activeIcon;
          return (
          <Tab.Screen
            key={tab.name}
            name={tab.name}
            component={tab.component}
            options={{
              tabBarLabel: tabLabels[tab.name] || tab.label,
              tabBarIcon: iconName
                ? ({ focused, color }) => (
                    <AntDesign
                      name={(focused ? activeIconName : iconName) as any}
                      size={22}
                      color={color}
                    />
                  )
                : () => null,
            }}
          />
          );
        })}
      </Tab.Navigator>

      {quickActionVisible && (
        <QuickActionSheet
          visible={showActions}
          onClose={() => setShowActions(false)}
          actions={quickActions}
        />
      )}
    </View>
  );
}

function IOSTabBar({
  state,
  descriptors,
  navigation,
  colors,
  isDark,
  showCenterButton,
  bottomBarVisible,
  onCenterPress,
  onCenterLongPress,
  visibleTabs,
}: any) {
  const insets = useSafeAreaInsets();

  if (!bottomBarVisible) {
    return null;
  }

  const scaleAnims = useRef<Record<string, Animated.Value>>({}).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabRotate = useRef(new Animated.Value(0)).current;

  function springTap(routeName: string, toValue: number) {
    if (!scaleAnims[routeName]) {
      scaleAnims[routeName] = new Animated.Value(1);
    }
    Animated.spring(scaleAnims[routeName], { toValue, ...PRESS_SPRING }).start();
  }

  function renderTab(route: any) {
    const descriptor = descriptors[route.key];
    const { options } = descriptor;
    const isFocused = state.index === state.routes.findIndex((r: any) => r.key === route.key);

    if (!scaleAnims[route.name]) {
      scaleAnims[route.name] = new Animated.Value(1);
    }

    const onPress = () => {
      springTap(route.name, 0.92);
      setTimeout(() => springTap(route.name, 1), 100);
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (event.defaultPrevented) {
        return;
      }
      const homeScreen = TAB_HOME_SCREENS[route.name];
      if (homeScreen) {
        navigation.navigate(route.name, { screen: homeScreen });
      } else {
        navigation.navigate(route.name);
      }
    };

    const focusedColor = colors.accent.primary;
    const unfocusedColor = colors.text.tertiary;
    const icon = options.tabBarIcon
      ? options.tabBarIcon({
          focused: isFocused,
          color: isFocused ? focusedColor : unfocusedColor,
          size: 22,
        })
      : null;

    return (
      <TouchableOpacity
        key={route.key}
        activeOpacity={0.7}
        style={tabStyles.tabItem}
        onPress={onPress}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnims[route.name] }] }}>
          {icon}
        </Animated.View>
        <Text
          style={[
            tabStyles.label,
            {
              color: isFocused ? focusedColor : unfocusedColor,
              fontWeight: isFocused ? '700' : '500',
            },
          ]}
        >
          {options.tabBarLabel || route.name}
        </Text>
      </TouchableOpacity>
    );
  }

  const visibleRouteNames = (visibleTabs || []).map((t: any) => t.name);
  const visibleRoutes = state.routes.filter((r: any) => visibleRouteNames.includes(r.name));
  const midIndex = Math.floor(visibleRoutes.length / 2);

  const fabRotation = fabRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View
      style={[
        tabStyles.container,
        {
          paddingBottom: insets.bottom + 4,
          backgroundColor: isDark ? 'rgba(12,12,14,0.95)' : 'rgba(245,245,248,0.95)',
        },
      ]}
    >
      <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View
        style={[
          tabStyles.outerWrapper,
          {
            backgroundColor: isDark ? 'rgba(22,22,26,0.9)' : 'rgba(255,255,255,0.9)',
            borderColor: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.12)',
            shadowColor: isDark ? '#7C3AED' : '#7C3AED',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.2 : 0.08,
            shadowRadius: 12,
            elevation: 4,
          },
        ]}
      >
        <View style={tabStyles.innerRow}>
          <View style={tabStyles.sideGroup}>
            {visibleRoutes.slice(0, midIndex).map((route: any) => renderTab(route))}
          </View>
          {showCenterButton && (
            <TouchableOpacity
              activeOpacity={0.85}
              style={tabStyles.centerFab}
              onPressIn={() => {
                Animated.spring(fabScale, { toValue: 0.88, ...PRESS_SPRING }).start();
                Animated.spring(fabRotate, {
                  toValue: 1,
                  tension: 140,
                  friction: 14,
                  useNativeDriver: true,
                }).start();
              }}
              onPressOut={() => {
                Animated.spring(fabScale, { toValue: 1, ...PRESS_SPRING }).start();
                setTimeout(
                  () =>
                    Animated.spring(fabRotate, {
                      toValue: 0,
                      tension: 140,
                      friction: 14,
                      useNativeDriver: true,
                    }).start(),
                  200,
                );
              }}
              onPress={() => onCenterPress()}
              onLongPress={onCenterLongPress}
              delayLongPress={400}
            >
              <Animated.View
                style={[
                  tabStyles.centerFabInner,
                  {
                    backgroundColor: colors.accent.primary,
                    transform: [{ scale: fabScale }, { rotate: fabRotation }],
                    shadowColor: colors.accent.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    elevation: 6,
                  },
                ]}
              >
                <AntDesign name="plus" size={26} color="#FFF" />
              </Animated.View>
            </TouchableOpacity>
          )}
          <View style={tabStyles.sideGroup}>
            {visibleRoutes.slice(midIndex).map((route: any) => renderTab(route))}
          </View>
        </View>
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: { overflow: 'hidden' },
  outerWrapper: { marginHorizontal: 12, borderRadius: 30, borderWidth: 1, minHeight: 60 },
  innerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 60 },
  sideGroup: { flex: 1, flexDirection: 'row' },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  label: { fontSize: 10, letterSpacing: 0.2, marginTop: 2 },
  centerFab: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  centerFabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const styles = StyleSheet.create({});
