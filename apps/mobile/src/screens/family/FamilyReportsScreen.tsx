import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';

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

const reportTiles: ReportTile[] = [
  { id: '1', icon: 'barschart', title: 'Monthly Spend', subtitle: 'View spending trends', color: '#3B82F6', gradientColors: ['#3B82F6', '#2563EB'] },
  { id: '2', icon: 'piechart', title: 'Category Breakdown', subtitle: 'Spend by category', color: '#8B5CF6', gradientColors: ['#8B5CF6', '#7C3AED'] },
  { id: '3', icon: 'arrowup', title: 'Savings Report', subtitle: 'Savings performance', color: '#10B981', gradientColors: ['#10B981', '#059669'] },
  { id: '4', icon: 'linechart', title: 'Investment Report', subtitle: 'Portfolio performance', color: '#EC4899', gradientColors: ['#EC4899', '#DB2777'] },
  { id: '5', icon: 'swap', title: 'Vs Last Month', subtitle: 'Compare spending', color: '#F59E0B', gradientColors: ['#F59E0B', '#D97706'] },
  { id: '6', icon: 'calendar', title: 'Yearly Summary', subtitle: 'Annual overview', color: '#6366F1', gradientColors: ['#6366F1', '#4F46E5'] },
];

const ReportTileCard: React.FC<{ tile: ReportTile; onPress: () => void }> = ({ tile, onPress }) => (
  <TouchableOpacity
    style={styles.reportTile}
    activeOpacity={0.85}
    onPress={onPress}
  >
    <View style={[styles.tileGradient, { backgroundColor: tile.color + '20' }]}>
      <View style={[styles.tileIconContainer, { backgroundColor: tile.color + '30' }]}>
        <AntDesign name={tile.icon} size={26} color={tile.color} />
      </View>
      <Text style={styles.tileTitle}>{tile.title}</Text>
      <Text style={styles.tileSubtitle}>{tile.subtitle}</Text>
      <View style={styles.tileArrow}>
        <AntDesign name="arrowright" size={16} color={tile.color} />
      </View>
    </View>
  </TouchableOpacity>
);

export default function FamilyReportsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [selectedFilter, setSelectedFilter] = useState('3M');
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    api.get('/family-space/reports').then((res: any) => {
      const data = res?.data || res || {};
      if (mounted) setInsights(data);
    }).catch(() => {}).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []));

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
      <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports</Text>
      </View>

      <View style={styles.headerSummary}>
        <View style={styles.headerSummaryCard}>
          <Text style={styles.headerSummaryLabel}>Reports Available</Text>
          <Text style={styles.headerSummaryValue}>{reportTiles.length}</Text>
        </View>
        <View style={styles.headerSummaryCard}>
          <Text style={styles.headerSummaryLabel}>Last Updated</Text>
          <Text style={styles.headerSummaryValue}>{lastUpdated}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {['1M', '3M', '6M', '1Y', 'All'].map(filter => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterTab, selectedFilter === filter && styles.filterTabActive]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[styles.filterText, selectedFilter === filter && styles.filterTextActive]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tilesGrid}>
          {reportTiles.map(tile => (
            <ReportTileCard
              key={tile.id}
              tile={tile}
              onPress={() => handleTilePress(tile)}
            />
          ))}
        </View>

        <View style={styles.insightCard}>
          <View style={styles.insightHeaderRow}>
            <AntDesign name="star" size={18} color="#10B981" />
            <Text style={styles.insightTitle}>Quick Insights</Text>
          </View>
          <View style={styles.insightRow}>
            <View style={styles.insightDot} />
            <Text style={styles.insightText}>
              Total spend this month is <Text style={styles.insightHighlight}>₹{totalSpend.toLocaleString('en-IN')}</Text>
            </Text>
          </View>
          <View style={styles.insightRow}>
            <View style={styles.insightDot} />
            <Text style={styles.insightText}>
              Savings rate: <Text style={[styles.insightHighlight, { color: '#10B981' }]}>{savingsRate}%</Text> of income
            </Text>
          </View>
          <View style={styles.insightRow}>
            <View style={styles.insightDot} />
            <Text style={styles.insightText}>
              Top category: <Text style={styles.insightHighlight}>{topCategory}</Text> ({topCategoryPct}% of spend)
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
    backgroundColor: '#0A0A0A',
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
    color: '#F9FAFB',
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
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  headerSummaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  headerSummaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
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
    backgroundColor: '#1C1C1E',
  },
  filterTabActive: {
    backgroundColor: '#10B981',
  },
  filterText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#0A0A0A',
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
    color: '#F9FAFB',
    marginBottom: 4,
  },
  tileSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  tileArrow: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  insightCard: {
    backgroundColor: '#1C1C1E',
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
    color: '#F9FAFB',
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
    backgroundColor: '#10B981',
    marginTop: 6,
  },
  insightText: {
    fontSize: 14,
    color: '#D1D5DB',
    flex: 1,
    lineHeight: 20,
  },
  insightHighlight: {
    color: '#F9FAFB',
    fontWeight: '600',
  },
});
