import React, { lazy, Suspense } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLensStore } from '../../store/lensStore';
import { useTheme } from '../../theme';

const PersonalDashboard = lazy(() => import('./PersonalLensDashboard').then((m) => ({ default: m.PersonalLensDashboard })));
const PartneredDashboard = lazy(() => import('./PartneredLensDashboard').then((m) => ({ default: m.PartneredLensDashboard })));
const FamilyDashboard = lazy(() => import('./FamilyLensDashboard').then((m) => ({ default: m.FamilyLensDashboard })));
const FullDashboard = lazy(() => import('./FullLensDashboard').then((m) => ({ default: m.FullLensDashboard })));

const DASHBOARD_MAP: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  PERSONAL: PersonalDashboard,
  PARTNERED: PartneredDashboard,
  FAMILY: FamilyDashboard,
  FULL: FullDashboard,
};

function DashboardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary, padding: 16 }}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            height: 100,
            marginBottom: 12,
            backgroundColor: colors.skeleton.base,
            borderRadius: 16,
          }}
        />
      ))}
    </View>
  );
}

export function DashboardRouter() {
  const activeLens = useLensStore((s) => s.activeLens);
  const DashboardComponent = DASHBOARD_MAP[activeLens] || DASHBOARD_MAP.PERSONAL;

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardComponent />
    </Suspense>
  );
}
