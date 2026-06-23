import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';

const FAMILY_MODULES = [
  { key: 'dashboard', icon: 'appstore-o', label: 'Dashboard', color: '#7C3AED' },
  { key: 'members', icon: 'team', label: 'Members', color: '#3B82F6' },
  { key: 'goals', icon: 'flag', label: 'Goals', color: '#F59E0B' },
  { key: 'bills', icon: 'filetext1', label: 'Bills', color: '#EF4444' },
  { key: 'contributions', icon: 'caretup', label: 'Contributions', color: '#10B981' },
  { key: 'budget', icon: 'piechart', label: 'Budget', color: '#8B5CF6' },
  { key: 'investments', icon: 'caretup', label: 'Investments', color: '#06B6D4' },
  { key: 'insurance', icon: 'Safety', label: 'Insurance', color: '#EC4899' },
  { key: 'emergency', icon: 'warning', label: 'Emergency Fund', color: '#F97316' },
  { key: 'tasks', icon: 'checksquareo', label: 'Tasks', color: '#14B8A6' },
  { key: 'calendar', icon: 'calendar', label: 'Calendar', color: '#6366F1' },
  { key: 'documents', icon: 'folder1', label: 'Documents', color: '#A855F7' },
  { key: 'ai-advisor', icon: 'bulb1', label: 'AI Advisor', color: '#FBBF24' },
  { key: 'reports', icon: 'barschart', label: 'Reports', color: '#64748B' },
  { key: 'vault', icon: 'lock', label: 'Family Vault', color: '#1E293B' },
];

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function fmtCompact(v: number) {
  if (v >= 10000000) return '\u20B9' + (v / 10000000).toFixed(1) + 'Cr';
  if (v >= 100000) return '\u20B9' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '\u20B9' + (v / 1000).toFixed(1) + 'K';
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function FamilySpaceScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiReview, setAiReview] = useState<any>(null);
  const [aiSavings, setAiSavings] = useState<any>(null);

  const loadData = useCallback(async (silent = false, refresh = false) => {
    if (refresh) setRefreshing(true); else if (!silent) setLoading(true);
    try {
      const [famRes, reviewRes, savingsRes] = await Promise.all([
        api.get('/family/dashboard'),
        api.get('/ai/family-advisor/review').catch(() => null),
        api.get('/ai/family-advisor/savings').catch(() => null),
      ]);
      setData((famRes as any)?.data || famRes);
      setAiReview((reviewRes as any)?.data || reviewRes);
      setAiSavings((savingsRes as any)?.data || savingsRes);
    } catch { /* ignore */ } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useSilentRefresh(useCallback((isInitial) => { loadData(!isInitial); }, [loadData]));

  const totalSaved = data?.totalSaved ?? 0;
  const monthlySaved = data?.monthlySaved ?? 0;
  const familyScore = data?.familyScore ?? 0;
  const familyName = data?.name || 'Family';
  const members = data?.members || [];

  const handleModulePress = (mod: typeof FAMILY_MODULES[number]) => {
    if (mod.key === 'dashboard') {
      navigation.navigate('FamilyDashboard');
    } else {
      const routeMap: Record<string, string> = {
        members: 'FamilyMembers',
        goals: 'FamilyGoals',
        bills: 'FamilyBills',
        contributions: 'FamilyContributions',
        budget: 'FamilyBudget',
        investments: 'FamilyInvestments',
        insurance: 'FamilyInsurance',
        emergency: 'FamilyEmergencyFund',
        tasks: 'FamilyTasks',
        calendar: 'FamilyCalendar',
        documents: 'FamilyDocuments',
        'ai-advisor': 'FamilyAIAdvisor',
        reports: 'FamilyReports',
        vault: 'FamilyVault',
      };
      const route = routeMap[mod.key];
      if (route) navigation.navigate(route);
      else navigation.navigate('FamilyModule', { module: mod.key, title: mod.label });
    }
  };

  const maxAvatars = 5;
  const visibleMembers = members.slice(0, maxAvatars);
  const overflow = members.length - maxAvatars;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      {loading && !data ? (
        <View style={styles.loadingContainer}>
          <View style={[styles.skelHero, { backgroundColor: colors.bg.tertiary }]} />
          <View style={styles.skelStatsRow}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={[styles.skelStat, { backgroundColor: colors.bg.tertiary }]} />
            ))}
          </View>
          <View style={styles.skelGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={[styles.skelModule, { backgroundColor: colors.bg.tertiary }]} />
            ))}
          </View>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadData(false, true)} tintColor={colors.accent.primary} />
          }
        >
          <View style={[styles.heroCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
            <View style={styles.heroTop}>
              <View style={styles.heroInfo}>
                <Text style={[styles.heroLabel, { color: colors.text.tertiary }]}>Family Space</Text>
                <Text style={[styles.heroName, { color: colors.text.primary }]}>{familyName}</Text>
                <Text style={[styles.heroMemberCount, { color: colors.text.secondary }]}>
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.heroIconWrap}>
                <AntDesign name="team" size={32} color={colors.accent.primary}  />
              </View>
            </View>
            {members.length > 0 && (
              <View style={styles.avatarRow}>
                {visibleMembers.map((m: any, i: number) => {
                  const avatarColors = [colors.accent.primary, colors.accent.secondary, colors.status.success, colors.status.warning, colors.status.error];
                  const ac = avatarColors[i % avatarColors.length];
                  const name = m?.firstName || m?.email || `Member ${i + 1}`;
                  return (
                    <View
                      key={m?.id || i}
                      style={[styles.avatar, { backgroundColor: `${ac}20`, borderColor: `${ac}40` }]}
                    >
                      <Text style={[styles.avatarText, { color: ac }]}>{getInitials(name)}</Text>
                    </View>
                  );
                })}
                {overflow > 0 && (
                  <View style={[styles.avatar, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}>
                    <Text style={[styles.avatarText, { color: colors.text.tertiary, fontSize: 11 }]}>+{overflow}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <Text style={[styles.statIcon]}>💰</Text>
              <Text style={[styles.statValue, { color: colors.text.primary }]}>{fmtCompact(totalSaved)}</Text>
              <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Total Saved</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <Text style={[styles.statIcon]}>📊</Text>
              <Text style={[styles.statValue, { color: colors.text.primary }]}>{fmtCompact(monthlySaved)}</Text>
              <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>This Month</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <Text style={[styles.statIcon]}>🏆</Text>
              <Text style={[styles.statValue, { color: colors.text.primary }]}>{familyScore}</Text>
              <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Family Score</Text>
            </View>
          </View>

          {/* AI Family Review */}
          {(aiReview || aiSavings) && (
            <View style={[styles.aiSection, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <AntDesign name="bulb1" size={18} color="#FBBF24" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>AI Family Insights</Text>
              </View>
              {aiReview?.summary && (
                <Text style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 18, marginBottom: 8 }}>{aiReview.summary}</Text>
              )}
              {aiReview?.highlights && Array.isArray(aiReview.highlights) && aiReview.highlights.slice(0, 3).map((h: string, i: number) => (
                <View key={i} style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                  <Text style={{ color: colors.status.success }}>✓</Text>
                  <Text style={{ fontSize: 12, color: colors.text.secondary, flex: 1 }}>{h}</Text>
                </View>
              ))}
              {aiSavings?.recommendations && Array.isArray(aiSavings.recommendations) && aiSavings.recommendations.slice(0, 2).map((r: string, i: number) => (
                <View key={i} style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                  <Text style={{ color: colors.status.warning }}>💡</Text>
                  <Text style={{ fontSize: 12, color: colors.text.secondary, flex: 1 }}>{r}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.grid}>
            {FAMILY_MODULES.map((mod) => (
              <TouchableOpacity
                key={mod.key}
                style={[styles.moduleCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
                activeOpacity={0.7}
                onPress={() => handleModulePress(mod)}
              >
                <View style={[styles.moduleIcon, { backgroundColor: `${mod.color}15` }]}>
                  <AntDesign name={mod.icon as any} size={22} color={mod.color} />
                </View>
                <Text style={[styles.moduleLabel, { color: colors.text.primary }]} numberOfLines={2}>
                  {mod.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
  loadingContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  skelHero: { height: 120, borderRadius: 20, marginBottom: 16 },
  skelStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  skelStat: { flex: 1, height: 80, borderRadius: 16 },
  skelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skelModule: { width: '31%', aspectRatio: 1, borderRadius: 16 },

  heroCard: {
    borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroInfo: { flex: 1 },
  heroLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroName: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  heroMemberCount: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  heroIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: -6 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarText: { fontSize: 11, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, borderRadius: 16, borderWidth: 1, padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  statLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moduleCard: {
    width: '31%', borderRadius: 16, borderWidth: 1, paddingVertical: 16, paddingHorizontal: 6,
    alignItems: 'center', gap: 8, minHeight: 96,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  moduleIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  moduleLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 15 },
  aiSection: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 16 },
});
