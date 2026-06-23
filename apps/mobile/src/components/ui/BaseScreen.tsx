import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, ScrollView, FlatList, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, spacing } from '../../theme';

interface BaseScreenProps {
  children: ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  flatList?: boolean;
  flatListProps?: any;
  contentContainerStyle?: ViewStyle;
  gradient?: boolean;
  gradientColors?: string[];
}

export function BaseScreen({
  children,
  style,
  noPadding = false,
  scrollable = false,
  refreshing = false,
  onRefresh,
  flatList = false,
  flatListProps,
  contentContainerStyle,
  gradient = false,
  gradientColors,
}: BaseScreenProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const safeAreaStyle = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
  };

  const containerPadding = !noPadding ? { paddingHorizontal: spacing.xl } : undefined;

  const renderContent = () => {
    if (flatList) {
      return (
        <FlatList
          {...flatListProps}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent.primary}
              />
            ) : undefined
          }
          contentContainerStyle={[
            containerPadding,
            contentContainerStyle,
          ]}
        />
      );
    }

    if (scrollable) {
      return (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent.primary}
              />
            ) : undefined
          }
          contentContainerStyle={[
            containerPadding,
            { flexGrow: 1 },
            contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
      );
    }

    return !noPadding ? <View style={{ paddingHorizontal: spacing.xl }}>{children}</View> : children;
  };

  if (gradient) {
    const gColors = gradientColors || (isDark
      ? ['#1A0A2E', '#0C0C0E']
      : ['#F0E6FF', '#F5F5F8']);
    return (
      <LinearGradient
        colors={gColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.root, safeAreaStyle, style]}
      >
        {renderContent()}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }, safeAreaStyle, style]}>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
