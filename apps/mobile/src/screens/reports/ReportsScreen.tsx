import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useApiGet } from '../../hooks/useApi';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { spacing, borderRadius, shadows } from '../../theme/design';

function fmt(v: number) {
  return `\u20B9${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

const MONTH_NAMES = [
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

const CAT_COLORS: Record<string, string> = {
  Food: '#FF6B6B',
  Rent: '#60A5FA',
  Travel: '#34C759',
  Shopping: '#14B8A6',
  Bills: '#F59E0B',
  Fuel: '#FF4D4F',
  Medical: '#FF4D4F',
  Entertainment: '#14B8A6',
  Groceries: '#14B8A6',
  Utilities: '#60A5FA',
  Transport: '#34C759',
  Education: '#14B8A6',
  Healthcare: '#FF4D4F',
  Insurance: '#F59E0B',
  Salary: '#34C759',
  Investment: '#14B8A6',
  Dining: '#FF6B6B',
  Other: '#64748B',
};

function DonutChart({
  data,
  size = 160,
  bgColor = '#1E293B',
  centerBg = '#0F172A',
  totalColor = '#F8FAFC',
  totalLabelColor = '#64748B',
}: {
  data: { name: string; amount: number; color: string; pct: number }[];
  size?: number;
  bgColor?: string;
  centerBg?: string;
  totalColor?: string;
  totalLabelColor?: string;
}) {
  const total = data.reduce((s, c) => s + c.amount, 0);
  if (total === 0) {
    return null;
  }
  const sorted = [...data].sort((a, b) => b.amount - a.amount);

  return (
    <View style={{ alignItems: 'center', marginVertical: 12 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {sorted.map((cat, i) => {
          const pct = (cat.amount / total) * 100;
          const angle = (pct / 100) * 360;
          const rotation = sorted.slice(0, i).reduce((s, c) => s + (c.amount / total) * 360, 0);
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: size,
                height: size,
                transform: [{ rotate: `${rotation}deg` }],
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: size / 2,
                  width: size / 2,
                  height: size / 2,
                  backgroundColor: cat.color,
                  borderTopRightRadius: size / 2,
                  opacity: 1,
                }}
              />
            </View>
          );
        })}
        <View
          style={{
            width: size * 0.55,
            height: size * 0.55,
            borderRadius: (size * 0.55) / 2,
            backgroundColor: centerBg,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '800', color: totalColor }}>{fmt(total)}</Text>
          <Text style={{ fontSize: 10, fontWeight: '600', color: totalLabelColor }}>Total</Text>
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 12,
          marginTop: 16,
        }}
      >
        {sorted.slice(0, 5).map((cat, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.color }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>{cat.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ReportsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [exporting, setExporting] = useState<'file1' | 'excel' | 'csv' | null>(null);

  const handleExport = async (format: 'file1' | 'excel' | 'csv') => {
    setExporting(format);
    try {
      const { downloadAndShareFile } = await import('../../utils/exportFile');
      await downloadAndShareFile('/reports/export', { type: 'monthly', format }, `dabbu-report`, format);
    } catch (e: any) {
      const { Alert } = require('react-native');
      Alert.alert('Export Failed', e.message || 'Could not export report');
    } finally {
      setExporting(null);
    }
  };

  const {
    data: stats,
    loading,
    refreshing,
    refresh,
  } = useApiGet<any>('/transactions/stats?months=6');

  const monthlyData = useMemo(() => {
    if (!stats?.monthlyTrend) {
      return [] as { label: string; amount: number }[];
    }
    return (stats.monthlyTrend as any[]).map((d: any) => {
      const parts = (d.month || '').split('-');
      const label = parts.length === 2 ? MONTH_NAMES[parseInt(parts[1]) - 1] || d.month : d.month;
      return { label, amount: d.expense || 0 };
    });
  }, [stats]);

  const categoryData = useMemo(() => {
    if (!stats?.categoryBreakdown) {
      return [] as { name: string; amount: number; color: string; pct: number }[];
    }
    const total =
      (stats.categoryBreakdown as any[]).reduce((s: number, c: any) => s + (c.amount || 0), 0) || 1;
    return (stats.categoryBreakdown as any[]).map((c: any) => ({
      name: c.name || 'Uncategorized',
      amount: c.amount || 0,
      color: CAT_COLORS[c.name] || colors.accent.primary,
      pct: Math.round((c.amount / total) * 100),
    }));
  }, [stats]);

  const summary = stats?.summary || {};
  const monthlySpend = summary.totalExpense ?? 0;
  const income = summary.totalIncome ?? 0;
  const savings = summary.netSavings ?? 0;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

  const maxAmount = monthlyData.length > 0 ? Math.max(...monthlyData.map((d: any) => d.amount)) : 1;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.accent.primary}
          />
        }
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
      >
        {/* Header */}
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: spacing['2xl'], paddingBottom: spacing.lg }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Text
              style={{
                fontSize: 28,
                fontWeight: '800',
                color: colors.text.primary,
                letterSpacing: -0.5,
              }}
            >
              Reports
            </Text>
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: `${colors.accent.primary}10`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AntDesign  name="calendar" size={20} color={colors.accent.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={{ paddingHorizontal: spacing['2xl'], gap: 12, marginBottom: spacing.xl }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: colors.bg.secondary,
                borderRadius: borderRadius.lg,
                padding: 18,
                ...shadows.sm,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: `${colors.status.error}15`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <AntDesign  name="up" size={16} color={colors.status.error} />
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: colors.text.tertiary,
                  marginBottom: 4,
                }}
              >
                Monthly Spend
              </Text>
              <Text
                style={{ fontSize: 22, fontWeight: '800', color: '#FF4D4F', letterSpacing: -0.5 }}
              >
                {fmt(monthlySpend)}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: colors.bg.secondary,
                borderRadius: borderRadius.lg,
                padding: 18,
                ...shadows.sm,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: `${colors.status.success}15`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <AntDesign  name="down" size={16} color={colors.status.success} />
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: colors.text.tertiary,
                  marginBottom: 4,
                }}
              >
                Income
              </Text>
              <Text
                style={{ fontSize: 22, fontWeight: '800', color: '#34C759', letterSpacing: -0.5 }}
              >
                {fmt(income)}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: colors.bg.secondary,
                borderRadius: borderRadius.lg,
                padding: 18,
                ...shadows.sm,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: `${colors.accent.primary}15`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <AntDesign  name="linechart" size={16} color={colors.accent.primary} />
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: colors.text.tertiary,
                  marginBottom: 4,
                }}
              >
                Savings
              </Text>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '800',
                  color: colors.accent.primary,
                  letterSpacing: -0.5,
                }}
              >
                {fmt(savings)}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: colors.bg.secondary,
                borderRadius: borderRadius.lg,
                padding: 18,
                ...shadows.sm,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: `${colors.status.warning}15`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <AntDesign  name="piechart" size={16} color={colors.status.warning} />
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: colors.text.tertiary,
                  marginBottom: 4,
                }}
              >
                Savings Rate
              </Text>
              <Text
                style={{ fontSize: 22, fontWeight: '800', color: '#F59E0B', letterSpacing: -0.5 }}
              >
                {savingsRate}%
              </Text>
            </View>
          </View>
        </View>

        {/* Monthly Trend */}
        {monthlyData.length > 0 && (
          <View
            style={{
              marginHorizontal: spacing['2xl'],
              backgroundColor: colors.bg.card,
              borderRadius: borderRadius.xl,
              padding: 20,
              marginBottom: 16,
              ...shadows.md,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: colors.text.primary,
                marginBottom: 8,
              }}
            >
              Monthly Trend
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: colors.text.tertiary,
                marginBottom: 20,
              }}
            >
              Spending over the last 6 months
            </Text>
            <View style={{ height: 160, justifyContent: 'flex-end' }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  height: 140,
                }}
              >
                {monthlyData.map((d: { label: string; amount: number }, i: number) => {
                  const barH = (d.amount / maxAmount) * 130;
                  return (
                    <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                      <Text
                        style={{ fontSize: 10, fontWeight: '700', color: colors.text.tertiary }}
                      >
                        {fmt(d.amount)}
                      </Text>
                      <View
                        style={{
                          width: '60%',
                          height: Math.max(barH, 4),
                          borderRadius: 6,
                          backgroundColor: colors.accent.primary,
                          minHeight: 4,
                          opacity: 0.8 + (barH / 130) * 0.2,
                        }}
                      />
                      <Text
                        style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}
                      >
                        {d.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Category Breakdown - Donut */}
        {categoryData.length > 0 && (
          <View
            style={{
              marginHorizontal: spacing['2xl'],
              backgroundColor: colors.bg.card,
              borderRadius: borderRadius.xl,
              padding: 20,
              marginBottom: 16,
              ...shadows.md,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: colors.text.primary,
                marginBottom: 4,
              }}
            >
              Category Breakdown
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: colors.text.tertiary,
                marginBottom: 8,
              }}
            >
              Where your money went
            </Text>
            <DonutChart
              data={categoryData}
              size={160}
              bgColor={colors.bg.card}
              centerBg={colors.bg.primary}
              totalColor={colors.text.primary}
              totalLabelColor={colors.text.secondary}
            />
            {categoryData.map(
              (cat: { name: string; amount: number; color: string; pct: number }, i: number) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 8,
                    borderBottomWidth: i < categoryData.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border.subtle,
                  }}
                >
                  <View
                    style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.color }}
                  />
                  <Text
                    style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.text.primary }}
                    numberOfLines={1}
                  >
                    {cat.name}
                  </Text>
                  <View
                    style={{
                      flex: 1,
                      height: 6,
                      backgroundColor: colors.bg.tertiary,
                      borderRadius: 3,
                      overflow: 'hidden',
                      marginHorizontal: 8,
                    }}
                  >
                    <View
                      style={{
                        height: '100%',
                        borderRadius: 3,
                        width: `${cat.pct}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: colors.text.secondary,
                      minWidth: 60,
                      textAlign: 'right',
                    }}
                  >
                    {fmt(cat.amount)}
                  </Text>
                </View>
              ),
            )}
          </View>
        )}

        {/* Income vs Expense Summary */}
        {income > 0 && monthlySpend > 0 && (
          <View
            style={{
              marginHorizontal: spacing['2xl'],
              backgroundColor: colors.bg.card,
              borderRadius: borderRadius.xl,
              padding: 20,
              marginBottom: 16,
              ...shadows.md,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: colors.text.primary,
                marginBottom: 16,
              }}
            >
              Income vs Expenses
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View
                style={{
                  flex: 1,
                  padding: 16,
                  backgroundColor: `${colors.status.success}10`,
                  borderRadius: borderRadius.md,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: colors.text.tertiary,
                    marginBottom: 4,
                  }}
                >
                  INCOME
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#34C759' }}>
                  {fmt(income)}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  padding: 16,
                  backgroundColor: `${colors.status.error}10`,
                  borderRadius: borderRadius.md,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: colors.text.tertiary,
                    marginBottom: 4,
                  }}
                >
                  EXPENSES
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#FF4D4F' }}>
                  {fmt(monthlySpend)}
                </Text>
              </View>
            </View>
            {savings >= 0 ? (
              <View
                style={{
                  marginTop: 12,
                  padding: 14,
                  backgroundColor: `${colors.status.success}08`,
                  borderRadius: borderRadius.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: `${colors.status.success}15`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AntDesign  name="checkcircleo" size={18} color="#34C759" />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#34C759', flex: 1 }}>
                  You saved {fmt(savings)} this period ({savingsRate}% of income)
                </Text>
              </View>
            ) : (
              <View
                style={{
                  marginTop: 12,
                  padding: 14,
                  backgroundColor: `${colors.status.error}08`,
                  borderRadius: borderRadius.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: `${colors.status.error}15`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AntDesign  name="exclamationcircle" size={18} color="#FF4D4F" />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#FF4D4F', flex: 1 }}>
                  You spent {fmt(Math.abs(savings))} more than you earned
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Export */}
        <View style={{ marginHorizontal: spacing['2xl'], marginBottom: 32 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.text.primary,
              marginBottom: 12,
            }}
          >
            Export Report
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: colors.bg.card,
                borderRadius: borderRadius.lg,
                padding: 16,
                alignItems: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: colors.border.subtle,
                opacity: exporting === 'file1' ? 0.6 : 1,
              }}
              activeOpacity={0.7}
              disabled={!!exporting}
              onPress={() => handleExport('file1')}
            >
              {exporting === 'file1' ? (
                <ActivityIndicator size="small" color={colors.accent.primary} />
              ) : (
                <AntDesign name="filetext1" size={24} color={colors.accent.primary} />
              )}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text.secondary }}>
                PDF
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: colors.bg.card,
                borderRadius: borderRadius.lg,
                padding: 16,
                alignItems: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: colors.border.subtle,
                opacity: exporting === 'excel' ? 0.6 : 1,
              }}
              activeOpacity={0.7}
              disabled={!!exporting}
              onPress={() => handleExport('excel')}
            >
              {exporting === 'excel' ? (
                <ActivityIndicator size="small" color={colors.status.success} />
              ) : (
                <AntDesign name="appstore1" size={24} color={colors.status.success} />
              )}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text.secondary }}>
                Excel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: colors.bg.card,
                borderRadius: borderRadius.lg,
                padding: 16,
                alignItems: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: colors.border.subtle,
                opacity: exporting === 'csv' ? 0.6 : 1,
              }}
              activeOpacity={0.7}
              disabled={!!exporting}
              onPress={() => handleExport('csv')}
            >
              {exporting === 'csv' ? (
                <ActivityIndicator size="small" color={colors.status.warning} />
              ) : (
                <AntDesign name="codesquare" size={24} color={colors.status.warning}  />
              )}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text.secondary }}>
                CSV
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
});
