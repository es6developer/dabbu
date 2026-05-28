import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, spacing } from '../../theme';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';

interface DayExpense {
  day: number;
  date: string;
  title: string;
  description: string;
  amount: number;
  photoPlaceholder?: string;
}

interface FunFact {
  fact: string;
  emoji: string;
}

interface TripStoryData {
  title: string;
  subtitle: string;
  totalSpent: number;
  groupSize: number;
  currency: string;
  duration: number;
  mood: string;
  moodEmoji: string;
  timeline: DayExpense[];
  funFacts: FunFact[];
  photos: string[];
}

const MOOD_COLORS: Record<string, [string, string]> = {
  'Adventurous': ['#f7892c', '#e17055'],
  'Relaxed': ['#00B894', '#55EFC4'],
  'Fun': ['#FDCB6E', '#F39C12'],
  'Budget': ['#74B9FF', '#A29BFE'],
  'Luxury': ['#FD79A8', '#E84393'],
  'Cultural': ['#A29BFE', '#6C5CE7'],
  'Party': ['#FF6B6B', '#EE5A24'],
};

const formatAmount = (amount: number, currency: string = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
};

const { width } = Dimensions.get('window');

export function TripStoryScreen() {
  const { colors, spacing, borderRadius: br, typography } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: { groupId: string } }, 'params'>>();
  const { groupId } = route.params;

  const [data, setData] = useState<TripStoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStory = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await api.get<TripStoryData>(`/ai-insights/groups/${groupId}/trip-story`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load trip story');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      fetchStory();
    }, [fetchStory])
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
            onPress={() => fetchStory()}
          >
            <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  const moodColors = MOOD_COLORS[data.mood] || colors.accent.gradient;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchStory(true)}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: colors.text.primary }]}>Trip Story</Text>
          <View style={{ width: 24 }} />
        </View>

        <Card padding={0} style={styles.heroCard}>
          <LinearGradient colors={moodColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGradient}>
            <Text style={styles.moodEmoji}>{data.moodEmoji}</Text>
            <Text style={styles.heroTitle}>{data.title}</Text>
            <Text style={styles.heroSubtitle}>{data.subtitle}</Text>
          </LinearGradient>
          <View style={[styles.heroMeta, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={18} color={colors.accent.primary} />
              <Text style={[typography.subheadBold, { color: colors.text.primary, marginLeft: 6 }]}>
                {data.groupSize} people
              </Text>
            </View>
            <View style={[styles.metaDivider, { backgroundColor: colors.border.subtle }]} />
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={18} color={colors.accent.primary} />
              <Text style={[typography.subheadBold, { color: colors.text.primary, marginLeft: 6 }]}>
                {data.duration} days
              </Text>
            </View>
            <View style={[styles.metaDivider, { backgroundColor: colors.border.subtle }]} />
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={18} color={colors.accent.primary} />
              <Text style={[typography.subheadBold, { color: colors.text.primary, marginLeft: 6 }]}>
                {formatAmount(data.totalSpent, data.currency)}
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.moodCard}>
          <Card variant="glass" padding="lg">
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="partly-sunny" size={22} color={colors.accent.primary} />
              <Text style={[typography.calloutBold, { color: colors.text.primary, marginLeft: 10 }]}>
                Trip Mood: {data.mood}
              </Text>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={18} color={colors.accent.primary} />
            <Text style={[typography.h4, { color: colors.text.primary, marginLeft: spacing.sm }]}>
              Timeline
            </Text>
          </View>
          {data.timeline.map((day, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { backgroundColor: colors.accent.primary }]} />
                {index < data.timeline.length - 1 && (
                  <View style={[styles.timelineLine, { backgroundColor: colors.border.subtle }]} />
                )}
              </View>
              <Card variant="elevated" padding="lg" style={styles.timelineCard}>
                <View style={styles.timelineCardHeader}>
                  <View>
                    <Text style={[typography.subhead, { color: colors.accent.primary, fontWeight: '700' }]}>
                      Day {day.day}
                    </Text>
                    <Text style={[typography.bodyBold, { color: colors.text.primary, marginTop: 2 }]}>
                      {day.title}
                    </Text>
                  </View>
                  <Text style={[typography.amountSmall, { color: colors.text.primary }]}>
                    {formatAmount(day.amount, data.currency)}
                  </Text>
                </View>
                <Text style={[typography.callout, { color: colors.text.secondary, marginTop: 6, lineHeight: 20 }]}>
                  {day.description}
                </Text>
              </Card>
            </View>
          ))}
        </View>

        {data.funFacts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb-outline" size={18} color={colors.accent.primary} />
              <Text style={[typography.h4, { color: colors.text.primary, marginLeft: spacing.sm }]}>
                Fun Facts
              </Text>
            </View>
            {data.funFacts.map((fact, index) => (
              <Card key={index} variant="outlined" padding="lg" style={{ marginBottom: 10, borderColor: colors.border.default }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 20, marginRight: 12 }}>{fact.emoji}</Text>
                  <Text style={[typography.callout, { color: colors.text.secondary, flex: 1, lineHeight: 22 }]}>
                    {fact.fact}
                  </Text>
                </View>
              </Card>
            ))}
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
  heroCard: { marginHorizontal: 20, marginTop: 8, borderRadius: 24, overflow: 'hidden' },
  heroGradient: { padding: 32, alignItems: 'center' },
  moodEmoji: { fontSize: 52, marginBottom: 12 },
  heroTitle: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 6 },
  heroMeta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, borderWidth: 1, borderTopWidth: 0,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  metaDivider: { width: 1, height: 20 },
  moodCard: { marginHorizontal: 20, marginTop: 16 },
  section: { marginTop: 28, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  timelineItem: { flexDirection: 'row', marginBottom: 4 },
  timelineLeft: { alignItems: 'center', width: 24, marginRight: 12 },
  timelineDot: { width: 14, height: 14, borderRadius: 7, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, marginTop: 4 },
  timelineCard: { flex: 1, marginBottom: 12 },
  timelineCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
