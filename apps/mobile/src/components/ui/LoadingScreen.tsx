import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing as spacingTokens } from '../../theme';
import { Skeleton, ListSkeleton } from './AnimatedSkeleton';

const { width } = Dimensions.get('window');

interface LoadingScreenProps {
  skeleton?: React.ReactNode;
}

export function LoadingScreen({ skeleton }: LoadingScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.headerSkel, { paddingTop: insets.top + 60 }]}>
        <Skeleton
          width={width * 0.7}
          height={14}
          borderRadius={7}
          style={{ alignSelf: 'center' }}
        />
        <View style={{ height: 8 }} />
        <Skeleton
          width={width * 0.4}
          height={14}
          borderRadius={7}
          style={{ alignSelf: 'center' }}
        />
      </View>
      <View style={styles.skeletonContainer}>{skeleton || <ListSkeleton count={4} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerSkel: {
    paddingHorizontal: spacingTokens['3xl'],
    paddingBottom: spacingTokens['3xl'],
    justifyContent: 'center',
  },
  skeletonContainer: {
    flex: 1,
  },
});
