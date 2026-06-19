import React from 'react';
import { View } from 'react-native';
import { PersonalDashboardScreen } from './PersonalDashboardScreen';
import { CoupleDashboardScreen } from './CoupleDashboardScreen';
import { useLensStore } from '../../store/lensStore';
import { useTheme } from '../../theme';

export function DashboardRouterScreen({ navigation }: any) {
  const activeLens = useLensStore((s) => s.activeLens);
  const { colors } = useTheme();

  if (activeLens === 'FAMILY') {
    const FamilyDashboardScreen = React.lazy(() =>
      import('../family/FamilyDashboardScreen').then((m) => ({ default: m.FamilyDashboardScreen }))
    );
    return (
      <React.Suspense fallback={<View style={{ flex: 1, backgroundColor: colors.bg.primary }} />}>
        <FamilyDashboardScreen navigation={navigation} />
      </React.Suspense>
    );
  }

  if (activeLens === 'PARTNERED' || activeLens === 'FULL') {
    return <CoupleDashboardScreen navigation={navigation} />;
  }

  return <PersonalDashboardScreen navigation={navigation} />;
}
