import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { DashboardRouter } from '../dashboard/DashboardRouter';

export function LifeDashboardScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <DashboardRouter />
    </View>
  );
}
