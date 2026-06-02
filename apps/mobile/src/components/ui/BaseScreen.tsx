import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  ScrollView,
  FlatList,
  RefreshControl,
} from 'react-native';
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
}: BaseScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const containerStyle = [
    styles.root,
    {
      backgroundColor: colors.bg.primary,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
    },
    !noPadding && styles.padding,
    style,
  ];

  if (flatList) {
    return (
      <View style={containerStyle}>
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
            !noPadding && { paddingHorizontal: spacing.lg },
            contentContainerStyle,
          ]}
        />
      </View>
    );
  }

  if (scrollable) {
    return (
      <View style={containerStyle}>
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
            !noPadding && { paddingHorizontal: spacing.lg },
            { flexGrow: 1 },
            contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  padding: {
    paddingHorizontal: spacing.lg,
  },
});
