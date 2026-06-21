import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../../theme';
import { useLens } from '../../hooks/useLens';

export function PartneredDashboard() {
  const { colors } = useTheme();
  const { visibleWidgets, refreshDashboard, isDashboardLoading } = useLens();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg.primary }}
      refreshControl={<RefreshControl refreshing={isDashboardLoading} onRefresh={refreshDashboard} />}
    >
      <View style={{ padding: 16 }}>
        <Text style={{ color: colors.text.primary, fontSize: 28, fontWeight: '700' }}>Partnered</Text>
        <Text style={{ color: colors.text.secondary, fontSize: 14, marginTop: 4 }}>
          Shared finances with your partner
        </Text>
      </View>
      {visibleWidgets.map((widget) => (
        <View
          key={widget.key}
          style={{
            marginHorizontal: 16,
            marginBottom: 12,
            padding: 16,
            backgroundColor: colors.bg.card,
            borderRadius: 16,
            borderLeftWidth: 3,
            borderLeftColor: '#F43F5E',
          }}
        >
          <Text style={{ color: colors.text.primary, fontSize: 16, fontWeight: '600' }}>
            {widget.title}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
