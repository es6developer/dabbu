import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, spacing } from '../../theme';

interface PageContainerProps {
  children: ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
  noTopInset?: boolean;
  noBottomInset?: boolean;
}

export function PageContainer({
  children,
  style,
  noPadding = false,
  noTopInset = false,
  noBottomInset = false,
}: PageContainerProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.bg.primary,
          paddingTop: noTopInset ? 0 : insets.top,
          paddingBottom: noBottomInset ? 0 : insets.bottom,
        },
        !noPadding && styles.padding,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  padding: {
    paddingHorizontal: spacing.lg,
  },
});
