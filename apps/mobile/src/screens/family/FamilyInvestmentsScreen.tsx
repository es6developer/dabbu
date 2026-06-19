import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';

const CARD_H = 96;
const SKELETON_COUNT = 4;

const TYPE_ICONS: Record<string, { icon: keyof typeof AntDesign.glyphMap; color: string }> = {
  mutual_funds: { icon: 'barschart', color: '#3B82F6' },
  stocks: { icon: 'linechart', color: '#22C55E' },
  gold: { icon: 'star', color: '#F59E0B' },
  fd: { icon: 'wallet', color: '#14B8A6' },
  crypto: { icon: 'rocket1', color: '#A78BFA' },
  property: { icon: 'home', color: '#F97316' },
  pf: { icon: 'Safety', color: '#6366F1' },
  nps: { icon: 'user', color: '#EC4899' },
  other: { icon: 'question', color: '#9CA3AF' },
};

const ALLOCATION_COLORS: Record<string, string> = {
  mutual_funds: '#3B82F6',
  stocks: '#22C55E',
  gold: '#F59E0B',
  fd: '#14B8A6',
  crypto: '#A78BFA',
  property: '#F97316',
  pf: '#6366F1',
  nps: '#EC4899',
  other: '#9CA3AF',
};

const ALLOCATION_LABELS: Record<string, string> = {
  mutual_funds: 'MF',
  stocks: 'Stocks',
  gold: 'Gold',
  fd: 'FD',
  crypto: 'Crypto',
  property: 'Property',
  pf: 'PF',
  nps: 'NPS',
  other: 'Other',
};

function fmt(v: number) {
  if (v >= 10000000) return '₹' + (v / 10000000).toFixed(2) + 'Cr';
  if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '₹' + (v / 1000).toFixed(1) + 'K';
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function SkeletonBlock({ h, r }: { h: number; r?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: h,
        borderRadius: r ?? 16,
        backgroundColor: colors.skeleton.base,
        marginBottom: 8,
      }}
    />
  );
}

function SkeletonLine({ w, h, r }: { w?: number; h?: number; r?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: w ?? '100%',
        height: h ?? 12,
        borderRadius: r ?? 6,
        backgroundColor: colors.skeleton.base,
      }}
    />
  );
}

