import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeNavigator } from './HomeNavigator';
import { WalletNavigator } from './WalletNavigator';
import { SpacesNavigator } from './SpacesNavigator';
import { LifeHubNavigator } from './LifeHubNavigator';
import { SettingsNavigator } from './SettingsNavigator';
import { useTheme } from '../theme';
import { usePreferences } from '../store/PreferencesContext';
import { QuickActionSheet } from '../components/ui/QuickActionSheet';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = [
  { name: 'HomeTab', label: 'Home', icon: 'home', activeIcon: 'home', component: HomeNavigator },
  { name: 'WalletTab', label: 'Wallet', icon: 'wallet', activeIcon: 'wallet', component: WalletNavigator },
  { name: 'LifeHubTab', label: 'LifeHub', icon: 'calendar', activeIcon: 'calendar', component: LifeHubNavigator },
  { name: 'SpacesTab', label: 'Spaces', icon: 'team', activeIcon: 'team', component: SpacesNavigator },
  { name: 'ProfileTab', label: 'Profile', icon: 'user', activeIcon: 'user', component: SettingsNavigator },
];

const HIDDEN_TABS: { name: string; label?: string; icon?: string; activeIcon?: string; component: React.ComponentType<any> }[] = [
  { name: 'ProfileTab', component: SettingsNavigator },
];

export function MainTabNavigator() {
  const theme = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const { bottomBarVisible, quickActionVisible } = usePreferences();
  const [showActions, setShowActions] = useState(false);
  const navigation = useNavigation<any>();

  const quickActions = [
    { label: 'Life Dashboard', icon: 'home', color: '#8B5CF6', onPress: () => navigation.navigate('HomeTab', { screen: 'Personal', params: { screen: 'LifeDashboard' } }) },
    { label: 'Add Expense', icon: 'addusergroup', color: '#DC2626', onPress: () => navigation.navigate('WalletTab', { screen: 'AddExpense' }) },
    { label: 'Add Income', icon: 'caretup', color: '#16A34A', onPress: () => navigation.navigate('WalletTab', { screen: 'AddExpense', params: { type: 'income' } }) },
    { label: 'Scan Bill', icon: 'camerao', color: '#14B8A6', onPress: () => navigation.navigate('WalletTab', { screen: 'BillScanner' }) },
    { label: 'Create Goal', icon: 'flag', color: '#F59E0B', onPress: () => navigation.navigate('HomeTab', { screen: 'Personal', params: { screen: 'GoalsList' } }) },
    { label: 'Net Worth', icon: 'barschart', color: '#7C3AED', onPress: () => navigation.navigate('HomeTab', { screen: 'Personal', params: { screen: 'NetWorth' } }) },
  ];

  const isDark = theme.isDark;

  const handleFabPress = () => {
    setShowActions(true);
  };

  const handleFabLongPress = () => {
    setShowActions(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => (
          <IOSTabBar {...props} colors={colors} isDark={isDark}
            showCenterButton={true}
            bottomBarVisible={bottomBarVisible} onCenterPress={handleFabPress} onCenterLongPress={handleFabLongPress} />
        )}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: colors.accent.primary,
          tabBarInactiveTintColor: colors.text.tertiary,
          tabBarStyle: { backgroundColor: colors.bg.primary, borderTopWidth: 0, elevation: 0 },
        }}
      >
        {[...TAB_CONFIG, ...HIDDEN_TABS].map((tab) => (
          <Tab.Screen
            key={tab.name}
            name={tab.name}
            component={tab.component}
            options={{
              tabBarLabel: tab.label,
              tabBarIcon: tab.icon ? ({ focused, color }) => (
                <AntDesign name={(focused ? tab.activeIcon : tab.icon) as any} size={22} color={color} />
              ) : () => null,
            }}
          />
        ))}
      </Tab.Navigator>

      {quickActionVisible && (
        <QuickActionSheet visible={showActions} onClose={() => setShowActions(false)} actions={quickActions} />
      )}

      {/* Floating AI FAB */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.aiFab, {
          backgroundColor: colors.accent.primary,
          bottom: (Platform.OS === 'ios' ? 82 : 64) + insets.bottom + 8,
        }]}
        onPress={() => navigation.navigate('HomeTab', { screen: 'Personal', params: { screen: 'DabbuAI' } })}
      >
        <AntDesign name="star" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

function IOSTabBar({ state, descriptors, navigation, colors, isDark, showCenterButton, bottomBarVisible, onCenterPress, onCenterLongPress }: any) {
  const insets = useSafeAreaInsets();
  if (!bottomBarVisible) {return null;}

  const scaleAnims = useRef<Record<string, Animated.Value>>({}).current;
  const fabScale = useRef(new Animated.Value(1)).current;

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
        HomeTab: 'Personal',
        WalletTab: 'WalletHome',
        LifeHubTab: 'LifeHubHome',
        SpacesTab: 'SpacesDashboard',
        ProfileTab: 'SettingsMain',
      };
      if (homeScreens[route.name]) {
        navigation.navigate(route.name, { screen: homeScreens[route.name] });
      } else {
        navigation.navigate(route.name);
      }
    };

    const focusedColor = colors.accent.primary;
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

  const visibleRouteNames = TAB_CONFIG.map(t => t.name);
  const visibleRoutes = state.routes.filter((r: any) => visibleRouteNames.includes(r.name));
  const midIndex = Math.floor(visibleRoutes.length / 2);

  return (
    <View style={[tabStyles.container, { paddingBottom: insets.bottom, backgroundColor: isDark ? 'rgba(17,17,17,0.92)' : 'rgba(248,248,250,0.92)' }]}>
      <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[tabStyles.outerWrapper, {
        backgroundColor: isDark ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.85)',
        borderColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.1)',
      }]}>
        <View style={tabStyles.innerRow}>
          <View style={tabStyles.sideGroup}>
            {visibleRoutes.slice(0, midIndex).map((route: any) => renderTab(route))}
          </View>
          {showCenterButton && (
            <TouchableOpacity activeOpacity={0.85} style={tabStyles.centerFab}
              onPressIn={() => Animated.spring(fabScale, { toValue: 0.9, tension: 120, friction: 8, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(fabScale, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }).start()}
              onPress={onCenterPress}
              onLongPress={onCenterLongPress}
              delayLongPress={400}>
              <Animated.View style={[tabStyles.centerFabInner, { backgroundColor: colors.accent.primary, transform: [{ scale: fabScale }] }]}>
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
  outerWrapper: { marginHorizontal: 12, borderRadius: 26, borderWidth: 1, minHeight: 56, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  innerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  sideGroup: { flex: 1, flexDirection: 'row' },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  label: { fontSize: 10, letterSpacing: 0.1, marginTop: 2 },
  centerFab: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  centerFabInner: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});

const styles = StyleSheet.create({
  aiFab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
});
