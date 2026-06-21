import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const H_PADDING = 20;
const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - CARD_GAP) / 2;

interface CardConfig {
  key: string;
  label: string;
  icon: keyof typeof AntDesign.glyphMap;
  accent: string;
  navigateTo: string;
}

const CARDS: CardConfig[] = [
  { key: 'sharedExpenses', label: 'Shared Expenses', icon: 'wallet', accent: '#EF4444', navigateTo: 'Bills' },
  { key: 'sharedIncome', label: 'Shared Income', icon: 'caretdown', accent: '#22C55E', navigateTo: 'Bills' },
  { key: 'familyBudget', label: 'Family Budget', icon: 'piechart', accent: '#3B82F6', navigateTo: 'Budget' },
  { key: 'contributions', label: 'Contribution Tracking', icon: 'addusergroup', accent: '#A78BFA', navigateTo: 'Contributions' },
  { key: 'monthlyAnalysis', label: 'Monthly Analysis', icon: 'linechart', accent: '#F97316', navigateTo: 'Reports' },
  { key: 'cashFlow', label: 'Cash Flow', icon: 'swap', accent: '#14B8A6', navigateTo: 'Reports' },
];

function fmtShort(v: number): string {
  if (v >= 10000000) return '₹' + (v / 10000000).toFixed(1) + 'Cr';
  if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '₹' + (v / 1000).toFixed(1) + 'K';
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmt(v: number): string {
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

interface MoneyCardProps {
  card: CardConfig;
  value: string;
  subtext: string;
  onPress: () => void;
  colors: any;
}

function MoneyCard({ card, value, subtext, onPress, colors }: MoneyCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.bg.card }]}
    >
      <View style={[styles.cardAccent, { backgroundColor: card.accent + '20' }]}>
        <AntDesign name={card.icon} size={22} color={card.accent} />
      </View>
      <Text style={[styles.cardValue, { color: colors.text.primary }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.cardSubtext, { color: colors.text.tertiary }]} numberOfLines={2}>
        {subtext}
      </Text>
      <Text style={[styles.cardLabel, { color: card.accent }]} numberOfLines={1}>
        {card.label}
      </Text>
    </TouchableOpacity>
  );
}

function SkeletonCard({ colors }: { colors: any }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
      <View style={[styles.skelAccent, { backgroundColor: colors.skeleton.base }]} />
      <View style={[styles.skelLine, { backgroundColor: colors.skeleton.base, width: '70%', marginTop: 12 }]} />
      <View style={[styles.skelLine, { backgroundColor: colors.skeleton.base, width: '90%', marginTop: 6 }]} />
      <View style={[styles.skelLine, { backgroundColor: colors.skeleton.base, width: '50%', marginTop: 6 }]} />
    </View>
  );
}

export default function FamilyBillsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [wealth, setWealth] = useState<any>(null);

  const fetchData = useCallback(async (silent = false, refresh = false) => {
    if (refresh) setRefreshing(true); else if (!silent) setLoading(true);
    try {
      const families = await api.get<any>('/family');
      const activeFamily = Array.isArray(families) ? families[0] : null;
      if (!activeFamily) {
        setData(null);
        setWealth(null);
        return;
      }
      const fid = activeFamily.id;
      const [dashRes, wealthRes] = await Promise.allSettled([
        api.get<any>(`/family/dashboard?familyId=${fid}`),
        api.get<any>(`/family/wealth?familyId=${fid}`),
      ]);
      if (dashRes.status === 'fulfilled') setData(dashRes.value);
      if (wealthRes.status === 'fulfilled') setWealth(wealthRes.value);
    } catch {
      /* handled by empty/default state */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useSilentRefresh(useCallback((isInitial) => { fetchData(!isInitial); }, [fetchData]));

  const onRefresh = useCallback(() => {
    fetchData(false, true);
  }, [fetchData]);

  const d = data || {};
  const w = wealth || {};
  const totalExpenses = d.totalExpenses ?? w.totalExpenses ?? 0;
  const totalIncome = d.totalIncome ?? w.totalIncome ?? 0;
  const recentExpenses = d.recentExpenses ?? w.recentExpenses ?? 0;
  const budgetSpent = d.budgetSpent ?? w.budgetSpent ?? 0;
  const budgetLimit = d.budgetLimit ?? w.budgetLimit ?? 0;
  const contributions = d.contributions ?? w.contributions ?? 0;
  const members = d.members ?? w.members ?? 0;
  const monthlyIncome = d.monthlyIncome ?? w.monthlyIncome ?? 0;
  const monthlyExpense = d.monthlyExpense ?? w.monthlyExpense ?? 0;
  const monthlySavings = d.monthlySavings ?? w.monthlySavings ?? 0;
  const netFlow = d.netFlow ?? w.netFlow ?? (totalIncome - totalExpenses);

  const cardValues: Record<string, { value: string; subtext: string }> = {
    sharedExpenses: {
      value: fmtShort(totalExpenses),
      subtext: `₹${recentExpenses.toLocaleString('en-IN')} recent`,
    },
    sharedIncome: {
      value: fmtShort(totalIncome),
      subtext: `This month: ${fmtShort(monthlyIncome)}`,
    },
    familyBudget: {
      value: `${budgetLimit > 0 ? Math.round((budgetSpent / budgetLimit) * 100) : 0}%`,
      subtext: `${fmtShort(budgetSpent)} of ${fmtShort(budgetLimit)}`,
    },
    contributions: {
      value: fmtShort(contributions),
      subtext: `${members} member${members !== 1 ? 's' : ''}`,
    },
    monthlyAnalysis: {
      value: fmtShort(monthlySavings),
      subtext: `↑ ${fmtShort(monthlyIncome)} / ↓ ${fmtShort(monthlyExpense)}`,
    },
    cashFlow: {
      value: netFlow >= 0 ? `+${fmtShort(netFlow)}` : fmtShort(netFlow),
      subtext: netFlow >= 0 ? 'Positive cash flow' : 'Negative cash flow',
    },
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Money</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text.tertiary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.grid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} colors={colors} />
            ))}
          </View>
        ) : (
          <View style={styles.grid}>
            {CARDS.map((card) => {
              const cv = cardValues[card.key];
              return (
                <MoneyCard
                  key={card.key}
                  card={card}
                  value={cv?.value || '₹0'}
                  subtext={cv?.subtext || ''}
                  colors={colors}
                  onPress={() => navigation.navigate(card.navigateTo)}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 100,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  cardAccent: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cardSubtext: {
    fontSize: 12,
    lineHeight: 16,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  skelAccent: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  skelLine: {
    height: 14,
    borderRadius: 7,
  },
});
