import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Animated, RefreshControl, Dimensions } from 'react-native';
import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { Avatar } from '../../components/ui/Avatar';
import {
  fetchDeviceContacts,
  requestRawPermission,
  getRawPermissionStatus,
  syncContacts,
  DeviceContact,
  ContactMatch,
} from '../../services/contacts';

import { alertService } from "../../components/ui";
const { width } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_HORIZONTAL = 20;
const INITIAL_HEIGHT = 88;
const EXPANDED_EXTRA = 200;

type Role = string;

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

const ROLE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  Owner: { icon: 'crown-outline', color: '#F59E0B', label: 'Owner' },
  Admin: { icon: 'shield-outline', color: '#3B82F6', label: 'Admin' },
  Contributor: { icon: 'hand-left', color: '#22C55E', label: 'Contributor' },
  Viewer: { icon: 'eye-outline', color: '#6B7280', label: 'Viewer' },
};

const ROLE_MAP: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Contributor',
  viewer: 'Viewer',
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
  if (!iso) { return ''; }
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function MemberCardSkeleton() {
  const { colors } = useTheme();
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
    <View style={[styles.skeletonCard, { backgroundColor: colors.bg.secondary }]}>
      <View style={styles.skeletonRow}>
        <Animated.View style={[styles.skeletonAvatar, { backgroundColor: colors.bg.tertiary, opacity }]} />
        <View style={{ flex: 1, gap: 8 }}>
          <Animated.View style={[styles.skeletonLine, { backgroundColor: colors.bg.tertiary, width: '50%', opacity }]} />
          <Animated.View style={[styles.skeletonLine, { backgroundColor: colors.bg.tertiary, width: '35%', opacity }]} />
          <Animated.View style={[styles.skeletonLine, { backgroundColor: colors.bg.tertiary, width: '60%', opacity }]} />
        </View>
      </View>
    </View>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const key = ROLE_MAP[role.toLowerCase()] ?? 'Viewer';
  const cfg = ROLE_CONFIG[key];
  return (
    <View style={[styles.roleBadge, { backgroundColor: cfg.color + '20' }]}>
      <MaterialCommunityIcons name={cfg.icon as any} size={12} color={cfg.color} />
      <Text style={[styles.roleBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function ExpandIcon({ expanded }: { expanded: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.expandIconContainer}>
      <AntDesign name={expanded ? 'up' : 'down'} size={14} color={colors.text.tertiary} />
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
                {member.profile.phone ? `📞 ${member.profile.phone}` : `Joined ${fmtDate(member.joinedAt)}`}
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
                  <View style={[styles.activityItem, { backgroundColor: colors.bg.primary }]}>
                    <Text style={[styles.activityLabel, { color: colors.text.tertiary }]}>Income</Text>
                    <Text style={[styles.activityValue, { color: colors.status.success }]}>
                      {fmt(member.monthlyActivity.income)}
                    </Text>
                  </View>
                  <View style={[styles.activityItem, { backgroundColor: colors.bg.primary }]}>
                    <Text style={[styles.activityLabel, { color: colors.text.tertiary }]}>Expenses</Text>
                    <Text style={[styles.activityValue, { color: colors.status.error }]}>
                      {fmt(member.monthlyActivity.expenses)}
                    </Text>
                  </View>
                  <View style={[styles.activityItem, { backgroundColor: colors.bg.primary }]}>
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

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.accent.primary + '15' }]}
                  onPress={() => {/* TODO: Edit member role */}}
                >
                  <AntDesign name="edit" size={14} color={colors.accent.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.accent.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.status.error + '15' }]}
                  onPress={() => {/* TODO: Confirm remove */}}
                >
                  <AntDesign name="delete" size={14} color={colors.status.error} />
                  <Text style={[styles.actionBtnText, { color: colors.status.error }]}>Remove</Text>
                </TouchableOpacity>
              </View>
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
  // Add member modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStep, setAddStep] = useState<'contacts' | 'relationship'>('contacts');
  const [contactQuery, setContactQuery] = useState('');
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [matchedContacts, setMatchedContacts] = useState<ContactMatch[]>([]);
  const [allContacts, setAllContacts] = useState<((ContactMatch & { kind: 'match' }) | (DeviceContact & { kind: 'device' }))[]>([]);
  const [hasContactPermission, setHasContactPermission] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedContact, setSelectedContact] = useState<{ name: string; phone: string; userId?: string } | null>(null);
  const [selectedRelation, setSelectedRelation] = useState('');
  const [familyFound, setFamilyFound] = useState(true);

  const RELATIONSHIPS = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Other'];

  const fetchMembers = useCallback(async (refresh = false) => {
    if (refresh) { setRefreshing(true); }
    else { setLoading(true); }
    setError(null);
    try {
      const families: Family[] = await api.get('/family');
      if (!families || families.length === 0) {
        setMembers([]);
        setFamilyFound(false);
        return;
      }
      setFamilyFound(true);
      const activeFamily = families[0];
      const familyDetail: any = await api.get(`/family/${activeFamily.id}`);
      const rawMembers: any[] = familyDetail?.members || [];
      const data: FamilyMember[] = rawMembers.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        profile: {
          firstName: m.user?.firstName || '',
          lastName: m.user?.lastName || '',
          email: m.user?.email || '',
          avatarUrl: m.user?.avatarUrl || null,
          phone: m.user?.phone || '',
        },
        contributionHistory: [],
        totalContributed: 0,
        monthlyActivity: { income: 0, expenses: 0, transactionCount: 0 },
        responsibilities: [],
      }));
      setMembers(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load members');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMembers();
    }, [fetchMembers]),
  );

  // ── Contacts ──
  const syncDeviceContacts = useCallback(async () => {
    setSyncing(true);
    try {
      const perm = await requestRawPermission();
      if (!perm.granted) {
        alertService.alert('Permission Required', 'Enable contact access to add family members from your phonebook.');
        setSyncing(false);
        return;
      }
      setHasContactPermission(true);
      const { matched, unmatched } = await syncContacts();
      setMatchedContacts(matched);
      const untyped: (DeviceContact & { kind: 'device' })[] = unmatched.map((c) => ({ ...c, kind: 'device' as const }));
      setDeviceContacts(unmatched);
      setAllContacts([
        ...matched.map((m) => ({ ...m, kind: 'match' as const })),
        ...untyped,
      ]);
    } catch {
      alertService.alert('Error', 'Failed to sync contacts');
    } finally {
      setSyncing(false);
    }
  }, []);

  const filteredContacts = useMemo(() => {
    if (!contactQuery.trim()) return allContacts;
    const q = contactQuery.toLowerCase();
    return allContacts.filter((c) => {
      const name = 'kind' in c ? (c as any).name || '' : '';
      const phone = 'kind' in c ? (c as any).phone || '' : '';
      return name.toLowerCase().includes(q) || phone.replace(/[^0-9]/g, '').includes(q.replace(/[^0-9]/g, ''));
    });
  }, [allContacts, contactQuery]);

  // ── Add member ──
  const handleSelectContact = useCallback((contact: { name: string; phone: string; userId?: string }) => {
    setSelectedContact(contact);
    setSelectedRelation('');
    setAddStep('relationship');
  }, []);

  const handleConfirmAdd = useCallback(async () => {
    if (!selectedContact || !selectedRelation) return;
    setAdding(true);
    try {
      let families: Family[] = await api.get('/family');
      let familyId = families?.[0]?.id;
      if (!familyId) {
        const newFamily: Family = await api.post('/family', { name: 'My Family', description: '' });
        familyId = newFamily.id;
      }
      await api.post('/family/members/contact', {
        familyId,
        name: selectedContact.name,
        phone: selectedContact.phone,
        relationship: selectedRelation.toLowerCase(),
      });
      setShowAddModal(false);
      setAddStep('contacts');
      setContactQuery('');
      setSelectedContact(null);
      setSelectedRelation('');
      fetchMembers();
    } catch (err: any) {
      alertService.alert('Error', err?.message || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  }, [selectedContact, selectedRelation, fetchMembers]);

  const onRefresh = useCallback(() => {
    fetchMembers(true);
  }, [fetchMembers]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: CARD_HORIZONTAL }]}>
        <Text style={[styles.largeTitle, { color: colors.text.primary }]}>Family Members</Text>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.accent.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <AntDesign name="plus" size={18} color={colors.text.inverse} />
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
      ) : members.length === 0 && familyFound ? (
        <View style={styles.centerState}>
          <AntDesign name="team" size={48} color={colors.text.tertiary} />
          <Text style={[styles.stateText, { color: colors.text.secondary }]}>No members yet</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => setShowAddModal(true)}
          >
            <AntDesign name="adduser" size={16} color={colors.text.inverse} />
            <Text style={[styles.retryText, { color: colors.text.inverse }]}>Add a member</Text>
          </TouchableOpacity>
        </View>
      ) : members.length === 0 ? (
        <View style={styles.centerState}>
          <AntDesign name="addusergroup" size={48} color={colors.text.tertiary} />
          <Text style={[styles.stateText, { color: colors.text.secondary }]}>No family group found</Text>
          <Text style={[styles.stateSubtext, { color: colors.text.tertiary }]}>Create a family to start managing shared finances.</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => navigation.navigate('CreateFamily')}
          >
            <AntDesign name="addusergroup" size={16} color={colors.text.inverse} />
            <Text style={[styles.retryText, { color: colors.text.inverse }]}>Create Family</Text>
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

      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.bg.primary, maxHeight: '80%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                {addStep === 'contacts' ? 'Add Family Member' : 'Set Relationship'}
              </Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); setAddStep('contacts'); setContactQuery(''); }}>
                <AntDesign name="close" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>

            {addStep === 'contacts' && (
              <>
                <View style={[styles.modalInput, { borderColor: colors.border.subtle, marginBottom: 12 }]}>
                  <AntDesign name="search1" size={16} color={colors.text.tertiary} />
                  <TextInput
                    style={[styles.modalInputField, { color: colors.text.primary }]}
                    placeholder="Search contacts..."
                    placeholderTextColor={colors.text.tertiary}
                    value={contactQuery}
                    onChangeText={setContactQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {allContacts.length === 0 && !syncing && (
                  <TouchableOpacity
                    style={[styles.syncBtn, { borderColor: colors.accent.primary + '40' }]}
                    onPress={syncDeviceContacts}
                  >
                    <AntDesign name="team" size={16} color={colors.accent.primary} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accent.primary }}>Sync Contacts</Text>
                  </TouchableOpacity>
                )}

                {syncing && (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <ActivityIndicator size="small" color={colors.accent.primary} />
                    <Text style={{ marginTop: 8, fontSize: 13, color: colors.text.tertiary }}>Syncing contacts...</Text>
                  </View>
                )}

                {allContacts.length > 0 && (
                  <>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {matchedContacts.length} friend{matchedContacts.length !== 1 ? 's' : ''} on Dabbu · {deviceContacts.length} contacts
                    </Text>
                    <FlatList
                      data={filteredContacts}
                      keyExtractor={(_, i) => String(i)}
                      keyboardShouldPersistTaps="handled"
                      style={{ maxHeight: 320 }}
                      renderItem={({ item }) => {
                        const name = 'name' in item ? (item as any).name || '' : '';
                        const phone = 'phone' in item ? (item as any).phone || '' : '';
                        const isAppUser = item.kind === 'match';
                        const userId = isAppUser ? (item as any).userId : '';
                        return (
                          <TouchableOpacity
                            style={[styles.contactRow, { borderBottomColor: colors.border.subtle }]}
                            onPress={() => handleSelectContact({ name, phone, userId })}
                          >
                            {isAppUser ? (
                              <Avatar name={name} size={40} />
                            ) : (
                              <View style={[styles.contactAvatar, { backgroundColor: colors.bg.tertiary }]}>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.tertiary }}>
                                  {name[0]?.toUpperCase() || '?'}
                                </Text>
                              </View>
                            )}
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }} numberOfLines={1}>{name}</Text>
                              <Text style={{ fontSize: 12, color: colors.text.tertiary }} numberOfLines={1}>{phone}</Text>
                            </View>
                            {isAppUser && (
                              <View style={[styles.statusBadge, { backgroundColor: colors.status.success + '20' }]}>
                                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.status.success }}>On Dabbu</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      }}
                    />
                  </>
                )}
              </>
            )}

            {addStep === 'relationship' && selectedContact && (
              <>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <Avatar name={selectedContact.name} size={56} />
                  <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text.primary, marginTop: 8 }}>{selectedContact.name}</Text>
                  <Text style={{ fontSize: 13, color: colors.text.tertiary }}>{selectedContact.phone}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: 8 }}>What is their relationship to you?</Text>
                <View style={styles.relationGrid}>
                  {RELATIONSHIPS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.relationChip,
                        { borderColor: selectedRelation === r ? colors.accent.primary : colors.border.subtle },
                        selectedRelation === r && { backgroundColor: colors.accent.primary + '15' },
                      ]}
                      onPress={() => setSelectedRelation(r)}
                    >
                      <Text style={[
                        styles.relationChipText,
                        { color: selectedRelation === r ? colors.accent.primary : colors.text.secondary },
                      ]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: colors.bg.tertiary }]}
                    onPress={() => { setAddStep('contacts'); setSelectedContact(null); }}
                  >
                    <Text style={[styles.modalBtnText, { color: colors.text.secondary }]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: colors.accent.primary, opacity: adding || !selectedRelation ? 0.5 : 1 }]}
                    onPress={handleConfirmAdd}
                    disabled={adding || !selectedRelation}
                  >
                    <Text style={[styles.modalBtnText, { color: colors.text.inverse }]}>
                      {adding ? 'Adding...' : 'Add to Family'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
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
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  stateSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Skeleton
  skeletonCard: {
    marginBottom: CARD_MARGIN,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 16,
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
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
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

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Add Modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 1000,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    gap: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  modalInputField: {
    flex: 1,
    fontSize: 15,
    height: 48,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    marginVertical: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  relationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relationChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  relationChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
