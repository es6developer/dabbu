import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { DashboardNavigator } from './DashboardNavigator';

export function HomeNavigator() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <DashboardNavigator />
    </View>
  );
}
