import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';

const { width } = Dimensions.get('window');
const tileSize = (width - 52) / 2;

interface ReportTile {
  id: string;
  icon: keyof typeof AntDesign.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  gradientColors: string[];
}

function getReportTiles(colors: any): ReportTile[] {
  return [
    { id: '1', icon: 'barschart', title: 'Monthly Spend', subtitle: 'View spending trends', color: '#3B82F6', gradientColors: ['#3B82F6', '#2563EB'] },
    { id: '2', icon: 'piechart', title: 'Category Breakdown', subtitle: 'Spend by category', color: colors.accent.secondary, gradientColors: [colors.accent.secondary, colors.accent.primary] },
    { id: '3', icon: 'arrowup', title: 'Savings Report', subtitle: 'Savings performance', color: colors.status.success, gradientColors: [colors.status.success, colors.accent.primary] },
    { id: '4', icon: 'linechart', title: 'Investment Report', subtitle: 'Portfolio performance', color: '#EC4899', gradientColors: ['#EC4899', '#DB2777'] },
    { id: '5', icon: 'swap', title: 'Vs Last Month', subtitle: 'Compare spending', color: colors.status.warning, gradientColors: [colors.status.warning, colors.accent.secondary] },
    { id: '6', icon: 'calendar', title: 'Yearly Summary', subtitle: 'Annual overview', color: '#6366F1', gradientColors: ['#6366F1', '#4F46E5'] },
  ];
}

const ReportTileCard: React.FC<{ tile: ReportTile; onPress: () => void; colors: any }> = ({ tile, onPress, colors }) => (
  <TouchableOpacity
    style={styles.reportTile}
    activeOpacity={0.85}
    onPress={onPress}
  >
    <View style={[styles.tileGradient, { backgroundColor: tile.color + '20' }]}>
      <View style={[styles.tileIconContainer, { backgroundColor: tile.color + '30' }]}>
        <AntDesign name={tile.icon} size={26} color={tile.color} />
      </View>
      <Text style={[styles.tileTitle, { color: colors.text.primary }]}>{tile.title}</Text>
      <Text style={[styles.tileSubtitle, { color: colors.text.tertiary }]}>{tile.subtitle}</Text>
      <View style={styles.tileArrow}>
        <AntDesign name="arrowright" size={16} color={tile.color} />
      </View>
    </View>
  </TouchableOpacity>
);

export default function FamilyReportsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const reportTiles = getReportTiles(colors);
  const [selectedFilter, setSelectedFilter] = useState('3M');
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false, refresh = false) => {
    if (refresh) setRefreshing(true); else if (!silent) setLoading(true);
    try {
      const res = await api.get('/family-space/reports');
      const data = (res as any)?.data || res || {};
      setInsights(data);
    } catch {} finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useSilentRefresh(useCallback((isInitial) => { loadData(!isInitial); }, [loadData]));

  const handleTilePress = (tile: ReportTile) => {
    const routes: Record<string, string> = {
      '1': 'Analytics',
      '2': 'Analytics',
      '3': 'Analytics',
      '4': 'InvestmentPlanner',
      '5': 'Analytics',
      '6': 'YearlySummary',
    };
    const route = routes[tile.id] || 'Analytics';
    navigation.navigate(route);
  };

  const totalSpend = insights?.totalSpend ?? 185000;
  const savingsRate = insights?.savingsRate ?? 24;
  const topCategory = insights?.topCategory ?? 'Housing';
  const topCategoryPct = insights?.topCategoryPct ?? 32;
  const lastUpdated = insights?.lastUpdated ?? 'Today';

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.status.success} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Reports</Text>
      </View>

      <View style={styles.headerSummary}>
        <View style={[styles.headerSummaryCard, { backgroundColor: colors.bg.secondary }]}>
          <Text style={[styles.headerSummaryLabel, { color: colors.text.tertiary }]}>Reports Available</Text>
          <Text style={[styles.headerSummaryValue, { color: colors.text.primary }]}>{reportTiles.length}</Text>
        </View>
        <View style={[styles.headerSummaryCard, { backgroundColor: colors.bg.secondary }]}>
          <Text style={[styles.headerSummaryLabel, { color: colors.text.tertiary }]}>Last Updated</Text>
          <Text style={[styles.headerSummaryValue, { color: colors.text.primary }]}>{lastUpdated}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {['1M', '3M', '6M', '1Y', 'All'].map(filter => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterTab, { backgroundColor: selectedFilter === filter ? colors.status.success : colors.bg.secondary }, selectedFilter === filter && styles.filterTabActive]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[styles.filterText, { color: selectedFilter === filter ? colors.bg.primary : colors.text.tertiary }, selectedFilter === filter && styles.filterTextActive]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(false, true)} tintColor={colors.status.success} />}
      >
        <View style={styles.tilesGrid}>
          {reportTiles.map(tile => (
            <ReportTileCard
              key={tile.id}
              tile={tile}
              colors={colors}
              onPress={() => handleTilePress(tile)}
            />
          ))}
        </View>

        <View style={[styles.insightCard, { backgroundColor: colors.bg.secondary }]}>
          <View style={styles.insightHeaderRow}>
            <AntDesign name="star" size={18} color={colors.status.success} />
            <Text style={[styles.insightTitle, { color: colors.text.primary }]}>Quick Insights</Text>
          </View>
          <View style={styles.insightRow}>
            <View style={[styles.insightDot, { backgroundColor: colors.status.success }]} />
            <Text style={[styles.insightText, { color: colors.text.secondary }]}>
              Total spend this month is <Text style={[styles.insightHighlight, { color: colors.text.primary }]}>₹{totalSpend.toLocaleString('en-IN')}</Text>
            </Text>
          </View>
          <View style={styles.insightRow}>
            <View style={[styles.insightDot, { backgroundColor: colors.status.success }]} />
            <Text style={[styles.insightText, { color: colors.text.secondary }]}>
              Savings rate: <Text style={[styles.insightHighlight, { color: colors.status.success }]}>{savingsRate}%</Text> of income
            </Text>
          </View>
          <View style={styles.insightRow}>
            <View style={[styles.insightDot, { backgroundColor: colors.status.success }]} />
            <Text style={[styles.insightText, { color: colors.text.secondary }]}>
              Top category: <Text style={[styles.insightHighlight, { color: colors.text.primary }]}>{topCategory}</Text> ({topCategoryPct}% of spend)
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSummary: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  headerSummaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  headerSummaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  headerSummaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterTabActive: {
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterTextActive: {
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  reportTile: {
    width: tileSize,
    height: tileSize * 1.1,
  },
  tileGradient: {
    flex: 1,
    borderRadius: 18,
    padding: 18,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  tileIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  tileTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  tileSubtitle: {
    fontSize: 12,
  },
  tileArrow: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  insightCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  insightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  insightText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  insightHighlight: {
    fontWeight: '600',
  },
});
