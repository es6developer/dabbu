import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Category {
  id: string;
  name: string;
  icon: keyof typeof AntDesign.glyphMap;
  spent: number;
  limit: number;
}

const categories: Category[] = [
  { id: '1', name: 'Food', icon: 'rest', spent: 28500, limit: 30000 },
  { id: '2', name: 'Rent', icon: 'home', spent: 35000, limit: 35000 },
  { id: '3', name: 'Utilities', icon: 'bulb1', spent: 8200, limit: 10000 },
  { id: '4', name: 'Education', icon: 'book', spent: 12500, limit: 15000 },
  { id: '5', name: 'Transport', icon: 'car', spent: 9500, limit: 10000 },
  { id: '6', name: 'Healthcare', icon: 'heart', spent: 5400, limit: 8000 },
  { id: '7', name: 'Entertainment', icon: 'star', spent: 6300, limit: 6000 },
  { id: '8', name: 'Savings', icon: 'arrowup', spent: 45000, limit: 50000 },
];

const BudgetCategoryCard: React.FC<{ category: Category }> = ({ category }) => {
  const percentage = Math.min((category.spent / category.limit) * 100, 100);
  const isUnder = percentage < 80;
  const isWarning = percentage >= 80 && percentage <= 100;
  const isOver = percentage > 100;

  const barColor = isOver ? '#EF4444' : isWarning ? '#F59E0B' : '#10B981';
  const formatCurrency = (amount: number) => '₹' + amount.toLocaleString('en-IN');

  return (
    <View style={styles.categoryCard}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryLeft}>
          <View style={[styles.categoryIcon, { backgroundColor: barColor + '20' }]}>
            <AntDesign name={category.icon} size={18} color={barColor} />
          </View>
          <Text style={styles.categoryName}>{category.name}</Text>
        </View>
        {isOver && (
          <View style={styles.overBadge}>
            <AntDesign name="exclamationcircle" size={12} color="#EF4444" />
            <Text style={styles.overText}>Over</Text>
          </View>
        )}
      </View>

      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${Math.min(percentage, 100)}%`, backgroundColor: barColor },
          ]}
        />
      </View>

      <View style={styles.categoryFooter}>
        <Text style={styles.spentText}>
          Spent: <Text style={[styles.spentAmount, { color: barColor }]}>{formatCurrency(category.spent)}</Text>
        </Text>
        <Text style={styles.limitText}>
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

  const totalBudget = categories.reduce((s, c) => s + c.limit, 0);
  const totalSpent = categories.reduce((s, c) => s + c.spent, 0);
  const remaining = totalBudget - totalSpent;
  const overallPercent = (totalSpent / totalBudget) * 100;

  const formatCurrency = (amount: number) => '₹' + amount.toLocaleString('en-IN');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Family Budget</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => Alert.alert('Set Budget', 'Configure budget limits')}
        >
          <AntDesign name="setting" size={18} color="#10B981" />
          <Text style={styles.addButtonText}>Set Budget</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.overviewCard}>
        <View style={styles.overviewTop}>
          <View>
            <Text style={styles.overviewLabel}>Total Budget</Text>
            <Text style={styles.overviewAmount}>{formatCurrency(totalBudget)}</Text>
          </View>
          <View style={styles.overviewRight}>
            <Text style={styles.overviewLabel}>Remaining</Text>
            <Text style={[styles.overviewRemaining, { color: remaining > 0 ? '#10B981' : '#EF4444' }]}>
              {formatCurrency(remaining)}
            </Text>
          </View>
        </View>
        <View style={styles.overallProgress}>
          <View style={styles.overallBarBg}>
            <View
              style={[
                styles.overallBarFill,
                { width: `${Math.min(overallPercent, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.overallPercentText}>
            {overallPercent.toFixed(1)}% used
          </Text>
        </View>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>Under 80%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>80-100%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>Over 100%</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {categories.map(cat => (
          <BudgetCategoryCard key={cat.id} category={cat} />
        ))}
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2A25',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  overviewCard: {
    backgroundColor: '#1C1C1E',
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
    color: '#6B7280',
    marginBottom: 4,
  },
  overviewAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F9FAFB',
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
    backgroundColor: '#2C2C2E',
    borderRadius: 4,
    overflow: 'hidden',
  },
  overallBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  overallPercentText: {
    fontSize: 13,
    color: '#6B7280',
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
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  categoryCard: {
    backgroundColor: '#1C1C1E',
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
    color: '#F9FAFB',
  },
  overBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF444420',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  overText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#2C2C2E',
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
    color: '#6B7280',
  },
  spentAmount: {
    fontWeight: '600',
  },
  limitText: {
    fontSize: 13,
    color: '#6B7280',
  },
  percentageText: {
    position: 'absolute',
    top: 16,
    right: 16,
    fontSize: 14,
    fontWeight: '700',
  },
});
