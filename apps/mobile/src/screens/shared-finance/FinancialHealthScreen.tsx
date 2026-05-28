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

interface HealthMetric {
  label: string;
  value: string;
  score: number;
  icon: keyof typeof Ionicons.glyphMap;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
}

interface FinancialHealthData {
  healthScore: number;
  trustScore: number;
  stressLevel: number;
  metrics: HealthMetric[];
  trendsComparison: string;
  currency: string;
}

function RadialScore({ score, label, size = 160 }: { score: number; label: string; size?: number }) {
  const { colors } = useTheme();
  const radius = size * 0.4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (s: number) => {
    if (s >= 80) return colors.status.success;
    if (s >= 60) return colors.accent.primary;
    if (s >= 40) return colors.status.warning;
    return colors.status.error;
  };

  const scoreColor = getScoreColor(score);

  return (
    <View style={{ alignItems: 'center', width: size }}>
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: colors.bg.tertiary, justifyContent: 'center', alignItems: 'center',
        }}>
          <LinearGradient
            colors={[scoreColor + '20', scoreColor + '40']}
            style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
          />
          <Text style={{ fontSize: size * 0.3, fontWeight: '700', color: scoreColor, letterSpacing: -1 }}>
            {score}
          </Text>
          <Text style={{ fontSize: 11, color: colors.text.tertiary, fontWeight: '600', marginTop: 2 }}>/100</Text>
        </View>
        <View style={{
          position: 'absolute', width: size + 12, height: size + 12, borderRadius: (size + 12) / 2,
          borderWidth: 4, borderColor: colors.bg.tertiary,
        }} />
        <View style={{
          position: 'absolute', width: size + 12, height: size + 12, borderRadius: (size + 12) / 2,
          borderWidth: 4, borderColor: scoreColor, borderLeftColor: 'transparent', borderBottomColor: 'transparent',
          transform: [{ rotateZ: `${-90 + (score / 100) * 360}deg` }],
        }} />
      </View>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginTop: 10, textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  );
}

export function FinancialHealthScreen() {
  const { colors, spacing, borderRadius: br, typography } = useTheme();
  const navigation = useNavigation<any>();

  const [data, setData] = useState<FinancialHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await api.get<FinancialHealthData>('/ai-insights/financial-health');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load financial health');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHealth();
    }, [fetchHealth])
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
            onPress={() => fetchHealth()}
          >
            <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  const stressColor = data.stressLevel <= 30 ? colors.status.success : data.stressLevel <= 60 ? colors.status.warning : colors.status.error;
  const trustColor = data.trustScore >= 70 ? colors.status.success : data.trustScore >= 40 ? colors.accent.primary : colors.status.error;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchHealth(true)}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: colors.text.primary }]}>Financial Health</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.radialRow}>
          <RadialScore score={data.healthScore} label="Health Score" size={150} />
        </View>

        <View style={styles.scoreRow}>
          <Card variant="glass" padding="lg" style={styles.scoreCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.scoreIcon, { backgroundColor: trustColor + '20' }]}>
                <Ionicons name="shield-checkmark" size={20} color={trustColor} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[typography.subhead, { color: colors.text.tertiary }]}>Trust Score</Text>
                <Text style={[typography.h3, { color: trustColor, marginTop: 2 }]}>{data.trustScore}</Text>
              </View>
            </View>
          </Card>
          <Card variant="glass" padding="lg" style={styles.scoreCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.scoreIcon, { backgroundColor: stressColor + '20' }]}>
                <Ionicons name="pulse" size={20} color={stressColor} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[typography.subhead, { color: colors.text.tertiary }]}>Stress Level</Text>
                <Text style={[typography.h3, { color: stressColor, marginTop: 2 }]}>{data.stressLevel}%</Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={[typography.h4, { color: colors.text.primary }]}>Metrics</Text>
          <View style={styles.metricsGrid}>
            {data.metrics.map((metric, index) => {
              const metricColor = metric.score >= 70 ? colors.status.success : metric.score >= 40 ? colors.accent.primary : colors.status.error;
              const trendIcon = metric.trend === 'up' ? 'trending-up' : metric.trend === 'down' ? 'trending-down' : 'remove';
              const trendColor = metric.trend === 'up' ? colors.status.success : metric.trend === 'down' ? colors.status.error : colors.text.tertiary;

              return (
                <Card key={index} variant="elevated" padding="lg" style={styles.metricCard}>
                  <View style={styles.metricHeader}>
                    <View style={[styles.metricIcon, { backgroundColor: metricColor + '15' }]}>
                      <Ionicons name={metric.icon} size={18} color={metricColor} />
                    </View>
                    <View style={[styles.metricTrend, { backgroundColor: trendColor + '15' }]}>
                      <Ionicons name={trendIcon} size={14} color={trendColor} />
                    </View>
                  </View>
                  <Text style={[typography.amountSmall, { color: colors.text.primary, marginTop: spacing.md }]}>
                    {metric.value}
                  </Text>
                  <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 4 }]}>
                    {metric.label}
                  </Text>
                  <View style={[styles.metricBar, { backgroundColor: colors.bg.tertiary, marginTop: 10 }]}>
                    <View style={[styles.metricBarFill, { width: `${metric.score}%`, backgroundColor: metricColor }]} />
                  </View>
                </Card>
              );
            })}
          </View>
        </View>

        {data.trendsComparison && (
          <View style={styles.section}>
            <Card variant="outlined" padding="lg" style={{ borderColor: colors.accent.primary + '30' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Ionicons name="analytics" size={20} color={colors.accent.primary} />
                <Text style={[typography.h4, { color: colors.text.primary, marginLeft: 10 }]}>
                  Trends Comparison
                </Text>
              </View>
              <Text style={[typography.callout, { color: colors.text.secondary, lineHeight: 22 }]}>
                {data.trendsComparison}
              </Text>
            </Card>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  retryButton: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  radialRow: { alignItems: 'center', marginTop: 12, paddingHorizontal: 20 },
  scoreRow: { flexDirection: 'row', marginHorizontal: 20, marginTop: 24, gap: 12 },
  scoreCard: { flex: 1 },
  scoreIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  section: { marginTop: 28, paddingHorizontal: 20 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  metricCard: { width: '47%' },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  metricTrend: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  metricBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  metricBarFill: { height: '100%', borderRadius: 3 },
});
