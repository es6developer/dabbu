import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme';
import { useLensStore } from '../../store/lensStore';
import { PersonalLensDashboard } from '../dashboard/PersonalLensDashboard';
import { PartneredLensDashboard } from '../dashboard/PartneredLensDashboard';
import { FamilyLensDashboard } from '../dashboard/FamilyLensDashboard';
import { FullLensDashboard } from '../dashboard/FullLensDashboard';

const LENS_DASHBOARDS: Record<string, React.ComponentType> = {
  PERSONAL: PersonalLensDashboard,
  PARTNERED: PartneredLensDashboard,
  FAMILY: FamilyLensDashboard,
  FULL: FullLensDashboard,
};

export function LifeDashboardScreen() {
  const activeLens = useLensStore((s) => s.activeLens);
  const { colors } = useTheme();

  const DashboardComponent = LENS_DASHBOARDS[activeLens] || LENS_DASHBOARDS.PERSONAL;

  if (!DashboardComponent) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  return <DashboardComponent />;
}
