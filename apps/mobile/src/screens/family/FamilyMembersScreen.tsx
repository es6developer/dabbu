import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_HORIZONTAL = 20;
const INITIAL_HEIGHT = 88;
const EXPANDED_EXTRA = 200;

type Role = 'Owner' | 'Admin' | 'Contributor' | 'Viewer';

interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  phone: string;
}

interface ContributionHistory {
  amount: number;
  period: string;
  date: string;
}

interface MonthlyActivity {
  income: number;
  expenses: number;
  transactionCount: number;
}

interface Responsibility {
  id: string;
  title: string;
  completed: boolean;
}

interface FamilyMember {
  id: string;
  userId: string;
  role: Role;
  joinedAt: string;
  profile: Profile;
  contributionHistory: ContributionHistory[];
  totalContributed: number;
  monthlyActivity: MonthlyActivity;
  responsibilities: Responsibility[];
}

interface Family {
  id: string;
  name: string;
}

const ROLE_CONFIG: Record<Role, { icon: string; color: string; label: string }> = {
  Owner: { icon: 'crown-outline', color: '#F59E0B', label: 'Owner' },
  Admin: { icon: 'shield-outline', color: '#3B82F6', label: 'Admin' },
  Contributor: { icon: 'hand-left', color: '#22C55E', label: 'Contributor' },
  Viewer: { icon: 'eye-outline', color: '#6B7280', label: 'Viewer' },
};

const PROFILE_COLORS = [
  '#7C3AED', '#3B82F6', '#22C55E', '#F59E0B',
  '#EF4444', '#EC4899', '#14B8A6', '#F97316',
];

function getProfileColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PROFILE_COLORS[Math.abs(hash) % PROFILE_COLORS.length];
}

function initials(first: string, last: string): string {
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || '?';
}

