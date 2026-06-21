import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';

interface Contribution {
  id: string;
  memberName: string;
  amount: number;
  date: string;
  purpose: string;
  avatar?: keyof typeof AntDesign.glyphMap;
}

interface MemberTotal {
  name: string;
  total: number;
  count: number;
  avatar: keyof typeof AntDesign.glyphMap;
}

const months = ['May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026'];

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
  const [items, setItems] = useState<Contribution[]>([]);
  const [totals, setTotals] = useState<MemberTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();

  const loadData = useCallback(async (silent = false, refresh = false) => {
    if (refresh) setRefreshing(true); else if (!silent) setLoading(true);
    try {
      const res = await api.get('/family-space/contributions');
      const data = (res as any)?.data || res || {};
      const list = Array.isArray(data) ? data : data.contributions || data.items || [];
      const memberSummary = data.memberTotals || data.summary || [];
      setItems(list);
      setTotals(memberSummary);
    } catch {} finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useSilentRefresh(useCallback((isInitial) => { loadData(!isInitial); }, [loadData]));

  const formatCurrency = (amount: number) => '₹' + amount.toLocaleString('en-IN');
  const grandTotal = items.reduce((s, c) => s + c.amount, 0);

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
        <Text style={styles.headerTitle}>Contributions</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateContribution')}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(false, true)} tintColor="#10B981" />}
      >
        {totals.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Member Summary</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.memberSummaryScroll}
              contentContainerStyle={styles.memberSummaryContent}
            >
              {totals.map((m, i) => (
                <MemberSummaryCard key={m.name || i} member={m} />
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.sectionTitle}>History</Text>
        {items.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 40 }}>
            <AntDesign name="caretup" size={44} color="#6B7280" />
            <Text style={{ color: '#F9FAFB', marginTop: 14, fontSize: 18, fontWeight: '600' }}>No contributions yet</Text>
            <Text style={{ color: '#6B7280', marginTop: 6, fontSize: 14, textAlign: 'center' }}>
              Record your first family contribution to start tracking
            </Text>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 16, gap: 8 }}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('CreateContribution')}
            >
              <AntDesign name="plus" size={18} color="#0A0A0A" />
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#0A0A0A' }}>Add Your First Contribution</Text>
            </TouchableOpacity>
          </View>
        ) : items.map(c => (
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
