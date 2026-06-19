import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { usePreferences } from '../store/PreferencesContext';
import { HomeNavigator } from './HomeNavigator';
import { WalletNavigator } from './WalletNavigator';
import { SpacesNavigator } from './SpacesNavigator';
import { LifeHubNavigator } from './LifeHubNavigator';
import { SettingsNavigator } from './SettingsNavigator';
import { QuickActionSheet } from '../components/ui/QuickActionSheet';
import { PRESS_SPRING } from './animations';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = [
  { name: 'HomeTab', label: 'Home', icon: 'home', activeIcon: 'home', component: HomeNavigator },
  { name: 'WalletTab', label: 'Wallet', icon: 'wallet', activeIcon: 'wallet', component: WalletNavigator },
  { name: 'LifeHubTab', label: 'LifeHub', icon: 'calendar', activeIcon: 'calendar', component: LifeHubNavigator },
  { name: 'SpacesTab', label: 'Spaces', icon: 'team', activeIcon: 'team', component: SpacesNavigator },
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
  const fabRotate = useRef(new Animated.Value(0)).current;

  function springTap(routeName: string, toValue: number) {
    if (!scaleAnims[routeName]) {scaleAnims[routeName] = new Animated.Value(1);}
    Animated.spring(scaleAnims[routeName], { toValue, ...PRESS_SPRING }).start();
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
        <Text style={[tabStyles.label, { color: isFocused ? focusedColor : unfocusedColor, fontWeight: isFocused ? '700' : '500' }]}>
          {options.tabBarLabel || route.name}
        </Text>
      </TouchableOpacity>
    );
  }

  const visibleRouteNames = TAB_CONFIG.map(t => t.name);
  const visibleRoutes = state.routes.filter((r: any) => visibleRouteNames.includes(r.name));
  const midIndex = Math.floor(visibleRoutes.length / 2);

  const fabRotation = fabRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View style={[tabStyles.container, { paddingBottom: insets.bottom + 4, backgroundColor: isDark ? 'rgba(12,12,14,0.95)' : 'rgba(245,245,248,0.95)' }]}>
      <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[tabStyles.outerWrapper, {
        backgroundColor: isDark ? 'rgba(22,22,26,0.9)' : 'rgba(255,255,255,0.9)',
        borderColor: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.12)',
        shadowColor: isDark ? '#7C3AED' : '#7C3AED',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.2 : 0.08,
        shadowRadius: 12,
        elevation: 4,
      }]}>
        <View style={tabStyles.innerRow}>
          <View style={tabStyles.sideGroup}>
            {visibleRoutes.slice(0, midIndex).map((route: any) => renderTab(route))}
          </View>
          {showCenterButton && (
            <TouchableOpacity activeOpacity={0.85} style={tabStyles.centerFab}
              onPressIn={() => {
                Animated.spring(fabScale, { toValue: 0.88, ...PRESS_SPRING }).start();
                Animated.spring(fabRotate, { toValue: 1, tension: 140, friction: 14, useNativeDriver: true }).start();
              }}
              onPressOut={() => {
                Animated.spring(fabScale, { toValue: 1, ...PRESS_SPRING }).start();
                setTimeout(() => Animated.spring(fabRotate, { toValue: 0, tension: 140, friction: 14, useNativeDriver: true }).start(), 200);
              }}
              onPress={() => { onCenterPress(); }}
              onLongPress={onCenterLongPress}
              delayLongPress={400}>
              <Animated.View style={[tabStyles.centerFabInner, {
                backgroundColor: colors.accent.primary,
                transform: [{ scale: fabScale }, { rotate: fabRotation }],
                shadowColor: colors.accent.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 6,
              }]}>
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
  centerFabInner: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
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
