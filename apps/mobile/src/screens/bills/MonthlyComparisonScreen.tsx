import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { DetailSkeleton } from '../../components/ui/AnimatedSkeleton';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

interface PriceChange {
  name: string;
  month1Price: number;
  month2Price: number;
  diff: number;
  diffPercent: number;
}

interface MonthData {
  label: string;
  totalAmount: number;
  billCount: number;
  items: { name: string; price: number }[];
}

interface ComparisonData {
  month1: MonthData;
  month2: MonthData;
  differences: {
    onlyInMonth1: { name: string; price: number }[];
    onlyInMonth2: { name: string; price: number }[];
    priceChanges: PriceChange[];
  };
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

function SummaryCard({
  month,
  year,
  summary,
  colors,
  accent,
}: {
  month: number;
  year: number;
  summary: { totalAmount: number; billCount: number };
  colors: any;
  accent: string;
}) {
  return (
    <View
      style={[
        styles.summaryCard,
        { backgroundColor: colors.bg.glassLight, borderColor: colors.border.subtle },
      ]}
    >
      <View style={[styles.summaryAccent, { backgroundColor: accent }]} />
      <Text style={[styles.summaryMonth, { color: colors.text.primary }]}>
        {getMonthName(month)} {year}
      </Text>
      <View style={styles.summaryRow}>
        <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>Total Spent</Text>
        <Text style={[styles.summaryAmount, { color: colors.text.primary }]}>
          {formatCurrency(summary.totalAmount)}
        </Text>
      </View>
      <View style={[styles.summaryDivider, { backgroundColor: colors.border.subtle }]} />
      <View style={styles.summaryRow}>
        <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>Bills</Text>
        <Text style={[styles.summaryValue, { color: colors.text.secondary }]}>
          {summary.billCount}
        </Text>
      </View>
    </View>
  );
}

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <View style={[styles.sectionHeader, { borderBottomColor: colors.border.subtle }]}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{title}</Text>
    </View>
  );
}

