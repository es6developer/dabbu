import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated, LayoutAnimation,
  Platform, UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface BillItem {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  date: string;
  itemCount: number;
  confidence: number;
}

interface MonthlyGroup {
  year: number;
  month: number;
  totalAmount: number;
  count: number;
  bills: BillItem[];
}

function getMonthName(m: number): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[m - 1] || '';
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function AccordionSection({
  group,
  expanded,
  onToggle,
  colors,
  onBillPress,
}: {
  group: MonthlyGroup;
  expanded: boolean;
  onToggle: () => void;
  colors: any;
  onBillPress: (bill: BillItem) => void;
}) {
  const rotateAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={[styles.monthSection, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
      <TouchableOpacity style={styles.monthHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.monthHeaderLeft}>
          <Text style={[styles.monthName, { color: colors.text.primary }]}>
            {getMonthName(group.month)} {group.year}
          </Text>
          <View style={styles.monthMeta}>
            <Text style={[styles.monthTotal, { color: colors.accent.primary }]}>
              {formatCurrency(group.totalAmount)}
            </Text>
            <Text style={[styles.monthCount, { color: colors.text.tertiary }]}>
              {group.count} bill{group.count !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={20} color={colors.text.tertiary} />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.monthBills}>
          {group.bills.map((bill) => (
            <BillCard key={bill.id} bill={bill} colors={colors} onPress={() => onBillPress(bill)} />
          ))}
        </View>
      )}
    </View>
  );
}

