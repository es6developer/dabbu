import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, spacing } from '../../theme';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';

interface MemberRanking {
  id: string;
  name: string;
  role: string;
  contribution: number;
  label: string;
}

interface PersonalityData {
  archetype: string;
  description: string;
  vibe: string;
  spendingHabits: string;
  funnyInsight: string;
  memberCount: number;
  totalSpent: number;
  currency: string;
  memberRankings: MemberRanking[];
}

const ARCHETYPE_GRADIENTS: Record<string, [string, string]> = {
  'The Spender': ['#f7892c', '#f9a85c'],
  'The Saver': ['#00B894', '#55EFC4'],
  'The Investor': ['#74B9FF', '#A29BFE'],
  'The Budgeter': ['#FDCB6E', '#F39C12'],
  'The Generous': ['#FF6B6B', '#EE5A24'],
  'The Minimalist': ['#636E72', '#B2BEC3'],
  'The Social Butterfly': ['#FD79A8', '#E84393'],
  'The Host': ['#A29BFE', '#6C5CE7'],
};

const ARCHETYPE_EMOJIS: Record<string, string> = {
  'The Spender': '💸',
  'The Saver': '🐷',
  'The Investor': '📈',
  'The Budgeter': '📋',
  'The Generous': '🎁',
  'The Minimalist': '🧘',
  'The Social Butterfly': '🦋',
  'The Host': '🏠',
};

function AnimatedNumber({ value, style }: { value: number; style?: any }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    animatedValue.setValue(0);
    const listener = animatedValue.addListener(({ value: v }) => {
      setDisplayValue(Math.round(v));
    });
    Animated.timing(animatedValue, {
      toValue: value,
      duration: 1200,
      useNativeDriver: false,
    }).start();
    return () => animatedValue.removeListener(listener);
  }, [value]);

  return <Text style={style}>{displayValue.toLocaleString('en-IN')}</Text>;
}

const formatAmount = (amount: number, currency: string = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
};

export function GroupPersonalityScreen() {
  const { colors, spacing, borderRadius: br, typography } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: { groupId: string } }, 'params'>>();
  const { groupId } = route.params;

  const [data, setData] = useState<PersonalityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPersonality = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await api.get<PersonalityData>(`/ai-insights/groups/${groupId}/personality`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load group personality');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      fetchPersonality();
    }, [fetchPersonality])
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
            onPress={() => fetchPersonality()}
          >
            <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  const archetypeGradient = ARCHETYPE_GRADIENTS[data.archetype] || colors.accent.gradient;
  const archetypeEmoji = ARCHETYPE_EMOJIS[data.archetype] || '🌟';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchPersonality(true)}
            tintColor={colors.accent.primary}
            colors={[colors.accent.primary]}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: colors.text.primary }]}>Group Personality</Text>
          <View style={{ width: 24 }} />
        </View>

        <Card padding={0} style={styles.archetypeCard}>
          <LinearGradient
            colors={archetypeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.archetypeGradient}
          >
            <Text style={styles.archetypeEmoji}>{archetypeEmoji}</Text>
            <Text style={styles.archetypeTitle}>{data.archetype}</Text>
            <Text style={styles.archetypeDesc}>{data.description}</Text>
          </LinearGradient>
        </Card>

        <View style={styles.statsRow}>
          <Card variant="glass" padding="lg" style={styles.statCard}>
            <Text style={[typography.caption1, { color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
              Vibe
            </Text>
            <Text style={[typography.bodyBold, { color: colors.text.primary, marginTop: spacing.xs }]}>
              {data.vibe}
            </Text>
          </Card>
          <Card variant="glass" padding="lg" style={styles.statCard}>
            <Text style={[typography.caption1, { color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
              Total Spent
            </Text>
            <Text style={[typography.bodyBold, { color: colors.text.primary, marginTop: spacing.xs }]}>
              {formatAmount(data.totalSpent, data.currency)}
            </Text>
          </Card>
        </View>

        <View style={styles.section}>
          <Card variant="elevated" padding="lg">
            <View style={styles.sectionHeader}>
              <Ionicons name="cart-outline" size={18} color={colors.accent.primary} />
              <Text style={[typography.h4, { color: colors.text.primary, marginLeft: spacing.sm }]}>
                Spending Habits
              </Text>
            </View>
            <Text style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.md, lineHeight: 22 }]}>
              {data.spendingHabits}
            </Text>
          </Card>
        </View>

        {data.memberRankings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trophy-outline" size={18} color={colors.accent.primary} />
              <Text style={[typography.h4, { color: colors.text.primary, marginLeft: spacing.sm }]}>
                Member Ranking
              </Text>
            </View>
            <Card variant="elevated" padding="sm" style={{ marginTop: spacing.md }}>
              {data.memberRankings.map((member, index) => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.rankingRow,
                    index < data.memberRankings.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
                  ]}
                >
                  <View style={[styles.rankBadge, { backgroundColor: index === 0 ? colors.accent.primary + '25' : colors.bg.tertiary }]}>
                    <Text style={[typography.subheadBold, { color: index === 0 ? colors.accent.primary : colors.text.secondary }]}>
                      #{index + 1}
                    </Text>
                  </View>
                  <View style={[styles.rankAvatar, { backgroundColor: archetypeGradient[0] + '25' }]}>
                    <Text style={[styles.rankAvatarText, { color: archetypeGradient[0] }]}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.rankInfo}>
                    <Text style={[typography.calloutBold, { color: colors.text.primary }]}>{member.name}</Text>
                    <Text style={[typography.subhead, { color: colors.text.tertiary }]}>{member.label}</Text>
                  </View>
                  <Text style={[typography.amountSmall, { color: colors.accent.primary }]}>
                    {member.contribution.toFixed(1)}%
                  </Text>
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        )}

        <View style={styles.section}>
          <Card variant="outlined" padding="lg" style={{ borderColor: colors.accent.primary + '30' }}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb-outline" size={18} color={colors.accent.primary} />
              <Text style={[typography.h4, { color: colors.text.primary, marginLeft: spacing.sm }]}>
                Funny Insight
              </Text>
            </View>
            <Text style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.md, lineHeight: 22, fontStyle: 'italic' }]}>
              "{data.funnyInsight}"
            </Text>
          </Card>
        </View>

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
  archetypeCard: { marginHorizontal: 20, marginTop: 8, borderRadius: 24, overflow: 'hidden' },
  archetypeGradient: { padding: 28, alignItems: 'center' },
  archetypeEmoji: { fontSize: 48, marginBottom: 12 },
  archetypeTitle: { fontSize: 26, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  archetypeDesc: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  statsRow: { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, gap: 12 },
  statCard: { flex: 1 },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center' },
  rankingRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: spacing.sm,
  },
  rankBadge: { width: 32, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  rankAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  rankAvatarText: { fontSize: 16, fontWeight: '700' },
  rankInfo: { flex: 1, marginLeft: 12 },
});