function ItemRow({ name, price, colors }: { name: string; price?: number; colors: any }) {
  return (
    <View style={[styles.itemRow, { borderBottomColor: colors.border.subtle }]}>
      <View style={[styles.itemDot, { backgroundColor: `${colors.accent.primary}20` }]}>
        <AntDesign  name="appstore1" size={14} color={colors.accent.primary} />
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: colors.text.primary }]}>{name}</Text>
        {price !== undefined ? (
          <Text style={[styles.itemSubtitle, { color: colors.text.tertiary }]}>
            {formatCurrency(price)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function PriceChangeRow({ item, colors }: { item: PriceChange; colors: any }) {
  const isIncrease = item.diff > 0;
  const diff = Math.abs(item.diff);
  const pct = Math.abs(item.diffPercent);
  return (
    <View style={[styles.priceRow, { borderBottomColor: colors.border.subtle }]}>
      <View style={styles.priceItemInfo}>
        <View
          style={[
            styles.itemDot,
            {
              backgroundColor: isIncrease
                ? `${colors.status.error}22`
                : `${colors.status.success}22`,
            },
          ]}
        >
          <AntDesign
            name={(isIncrease ? 'arrowup' : 'arrowdown') as any}
            size={14}
            color={isIncrease ? colors.status.error : colors.status.success}
          />
        </View>
        <Text style={[styles.priceItemName, { color: colors.text.primary }]}>{item.name}</Text>
      </View>
      <View style={styles.priceDetails}>
        <View style={styles.pricePair}>
          <Text style={[styles.priceOld, { color: colors.text.tertiary }]}>
            {formatCurrency(item.month1Price)}
          </Text>
          <AntDesign
             name="arrowright"
            size={12}
            color={colors.text.tertiary}
            style={{ marginHorizontal: 4 }}
          />
          <Text
            style={[
              styles.priceNew,
              { color: isIncrease ? colors.status.error : colors.status.success },
            ]}
          >
            {formatCurrency(item.month2Price)}
          </Text>
        </View>
        <View
          style={[
            styles.priceDiffBadge,
            {
              backgroundColor: isIncrease
                ? `${colors.status.error}15`
                : `${colors.status.success}15`,
            },
          ]}
        >
          <Text
            style={[
              styles.priceDiffText,
              { color: isIncrease ? colors.status.error : colors.status.success },
            ]}
          >
            {isIncrease ? '+' : ''}
            {formatCurrency(diff)} ({isIncrease ? '+' : ''}
            {pct.toFixed(1)}%)
          </Text>
        </View>
      </View>
    </View>
  );
}

export function MonthlyComparisonScreen() {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const { accessToken } = useAuth();
  const { month1, year1, month2, year2 } = route.params;

  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    fetchComparison();
  }, [accessToken]);

  async function fetchComparison() {
    try {
      const res = await api.get<any>(
        `/bills/comparison?month1=${month1}&year1=${year1}&month2=${month2}&year2=${year2}`,
      );
      if (res) {
        setData(res);
      } else {
        throw new Error('Invalid response');
      }
    } catch (e: any) {
      setError(e.message || 'Could not load comparison data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg.primary }]}>
        <DetailSkeleton />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg.primary }]}>
        <View style={[styles.errorIconWrap, { backgroundColor: `${colors.status.error}18` }]}>
          <AntDesign  name="exclamationcircle" size={32} color={colors.status.error} />
        </View>
        <Text style={[styles.errorText, { color: colors.text.primary }]}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headingUnderline} />
      <Text style={[styles.heading, { color: colors.text.primary }]}>
        {getMonthName(month1)} {year1} vs {getMonthName(month2)} {year2}
      </Text>

      <View style={styles.summaryRowPair}>
        <View style={{ flex: 1 }}>
          <SummaryCard
            month={month1}
            year={year1}
            summary={{
              totalAmount: data?.month1?.totalAmount || 0,
              billCount: data?.month1?.billCount || 0,
            }}
            colors={colors}
            accent={colors.accent.primary}
          />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <SummaryCard
            month={month2}
            year={year2}
            summary={{
              totalAmount: data?.month2?.totalAmount || 0,
              billCount: data?.month2?.billCount || 0,
            }}
            colors={colors}
            accent={colors.text.secondary}
          />
        </View>
      </View>

      {data?.differences?.onlyInMonth1 && data.differences.onlyInMonth1.length > 0 && (
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.bg.glassLight, borderColor: colors.border.subtle },
          ]}
        >
          <View style={[styles.sectionAccent, { backgroundColor: colors.accent.primary }]} />
          <SectionHeader title={`Only in ${getMonthName(month1)} ${year1}`} colors={colors} />
          {data.differences.onlyInMonth1.map((item, i) => (
            <ItemRow key={i} name={item.name} price={item.price} colors={colors} />
          ))}
        </View>
      )}

      {data?.differences?.onlyInMonth2 && data.differences.onlyInMonth2.length > 0 && (
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.bg.glassLight, borderColor: colors.border.subtle },
          ]}
        >
          <View style={[styles.sectionAccent, { backgroundColor: colors.text.secondary }]} />
          <SectionHeader title={`Only in ${getMonthName(month2)} ${year2}`} colors={colors} />
          {data.differences.onlyInMonth2.map((item, i) => (
            <ItemRow key={i} name={item.name} price={item.price} colors={colors} />
          ))}
        </View>
      )}

      {data?.differences?.priceChanges && data.differences.priceChanges.length > 0 && (
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.bg.glassLight, borderColor: colors.border.subtle },
          ]}
        >
          <View style={[styles.sectionAccent, { backgroundColor: colors.status.warning }]} />
          <SectionHeader title="Price Changes" colors={colors} />
          <Text style={[styles.priceChangeSubtitle, { color: colors.text.tertiary }]}>
            Items bought in both months with price differences
          </Text>
          {data.differences.priceChanges.map((item, i) => (
            <PriceChangeRow key={i} item={item} colors={colors} />
          ))}
        </View>
      )}

      {(!data?.differences?.onlyInMonth1 || data.differences.onlyInMonth1.length === 0) &&
        (!data?.differences?.onlyInMonth2 || data.differences.onlyInMonth2.length === 0) &&
        (!data?.differences?.priceChanges || data.differences.priceChanges.length === 0) && (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.bg.glassLight, borderColor: colors.border.subtle },
            ]}
          >
            <View style={styles.emptyIconWrap}>
              <AntDesign  name="linechart" size={28} color="#FFFFFF" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              No Differences Found
            </Text>
            <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
              Both months have identical spending patterns.
            </Text>
          </View>
        )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 22, paddingBottom: 120 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headingUnderline: { height: 4, width: 60, borderRadius: 4, marginBottom: 14, marginTop: 8 },
  heading: { fontSize: 26, fontWeight: '800', marginBottom: 24, letterSpacing: -0.3 },
  summaryRowPair: { flexDirection: 'row', marginBottom: 24 },
  summaryCard: {
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 22,
    overflow: 'hidden',
  },
  summaryAccent: {
    height: 3,
    borderRadius: 4,
    marginBottom: 14,
    marginHorizontal: -16,
    marginTop: -16,
  },
  summaryMonth: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryDivider: { height: 1, marginVertical: 4, marginBottom: 8 },
  summaryLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryAmount: { fontSize: 26, fontWeight: '800' },
  summaryValue: { fontSize: 16, fontWeight: '600' },
  sectionCard: {
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 22,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sectionAccent: {
    height: 3,
    borderRadius: 4,
    marginBottom: 16,
    marginHorizontal: -16,
    marginTop: -16,
  },
  sectionHeader: { borderBottomWidth: 1, paddingBottom: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemDot: {
    width: 28,
    height: 28,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600' },
  itemSubtitle: { fontSize: 12, marginTop: 2 },
  priceRow: { paddingVertical: 18, borderBottomWidth: 1 },
  priceItemInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  priceItemName: { fontSize: 16, fontWeight: '600', flex: 1 },
  priceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 38,
  },
  pricePair: { flexDirection: 'row', alignItems: 'center' },
  priceOld: { fontSize: 16, textDecorationLine: 'line-through' },
  priceNew: { fontSize: 16, fontWeight: '700' },
  priceDiffBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  priceDiffText: { fontSize: 12, fontWeight: '700' },
  priceChangeSubtitle: { fontSize: 12, marginBottom: 8 },
  emptyCard: { borderRadius: 28, borderWidth: 1.5, padding: 36, alignItems: 'center', gap: 16 },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { fontSize: 16, textAlign: 'center', lineHeight: 19 },
  errorIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: { fontSize: 16, marginTop: 20, textAlign: 'center', paddingHorizontal: 36 },
});
