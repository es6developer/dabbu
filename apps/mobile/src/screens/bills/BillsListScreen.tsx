import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListSkeleton } from '../../components/ui/AnimatedSkeleton';

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
  const names = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
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
    <View
      style={[
        styles.monthSection,
        { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
      ]}
    >
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
          <AntDesign  name="down" size={20} color={colors.text.tertiary} />
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
    <TouchableOpacity
      style={[
        styles.billCard,
        { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.billCardLeft}>
        <View style={styles.categoryDot}>
          <AntDesign  name="filetext1" size={14} color="#FFFFFF" />
        </View>
        <View style={styles.billCardInfo}>
          <Text style={[styles.billMerchant, { color: colors.text.primary }]} numberOfLines={1}>
            {bill.merchant}
          </Text>
          <View style={styles.billCardMeta}>
            <View style={[styles.categoryBadge, { backgroundColor: `${colors.accent.primary}18` }]}>
              <Text style={[styles.categoryBadgeText, { color: colors.accent.primary }]}>
                {((bill.category as any)?.name || bill.category || '')}
              </Text>
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
        <Text style={[styles.billAmount, { color: colors.text.primary }]}>
          {formatCurrency(bill.amount)}
        </Text>
        <Text style={[styles.billDate, { color: colors.text.tertiary }]}>
          {formatDate(bill.date)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ComparisonCard({
  groups,
  colors,
  onCompare,
}: {
  groups: MonthlyGroup[];
  colors: any;
  onCompare: (g1: MonthlyGroup, g2: MonthlyGroup) => void;
}) {
  if (groups.length < 2) {
    return null;
  }

  const latest = groups[0];
  const previous = groups[1];
  const diff = latest.totalAmount - previous.totalAmount;
  const pct = previous.totalAmount > 0 ? (diff / previous.totalAmount) * 100 : 0;
  const isUp = diff > 0;

  return (
    <TouchableOpacity
      style={[
        styles.comparisonCard,
        { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
      ]}
      onPress={() => onCompare(latest, previous)}
      activeOpacity={0.7}
    >
      <View style={styles.comparisonHeader}>
        <AntDesign  name="linechart" size={18} color={colors.accent.primary} />
        <Text style={[styles.comparisonTitle, { color: colors.text.primary }]}>
          {getMonthName(latest.month)} vs {getMonthName(previous.month)}
        </Text>
        <AntDesign  name="right" size={16} color={colors.text.tertiary} />
      </View>
      <View style={styles.comparisonBody}>
        <View style={styles.comparisonCol}>
          <Text style={[styles.comparisonLabel, { color: colors.text.tertiary }]}>
            {getMonthName(latest.month)}
          </Text>
          <Text
            style={[
              styles.comparisonAmount,
              { color: isUp ? colors.status.error : colors.status.success },
            ]}
          >
            {formatCurrency(latest.totalAmount)}
          </Text>
        </View>
        <View style={[styles.comparisonDivider, { backgroundColor: colors.border.subtle }]} />
        <View style={styles.comparisonCol}>
          <Text style={[styles.comparisonLabel, { color: colors.text.tertiary }]}>
            {getMonthName(previous.month)}
          </Text>
          <Text style={[styles.comparisonAmount, { color: colors.text.primary }]}>
            {formatCurrency(previous.totalAmount)}
          </Text>
        </View>
      </View>
      <View style={[styles.comparisonFooter, { borderTopColor: colors.border.subtle }]}>
        <AntDesign
          name={(isUp ? 'arrowup' : 'arrowdown') as any}
          size={14}
          color={isUp ? colors.status.error : colors.status.success}
        />
        <Text
          style={[
            styles.comparisonFooterText,
            { color: isUp ? colors.status.error : colors.status.success },
          ]}
        >
          {isUp ? 'Increased' : 'Decreased'} by {formatCurrency(Math.abs(diff))} (
          {Math.abs(pct).toFixed(1)}%)
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ colors, onScan }: { colors: any; onScan: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.accent.primary}15` }]}>
        <AntDesign  name="filetext1" size={56} color={colors.accent.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No Bills Yet</Text>
      <Text style={[styles.emptyDesc, { color: colors.text.primary }]}>
        Scan your first receipt or bill to start managing expenses automatically.
      </Text>
      <View style={[styles.emptyBtn, { backgroundColor: colors.accent.primary }]}>
        <TouchableOpacity style={styles.emptyBtnInner} onPress={onScan} activeOpacity={0.8}>
          <AntDesign  name="camera" size={20} color="#FFFFFF" />
          <Text style={styles.emptyBtnText}>Scan Your First Bill</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function LoadingState() {
  return (
    <View style={styles.loadingContainer}>
      <ListSkeleton count={3} />
    </View>
  );
}

export function BillsListScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const [groups, setGroups] = useState<MonthlyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const loadBills = useCallback(async (silent = false, refresh = false) => {
    try {
      if (refresh) setRefreshing(true); else if (!silent) setLoading(true);
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.get<any>('/bills/monthly');
      if (Array.isArray(res)) {
        setGroups(res);
        if (res.length > 0 && expandedMonths.size === 0) {
          setExpandedMonths(new Set([`${res[0].year}-${res[0].month}`]));
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

  useSilentRefresh(
    useCallback((isInitial) => {
      loadBills(!isInitial);
    }, [loadBills]),
  );

  function toggleMonth(key: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
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
    loadBills(false, true);
  }

  if (loading && groups.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
        <LoadingState />
      </View>
    );
  }

  const totalSpent = groups.reduce((sum, g) => sum + g.totalAmount, 0);
  const totalBills = groups.reduce((sum, g) => sum + g.count, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.headerGradient, { backgroundColor: colors.bg.primary }]}>
        <View style={[styles.headerContent, { paddingTop: insets.top + 12 }]}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Bills</Text>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.bg.tertiary }]}>
            <AntDesign  name="setting" size={22} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {error && groups.length === 0 ? (
            <View style={styles.errorContainer}>
              <AntDesign  name="cloudo" size={56} color={colors.status.error} />
              <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
                Failed to Load
              </Text>
              <Text style={[styles.errorDesc, { color: colors.text.tertiary }]}>{error}</Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.accent.primary }]}
                onPress={() => {
                  setLoading(true);
                  loadBills();
                }}
              >
                <AntDesign  name="reload1" size={20} color="#FFFFFF" />
                <Text style={styles.emptyBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : groups.length === 0 ? (
            <EmptyState colors={colors} onScan={() => navigation.navigate('BillScanner')} />
          ) : (
            <>
              <View
                style={[
                  styles.summaryBar,
                  { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                ]}
              >
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>
                    Total Spent
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
                    {formatCurrency(totalSpent)}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border.subtle }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>Bills</Text>
                  <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
                    {totalBills}
                  </Text>
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
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: {
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { padding: 22, paddingBottom: 100 },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    padding: 22,
    marginBottom: 20,
    borderWidth: 1.5,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: { fontSize: 26, fontWeight: '800' },
  summaryDivider: { width: 1, height: 36, marginHorizontal: 20 },
  comparisonCard: {
    borderRadius: 30,
    borderWidth: 1.5,
    padding: 22,
    marginBottom: 20,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  comparisonTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  comparisonBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  comparisonCol: { flex: 1, alignItems: 'center' },
  comparisonLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comparisonAmount: { fontSize: 26, fontWeight: '800' },
  comparisonDivider: { width: 1, height: 32, marginHorizontal: 14 },
  comparisonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  comparisonFooterText: { fontSize: 12, fontWeight: '700' },
  monthSection: {
    borderRadius: 30,
    borderWidth: 1.5,
    marginBottom: 14,
    overflow: 'hidden',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 22,
  },
  monthHeaderLeft: { flex: 1 },
  monthName: { fontSize: 19, fontWeight: '800', marginBottom: 4 },
  monthMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthTotal: { fontSize: 16, fontWeight: '700' },
  monthCount: { fontSize: 16, fontWeight: '500' },
  monthBills: { paddingHorizontal: 24, paddingBottom: 8 },
  billCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 30,
    borderWidth: 1.5,
    marginBottom: spacing.lg,
  },
  billCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 },
  categoryDot: {
    width: 36,
    height: 36,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billCardInfo: { flex: 1 },
  billMerchant: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  billCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  categoryBadgeText: { fontSize: 12, fontWeight: '700' },
  billItems: { fontSize: 12, fontWeight: '500' },
  billCardRight: { alignItems: 'flex-end', marginLeft: 14 },
  billAmount: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  billDate: { fontSize: 12, fontWeight: '500' },
  emptyContainer: { flex: 1, alignItems: 'center', paddingVertical: 60, paddingHorizontal: 36 },
  emptyIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  emptyTitle: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  emptyDesc: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 36,
    fontWeight: '500',
  },
  emptyBtn: { borderRadius: 30, width: '100%' },
  emptyBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  emptyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  loadingContainer: { padding: 22, paddingTop: 44 },
  shimmerCard: { borderRadius: 30, borderWidth: 1.5, padding: 22, marginBottom: 14 },
  shimmerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  shimmerCircle: { width: 40, height: 40, borderRadius: 28 },
  shimmerLine: { height: 12, borderRadius: 12 },
  errorContainer: { flex: 1, alignItems: 'center', paddingVertical: 44, paddingHorizontal: 36 },
  errorTitle: { fontSize: 26, fontWeight: '800', marginTop: 20, marginBottom: 8 },
  errorDesc: { fontSize: 16, textAlign: 'center', marginBottom: 28, fontWeight: '500' },
});
