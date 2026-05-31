import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import { MyWalletScreen } from '../screens/transactions/MyWalletScreen';
import { SharedCirclesScreen } from '../screens/transactions/SharedCirclesScreen';
import { useTheme } from '../theme';

const Tab = createBottomTabNavigator();

export function ExpenseTabNavigator() {
  const { colors, isDark, typography } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="SharedCircles"
      screenOptions={{
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(22,24,29,0.88)' : 'rgba(255,255,255,0.9)',
          borderTopWidth: 0,
          borderCurve: 'continuous',
          height: 70,
          paddingBottom: Platform.OS === 'ios' ? 14 : 10,
          paddingTop: 10,
          paddingHorizontal: 18,
          borderRadius: 32,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.8)',
          elevation: 18,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 14 },
          shadowOpacity: isDark ? 0.45 : 0.18,
          shadowRadius: 22,
          position: 'absolute',
          left: 18,
          right: 18,
          bottom: 14,
        },
        tabBarActiveTintColor: colors.accent.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: { ...typography.tab, fontSize: 11, fontWeight: '700', marginTop: 2 },
        tabBarItemStyle: { borderRadius: 24, paddingVertical: 2 },
        headerStyle: { backgroundColor: colors.bg.primary },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { ...typography.calloutBold },
      }}
    >
      <Tab.Screen
        name="MyWallet"
        component={MyWalletScreen}
        options={{
          title: 'My Wallet',
          headerShown: false,
          tabBarIcon: ({ focused, size }) => (
            <View
              style={[
                styles.tabIconWrap,
                focused && [
                  styles.tabIconActive,
                  { backgroundColor: colors.accent.primary, shadowColor: colors.accent.primary },
                ],
              ]}
            >
              <Ionicons
                name={focused ? 'wallet' : 'wallet-outline'}
                size={focused ? Math.max(20, size - 2) : size}
                color={focused ? '#FFFFFF' : colors.text.tertiary}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="SharedCircles"
        component={SharedCirclesScreen}
        options={{
          title: 'Shared Circles',
          headerShown: false,
          tabBarIcon: ({ focused, size }) => (
            <View
              style={[
                styles.tabIconWrap,
                focused && [
                  styles.tabIconActive,
                  { backgroundColor: colors.accent.primary, shadowColor: colors.accent.primary },
                ],
              ]}
            >
              <Ionicons
                name={focused ? 'people' : 'people-outline'}
                size={focused ? Math.max(20, size - 2) : size}
                color={focused ? '#FFFFFF' : colors.text.tertiary}
              />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    width: 38,
    height: 30,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconActive: {
    marginTop: -3,
    elevation: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
});
