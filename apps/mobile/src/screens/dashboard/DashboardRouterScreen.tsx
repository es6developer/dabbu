import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useDashboard } from '../../store/DashboardContext';
import { PersonalDashboardScreen } from './PersonalDashboardScreen';
import { CoupleDashboardScreen } from './CoupleDashboardScreen';
import { FamilyDashboardScreen } from '../family/FamilyDashboardScreen';

export function DashboardRouterScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { mode, loading } = useDashboard();

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  if (mode === 'family') return <FamilyDashboardScreen navigation={navigation} />;
  if (mode === 'couple') return <CoupleDashboardScreen navigation={navigation} />;
  return <PersonalDashboardScreen navigation={navigation} />;
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
