import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Keyboard,
  Platform,
} from 'react-native';
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
import { FamilyMembersNavigator } from './FamilyMembersNavigator';
import { PartnerNavigator } from './PartnerNavigator';
import { SettingsNavigator } from './SettingsNavigator';
import { QuickActionSheet } from '../components/ui/QuickActionSheet';
import { PRESS_SPRING, TAB_SPRING } from './animations';

const Tab = createBottomTabNavigator();

const ALL_TAB_CONFIGS = [
  {
    name: 'HomeTab',
    label: 'Home',
    icon: 'home',
    activeIcon: 'home',
    component: HomeNavigator,
    lensKey: 'dashboard',
  },
  {
    name: 'PartnerTab',
    label: 'Partner',
    icon: 'addusergroup',
    activeIcon: 'addusergroup',
    component: PartnerNavigator,
    lensKey: 'partner',
  },
  {
    name: 'FamilyMembersTab',
    label: 'Family',
    icon: 'team',
    activeIcon: 'team',
    component: FamilyMembersNavigator,
    lensKey: 'family_members',
  },
  {
    name: 'SpacesTab',
    label: 'Spaces',
    icon: 'appstore-o',
    activeIcon: 'appstore-o',
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

const FALLBACK_TABS = ['HomeTab', 'WalletTab', 'LifeHubTab'];

const TAB_HOME_SCREENS: Record<string, string> = {
  HomeTab: 'LifeDashboard',
  WalletTab: 'WalletHome',
  LifeHubTab: 'LifeHubHome',
  SpacesTab: 'SpacesDashboard',
};

const SCREEN_TAB_MAP: Record<string, string> = {
  InvestmentPlanner: 'LifeHubTab',
  HousePlanner: 'LifeHubTab',
  BabyPlanner: 'LifeHubTab',
  RetirementPlanner: 'LifeHubTab',
  CarPlanner: 'LifeHubTab',
  EducationPlanner: 'LifeHubTab',
  VacationPlanner: 'LifeHubTab',
  WeddingPlanner: 'LifeHubTab',
  LifeHubHome: 'LifeHubTab',
  GoalsList: 'HomeTab',
  CoupleBudgets: 'HomeTab',
  CoupleGoals: 'HomeTab',
  NetWorth: 'HomeTab',
  CreateFamilyWorkspace: 'HomeTab',
  LifeDashboard: 'HomeTab',
  AddExpense: 'WalletTab',
  BillsList: 'WalletTab',
  Analytics: 'WalletTab',
  WalletHome: 'WalletTab',
  SpacesDashboard: 'SpacesTab',
  Settlement: 'SpacesTab',
  CreateSharedGroup: 'SpacesTab',
  FamilyMembersHome: 'FamilyMembersTab',
  PartnerHome: 'PartnerTab',
  SettingsMain: 'ProfileTab',
  FamilyHub: 'HomeTab',
  CouplePlanner: 'HomeTab',
  CoupleFinance: 'HomeTab',
  Settlements: 'HomeTab',
  CoupleSettings: 'HomeTab',
  Expenses: 'HomeTab',
  Income: 'HomeTab',
};

export function MainTabNavigator() {
  const theme = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const { bottomBarVisible, quickActionVisible } = usePreferences();
  const [showActions, setShowActions] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const navigation = useNavigation<any>();

  const [tabIndex, setTabIndex] = useState(0);
  const prevTabIndexRef = useRef(0);
  const tabContentAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (prevTabIndexRef.current !== tabIndex) {
      prevTabIndexRef.current = tabIndex;
      tabContentAnim.setValue(0.94);
      Animated.spring(tabContentAnim, { toValue: 1, ...TAB_SPRING }).start();
    }
  }, [tabIndex]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      },
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const lens = useLens();
  const { activeLens, isTabVisible, quickActions: lensQuickActions } = lens;

  const tabLabels = useMemo(() => lensMiddleware.getTabLabels(activeLens), [activeLens]);
  const tabIcons = useMemo(() => lensMiddleware.getTabIcons(activeLens), [activeLens]);

  const visibleTabs = useMemo(() => {
    const visibleTabNames = lensMiddleware.getVisibleTabs(activeLens);
    const tabs = ALL_TAB_CONFIGS.filter((t) => {
      if (t.name === 'ProfileTab') {
        return false;
      }
      if (lensMiddleware.getBlockedScreens(activeLens).includes(t.name)) {
        return false;
      }
      return visibleTabNames.includes(t.name);
    });

    if (tabs.length === 0) {
      return ALL_TAB_CONFIGS.filter((t) => FALLBACK_TABS.includes(t.name));
    }

    return tabs.sort((a, b) => {
      const order = lensMiddleware.getTabOrder(activeLens);
      return (order[a.name] ?? 99) - (order[b.name] ?? 99);
    });
  }, [activeLens]);

  const quickActions = useMemo(() => {
    if (
      lensQuickActions &&
      lensQuickActions.length > 0 &&
      lensQuickActions.some((qa: any) => qa.screen)
    ) {
      return lensQuickActions.map((qa: any) => {
        let targetTab = ALL_TAB_CONFIGS.find((t) => t.name === qa.screen)?.name;
        if (!targetTab) {
          const tabConfig = ALL_TAB_CONFIGS.find(
            (t) => t.lensKey === qa.screen?.toLowerCase()?.replace('tab', ''),
          );
          targetTab = tabConfig?.name;
        }
        if (!targetTab) {
          targetTab = SCREEN_TAB_MAP[qa.screen];
        }
        const finalTab = targetTab || 'LifeHubTab';
        const homeScreen = TAB_HOME_SCREENS[finalTab] || 'LifeHubHome';
        return {
          label: qa.label,
          icon: qa.icon || 'pluscircle',
          color: qa.color || colors.accent?.primary || colors.brand?.primary || '#7C3AED',
          onPress: () => {
            navigation.navigate(finalTab, { screen: qa.screen || homeScreen });
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
        onPress: () =>
          navigation.navigate('WalletTab', { screen: 'AddExpense', params: { type: 'income' } }),
      },
      add_shared_expense: {
        label: 'Shared Expense',
        icon: 'addusergroup',
        color: '#F43F5E',
        onPress: () =>
          navigation.navigate('WalletTab', { screen: 'AddExpense', params: { type: 'expense' } }),
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
        onPress: () =>
          navigation.navigate('WalletTab', { screen: 'AddExpense', params: { type: 'expense' } }),
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
        onPress: () => navigation.navigate('HomeTab', { screen: 'GoalsList', params: { openCreate: true } }),
      },
      create_budget: {
        label: 'Create Budget',
        icon: 'wallet',
        color: '#3B82F6',
        onPress: () => navigation.navigate('HomeTab', { screen: 'CreateBudget' }),
      },
      create_couple_goal: {
        label: 'Couple Goal',
        icon: 'flag',
        color: '#F59E0B',
        onPress: () => navigation.navigate('HomeTab', { screen: 'CoupleGoals' }),
      },
      add_family_goal: {
        label: 'Family Goal',
        icon: 'flag',
        color: '#3B82F6',
        onPress: () => navigation.navigate('HomeTab', { screen: 'GoalsList' }),
      },
      add_bill: {
        label: 'Add Bill',
        icon: 'filetext1',
        color: '#F59E0B',
        onPress: () => navigation.navigate('WalletTab', { screen: 'BillsList' }),
      },
      allowance: {
        label: 'Allowance',
        icon: 'gift',
        color: '#8B5CF6',
        onPress: () => navigation.navigate('SpacesTab', { screen: 'SpacesDashboard' }),
      },
      settle_balance: {
        label: 'Settle',
        icon: 'swap',
        color: '#22C55E',
        onPress: () => navigation.navigate('SpacesTab', { screen: 'Settlement' }),
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
        onPress: () => navigation.navigate('WalletTab', { screen: 'Analytics' }),
      },
    };

    const fullActions: Record<string, any> = {
      ...allActions,
      add_goal: {
        label: 'Add Goal',
        icon: 'flag',
        color: '#F59E0B',
        onPress: () => navigation.navigate('HomeTab', { screen: 'GoalsList', params: { openCreate: true } }),
      },
      create_budget: {
        label: 'Create Budget',
        icon: 'wallet',
        color: '#3B82F6',
        onPress: () => navigation.navigate('HomeTab', { screen: 'CreateBudget' }),
      },
      pay_bill: {
        label: 'Pay Bill',
        icon: 'filetext1',
        color: '#7C3AED',
        onPress: () => navigation.navigate('WalletTab', { screen: 'BillsList' }),
      },
      add_shared_income: {
        label: 'Shared Income',
        icon: 'pluscircle',
        color: '#22C55E',
        onPress: () =>
          navigation.navigate('WalletTab', {
            screen: 'AddExpense',
            params: { type: 'income' },
          }),
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
        onPress: () =>
          navigation.navigate('WalletTab', { screen: 'AddExpense', params: { type: 'expense' } }),
      },
      record_allowance: {
        label: 'Allowance',
        icon: 'gift',
        color: '#8B5CF6',
        onPress: () => navigation.navigate('SpacesTab', { screen: 'SpacesDashboard' }),
      },
      create_reminder: {
        label: 'Reminder',
        icon: 'bells',
        color: '#22C55E',
        onPress: () => navigation.navigate('SpacesTab', { screen: 'SpacesDashboard' }),
      },
      create_space: {
        label: 'Create Space',
        icon: 'team',
        color: '#D97706',
        onPress: () => navigation.navigate('HomeTab', { screen: 'CreateFamilyWorkspace' }),
      },
      export_report: {
        label: 'Export Report',
        icon: 'barschart',
        color: '#22C55E',
        onPress: () => navigation.navigate('WalletTab', { screen: 'Analytics' }),
      },
      add_investment: {
        label: 'Add Investment',
        icon: 'linechart',
        color: '#3B82F6',
        onPress: () => navigation.navigate('LifeHubTab', { screen: 'InvestmentPlanner' }),
      },
      add_family_member: {
        label: 'Family Members',
        icon: 'addusergroup',
        color: '#059669',
        onPress: () => navigation.navigate('FamilyMembersTab', { screen: 'FamilyMembersHome' }),
      },
      add_timeline_event: {
        label: 'Add Timeline Event',
        icon: 'clockcircleo',
        color: '#F43F5E',
        onPress: () => navigation.navigate('PartnerTab', { screen: 'PartnerHome' }),
      },
    };
    return availableKeys.map((key) => fullActions[key]).filter(Boolean);
  }, [activeLens, lensQuickActions, navigation, colors]);

  const isDark = theme.isDark;
  const showFab = quickActionVisible;

  const handleFabPress = useCallback(() => {
    setShowActions(true);
  }, []);

  const handleFabLongPress = useCallback(() => {
    setShowActions(true);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[{ flex: 1 }, { opacity: tabContentAnim }]}>
        <Tab.Navigator
          tabBar={(props) => {
            setTabIndex(props.state.index);
            return (
              <IOSTabBar
                {...props}
                colors={colors}
                isDark={isDark}
                showCenterButton={showFab}
                bottomBarVisible={bottomBarVisible}
                keyboardVisible={keyboardVisible}
                onCenterPress={handleFabPress}
                onCenterLongPress={handleFabLongPress}
                visibleTabs={visibleTabs}
                activeLens={activeLens}
              />
            );
          }}
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
size={20}
                          color={color}
                        />
                      )
                    : () => null,
                }}
              />
            );
          })}
        </Tab.Navigator>
      </Animated.View>

      {quickActions.length > 0 && (
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
  keyboardVisible,
  onCenterPress,
  onCenterLongPress,
  visibleTabs,
  activeLens,
}: any) {
  const insets = useSafeAreaInsets();
  const keyboardAnim = useRef(new Animated.Value(0)).current;

  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const bubbleLeft = useRef(new Animated.Value(0)).current;
  const bubbleWidth = useRef(new Animated.Value(0)).current;
  const firstMeasureRef = useRef(false);
  const prevTabIndex = useRef(state.index);

  useEffect(() => {
    Animated.spring(keyboardAnim, {
      toValue: keyboardVisible ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [keyboardVisible, keyboardAnim]);

  const visibleRouteNames = useMemo(() => (visibleTabs || []).map((t: any) => t.name), [visibleTabs]);
  const visibleRoutes = useMemo(
    () => state.routes.filter((r: any) => visibleRouteNames.includes(r.name)),
    [state.routes, visibleRouteNames],
  );

  useEffect(() => {
    if (prevTabIndex.current === state.index) return;
    prevTabIndex.current = state.index;
    const activeRoute = state.routes[state.index];
    if (activeRoute && tabLayouts.current[activeRoute.name]) {
      const { x, width } = tabLayouts.current[activeRoute.name];
      Animated.spring(bubbleLeft, {
        toValue: x,
        tension: 200,
        friction: 22,
        useNativeDriver: false,
      }).start();
      Animated.spring(bubbleWidth, {
        toValue: width,
        tension: 200,
        friction: 22,
        useNativeDriver: false,
      }).start();
    }
  }, [state.index, visibleRouteNames]);

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
      springTap(route.name, 0.9);
      setTimeout(() => springTap(route.name, 1), 100);
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (event.defaultPrevented) {
        return;
      }
      const homeScreen = activeLens
        ? lensMiddleware.getTabHomeScreen(activeLens, route.name)
        : TAB_HOME_SCREENS[route.name];
      if (homeScreen) {
        navigation.navigate(route.name, { screen: homeScreen });
      } else {
        navigation.navigate(route.name);
      }
    };

    const iconColor = isFocused ? '#FFFFFF' : colors.text.tertiary;
    const labelColor = isFocused ? '#FFFFFF' : colors.text.tertiary;

    const icon = options.tabBarIcon
      ? options.tabBarIcon({ focused: isFocused, color: iconColor, size: 20 })
      : null;

    return (
      <TouchableOpacity
        key={route.key}
        activeOpacity={0.7}
        style={tabStyles.tabOuter}
        onPress={onPress}
        onLayout={(e) => {
          const { x, width } = e.nativeEvent.layout;
          tabLayouts.current[route.name] = { x, width };
          if (!firstMeasureRef.current) {
            firstMeasureRef.current = true;
            bubbleLeft.setValue(x);
            bubbleWidth.setValue(width);
          }
        }}
      >
        <Animated.View
          style={[
            tabStyles.tabPill,
            { transform: [{ scale: scaleAnims[route.name] }] },
          ]}
        >
          {icon}
          <Text
            style={[tabStyles.pillLabel, { color: labelColor }]}
            numberOfLines={1}
          >
            {options.tabBarLabel || route.name}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  const fabRotation = fabRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const tabBarTranslate = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });

  return (
    <Animated.View
      style={[
        tabStyles.container,
        {
          paddingBottom: insets.bottom + 8,
          paddingTop: 6,
          backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(240,240,245,0.85)',
          transform: [{ translateY: tabBarTranslate }],
        },
      ]}
    >
      <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[tabStyles.pillsRow, { paddingHorizontal: Math.max(insets.left, insets.right, 14) }]}>
        <Animated.View
          style={[
            tabStyles.bubble,
            {
              backgroundColor: colors.accent.primary,
              shadowColor: '#000',
              left: bubbleLeft,
              width: bubbleWidth,
            },
          ]}
        />
        {visibleRoutes.map((route: any) => renderTab(route))}
        {showCenterButton && (
          <TouchableOpacity
            activeOpacity={0.85}
            style={tabStyles.fabOuter}
            onPressIn={() => {
              Animated.spring(fabScale, { toValue: 0.85, ...PRESS_SPRING }).start();
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
                tabStyles.fabPill,
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
              <AntDesign name="plus" size={22} color="#FFF" />
            </Animated.View>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    gap: 6,
  },
  tabOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPill: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 36,
    gap: 2,
    minWidth: 56,
  },
  pillLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  bubble: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 36,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  fabOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPill: {
    width: 44,
    height: 44,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const styles = StyleSheet.create({});
