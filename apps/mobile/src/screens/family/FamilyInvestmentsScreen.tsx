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

type InvestmentType = 'FD' | 'Stocks' | 'MF' | 'PPF' | 'NPS' | 'Real Estate';

interface Investment {
  id: string;
  type: InvestmentType;
  name: string;
  invested: number;
  currentValue: number;
  returnPercent: number;
  maturityDate: string;
  icon: keyof typeof AntDesign.glyphMap;
}

const typeConfig: Record<InvestmentType, { icon: keyof typeof AntDesign.glyphMap; color: string }> = {
  FD: { icon: 'bank', color: '#3B82F6' },
  Stocks: { icon: 'linechart', color: '#10B981' },
  MF: { icon: 'barschart', color: '#8B5CF6' },
  PPF: { icon: 'Safety', color: '#F59E0B' },
  NPS: { icon: 'customerservice', color: '#EC4899' },
  'Real Estate': { icon: 'home', color: '#6366F1' },
};

const investments: Investment[] = [
  { id: '1', type: 'FD', name: 'SBI Fixed Deposit', invested: 500000, currentValue: 542000, returnPercent: 8.4, maturityDate: 'Dec 2027', icon: 'bank' },
  { id: '2', type: 'Stocks', name: 'Equity Portfolio', invested: 800000, currentValue: 1020000, returnPercent: 27.5, maturityDate: 'Liquid', icon: 'linechart' },
  { id: '3', type: 'MF', name: 'HDFC Midcap Fund', invested: 300000, currentValue: 384000, returnPercent: 28.0, maturityDate: 'Ongoing', icon: 'barschart' },
  { id: '4', type: 'PPF', name: 'PPF Account', invested: 150000, currentValue: 175500, returnPercent: 7.1, maturityDate: 'Mar 2035', icon: 'Safety' },
  { id: '5', type: 'NPS', name: 'NPS Tier 1', invested: 200000, currentValue: 234000, returnPercent: 17.0, maturityDate: 'Jun 2045', icon: 'customerservice' },
  { id: '6', type: 'Real Estate', name: 'Plot in Whitefield', invested: 2500000, currentValue: 3200000, returnPercent: 28.0, maturityDate: 'Flexible', icon: 'home' },
];

const InvestmentCard: React.FC<{ investment: Investment }> = ({ investment }) => {
  const config = typeConfig[investment.type];
  const isPositive = investment.returnPercent >= 0;
  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return '₹' + (amount / 10000000).toFixed(2) + 'Cr';
    if (amount >= 100000) return '₹' + (amount / 100000).toFixed(1) + 'L';
    return '₹' + amount.toLocaleString('en-IN');
  };

  return (
    <View style={styles.investmentCard}>
      <View style={styles.investmentHeader}>
        <View style={[styles.investmentIcon, { backgroundColor: config.color + '20' }]}>
          <AntDesign name={config.icon} size={22} color={config.color} />
        </View>
        <View style={styles.investmentInfo}>
          <Text style={styles.investmentName}>{investment.name}</Text>
          <Text style={styles.investmentType}>{investment.type}</Text>
        </View>
        <View style={[styles.returnBadge, { backgroundColor: isPositive ? '#10B98120' : '#EF444420' }]}>
          <AntDesign
            name={isPositive ? 'arrowup' : 'arrowdown'}
            size={12}
            color={isPositive ? '#10B981' : '#EF4444'}
          />
          <Text style={[styles.returnText, { color: isPositive ? '#10B981' : '#EF4444' }]}>
            {isPositive ? '+' : ''}{investment.returnPercent}%
          </Text>
        </View>
      </View>

      <View style={styles.investmentDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Invested</Text>
          <Text style={styles.detailValue}>{formatCurrency(investment.invested)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Current Value</Text>
          <Text style={[styles.detailValue, { color: '#10B981' }]}>
            {formatCurrency(investment.currentValue)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Maturity</Text>
          <Text style={styles.detailValue}>{investment.maturityDate}</Text>
        </View>
      </View>
    </View>
  );
};

export default function FamilyInvestmentsScreen() {
  const insets = useSafeAreaInsets();

  const totalInvested = investments.reduce((s, i) => s + i.invested, 0);
  const totalCurrent = investments.reduce((s, i) => s + i.currentValue, 0);
  const totalReturns = totalCurrent - totalInvested;
  const returnPercent = ((totalReturns / totalInvested) * 100);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return '₹' + (amount / 10000000).toFixed(2) + 'Cr';
    if (amount >= 100000) return '₹' + (amount / 100000).toFixed(1) + 'L';
    return '₹' + amount.toLocaleString('en-IN');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Family Investments</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => Alert.alert('Add Investment', 'Record a new investment')}
        >
          <AntDesign name="plus" size={18} color="#0A0A0A" />
          <Text style={styles.addButtonText}>Add Investment</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.portfolioCard}>
        <View style={styles.portfolioRow}>
          <View style={styles.portfolioItem}>
            <Text style={styles.portfolioLabel}>Total Invested</Text>
            <Text style={styles.portfolioValue}>{formatCurrency(totalInvested)}</Text>
          </View>
          <View style={styles.portfolioItem}>
            <Text style={styles.portfolioLabel}>Current Value</Text>
            <Text style={[styles.portfolioValue, { color: '#10B981' }]}>
              {formatCurrency(totalCurrent)}
            </Text>
          </View>
        </View>
        <View style={styles.portfolioReturnRow}>
          <AntDesign name="arrowup" size={16} color="#10B981" />
          <Text style={styles.portfolioReturnText}>
            Returns: {formatCurrency(totalReturns)} (+{returnPercent.toFixed(1)}%)
          </Text>
        </View>
        <View style={styles.overallBarBg}>
          <View style={[styles.overallBarFill, { width: '100%' }]} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {investments.map(inv => (
          <InvestmentCard key={inv.id} investment={inv} />
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
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A0A0A',
  },
  portfolioCard: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  portfolioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  portfolioItem: {
    flex: 1,
  },
  portfolioLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  portfolioValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  portfolioReturnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  portfolioReturnText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  overallBarBg: {
    height: 4,
    backgroundColor: '#2C2C2E',
    borderRadius: 2,
    overflow: 'hidden',
  },
  overallBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  investmentCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  investmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  investmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  investmentInfo: {
    flex: 1,
  },
  investmentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  investmentType: {
    fontSize: 12,
    color: '#6B7280',
  },
  returnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  returnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  investmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F9FAFB',
  },
});
