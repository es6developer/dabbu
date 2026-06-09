import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
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

export function DashboardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.skelWrap, { paddingHorizontal: 20 }]}>
      <Skeleton width={90} height={12} borderRadius={6} />
      <Skeleton width={170} height={26} style={{ marginTop: 4 }} borderRadius={6} />
      <Skeleton width="100%" height={180} style={{ marginTop: 16 }} borderRadius={20} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={100} borderRadius={16} />
        </View>
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={100} borderRadius={16} />
        </View>
      </View>
      <Skeleton width="100%" height={120} style={{ marginTop: 12 }} borderRadius={16} />
      <Skeleton width="100%" height={120} style={{ marginTop: 12 }} borderRadius={16} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} width={(width - 56) / 3} height={44} borderRadius={22} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerSkel: {
    paddingHorizontal: 28,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  skeletonContainer: {
    flex: 1,
  },
  skelWrap: {
    gap: 4,
  },
});