function fmt(v: number) {
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function MemberCardSkeleton() {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonRow}>
        <Animated.View style={[styles.skeletonAvatar, { opacity }]} />
        <View style={{ flex: 1, gap: 8 }}>
          <Animated.View style={[styles.skeletonLine, { width: '50%', opacity }]} />
          <Animated.View style={[styles.skeletonLine, { width: '35%', opacity }]} />
          <Animated.View style={[styles.skeletonLine, { width: '60%', opacity }]} />
        </View>
      </View>
    </View>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <View style={[styles.roleBadge, { backgroundColor: cfg.color + '20' }]}>
      <MaterialCommunityIcons name={cfg.icon as any} size={12} color={cfg.color} />
      <Text style={[styles.roleBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function ExpandIcon({ expanded }: { expanded: boolean }) {
  return (
    <View style={styles.expandIconContainer}>
      <AntDesign name={expanded ? 'up' : 'down'} size={14} color="#6B7280" />
    </View>
  );
}

function MemberCard({
  member,
  index,
}: {
  member: FamilyMember;
  index: number;
}) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const animHeight = useRef(new Animated.Value(INITIAL_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const mounted = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
    mounted.current = true;
  }, []);

  const toggleExpand = useCallback(() => {
    const toValue = expanded ? INITIAL_HEIGHT : INITIAL_HEIGHT + EXPANDED_EXTRA;
    Animated.spring(animHeight, {
      toValue,
      damping: 20,
      stiffness: 300,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  }, [expanded, animHeight]);

  const cfg = ROLE_CONFIG[member.role];
  const profileColor = getProfileColor(member.userId);
  const fullName = `${member.profile.firstName} ${member.profile.lastName}`.trim();

  return (
    <Animated.View
      style={[
        styles.cardOuter,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <TouchableOpacity activeOpacity={0.7} onPress={toggleExpand}>
        <Animated.View
          style={[
            styles.card,
            { borderColor: colors.border.subtle, height: animHeight },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.avatar, { backgroundColor: profileColor + '20' }]}>
              <Text style={[styles.avatarText, { color: profileColor }]}>
                {initials(member.profile.firstName, member.profile.lastName)}
              </Text>
            </View>
            <View style={styles.cardHeaderInfo}>
              <View style={styles.nameRoleRow}>
                <Text style={[styles.memberName, { color: colors.text.primary }]} numberOfLines={1}>
                  {fullName}
                </Text>
                <RoleBadge role={member.role} />
              </View>
              <Text style={[styles.joinedDate, { color: colors.text.tertiary }]}>
                Joined {fmtDate(member.joinedAt)}
              </Text>
              <Text style={[styles.contributionAmount, { color: colors.text.primary }]}>
                {fmt(member.totalContributed)} contributed
              </Text>
            </View>
            <ExpandIcon expanded={expanded} />
          </View>

          {expanded && (
            <View style={styles.cardExpanded}>
              <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

              <View style={styles.expandedSection}>
                <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>Monthly Activity</Text>
                <View style={styles.activityRow}>
                  <View style={styles.activityItem}>
                    <Text style={[styles.activityLabel, { color: colors.text.tertiary }]}>Income</Text>
                    <Text style={[styles.activityValue, { color: colors.status.success }]}>
                      {fmt(member.monthlyActivity.income)}
                    </Text>
                  </View>
                  <View style={styles.activityItem}>
                    <Text style={[styles.activityLabel, { color: colors.text.tertiary }]}>Expenses</Text>
                    <Text style={[styles.activityValue, { color: colors.status.error }]}>
                      {fmt(member.monthlyActivity.expenses)}
                    </Text>
                  </View>
                  <View style={styles.activityItem}>
                    <Text style={[styles.activityLabel, { color: colors.text.tertiary }]}>Transactions</Text>
                    <Text style={[styles.activityValue, { color: colors.text.primary }]}>
                      {member.monthlyActivity.transactionCount}
                    </Text>
                  </View>
                </View>
              </View>

              {member.responsibilities.length > 0 && (
                <View style={styles.expandedSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>Responsibilities</Text>
                  <Text style={[styles.responsibilityCount, { color: colors.text.primary }]}>
                    {member.responsibilities.filter(r => !r.completed).length} pending ·{' '}
                    {member.responsibilities.filter(r => r.completed).length} completed
                  </Text>
                </View>
              )}

              {member.contributionHistory.length > 0 && (
                <View style={styles.expandedSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>Contribution History</Text>
                  {member.contributionHistory.slice(0, 3).map((ch, i) => (
                    <View key={i} style={styles.historyRow}>
                      <Text style={[styles.historyPeriod, { color: colors.text.secondary }]}>
                        {ch.period}
                      </Text>
                      <Text style={[styles.historyAmount, { color: colors.text.primary }]}>
                        {fmt(ch.amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function FamilyMembersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const families: Family[] = await api.get('/family');
      if (!families || families.length === 0) {
        setMembers([]);
        return;
      }
      const activeFamily = families[0];
      const data: FamilyMember[] = await api.get(
        `/family/members?familyId=${activeFamily.id}`,
      );
      setMembers(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load members');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const onRefresh = useCallback(() => {
    fetchMembers(true);
  }, [fetchMembers]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: CARD_HORIZONTAL }]}>
        <Text style={[styles.largeTitle, { color: colors.text.primary }]}>Family Members</Text>
        <TouchableOpacity
          style={[styles.inviteButton, { backgroundColor: colors.accent.primary }]}
          onPress={() => navigation?.navigate('InviteMember')}
        >
          <AntDesign name="adduser" size={18} color={colors.text.inverse} />
          <Text style={[styles.inviteButtonText, { color: colors.text.inverse }]}>Invite</Text>
        </TouchableOpacity>
      </View>

      {!loading && !error && members.length > 0 && (
        <View style={[styles.countPill, { backgroundColor: colors.bg.tertiary }]}>
          <Text style={[styles.countText, { color: colors.text.secondary }]}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {loading ? (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: 8, paddingHorizontal: CARD_HORIZONTAL, paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {[1, 2, 3, 4, 5].map(i => (
            <MemberCardSkeleton key={i} />
          ))}
        </ScrollView>
      ) : error ? (
        <View style={styles.centerState}>
          <AntDesign name="exclamationcircleo" size={48} color={colors.text.tertiary} />
          <Text style={[styles.stateText, { color: colors.text.secondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => fetchMembers()}
          >
            <Text style={[styles.retryText, { color: colors.text.inverse }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : members.length === 0 ? (
        <View style={styles.centerState}>
          <AntDesign name="team" size={48} color={colors.text.tertiary} />
          <Text style={[styles.stateText, { color: colors.text.secondary }]}>No members yet</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => navigation?.navigate('InviteMember')}
          >
            <AntDesign name="adduser" size={16} color={colors.text.inverse} />
            <Text style={[styles.retryText, { color: colors.text.inverse }]}>Invite someone</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: 4, paddingHorizontal: CARD_HORIZONTAL, paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent.primary}
              colors={[colors.accent.primary]}
            />
          }
        >
          {members.map((member, i) => (
            <MemberCard key={member.id} member={member} index={i} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  inviteButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  countPill: {
    alignSelf: 'flex-start',
    marginLeft: CARD_HORIZONTAL,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  countText: {
    fontSize: 13,
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  stateText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Skeleton
  skeletonCard: {
    marginBottom: CARD_MARGIN,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 16,
    backgroundColor: '#1C1C1E',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  skeletonAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#27272A',
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#27272A',
  },

  // Card
  cardOuter: {
    marginBottom: CARD_MARGIN,
  },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  cardHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  nameRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 17,
    fontWeight: '600',
    flexShrink: 1,
  },
  joinedDate: {
    fontSize: 13,
  },
  contributionAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  expandIconContainer: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Role Badge
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Expanded
  cardExpanded: {
    paddingTop: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  expandedSection: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  activityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  activityItem: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  activityLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  activityValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  responsibilityCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  historyPeriod: {
    fontSize: 14,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
});
