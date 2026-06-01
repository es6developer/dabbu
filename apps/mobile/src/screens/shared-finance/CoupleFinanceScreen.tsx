import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

function fmt(v: number) {
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function CoupleFinanceScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { accessToken, user: currentUser } = useAuth();
  const { colors, isDark } = useTheme();

  const [couple, setCouple] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  const loadData = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        const res = await api.get<any>('/couple-finance');
        const data = res?.data || res;
        setCouple(data);
      } catch (e: any) {
        if (e.message !== 'Session expired. Please login again.') {
          setError(e.message || 'Unable to load');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  async function sendInvite() {
    if (!partnerEmail.trim()) {
      Alert.alert('Email required', "Enter your partner's email");
      return;
    }
    setSendingInvite(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.post('/couple-finance/invite', { email: partnerEmail.trim() });
      Alert.alert('Invite Sent', `Invitation sent to ${partnerEmail.trim()}`);
      setPartnerEmail('');
      await loadData(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send invite');
    } finally {
      setSendingInvite(false);
    }
  }

  const partner = couple?.partner;
  const hasPartner = !!partner;
  const myName = currentUser?.firstName || 'You';
  const partnerName = partner?.firstName || partner?.email || 'Partner';
  const ratio = couple?.contributionRatio || { mine: 70, partner: 30 };
  const sharedSavings = Number(couple?.sharedSavings || 0);
  const totalSpent = Number(couple?.totalSpent || 0);
  const monthlyBudget = Number(couple?.monthlyBudget || 0);
  const budgetUsed = totalSpent > 0 ? (totalSpent / Math.max(monthlyBudget, 1)) * 100 : 0;
  const mySalary = Number(couple?.mySalary || 0);
  const partnerSalary = Number(couple?.partnerSalary || 0);
  const suggestedRatio =
    mySalary + partnerSalary > 0
      ? {
          mine: Math.round((mySalary / (mySalary + partnerSalary)) * 100),
          partner: Math.round((partnerSalary / (mySalary + partnerSalary)) * 100),
        }
      : null;
  const lastMonth = couple?.lastMonth;

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={{ padding: 24, paddingTop: insets.top + 16, gap: 16 }}>
          <Skeleton width={120} height={14} />
          <Skeleton width="100%" height={160} borderRadius={24} />
          <Skeleton width="100%" height={80} borderRadius={18} />
          <Skeleton width="100%" height={80} borderRadius={18} />
        </View>
      </View>
    );
  }

  if (!hasPartner) {
    return (
      <ScrollView
        style={[s.screen, { backgroundColor: colors.bg.primary }]}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[s.backBtn, { backgroundColor: colors.bg.glassLight }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>

        <LinearGradient colors={['#FF6B9D', '#c44a7c']} style={s.heroEmpty}>
          <View style={s.heartIconWrap}>
            <Ionicons name="heart-circle" size={64} color="#FFF" />
          </View>
          <Text style={s.heroTitle}>Couple Finance</Text>
          <Text style={s.heroSub}>Track shared expenses, savings, and goals together</Text>
        </LinearGradient>

        <View style={[s.inviteCard, { backgroundColor: colors.bg.secondary }]}>
          <Ionicons name="link-outline" size={24} color={colors.accent.primary} />
          <Text style={[s.inviteTitle, { color: colors.text.primary }]}>
            Connect with your Partner
          </Text>
          <Text style={[s.inviteDesc, { color: colors.text.tertiary }]}>
            Send an invite to your partner to start sharing finances
          </Text>
          <View
            style={[
              s.inviteInputRow,
              { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
            ]}
          >
            <TextInput
              style={[s.inviteInput, { color: colors.text.primary }]}
              value={partnerEmail}
              onChangeText={setPartnerEmail}
              placeholder="partner@email.com"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[s.sendBtn, { backgroundColor: colors.accent.primary }]}
              onPress={sendInvite}
              disabled={sendingInvite}
            >
              {sendingInvite ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={s.sendBtnText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={[s.infoCard, { backgroundColor: colors.bg.tertiary }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.status.info} />
          <Text style={[s.infoText, { color: colors.text.tertiary }]}>
            Your data is encrypted and private. Only you and your partner can see this information.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: colors.bg.primary }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
          tintColor={colors.accent.primary}
        />
      }
    >
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[s.backBtn, { backgroundColor: colors.bg.glassLight }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <LinearGradient colors={['#FF6B9D', '#c44a7c']} style={s.heroSection}>
        <View style={s.heroPartners}>
          <View style={s.partnerAvatar}>
            <Text style={s.partnerInit}>{myName[0]?.toUpperCase() || '?'}</Text>
          </View>
          <Ionicons name="heart" size={20} color="#FFF" style={{ marginHorizontal: 8 }} />
          <View style={[s.partnerAvatar, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
            <Text style={s.partnerInit}>{partnerName[0]?.toUpperCase() || '?'}</Text>
          </View>
        </View>
        <Text style={s.heroRatio}>
          {ratio.mine}:{ratio.partner}
        </Text>
        <Text style={s.heroRatioLabel}>Contribution Ratio</Text>

        <View style={s.budgetBarOuter}>
          <View style={[s.budgetBarFill, { width: `${Math.min(budgetUsed, 100)}%` }]} />
        </View>
        <Text style={s.budgetBarLabel}>
          Shared Budget: {fmt(totalSpent)} / {fmt(monthlyBudget)}
        </Text>
      </LinearGradient>

      <View style={s.statsRow}>
        <LinearGradient colors={[colors.bg.secondary, colors.bg.tertiary]} style={s.statCard}>
          <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Shared Savings</Text>
          <Text style={[s.statValue, { color: colors.status.success }]}>{fmt(sharedSavings)}</Text>
        </LinearGradient>
        <LinearGradient colors={[colors.bg.secondary, colors.bg.tertiary]} style={s.statCard}>
          <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Total Spent</Text>
          <Text style={[s.statValue, { color: colors.text.primary }]}>{fmt(totalSpent)}</Text>
        </LinearGradient>
        <LinearGradient colors={[colors.bg.secondary, colors.bg.tertiary]} style={s.statCard}>
          <Text style={[s.statLabel, { color: colors.text.tertiary }]}>Monthly Budget</Text>
          <Text style={[s.statValue, { color: colors.text.primary }]}>{fmt(monthlyBudget)}</Text>
        </LinearGradient>
      </View>

      {suggestedRatio && (
        <View style={[s.suggestionCard, { backgroundColor: `${colors.accent.primary}12` }]}>
          <Ionicons name="calculator-outline" size={20} color={colors.accent.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[s.suggestionTitle, { color: colors.text.primary }]}>
              Salary-Based Split Recommendation
            </Text>
            <Text style={[s.suggestionDesc, { color: colors.text.tertiary }]}>
              Based on your salaries, a {suggestedRatio.mine}:{suggestedRatio.partner} split is
              recommended
            </Text>
          </View>
        </View>
      )}

      {lastMonth && (
        <View style={[s.comparisonCard, { backgroundColor: colors.bg.secondary }]}>
          <View style={s.comparisonHeader}>
            <Ionicons name="trending-up-outline" size={20} color={colors.text.primary} />
            <Text style={[s.comparisonTitle, { color: colors.text.primary }]}>
              Last Month Comparison
            </Text>
          </View>
          <View style={s.comparisonRow}>
            <Text style={[s.comparisonLabel, { color: colors.text.tertiary }]}>This month</Text>
            <Text style={[s.comparisonValue, { color: colors.text.primary }]}>
              {fmt(totalSpent)}
            </Text>
          </View>
          <View style={s.comparisonRow}>
            <Text style={[s.comparisonLabel, { color: colors.text.tertiary }]}>Last month</Text>
            <Text style={[s.comparisonValue, { color: colors.text.primary }]}>
              {fmt(lastMonth.totalSpent || 0)}
            </Text>
          </View>
          <View style={s.comparisonRow}>
            <Text style={[s.comparisonLabel, { color: colors.text.tertiary }]}>Change</Text>
            <Text
              style={[
                s.comparisonValue,
                {
                  color:
                    totalSpent - (lastMonth.totalSpent || 0) <= 0
                      ? colors.status.success
                      : colors.status.error,
                },
              ]}
            >
              {totalSpent > (lastMonth.totalSpent || 0) ? '+' : ''}
              {fmt(totalSpent - (lastMonth.totalSpent || 0))}
            </Text>
          </View>
        </View>
      )}

      {couple?.goals && couple.goals.length > 0 && (
        <View style={s.goalsSection}>
          <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Shared Goals</Text>
          {couple.goals.map((goal: any, i: number) => (
            <View key={goal.id || i} style={[s.goalCard, { backgroundColor: colors.bg.secondary }]}>
              <View style={s.goalTop}>
                <Ionicons
                  name={goal.icon || 'flag-outline'}
                  size={20}
                  color={colors.accent.primary}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.goalName, { color: colors.text.primary }]}>{goal.name}</Text>
                  <Text style={[s.goalTarget, { color: colors.text.tertiary }]}>
                    Target: {fmt(goal.targetAmount || 0)}
                  </Text>
                </View>
              </View>
              <View style={s.goalBarOuter}>
                <View
                  style={[
                    s.goalBarFill,
                    {
                      width: `${Math.min(
                        ((goal.savedAmount || 0) / Math.max(goal.targetAmount, 1)) * 100,
                        100,
                      )}%`,
                      backgroundColor: colors.accent.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[s.goalProgress, { color: colors.text.tertiary }]}>
                {fmt(goal.savedAmount || 0)} saved
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSection: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginTop: 16,
    alignItems: 'center',
  },
  heroPartners: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  partnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerInit: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  heroRatio: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 2,
  },
  heroRatioLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    marginBottom: 16,
  },
  budgetBarOuter: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetBarFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 4,
  },
  budgetBarLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 18,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: { fontSize: 16, fontWeight: '700', marginTop: 6 },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
  },
  suggestionTitle: { fontSize: 14, fontWeight: '700' },
  suggestionDesc: { fontSize: 12, marginTop: 2 },
  comparisonCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 18,
    borderRadius: 18,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  comparisonTitle: { fontSize: 15, fontWeight: '700' },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  comparisonLabel: { fontSize: 13 },
  comparisonValue: { fontSize: 14, fontWeight: '700' },
  goalsSection: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  goalCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },
  goalTop: { flexDirection: 'row', alignItems: 'center' },
  goalName: { fontSize: 15, fontWeight: '700' },
  goalTarget: { fontSize: 12, marginTop: 2 },
  goalBarOuter: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(150,150,150,0.15)',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  goalBarFill: { height: '100%', borderRadius: 3 },
  goalProgress: { fontSize: 12, marginTop: 4 },
  heroEmpty: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
  },
  heartIconWrap: { marginBottom: 12 },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  inviteCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  inviteTitle: { fontSize: 17, fontWeight: '700' },
  inviteDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  inviteInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    width: '100%',
  },
  inviteInput: { flex: 1, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
  sendBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  sendBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