function InvestmentCard({
  item,
  index,
  animatedValues,
}: {
  item: any;
  index: number;
  animatedValues: Animated.Value[];
}) {
  const { colors } = useTheme();
  const config = TYPE_ICONS[item.type] || TYPE_ICONS.other;
  const isPositive = item.returns >= 0;
  const opacity = animatedValues[index];
  if (!opacity) return null;

  return (
    <Animated.View style={{ opacity }}>
      <View
        style={[
          styles.invCard,
          {
            backgroundColor: colors.bg.secondary,
            borderLeftColor: isPositive ? colors.status.success : colors.status.error,
          },
        ]}
      >
        <View style={styles.invTop}>
          <View style={[styles.invIcon, { backgroundColor: config.color + '20' }]}>
            <AntDesign name={config.icon} size={18} color={config.color} />
          </View>
          <View style={styles.invInfo}>
            <Text style={[styles.invName, { color: colors.text.primary }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.invType, { color: colors.text.tertiary }]}>
              {item.manager?.name}
              {item.institution ? ` · ${item.institution}` : ''}
            </Text>
          </View>
          <View
            style={[
              styles.returnBadge,
              {
                backgroundColor: isPositive
                  ? colors.status.success + '18'
                  : colors.status.error + '18',
              },
            ]}
          >
            <AntDesign
              name={isPositive ? 'arrowup' : 'arrowdown'}
              size={11}
              color={isPositive ? colors.status.success : colors.status.error}
            />
            <Text
              style={[
                styles.returnPct,
                {
                  color: isPositive ? colors.status.success : colors.status.error,
                },
              ]}
            >
              {isPositive ? '+' : ''}
              {item.returnPercentage?.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.invValues}>
          <View style={styles.invValueCol}>
            <Text style={[styles.invValueLabel, { color: colors.text.tertiary }]}>Invested</Text>
            <Text style={[styles.invValueAmt, { color: colors.text.secondary }]}>
              {fmt(item.investedAmount)}
            </Text>
          </View>
          <View style={styles.invValueCol}>
            <Text style={[styles.invValueLabel, { color: colors.text.tertiary }]}>Current</Text>
            <Text style={[styles.invValueAmt, { color: colors.text.primary }]}>
              {fmt(item.currentValue)}
            </Text>
          </View>
          <View style={styles.invValueCol}>
            <Text style={[styles.invValueLabel, { color: colors.text.tertiary }]}>Returns</Text>
            <Text
              style={[
                styles.invValueAmt,
                { color: isPositive ? colors.status.success : colors.status.error },
              ]}
            >
              {isPositive ? '+' : ''}
              {fmt(item.returns)}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function FamilyInvestmentsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const animatedValues = useRef<Animated.Value[]>([]).current;
  const staggerAnim = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      try {
        let fid = familyId;
        if (!fid) {
          const families = await api.get<any>('/family');
          const active = Array.isArray(families) ? families[0] : null;
          if (!active) {
            setLoading(false);
            setRefreshing(false);
            return;
          }
          fid = active.id;
          setFamilyId(fid);
        }
        const res = await api.get<any>(`/family/investments?familyId=${fid}`);
        setData(res);
      } catch {
        /* handled by empty state */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [familyId],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (data?.investments?.length) {
      const arr = data.investments.map(() => new Animated.Value(0));
      animatedValues.length = 0;
      animatedValues.push(...arr);
      Animated.stagger(
        60,
        arr.map((v: Animated.Value) =>
          Animated.timing(v, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ),
      ).start();
      Animated.timing(staggerAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [data]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  // Skeleton loading
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Investments</Text>
        </View>
        <View style={styles.skelPortfolio}>
          <SkeletonBlock h={140} r={20} />
        </View>
        <View style={styles.skelAlloc}>
          <SkeletonLine w={120} h={16} r={8} />
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 10 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={{ flex: 1, gap: 4 }}>
                <SkeletonBlock h={40} r={6} />
                <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.skeleton.base }} />
              </View>
            ))}
          </View>
        </View>
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <SkeletonBlock key={i} h={CARD_H} r={16} />
          ))}
        </View>
      </View>
    );
  }

  // Empty state
  if (!data || !data.investments?.length) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top + 60 }]}
      >
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.bg.tertiary }]}>
            <AntDesign name="linechart" size={36} color={colors.text.tertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
            Start investing together
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
            Track your family's investments, monitor returns, and grow wealth collectively.
          </Text>
          <TouchableOpacity
            onPress={() => navigation?.navigate('FamilyModule', { module: 'investments', title: 'Add Investment' })}
            style={[styles.emptyBtn, { backgroundColor: colors.accent.primary }]}
          >
            <Text style={styles.emptyBtnText}>Add Investment</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const {
    totalPortfolio = 0,
    totalInvested = 0,
    totalReturns = 0,
    returnPercentage = 0,
    assetAllocation = {},
  } = data;

  const isPortfolioPositive = totalReturns >= 0;

  // Build allocation entries
  const allocEntries = Object.entries(ALLOCATION_LABELS)
    .map(([key, label]) => ({
      key,
      label,
      value: (assetAllocation as any)[key] || 0,
      color: ALLOCATION_COLORS[key] || '#9CA3AF',
    }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value);

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <InvestmentCard item={item} index={index} animatedValues={animatedValues} />
  );

  const ListHeader = (
    <Animated.View style={{ opacity: staggerAnim }}>
      {/* Portfolio Summary Card */}
      <View style={[styles.portfolioCard, { backgroundColor: colors.bg.secondary }]}>
        <Text style={[styles.portfolioTitle, { color: colors.text.tertiary }]}>
          Portfolio Value
        </Text>
        <Text style={[styles.portfolioValue, { color: colors.text.primary }]}>
          {fmt(totalPortfolio)}
        </Text>

        <View style={[styles.portfolioDivider, { backgroundColor: colors.border.subtle }]} />

        <View style={styles.portfolioRows}>
          <View style={styles.portfolioRow}>
            <Text style={[styles.portfolioLabel, { color: colors.text.tertiary }]}>Invested</Text>
            <Text style={[styles.portfolioAmt, { color: colors.text.secondary }]}>
              {fmt(totalInvested)}
            </Text>
          </View>
          <View style={styles.portfolioRow}>
            <Text style={[styles.portfolioLabel, { color: colors.text.tertiary }]}>Returns</Text>
            <Text
              style={[
                styles.portfolioAmt,
                {
                  color: isPortfolioPositive ? colors.status.success : colors.status.error,
                },
              ]}
            >
              {isPortfolioPositive ? '+' : ''}
              {fmt(totalReturns)}
            </Text>
          </View>
        </View>

        <View style={styles.portfolioReturnRow}>
          <View
            style={[
              styles.portfolioReturnBadge,
              {
                backgroundColor: isPortfolioPositive
                  ? colors.status.success + '18'
                  : colors.status.error + '18',
              },
            ]}
          >
            <AntDesign
              name={isPortfolioPositive ? 'arrowup' : 'arrowdown'}
              size={14}
              color={isPortfolioPositive ? colors.status.success : colors.status.error}
            />
            <Text
              style={[
                styles.portfolioReturnText,
                {
                  color: isPortfolioPositive ? colors.status.success : colors.status.error,
                },
              ]}
            >
              {isPortfolioPositive ? '+' : ''}
              {returnPercentage.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Asset Allocation */}
      {allocEntries.length > 0 && (
        <View style={styles.allocSection}>
          <Text style={[styles.allocTitle, { color: colors.text.primary }]}>
            Asset Allocation
          </Text>
          <View style={[styles.allocCard, { backgroundColor: colors.bg.secondary }]}>
            {allocEntries.map((entry) => (
              <View key={entry.key} style={styles.allocRow}>
                <View style={[styles.allocDot, { backgroundColor: entry.color }]} />
                <Text style={[styles.allocLabel, { color: colors.text.secondary }]}>
                  {entry.label}
                </Text>
                <View style={styles.allocBarWrap}>
                  <View
                    style={[
                      styles.allocBar,
                      {
                        backgroundColor: colors.bg.tertiary,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.allocBarFill,
                        {
                          width: `${Math.min(entry.value, 100)}%`,
                          backgroundColor: entry.color,
                        },
                      ]}
                    />
                  </View>
                </View>
                <Text style={[styles.allocValue, { color: colors.text.primary }]}>
                  {entry.value.toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          All Investments
        </Text>
        <Text style={[styles.sectionCount, { color: colors.text.tertiary }]}>
          {data.investments.length}
        </Text>
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Investments</Text>
      </View>

      <FlatList
        data={data.investments}
        keyExtractor={(item: any) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  listContent: {
    paddingBottom: 100,
  },

  // ── Skeleton ──────────────────────────────────
  skelPortfolio: {
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
  },
  skelAlloc: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  // ── Portfolio Card ────────────────────────────
  portfolioCard: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 24,
    padding: 22,
  },
  portfolioTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  portfolioValue: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  portfolioDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  portfolioRows: {
    gap: 8,
  },
  portfolioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portfolioLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  portfolioAmt: {
    fontSize: 16,
    fontWeight: '700',
  },
  portfolioReturnRow: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  portfolioReturnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  portfolioReturnText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Allocation ────────────────────────────────
  allocSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  allocTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  allocCard: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  allocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allocDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  allocLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 60,
  },
  allocBarWrap: {
    flex: 1,
  },
  allocBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  allocBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  allocValue: {
    fontSize: 12,
    fontWeight: '700',
    width: 46,
    textAlign: 'right',
  },

  // ── Section Header ────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Investment Card ───────────────────────────
  invCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 18,
    padding: 16,
    borderLeftWidth: 4,
  },
  invTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  invIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  invInfo: {
    flex: 1,
  },
  invName: {
    fontSize: 15,
    fontWeight: '600',
  },
  invType: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  returnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  returnPct: {
    fontSize: 13,
    fontWeight: '700',
  },
  invValues: {
    flexDirection: 'row',
    gap: 0,
  },
  invValueCol: {
    flex: 1,
  },
  invValueLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  invValueAmt: {
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Empty State ───────────────────────────────
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