function BillCard({ bill, colors, onPress }: { bill: BillItem; colors: any; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.billCard, { borderColor: colors.border.subtle }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.billCardLeft}>
        <View style={[styles.categoryDot, { backgroundColor: `${colors.accent.primary}22` }]}>
          <Ionicons name="receipt" size={14} color={colors.accent.primary} />
        </View>
        <View style={styles.billCardInfo}>
          <Text style={[styles.billMerchant, { color: colors.text.primary }]} numberOfLines={1}>
            {bill.merchant}
          </Text>
          <View style={styles.billCardMeta}>
            <View style={[styles.categoryBadge, { backgroundColor: `${colors.accent.primary}15` }]}>
              <Text style={[styles.categoryBadgeText, { color: colors.accent.primary }]}>{bill.category}</Text>
            </View>
            {bill.itemCount > 0 && (
              <Text style={[styles.billItems, { color: colors.text.tertiary }]}>
                {bill.itemCount} item{bill.itemCount !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>
      </View>
      <View style={styles.billCardRight}>
        <Text style={[styles.billAmount, { color: colors.text.primary }]}>{formatCurrency(bill.amount)}</Text>
        <Text style={[styles.billDate, { color: colors.text.tertiary }]}>{formatDate(bill.date)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ComparisonCard({ groups, colors, onCompare }: { groups: MonthlyGroup[]; colors: any; onCompare: (g1: MonthlyGroup, g2: MonthlyGroup) => void }) {
  if (groups.length < 2) return null;

  const latest = groups[0];
  const previous = groups[1];
  const diff = latest.totalAmount - previous.totalAmount;
  const pct = previous.totalAmount > 0 ? (diff / previous.totalAmount) * 100 : 0;
  const isUp = diff > 0;

  return (
    <TouchableOpacity
      style={[styles.comparisonCard, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}
      onPress={() => onCompare(latest, previous)}
      activeOpacity={0.7}
    >
      <View style={styles.comparisonHeader}>
        <Ionicons name="trending-up" size={18} color={colors.accent.primary} />
        <Text style={[styles.comparisonTitle, { color: colors.text.primary }]}>
          {getMonthName(latest.month)} vs {getMonthName(previous.month)}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
      </View>
      <View style={styles.comparisonBody}>
        <View style={styles.comparisonCol}>
          <Text style={[styles.comparisonLabel, { color: colors.text.tertiary }]}>{getMonthName(latest.month)}</Text>
          <Text style={[styles.comparisonAmount, { color: isUp ? colors.status.error : colors.status.success }]}>
            {formatCurrency(latest.totalAmount)}
          </Text>
        </View>
        <View style={[styles.comparisonDivider, { backgroundColor: colors.border.subtle }]} />
        <View style={styles.comparisonCol}>
          <Text style={[styles.comparisonLabel, { color: colors.text.tertiary }]}>{getMonthName(previous.month)}</Text>
          <Text style={[styles.comparisonAmount, { color: colors.text.primary }]}>
            {formatCurrency(previous.totalAmount)}
          </Text>
        </View>
      </View>
      <View style={[styles.comparisonFooter, { borderTopColor: colors.border.subtle }]}>
        <Ionicons name={isUp ? 'arrow-up' : 'arrow-down'} size={14} color={isUp ? colors.status.error : colors.status.success} />
        <Text style={[styles.comparisonFooterText, { color: isUp ? colors.status.error : colors.status.success }]}>
          {isUp ? 'Increased' : 'Decreased'} by {formatCurrency(Math.abs(diff))} ({Math.abs(pct).toFixed(1)}%)
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ colors, onScan }: { colors: any; onScan: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.accent.primary}15` }]}>
        <Ionicons name="receipt-outline" size={56} color={colors.accent.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No Bills Yet</Text>
      <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
        Scan your first receipt or bill to start managing expenses automatically.
      </Text>
      <TouchableOpacity
        style={[styles.emptyBtn, { backgroundColor: colors.accent.primary }]}
        onPress={onScan}
      >
        <Ionicons name="camera" size={20} color="#FFFFFF" />
        <Text style={styles.emptyBtnText}>Scan Your First Bill</Text>
      </TouchableOpacity>
    </View>
  );
}

function LoadingState({ colors }: { colors: any }) {
  return (
    <View style={styles.loadingContainer}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.shimmerCard, { backgroundColor: colors.skeleton.base, borderColor: colors.border.subtle }]}>
          <View style={styles.shimmerRow}>
            <View style={[styles.shimmerCircle, { backgroundColor: colors.skeleton.highlight }]} />
            <View style={{ flex: 1 }}>
              <View style={[styles.shimmerLine, { width: '60%', backgroundColor: colors.skeleton.highlight }]} />
              <View style={[styles.shimmerLine, { width: '40%', backgroundColor: colors.skeleton.highlight, marginTop: 6 }]} />
            </View>
            <View>
              <View style={[styles.shimmerLine, { width: 80, backgroundColor: colors.skeleton.highlight }]} />
              <View style={[styles.shimmerLine, { width: 60, backgroundColor: colors.skeleton.highlight, marginTop: 6 }]} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function BillsListScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<MonthlyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const loadBills = useCallback(async () => {
    try {
      if (accessToken) setAccessToken(accessToken);
      const res = await api.get<any>('/bills/monthly');
      if (res.success && Array.isArray(res.data)) {
        setGroups(res.data);
        if (res.data.length > 0 && expandedMonths.size === 0) {
          setExpandedMonths(new Set([`${res.data[0].year}-${res.data[0].month}`]));
        }
      } else {
        setGroups([]);
      }
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load bills');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      loadBills();
    }, [loadBills])
  );

  function toggleMonth(key: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleBillPress(bill: BillItem) {
    navigation.navigate('BillDetail', { billId: bill.id });
  }

  function handleCompare(g1: MonthlyGroup, g2: MonthlyGroup) {
    navigation.navigate('MonthlyComparison', {
      month1: g1.month,
      year1: g1.year,
      month2: g2.month,
      year2: g2.year,
    });
  }

  function onRefresh() {
    setRefreshing(true);
    loadBills();
  }

  if (loading && groups.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
        <LoadingState colors={colors} />
      </View>
    );
  }

  const totalSpent = groups.reduce((sum, g) => sum + g.totalAmount, 0);
  const totalBills = groups.reduce((sum, g) => sum + g.count, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />
        }
      >
        {error && groups.length === 0 ? (
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline-outline" size={56} color={colors.status.error} />
            <Text style={[styles.errorTitle, { color: colors.text.primary }]}>Failed to Load</Text>
            <Text style={[styles.errorDesc, { color: colors.text.tertiary }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.accent.primary }]}
              onPress={() => { setLoading(true); loadBills(); }}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.emptyBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : groups.length === 0 ? (
          <EmptyState colors={colors} onScan={() => navigation.navigate('BillScanner')} />
        ) : (
          <>
            <View style={styles.summaryBar}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>Total Spent</Text>
                <Text style={[styles.summaryValue, { color: colors.text.primary }]}>{formatCurrency(totalSpent)}</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border.subtle }]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>Bills</Text>
                <Text style={[styles.summaryValue, { color: colors.text.primary }]}>{totalBills}</Text>
              </View>
            </View>

            <ComparisonCard groups={groups} colors={colors} onCompare={handleCompare} />

            {groups.map((group) => {
              const key = `${group.year}-${group.month}`;
              return (
                <AccordionSection
                  key={key}
                  group={group}
                  expanded={expandedMonths.has(key)}
                  onToggle={() => toggleMonth(key)}
                  colors={colors}
                  onBillPress={handleBillPress}
                />
              );
            })}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent.primary, bottom: insets.bottom + 100 }]}
        onPress={() => navigation.navigate('BillScanner')}
        activeOpacity={0.8}
      >
        <Ionicons name="camera" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  summaryBar: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, padding: 20, marginBottom: 16,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 22, fontWeight: '700' },
  summaryDivider: { width: 1, height: 36, marginHorizontal: 16 },
  comparisonCard: {
    borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 16,
  },
  comparisonHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  comparisonTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  comparisonBody: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
  },
  comparisonCol: { flex: 1, alignItems: 'center' },
  comparisonLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4, textTransform: 'uppercase' },
  comparisonAmount: { fontSize: 18, fontWeight: '700' },
  comparisonDivider: { width: 1, height: 32, marginHorizontal: 12 },
  comparisonFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingTop: 10, borderTopWidth: 1,
  },
  comparisonFooterText: { fontSize: 12, fontWeight: '600' },
  monthSection: {
    borderRadius: 20, borderWidth: 1, marginBottom: 12, overflow: 'hidden',
  },
  monthHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16,
  },
  monthHeaderLeft: { flex: 1 },
  monthName: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  monthMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthTotal: { fontSize: 15, fontWeight: '600' },
  monthCount: { fontSize: 13 },
  monthBills: { paddingHorizontal: 16, paddingBottom: 8 },
  billCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1,
    marginBottom: 8,
  },
  billCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  categoryDot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  billCardInfo: { flex: 1 },
  billMerchant: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  billCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  categoryBadgeText: { fontSize: 11, fontWeight: '600' },
  billItems: { fontSize: 11 },
  billCardRight: { alignItems: 'flex-end', marginLeft: 12 },
  billAmount: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  billDate: { fontSize: 11 },
  emptyContainer: { flex: 1, alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIconWrap: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16 },
  emptyBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  loadingContainer: { padding: 16, paddingTop: 40 },
  shimmerCard: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 12 },
  shimmerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shimmerCircle: { width: 40, height: 40, borderRadius: 12 },
  shimmerLine: { height: 12, borderRadius: 6 },
  errorContainer: { flex: 1, alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 },
  errorTitle: { fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  errorDesc: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  fab: {
    position: 'absolute', right: 20,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
});
