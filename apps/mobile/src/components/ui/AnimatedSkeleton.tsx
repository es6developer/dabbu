import { useEffect, useRef, useContext, createContext } from 'react';
import { Animated, View } from 'react-native';
import { useTheme } from '../../theme';
import { spacing as spacingTokens } from '../../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

const SHIMMER_DURATION = 800;

// Shared shimmer value to reduce concurrent Animated.loop instances
const ShimmerContext = createContext<Animated.Value | null>(null);

function useShimmerValue() {
  const shared = useContext(ShimmerContext);
  if (shared) return shared;
  const localRef = useRef(new Animated.Value(0));
  return localRef.current;
}

export function ShimmerProvider({ children }: { children: React.ReactNode }) {
  const animRef = useRef(new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(animRef.current, { toValue: 1, duration: SHIMMER_DURATION, useNativeDriver: true }),
        Animated.timing(animRef.current, { toValue: 0, duration: SHIMMER_DURATION, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <ShimmerContext.Provider value={animRef.current}>
      {children}
    </ShimmerContext.Provider>
  );
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const { colors, isDark } = useTheme();
  const anim = useShimmerValue();

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.skeleton.base,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          width: 80,
          height: '100%',
          backgroundColor: colors.skeleton.highlight,
          opacity: 0.7,
          transform: [{ translateX }],
        }}
      />
    </View>
  );
}

export function SkeletonCard({ style }: { style?: any }) {
  return <Skeleton height={120} borderRadius={20} style={style} />;
}

export function SkeletonList({ count = 3, style }: { count?: number; style?: any }) {
  return (
    <View style={[{ gap: 12 }, style]}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={{ paddingHorizontal: spacingTokens.xl, paddingTop: spacingTokens.lg, gap: spacingTokens.md }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacingTokens.md }}>
          <Skeleton width={44} height={44} borderRadius={12} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width={i % 3 === 0 ? '80%' : '60%'} height={14} borderRadius={6} />
            <Skeleton width={i % 2 === 0 ? '50%' : '40%'} height={11} borderRadius={5} />
          </View>
          <Skeleton width={60} height={18} borderRadius={6} />
        </View>
      ))}
    </View>
  );
}

export function DetailSkeleton() {
  return (
    <View style={{ paddingTop: spacingTokens.lg, gap: spacingTokens.lg }}>
      <View style={{ paddingHorizontal: spacingTokens.xl, flexDirection: 'row', alignItems: 'center', gap: spacingTokens.md }}>
        <Skeleton width={36} height={36} borderRadius={10} />
        <Skeleton width="60%" height={22} borderRadius={8} />
      </View>
      <View style={{ paddingHorizontal: spacingTokens.xl }}>
        <Skeleton width="100%" height={140} borderRadius={20} />
      </View>
      <View style={{ paddingHorizontal: spacingTokens.xl, gap: spacingTokens.md }}>
        <SkeletonCard />
        <SkeletonCard />
      </View>
    </View>
  );
}

export function AnalyticsSkeleton() {
  return (
    <View style={{ paddingHorizontal: spacingTokens.xl, paddingTop: spacingTokens.lg, gap: spacingTokens.lg }}>
      <View style={{ flexDirection: 'row', gap: spacingTokens.sm }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1 }}>
            <Skeleton width="100%" height={80} borderRadius={16} />
          </View>
        ))}
      </View>
      <Skeleton width="100%" height={200} borderRadius={20} />
      <View style={{ gap: spacingTokens.md }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacingTokens.sm }}>
            <Skeleton width={12} height={12} borderRadius={6} />
            <Skeleton width="60%" height={14} borderRadius={6} />
            <View style={{ flex: 1 }} />
            <Skeleton width={50} height={14} borderRadius={6} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function FormSkeleton() {
  return (
    <View style={{ paddingHorizontal: spacingTokens.xl, paddingTop: spacingTokens.lg, gap: spacingTokens.xl }}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={{ gap: spacingTokens.sm }}>
          <Skeleton width={80} height={12} borderRadius={6} />
          <Skeleton width="100%" height={48} borderRadius={12} />
        </View>
      ))}
      <Skeleton width="100%" height={52} borderRadius={12} style={{ marginTop: spacingTokens.sm }} />
    </View>
  );
}

export function DashboardSkeleton() {
  return (
    <View style={{ paddingHorizontal: spacingTokens.xl, paddingTop: spacingTokens.lg, gap: spacingTokens.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ gap: spacingTokens.xs }}>
          <Skeleton width={120} height={12} borderRadius={6} />
          <Skeleton width={180} height={22} borderRadius={8} />
        </View>
        <Skeleton width={44} height={44} borderRadius={22} />
      </View>
      <Skeleton width="100%" height={180} borderRadius={20} />
      <View style={{ flexDirection: 'row', gap: spacingTokens.sm }}>
        {[1, 2].map((i) => (
          <View key={i} style={{ flex: 1 }}>
            <Skeleton width="100%" height={100} borderRadius={16} />
          </View>
        ))}
      </View>
      <SkeletonList count={2} />
    </View>
  );
}
