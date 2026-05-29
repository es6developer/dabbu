import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';

interface FunFact {
  fact: string;
  emoji: string;
}

interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface WrappedData {
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  topCategory: string;
  topCategoryAmount: number;
  totalTransactions: number;
  funFacts: FunFact[];
  funnyInsight: string;
  badges: Badge[];
  achievements: Achievement[];
  currency: string;
}

const formatAmount = (amount: number, currency: string = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
};

const YEARS = [2025, 2024, 2023, 2022, 2021];

export function YearlyWrappedScreen() {
  const { colors, spacing, borderRadius: br, typography } = useTheme();
  const navigation = useNavigation<any>();

  const [data, setData] = useState<WrappedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(2025);

  const fetchWrapped = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await api.get<WrappedData>(`/ai-insights/wrapped?year=${selectedYear}`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load wrapped data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear]);

  useFocusEffect(
    useCallback(() => {
      fetchWrapped();
    }, [fetchWrapped])
  );

  if (loading && !data) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.status.error} />
          <Text style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.md }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => fetchWrapped()}
          >
            <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  const savingsRate = data.totalIncome > 0 ? (data.totalSavings / data.totalIncome) * 100 : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchWrapped(true)}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: colors.text.primary }]}>Dabbu Wrapped</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.yearSelector}
        >
          {YEARS.map(year => (
            <TouchableOpacity
              key={year}
              style={[styles.yearChip, {
                backgroundColor: selectedYear === year ? colors.accent.primary : colors.bg.card,
                borderColor: selectedYear === year ? colors.accent.primary : colors.border.subtle,
              }]}
              onPress={() => setSelectedYear(year)}
            >
              <Text style={[typography.calloutBold, {
                color: selectedYear === year ? '#FFFFFF' : colors.text.secondary,
              }]}>
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Card padding={0} style={styles.heroCard}>
          <LinearGradient
            colors={[...colors.accent.gradient] as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <Text style={styles.heroEmoji}>🎉</Text>
            <Text style={styles.heroTitle}>Dabbu Wrapped {selectedYear}</Text>
            <Text style={styles.heroSubtitle}>{data.totalTransactions} transactions this year</Text>
          </LinearGradient>
        </Card>

        <View style={styles.statsGrid}>
          <Card variant="elevated" padding="lg" style={styles.statCard}>
            <Text style={[typography.subhead, { color: colors.text.tertiary }]}>Income</Text>
            <Text style={[typography.amountSmall, { color: colors.status.success, marginTop: 4 }]}>
              {formatAmount(data.totalIncome, data.currency)}
            </Text>
          </Card>
          <Card variant="elevated" padding="lg" style={styles.statCard}>
            <Text style={[typography.subhead, { color: colors.text.tertiary }]}>Expenses</Text>
            <Text style={[typography.amountSmall, { color: colors.status.error, marginTop: 4 }]}>
              {formatAmount(data.totalExpense, data.currency)}
            </Text>
          </Card>
          <Card variant="elevated" padding="lg" style={styles.statCard}>
            <Text style={[typography.subhead, { color: colors.text.tertiary }]}>Savings</Text>
            <Text style={[typography.amountSmall, { color: colors.accent.primary, marginTop: 4 }]}>
              {formatAmount(data.totalSavings, data.currency)}
            </Text>
          </Card>
          <Card variant="elevated" padding="lg" style={styles.statCard}>
            <Text style={[typography.subhead, { color: colors.text.tertiary }]}>Savings Rate</Text>
            <Text style={[typography.amountSmall, { color: colors.accent.primary, marginTop: 4 }]}>
              {savingsRate.toFixed(1)}%
            </Text>
          </Card>
        </View>

        {data.topCategory && (
          <View style={styles.section}>
            <Card variant="premium" padding="lg">
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.topCatIcon, { backgroundColor: colors.accent.primary + '20' }]}>
                  <Ionicons name="trophy" size={24} color={colors.accent.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[typography.subhead, { color: colors.text.tertiary }]}>Top Category</Text>
                  <Text style={[typography.h3, { color: colors.text.primary, marginTop: 2 }]}>
                    {data.topCategory}
                  </Text>
                </View>
                <Text style={[typography.bodyBold, { color: colors.accent.primary }]}>
                  {formatAmount(data.topCategoryAmount, data.currency)}
                </Text>
              </View>
            </Card>
          </View>
        )}

        {data.funFacts.length > 0 && (
          <View style={styles.section}>
            <Text style={[typography.h4, { color: colors.text.primary }]}>Fun Facts</Text>
            {data.funFacts.map((fact, index) => (
              <Card key={index} variant="glass" padding="lg" style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 22, marginRight: 12 }}>{fact.emoji}</Text>
                  <Text style={[typography.callout, { color: colors.text.secondary, flex: 1, lineHeight: 22 }]}>
                    {fact.fact}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {data.funnyInsight && (
          <View style={styles.section}>
            <Card variant="outlined" padding="lg" style={{ borderColor: colors.accent.primary + '30' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="bulb-outline" size={20} color={colors.accent.primary} />
                <Text style={[typography.h4, { color: colors.text.primary, marginLeft: 10 }]}>AI Insight</Text>
              </View>
              <Text style={[typography.callout, { color: colors.text.secondary, lineHeight: 22, fontStyle: 'italic' }]}>
                "{data.funnyInsight}"
              </Text>
            </Card>
          </View>
        )}

        {data.badges.length > 0 && (
          <View style={styles.section}>
            <Text style={[typography.h4, { color: colors.text.primary }]}>Badges</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesRow}>
              {data.badges.map(badge => (
                <Card key={badge.id} variant="elevated" padding="lg" style={styles.badgeCard}>
                  <Text style={{ fontSize: 36 }}>{badge.emoji}</Text>
                  <Text style={[typography.subheadBold, { color: colors.text.primary, marginTop: 8, textAlign: 'center' }]}>
                    {badge.name}
                  </Text>
                  <Text style={[typography.caption1, { color: colors.text.tertiary, textAlign: 'center', marginTop: 4 }]}>
                    {badge.description}
                  </Text>
                </Card>
              ))}
            </ScrollView>
          </View>
        )}

        {data.achievements.length > 0 && (
          <View style={styles.section}>
            <Text style={[typography.h4, { color: colors.text.primary }]}>Achievements</Text>
            {data.achievements.map((achievement, index) => (
              <Card key={achievement.id} variant="glass" padding="lg" style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 28, marginRight: 14 }}>{achievement.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.calloutBold, { color: colors.text.primary }]}>
                      {achievement.title}
                    </Text>
                    <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 2 }]}>
                      {achievement.description}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  retryButton: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  yearSelector: { paddingHorizontal: 20, gap: 10, paddingVertical: 4 },
  yearChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  heroCard: { marginHorizontal: 20, marginTop: 16, borderRadius: 24, overflow: 'hidden' },
  heroGradient: { padding: 32, alignItems: 'center' },
  heroEmoji: { fontSize: 48, marginBottom: 12 },
  heroTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 20, marginTop: 20, gap: 10 },
  statCard: { width: '47%' },
  section: { marginTop: 28, paddingHorizontal: 20 },
  topCatIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  badgesRow: { gap: 12, paddingVertical: 10 },
  badgeCard: { width: 130, alignItems: 'center' },
});
