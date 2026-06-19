import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { DashboardRouterScreen } from '../screens/dashboard/DashboardRouterScreen';
import { NotificationsScreen } from '../screens/home/NotificationsScreen';
import { NotificationCenterScreen } from '../screens/home/NotificationCenterScreen';
import { GoalsListScreen } from '../screens/goals/GoalsListScreen';
import { GoalDetailScreen } from '../screens/goals/GoalDetailScreen';
import { NetWorthScreen } from '../screens/home/NetWorthScreen';
import { HealthScoreScreen } from '../screens/health/HealthScoreScreen';
import { EmergencyFundScreen } from '../screens/savings/EmergencyFundScreen';
import { FinancialCenterScreen } from '../screens/finance/FinancialCenterScreen';
import { DabbuAIScreen } from '../screens/ai/DabbuAIScreen';
import { DocumentVaultScreen } from '../screens/documents/DocumentVaultScreen';
import { DocumentDetailScreen } from '../screens/documents/DocumentDetailScreen';
import { BadgeWallScreen } from '../screens/documents/BadgeWallScreen';
import { StreaksScreen } from '../screens/home/StreaksScreen';
import { GlobalSearchScreen } from '../screens/home/GlobalSearchScreen';
import { SpaceDetailScreen } from '../screens/spaces/SpaceDetailScreen';
import { CreateSpaceScreen } from '../screens/spaces/CreateSpaceScreen';
import { SpacesDashboardScreen as SpacesListScreen } from '../screens/spaces/SpacesDashboardScreen';
import { YearlySummaryScreen } from '../screens/home/YearlySummaryScreen';
import { HousePlannerScreen } from '../screens/lifehub/HousePlannerScreen';
import { BabyPlannerScreen } from '../screens/lifehub/BabyPlannerScreen';
import { RetirementPlannerScreen } from '../screens/lifehub/RetirementPlannerScreen';
import { InvestmentPlannerScreen } from '../screens/lifehub/InvestmentPlannerScreen';
import { WalletNavigator } from './WalletNavigator';
import { CoupleSpaceNavigator } from './CoupleSpaceNavigator';
import { FamilySpaceNavigator } from './FamilySpaceNavigator';
import { FamilyHubNavigator } from './FamilyHubNavigator';
import { SettingsNavigator } from './SettingsNavigator';
import { useTheme } from '../theme';
import { useAuth } from '../store/AuthContext';
import { usePreferences } from '../store/PreferencesContext';
import { useCoupleMode, COUPLE_COLORS } from '../hooks/useCoupleMode';
import { QuickActionSheet } from '../components/ui/QuickActionSheet';
import { iosTransitionOptions } from './animations';

const Tab = createBottomTabNavigator();
const DashboardStack = createNativeStackNavigator();

