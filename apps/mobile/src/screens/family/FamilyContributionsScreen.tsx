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

interface Contribution {
  id: string;
  memberName: string;
  amount: number;
  date: string;
  purpose: string;
  avatar: keyof typeof AntDesign.glyphMap;
}

interface MemberTotal {
  name: string;
  total: number;
  count: number;
  avatar: keyof typeof AntDesign.glyphMap;
}

const months = ['May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026'];

const contributions: Contribution[] = [
  { id: '1', memberName: 'Rajesh Sharma', amount: 25000, date: '15 Jun 2026', purpose: 'Monthly Pool', avatar: 'user' },
  { id: '2', memberName: 'Priya Sharma', amount: 15000, date: '14 Jun 2026', purpose: 'Monthly Pool', avatar: 'user' },
  { id: '3', memberName: 'Rajesh Sharma', amount: 50000, date: '10 Jun 2026', purpose: 'Emergency Fund', avatar: 'user' },
  { id: '4', memberName: 'Suresh Sharma', amount: 10000, date: '08 Jun 2026', purpose: 'Monthly Pool', avatar: 'user' },
  { id: '5', memberName: 'Priya Sharma', amount: 8000, date: '05 Jun 2026', purpose: 'Groceries', avatar: 'user' },
  { id: '6', memberName: 'Rajesh Sharma', amount: 12000, date: '01 Jun 2026', purpose: 'Education Fund', avatar: 'user' },
  { id: '7', memberName: 'Suresh Sharma', amount: 15000, date: '28 May 2026', purpose: 'Emergency Fund', avatar: 'user' },
  { id: '8', memberName: 'Priya Sharma', amount: 22000, date: '25 May 2026', purpose: 'Monthly Pool', avatar: 'user' },
];

const memberTotals: MemberTotal[] = [
  { name: 'Rajesh Sharma', total: 87000, count: 3, avatar: 'user' },
  { name: 'Priya Sharma', total: 45000, count: 3, avatar: 'user' },
  { name: 'Suresh Sharma', total: 25000, count: 2, avatar: 'user' },
];

const ContributionCard: React.FC<{ item: Contribution }> = ({ item }) => {
  const formatCurrency = (amount: number) => '₹' + amount.toLocaleString('en-IN');

  return (
    <View style={styles.contributionCard}>
      <View style={styles.contribAvatar}>
        <AntDesign name={item.avatar} size={20} color="#10B981" />
      </View>
      <View style={styles.contribInfo}>
        <Text style={styles.contribName}>{item.memberName}</Text>
        <View style={styles.contribMeta}>
          <Text style={styles.contribPurpose}>{item.purpose}</Text>
          <Text style={styles.contribDate}>{item.date}</Text>
        </View>
      </View>
      <Text style={styles.contribAmount}>{formatCurrency(item.amount)}</Text>
    </View>
  );
};

const MemberSummaryCard: React.FC<{ member: MemberTotal }> = ({ member }) => {
  const formatCurrency = (amount: number) => '₹' + amount.toLocaleString('en-IN');

  return (
    <View style={styles.memberSummaryCard}>
      <View style={styles.memberSummaryAvatar}>
        <AntDesign name={member.avatar} size={18} color="#10B981" />
      </View>
      <View style={styles.memberSummaryInfo}>
        <Text style={styles.memberSummaryName}>{member.name}</Text>
        <Text style={styles.memberSummaryCount}>{member.count} contributions</Text>
      </View>
      <Text style={styles.memberSummaryAmount}>{formatCurrency(member.total)}</Text>
    </View>
  );
};

export default function FamilyContributionsScreen() {
  const insets = useSafeAreaInsets();
  const [activeMonth, setActiveMonth] = useState(1);

  const formatCurrency = (amount: number) => '₹' + amount.toLocaleString('en-IN');
  const grandTotal = contributions.reduce((s, c) => s + c.amount, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contributions</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => Alert.alert('Add Contribution', 'Record a new contribution')}
        >
          <AntDesign name="plus" size={18} color="#0A0A0A" />
          <Text style={styles.addButtonText}>Add Contribution</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grandTotalCard}>
        <Text style={styles.grandTotalLabel}>Total Contributions</Text>
        <Text style={styles.grandTotalAmount}>{formatCurrency(grandTotal)}</Text>
      </View>

      <View style={styles.monthTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthTabsContent}>
          {months.map((month, index) => (
            <TouchableOpacity
              key={month}
              style={[styles.monthTab, index === activeMonth && styles.monthTabActive]}
              onPress={() => setActiveMonth(index)}
            >
              <Text style={[styles.monthTabText, index === activeMonth && styles.monthTabTextActive]}>
                {month}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Member Summary</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.memberSummaryScroll}
          contentContainerStyle={styles.memberSummaryContent}
        >
          {memberTotals.map(m => (
            <MemberSummaryCard key={m.name} member={m} />
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>History</Text>
        {contributions.map(c => (
          <ContributionCard key={c.id} item={c} />
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
  grandTotalCard: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  grandTotalLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  grandTotalAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: -0.5,
  },
  monthTabs: {
    marginBottom: 12,
  },
  monthTabsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  monthTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
  },
  monthTabActive: {
    backgroundColor: '#10B981',
  },
  monthTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  monthTabTextActive: {
    color: '#0A0A0A',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  memberSummaryScroll: {
    marginBottom: 20,
  },
  memberSummaryContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  memberSummaryCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 220,
  },
  memberSummaryAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A2E2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberSummaryInfo: {
    flex: 1,
  },
  memberSummaryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  memberSummaryCount: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  memberSummaryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  contributionCard: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contribAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A2E2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contribInfo: {
    flex: 1,
  },
  contribName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  contribMeta: {
    flexDirection: 'row',
    gap: 10,
  },
  contribPurpose: {
    fontSize: 12,
    color: '#10B981',
  },
  contribDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  contribAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F9FAFB',
  },
});
