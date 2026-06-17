import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { getCategoryIcon } from '../../config/categoryIcons';
import { spacing, borderRadius, shadows } from '../../theme/design';

const { width } = Dimensions.get('window');
const BAR_H = 8;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(v: number) {
  return `\u20B9${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function monthLabel(): string {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function pctColor(pct: number, colors: any): string {
  if (pct > 90) {
    return colors.status.error;
  }
  if (pct > 70) {
    return colors.status.warning;
  }
  return colors.status.success;
}

function statusBadge(pct: number): { label: string; bg: string; text: string; icon: string } {
  if (pct > 90) {
    return { label: 'Exceeded', bg: '#FFE5E5', text: '#CC3B3B', icon: 'exclamationcircle' };
  }
  if (pct > 70) {
    return { label: 'Warning', bg: '#FFF4D9', text: '#B8860B', icon: 'warning' };
  }
  return { label: 'Normal', bg: '#E5F9E5', text: '#2E7D32', icon: 'checkcircle' };
}

export function CoupleBudgetsScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [budgetData, setBudgetData] = useState<any>(null);
  const [error, setError] = useState('');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const coupleGroup = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (!coupleGroup) {
        setError('No couple space found. Create a couple group first.');
        setBudgetData(null);
        return;
      }
      const res = await api.get<any>(`/shared-finance/groups/${coupleGroup.id}/couple/budgets`);
      setBudgetData(res || {});
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load budgets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <LoadingScreen />;
  }

  const budget = budgetData?.currentMonth || {};
  const totalBudget = budget.totalBudget ?? 0;
  const totalSpent = budget.totalSpent ?? 0;
  const remaining = Math.max(totalBudget - totalSpent, 0);
  const overallPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const categories: any[] = budgetData?.categories || [];

  if (error && !budgetData) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
        <ScrollView
          contentContainerStyle={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              paddingTop: insets.top + 12,
              paddingBottom: 28,
              paddingHorizontal: 20,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              backgroundColor: colors.accent.primary,
            }}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <AntDesign  name="arrowleft" size={22} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Budgets</Text>
              <View style={{ width: 32 }} />
            </View>
          </View>
          <AntDesign  name="wallet" size={48} color={colors.accent.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text.secondary, marginTop: 12 }]}>
            No Budget Data
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.text.tertiary, textAlign: 'center' }]}>
            {error}
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData(true);
            }}
            tintColor={colors.accent.primary}
          />
        }
      >
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingBottom: 28,
            paddingHorizontal: 20,
            backgroundColor: colors.accent.primary,
          }}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <AntDesign  name="arrowleft" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Budgets</Text>
            <View style={{ width: 32 }} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
          <View style={[styles.heroCard, { backgroundColor: '#FFEBB4' }]}>
            <View style={styles.heroTop}>
              <Text style={styles.heroLabel}>{monthLabel()}</Text>
              <View style={styles.heroBadge}>
                <AntDesign  name="calendar" size={12} color={colors.accent.primary} />
                <Text style={styles.heroBadgeText}> Monthly Budget</Text>
              </View>
            </View>
            <Text style={styles.heroAmount}>{fmt(remaining)}</Text>
            <Text style={styles.heroSub}>Remaining of {fmt(totalBudget)}</Text>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: 'rgba(93,56,181,0.12)', marginTop: 12 },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(overallPct, 100)}%`,
                    backgroundColor:
                      overallPct > 90
                        ? '#FF4D4F'
                        : overallPct > 70
                          ? '#F59E0B'
                          : colors.accent.primary,
                  },
                ]}
              />
            </View>
            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>Spent</Text>
                <Text style={styles.heroStatValue}>{fmt(totalSpent)}</Text>
              </View>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>Budget</Text>
                <Text style={styles.heroStatValue}>{fmt(totalBudget)}</Text>
              </View>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>Used</Text>
                <Text style={styles.heroStatValue}>{overallPct}%</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>
            Category Breakdown
          </Text>

          {categories.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.bg.card }]}>
              <AntDesign name="appstore1" size={32} color={colors.text.tertiary} />
              <Text style={[styles.emptyCardText, { color: colors.text.secondary }]}>
                No categories set up yet
              </Text>
              <Text style={[styles.emptyCardSub, { color: colors.text.tertiary }]}>
                Tap "Adjust Budget" to get started
              </Text>
            </View>
          )}

          {categories.map((cat: any, i: number) => {
            const catBudget = cat.budget ?? 0;
            const catSpent = cat.spent ?? 0;
            const catPct = catBudget > 0 ? Math.round((catSpent / catBudget) * 100) : 0;
            const badge = statusBadge(catPct);
            const icon = getCategoryIcon(cat.category, 'wallet');

            return (
              <View key={cat.id || i} style={[styles.catCard, { backgroundColor: colors.bg.card }]}>
                <View style={styles.catTop}>
                  <View style={styles.catLeft}>
                    <View style={[styles.catIcon, { backgroundColor: colors.accent.primary }]}>
                      <AntDesign name={icon as any} size={16} color="#FFF" />
                    </View>
                    <View>
                      <Text style={[styles.catName, { color: colors.text.primary }]}>
                        {cat.category || 'Category'}
                      </Text>
                      <Text style={[styles.catBudgetText, { color: colors.text.tertiary }]}>
                        {fmt(catBudget)} budget
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <AntDesign name={badge.icon as any} size={10} color={badge.text} />
                    <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.progressBar,
                    { backgroundColor: colors.bg.tertiary, marginTop: 4 },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(catPct, 100)}%`,
                        backgroundColor: pctColor(catPct, colors),
                      },
                    ]}
                  />
                </View>

                <View style={styles.catBottom}>
                  <Text style={[styles.catSpent, { color: colors.text.secondary }]}>
                    Spent: {fmt(catSpent)}
                  </Text>
                  <Text style={[styles.catPctText, { color: pctColor(catPct, colors) }]}>
                    {catPct}%
                  </Text>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={[styles.adjustBtn, { backgroundColor: colors.accent.primary }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CoupleBudgetAdjust')}
          >
            <AntDesign  name="setting" size={18} color="#FFF" />
            <Text style={styles.adjustBtnText}>Adjust Budget</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  heroCard: {
    borderRadius: 24,
    padding: 22,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroLabel: { fontSize: 12, fontWeight: '600', color: '#F97316', letterSpacing: 0.3 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(93,56,181,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  heroBadgeText: { fontSize: 11, fontWeight: '700', color: '#F97316' },
  heroAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F97316',
    letterSpacing: -1,
    marginTop: 4,
  },
  heroSub: { fontSize: 13, fontWeight: '500', color: '#F97316', opacity: 0.7, marginTop: 2 },
  heroStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  heroStatItem: { alignItems: 'center' },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F97316',
    letterSpacing: 0.3,
    opacity: 0.6,
  },
  heroStatValue: { fontSize: 15, fontWeight: '800', color: '#F97316', marginTop: 2 },

  progressBar: { height: BAR_H, borderRadius: BAR_H / 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: BAR_H / 2 },

  sectionLabel: { fontSize: 18, fontWeight: '800', marginTop: 8, marginBottom: -4 },

  catCard: {
    borderRadius: 20,
    padding: 16,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  catTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  catIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: { fontSize: 14, fontWeight: '700' },
  catBudgetText: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  catBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catSpent: { fontSize: 11, fontWeight: '500' },
  catPctText: { fontSize: 12, fontWeight: '700' },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },

  adjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  adjustBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 14 },
  emptyCard: { borderRadius: 20, padding: 32, alignItems: 'center', gap: 8 },
  emptyCardText: { fontSize: 15, fontWeight: '600' },
  emptyCardSub: { fontSize: 12, fontWeight: '500' },
});