function DashboardNavigator() {
  const theme = useTheme();
  return (
    <DashboardStack.Navigator screenOptions={iosTransitionOptions(theme)}>
      <DashboardStack.Screen name="DashboardMain" component={DashboardRouterScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="NotificationCenter" component={NotificationCenterScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="GoalsList" component={GoalsListScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="GoalDetail" component={GoalDetailScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="NetWorth" component={NetWorthScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="HealthScore" component={HealthScoreScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="EmergencyFund" component={EmergencyFundScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="FinancialCenter" component={FinancialCenterScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="DabbuAI" component={DabbuAIScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="DocumentVault" component={DocumentVaultScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="DocumentDetail" component={DocumentDetailScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="BadgeWall" component={BadgeWallScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="Streaks" component={StreaksScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="YearlySummary" component={YearlySummaryScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="GlobalSearch" component={GlobalSearchScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="SpaceDetail" component={SpaceDetailScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="CreateSpace" component={CreateSpaceScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="SpacesDashboard" component={SpacesListScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="HousePlanner" component={HousePlannerScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="BabyPlanner" component={BabyPlannerScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="RetirementPlanner" component={RetirementPlannerScreen} options={{ headerShown: false }} />
      <DashboardStack.Screen name="InvestmentPlanner" component={InvestmentPlannerScreen} options={{ headerShown: false }} />
    </DashboardStack.Navigator>
  );
}

const TAB_CONFIG = [
  { name: 'Dashboard', label: 'Home', icon: 'home', activeIcon: 'home', component: DashboardNavigator },
  { name: 'Couple', label: 'Couple', icon: 'hearto', activeIcon: 'heart', component: CoupleSpaceNavigator },
  { name: 'Wallet', label: 'Wallet', icon: 'wallet', activeIcon: 'wallet', component: WalletNavigator },
  { name: 'Family', label: 'Family', icon: 'team', activeIcon: 'team', component: FamilySpaceNavigator },
  { name: 'Settings', label: 'Profile', icon: 'user', activeIcon: 'user', component: SettingsNavigator },
];

export function MainTabNavigator() {
  const theme = useTheme();
  const { colors } = theme;
  const { user, accessToken } = useAuth();
  const { getTabVisibility, bottomBarVisible, quickActionVisible } = usePreferences();
  const { showCoupleFeatures, isInCouple } = useCoupleMode();
  const [showActions, setShowActions] = useState(false);
  const navigation = useNavigation<any>();

  const qaVisible = getTabVisibility('QuickAction');

  const quickActions = [
    { label: 'Add Expense', icon: 'addusergroup', color: '#DC2626', onPress: () => navigation.navigate('Wallet', { screen: 'AddExpense' }) },
    { label: 'Add Income', icon: 'caretup', color: '#16A34A', onPress: () => navigation.navigate('Wallet', { screen: 'AddExpense', params: { type: 'income' } }) },
    { label: 'Create Goal', icon: 'flag', color: '#F59E0B', onPress: () => navigation.navigate('Dashboard', { screen: 'GoalsList' }) },
    { label: 'Net Worth', icon: 'barschart', color: '#7C3AED', onPress: () => navigation.navigate('Dashboard', { screen: 'NetWorth' }) },
    { label: 'Scan Bill', icon: 'camerao', color: '#14B8A6', onPress: () => navigation.navigate('Wallet', { screen: 'BillScanner' }) },
  ];

  const isDark = theme.isDark;

  return (
    <View style={{ flex: 1 }}>
      {showCoupleFeatures && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <AntDesign key={i} name="hearto" size={24 + i * 8} color={`${COUPLE_COLORS.heart}08`}
              style={{ position: 'absolute', top: 60 + (i % 3) * 120, left: 20 + (i % 2) * (i * 30 + 40), transform: [{ rotate: `${i * 15}deg` }] }} />
          ))}
        </View>
      )}
      <Tab.Navigator
        tabBar={(props) => (
          <IOSTabBar {...props} colors={colors} isDark={isDark}
            showCenterButton={qaVisible && quickActionVisible}
            bottomBarVisible={bottomBarVisible} onCenterPress={() => setShowActions(true)} />
        )}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: colors.accent.primary,
          tabBarInactiveTintColor: colors.text.tertiary,
          tabBarStyle: { backgroundColor: colors.bg.primary, borderTopWidth: 0, elevation: 0 },
        }}
      >
        {TAB_CONFIG.map((tab) => (
          <Tab.Screen
            key={tab.name}
            name={tab.name}
            component={tab.component}
            options={{
              tabBarLabel: tab.label,
              tabBarIcon: ({ focused, color }) => (
                <AntDesign name={(focused ? tab.activeIcon : tab.icon) as any} size={22} color={color} />
              ),
            }}
          />
        ))}
      </Tab.Navigator>
      {quickActionVisible && (
        <QuickActionSheet visible={showActions} onClose={() => setShowActions(false)} actions={quickActions} />
      )}
    </View>
  );
}

function IOSTabBar({ state, descriptors, navigation, colors, isDark, showCenterButton, bottomBarVisible, onCenterPress }: any) {
  if (!bottomBarVisible) {return null;}

  const scaleAnims = useRef<Record<string, Animated.Value>>({}).current;
  const fabScale = useRef(new Animated.Value(1)).current;

  const { getTabVisibility } = usePreferences();

  function springTap(routeName: string, toValue: number) {
    if (!scaleAnims[routeName]) {scaleAnims[routeName] = new Animated.Value(1);}
    Animated.spring(scaleAnims[routeName], { toValue, tension: 120, friction: 8, useNativeDriver: true }).start();
  }

  function renderTab(route: any) {
    const descriptor = descriptors[route.key];
    const { options } = descriptor;
    const isFocused = state.index === state.routes.findIndex((r: any) => r.key === route.key);

    if (!scaleAnims[route.name]) {scaleAnims[route.name] = new Animated.Value(1);}

    const onPress = () => {
      springTap(route.name, 0.92);
      setTimeout(() => springTap(route.name, 1), 100);
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (event.defaultPrevented) {return;}
      const homeScreens: Record<string, string> = {
        Dashboard: 'DashboardMain',
        Couple: 'CoupleOverview',
        Wallet: 'WalletHome',
        Family: 'FamilyOverview',
        Settings: 'SettingsMain',
      };
      navigation.navigate(route.name, { screen: homeScreens[route.name] || route.name });
    };

    const focusedColor = showCenterButton ? colors.accent.primary : colors.accent.primary;
    const unfocusedColor = colors.text.tertiary;
    const icon = options.tabBarIcon ? options.tabBarIcon({ focused: isFocused, color: isFocused ? focusedColor : unfocusedColor, size: 22 }) : null;

    return (
      <TouchableOpacity key={route.key} activeOpacity={0.7} style={tabStyles.tabItem} onPress={onPress}>
        <Animated.View style={{ transform: [{ scale: scaleAnims[route.name] }] }}>{icon}</Animated.View>
        <Text style={[tabStyles.label, { color: isFocused ? focusedColor : unfocusedColor, fontWeight: isFocused ? '600' : '400' }]}>
          {options.tabBarLabel || route.name}
        </Text>
      </TouchableOpacity>
    );
  }

  const midIndex = Math.floor(state.routes.length / 2);

  return (
    <View style={[tabStyles.container, { backgroundColor: isDark ? 'rgba(17,17,17,0.92)' : 'rgba(248,248,250,0.92)' }]}>
      <BlurView intensity={Platform.OS === 'ios' ? 80 : 50} tint={isDark ? 'dark' : 'light'} style={tabStyles.blurWrap}>
        <View style={[tabStyles.outerWrapper, {
          backgroundColor: isDark ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.85)',
          borderColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.1)',
          shadowColor: colors.accent.primary,
        }]}>
          <View style={tabStyles.innerRow}>
            {state.routes.slice(0, midIndex).map((route: any) => renderTab(route))}
            {showCenterButton && (
              <TouchableOpacity activeOpacity={0.85} style={tabStyles.centerFab}
                onPressIn={() => Animated.spring(fabScale, { toValue: 0.9, tension: 120, friction: 8, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(fabScale, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }).start()}
                onPress={onCenterPress}>
                <Animated.View style={[tabStyles.centerFabInner, { backgroundColor: colors.accent.primary, transform: [{ scale: fabScale }], shadowColor: colors.accent.primary }]}>
                  <AntDesign name="plus" size={26} color="#FFF" />
                </Animated.View>
              </TouchableOpacity>
            )}
            {state.routes.slice(midIndex).map((route: any) => renderTab(route))}
          </View>
        </View>
      </BlurView>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: { paddingBottom: Platform.OS === 'android' ? 0 : 5, overflow: 'hidden' },
  blurWrap: { paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
  outerWrapper: { marginHorizontal: 12, borderRadius: 26, borderWidth: 1, minHeight: 56, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  innerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', minHeight: 56 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10, letterSpacing: 0.1, marginTop: 2 },
  centerFab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerFabInner: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
