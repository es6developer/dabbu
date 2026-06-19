import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { DashboardNavigator } from './DashboardNavigator';
import { CoupleSpaceNavigator } from './CoupleSpaceNavigator';
import { FamilyHubNavigator } from './FamilyHubNavigator';

type Tab = 'Personal' | 'Couple' | 'Family';

const TABS: { key: Tab; label: string }[] = [
  { key: 'Personal', label: 'Personal' },
  { key: 'Couple', label: 'Couple' },
  { key: 'Family', label: 'Family' },
];

export function HomeNavigator() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('Personal');

  const onTabPress = (tab: Tab) => {
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Personal':
        return <DashboardNavigator />;
      case 'Couple':
        return <CoupleSpaceNavigator />;
      case 'Family':
        return <FamilyHubNavigator />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <View style={[styles.chipRow, { borderBottomColor: colors.border.default || 'rgba(255,255,255,0.08)' }]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.7}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? colors.brand.primary : 'transparent',
                  borderColor: isActive ? colors.brand.primary : colors.text.tertiary,
                },
              ]}
              onPress={() => onTabPress(tab.key)}
            >
              <Text
                style={[
                  styles.chipLabel,
                  { color: isActive ? '#FFFFFF' : colors.text.tertiary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
