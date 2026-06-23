import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';

interface Category {
  id: string;
  name: string;
  icon: keyof typeof AntDesign.glyphMap;
  spent: number;
  limit: number;
}

const BudgetCategoryCard: React.FC<{ category: Category }> = ({ category }) => {
  const { colors } = useTheme();
  const percentage = Math.min((category.spent / category.limit) * 100, 100);
  const isUnder = percentage < 80;
  const isWarning = percentage >= 80 && percentage <= 100;
  const isOver = percentage > 100;

  const barColor = isOver ? colors.status.error : isWarning ? colors.status.warning : colors.status.success;
  const formatCurrency = (amount: number) => '₹' + amount.toLocaleString('en-IN');

  return (
    <View style={[styles.categoryCard, { backgroundColor: colors.bg.secondary }]}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryLeft}>
          <View style={[styles.categoryIcon, { backgroundColor: barColor + '20' }]}>
            <AntDesign name={category.icon} size={18} color={barColor} />
          </View>
          <Text style={[styles.categoryName, { color: colors.text.primary }]}>{category.name}</Text>
        </View>
        {isOver && (
          <View style={[styles.overBadge, { backgroundColor: colors.status.error + '20' }]}>
            <AntDesign name="exclamationcircle" size={12} color={colors.status.error} />
            <Text style={[styles.overText, { color: colors.status.error }]}>Over</Text>
          </View>
        )}
      </View>

      <View style={[styles.progressBarBg, { backgroundColor: colors.bg.tertiary }]}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${Math.min(percentage, 100)}%`, backgroundColor: barColor },
          ]}
        />
      </View>

      <View style={styles.categoryFooter}>
        <Text style={[styles.spentText, { color: colors.text.tertiary }]}>
          Spent: <Text style={[styles.spentAmount, { color: barColor }]}>{formatCurrency(category.spent)}</Text>
        </Text>
        <Text style={[styles.limitText, { color: colors.text.tertiary }]}>
          {formatCurrency(category.limit)} limit
        </Text>
      </View>

      <Text style={[styles.percentageText, { color: barColor }]}>
        {percentage.toFixed(1)}%
      </Text>
    </View>
  );
};

export default function FamilyBudgetScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false, refresh = false) => {
    if (refresh) setRefreshing(true); else if (!silent) setLoading(true);
    try {
      const res = await api.get('/family-space/budget');
      const data = (res as any)?.data || res || [];
      setCategories(Array.isArray(data) ? data : []);
    } catch {} finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useSilentRefresh(useCallback((isInitial) => { loadData(!isInitial); }, [loadData]));

  const totalBudget = categories.reduce((s, c) => s + (c.limit || 0), 0);
  const totalSpent = categories.reduce((s, c) => s + (c.spent || 0), 0);
  const remaining = totalBudget - totalSpent;
  const overallPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const formatCurrency = (amount: number) => '₹' + amount.toLocaleString('en-IN');

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Family Budget</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.status.success} />
        </View>
      ) : categories.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <AntDesign name="piechart" size={52} color={colors.text.tertiary} />
          <Text style={{ color: colors.text.primary, marginTop: 16, fontSize: 18, fontWeight: '600' }}>No budget yet</Text>
          <Text style={{ color: colors.text.tertiary, marginTop: 6, fontSize: 14, textAlign: 'center' }}>
            Set up a family budget to track spending across categories
          </Text>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.status.success, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 20, gap: 8 }}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Goals')}
          >
            <AntDesign name="plus" size={18} color={colors.bg.primary} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.bg.primary }}>Create Your First Budget</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <>
        <View style={[styles.overviewCard, { backgroundColor: colors.bg.secondary }]}>
          <View style={styles.overviewTop}>
            <View>
              <Text style={[styles.overviewLabel, { color: colors.text.tertiary }]}>Total Budget</Text>
              <Text style={[styles.overviewAmount, { color: colors.text.primary }]}>{formatCurrency(totalBudget)}</Text>
            </View>
            <View style={styles.overviewRight}>
              <Text style={[styles.overviewLabel, { color: colors.text.tertiary }]}>Remaining</Text>
              <Text style={[styles.overviewRemaining, { color: remaining > 0 ? colors.status.success : colors.status.error }]}>          
                {formatCurrency(remaining)}
              </Text>
            </View>
          </View>
          <View style={styles.overallProgress}>
            <View style={[styles.overallBarBg, { backgroundColor: colors.bg.tertiary }]}>
              <View
                style={[
                  styles.overallBarFill,
                  { width: `${Math.min(overallPercent, 100)}%`, backgroundColor: colors.status.success },
                ]}
              />
            </View>
            <Text style={[styles.overallPercentText, { color: colors.text.tertiary }]}>
              {overallPercent.toFixed(1)}% used
            </Text>
          </View>
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.status.success }]} />
            <Text style={[styles.legendText, { color: colors.text.tertiary }]}>Under 80%</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.status.warning }]} />
            <Text style={[styles.legendText, { color: colors.text.tertiary }]}>80-100%</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.status.error }]} />
            <Text style={[styles.legendText, { color: colors.text.tertiary }]}>Over 100%</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(false, true)} tintColor={colors.status.success} />}
        >
          {categories.map(cat => (
            <BudgetCategoryCard key={cat.id} category={cat} />
          ))}
        </ScrollView>
      </>
      )}
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  overviewCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  overviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  overviewLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  overviewAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  overviewRight: {
    alignItems: 'flex-end',
  },
  overviewRemaining: {
    fontSize: 24,
    fontWeight: '700',
  },
  overallProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  overallBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  overallBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  overallPercentText: {
    fontSize: 13,
    fontWeight: '500',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  categoryCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    position: 'relative',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
  },
  overBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  overText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spentText: {
    fontSize: 13,
  },
  spentAmount: {
    fontWeight: '600',
  },
  limitText: {
    fontSize: 13,
  },
  percentageText: {
    position: 'absolute',
    top: 16,
    right: 16,
    fontSize: 14,
    fontWeight: '700',
  },
});
