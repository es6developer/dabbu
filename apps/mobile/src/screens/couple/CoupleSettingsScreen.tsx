import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  RefreshControl,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

const { width } = Dimensions.get('window');

interface NotificationPref {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const NOTIFICATION_ITEMS: NotificationPref[] = [
  { key: 'newExpenses', label: 'New Expenses', icon: 'card-outline' },
  { key: 'budgetAlerts', label: 'Budget Alerts', icon: 'alert-circle-outline' },
  { key: 'billReminders', label: 'Bill Reminders', icon: 'calendar-outline' },
  { key: 'goalProgress', label: 'Goal Progress', icon: 'trophy-outline' },
];

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

export function CoupleSettingsScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coupleData, setCoupleData] = useState<any>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    newExpenses: true,
    budgetAlerts: true,
    billReminders: true,
    goalProgress: true,
  });
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const coupleGroup = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (!coupleGroup) {
        setCoupleData(null);
        return;
      }
      const [dashboard, settings] = await Promise.all([
        api.get<any>(`/shared-finance/groups/${coupleGroup.id}/couple/dashboard`),
        api.get<any>(`/shared-finance/groups/${coupleGroup.id}/settings`).catch(() => null),
      ]);
      setCoupleData({ ...(dashboard || {}), group: coupleGroup, settings: settings || {} });
      if (settings?.notificationPreferences) {
        setNotifPrefs((prev) => ({ ...prev, ...settings.notificationPreferences }));
      }
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggle = useCallback(
    async (key: string, value: boolean) => {
      const groupId = coupleData?.group?.id;
      if (!groupId) {
        return;
      }
      setSaving(key);
      const prev = notifPrefs;
      setNotifPrefs((p) => ({ ...p, [key]: value }));
      try {
        await api.patch(`/shared-finance/groups/${groupId}/settings`, {
          notificationPreferences: { ...notifPrefs, [key]: value },
        });
      } catch {
        setNotifPrefs(prev);
      } finally {
        setSaving(null);
      }
    },
    [coupleData, notifPrefs],
  );

  const handleLeaveCouple = useCallback(() => {
    Alert.alert(
      'Leave Couple Space',
      'Are you sure? All shared data will be archived. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/shared-finance/groups/${coupleData?.group?.id}/leave`);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to leave couple space');
            }
          },
        },
      ],
    );
  }, [coupleData, navigation]);

  const handleInvite = useCallback(async () => {
    try {
      const token = await api.post<string>(
        `/shared-finance/groups/${coupleData?.group?.id}/invites`,
      );
      const inviteUrl = `https://dabbu.app/join?token=${token}`;
      await Share.share({ message: `Join our Couple Space on Dabbu! ${inviteUrl}` });
    } catch {
      Alert.alert('Error', 'Failed to generate invite link');
    }
  }, [coupleData]);

  if (loading) {
    return <LoadingScreen />;
  }

  const p1 = coupleData?.profile?.partner1;
  const p2 = coupleData?.profile?.partner2;
  const group = coupleData?.group;
  const settings = coupleData?.settings || {};

  const partner1Name = p1?.firstName || p1?.name || 'Partner 1';
  const partner2Name = p2?.firstName || p2?.name || 'Partner 2';
  const p1Initial = partner1Name[0] || 'P';
  const p2Initial = partner2Name[0] || 'P';
  const partner2Joined = !!p2;

  const togetherSince = group?.createdAt
    ? new Date(group.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '';
  const daysTogether = group?.createdAt ? daysSince(group.createdAt) : 0;

  const sharedBudget = coupleData?.sharedBudget;
  const budgetTotal = sharedBudget?.budget ?? settings?.monthlyBudget ?? 0;
  const splitRatio = settings?.splitRatio || 50;
  const savingsGoal = coupleData?.savingsProgress?.goal ?? settings?.savingsGoal ?? 0;
  const savingsContribution = settings?.savingsContribution ?? 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData(true);
            }}
            tintColor={colors.accent.primary}
          />
        }
      >
        <View
          style={[styles.hero, { paddingTop: insets.top + 12, backgroundColor: colors.bg.primary }]}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Settings</Text>
          <Text style={styles.heroSub}>Couple space preferences</Text>
          <View style={styles.heroGlow} />
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#FF4D4F" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.profileSection}>
          <View style={[styles.profileCard, { backgroundColor: colors.bg.card }]}>
            <View style={styles.profileRow}>
              <View style={styles.profileAvatar}>
                <Text style={styles.avatarText}>{p1Initial}</Text>
              </View>
              <View style={styles.heartWrap}>
                <Ionicons name="heart" size={20} color="#FF4D4F" />
              </View>
              <View style={[styles.profileAvatar, !partner2Joined && styles.avatarEmpty]}>
                <Text
                  style={[styles.avatarText, !partner2Joined && { color: colors.text.tertiary }]}
                >
                  {partner2Joined ? p2Initial : '?'}
                </Text>
              </View>
            </View>
            <Text style={[styles.coupleName, { color: colors.text.primary }]}>
              {partner1Name} & {partner2Joined ? partner2Name : 'Waiting for Partner'}
            </Text>
            {togetherSince ? (
              <Text style={[styles.togetherDate, { color: colors.text.tertiary }]}>
                Together since {togetherSince} · {daysTogether} days
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>FINANCES</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.bg.card }]}>
            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingIconWrap}>
                <View style={[styles.settingIcon, { backgroundColor: colors.accent.primary }]}>
                  <Ionicons name="wallet-outline" size={16} color="#FFF" />
                </View>
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.text.primary }]}>
                  Monthly Budget
                </Text>
                <Text style={[styles.settingValue, { color: colors.text.secondary }]}>
                  {budgetTotal > 0
                    ? `₹${budgetTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} / month`
                    : 'Not set'}
                </Text>
              </View>
              <TouchableOpacity style={styles.editBtn} activeOpacity={0.7}>
                <Text style={styles.editBtnText}>Adjust</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingIconWrap}>
                <View style={[styles.settingIcon, { backgroundColor: colors.accent.secondary }]}>
                  <Ionicons name="pie-chart-outline" size={16} color="#FFF" />
                </View>
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.text.primary }]}>
                  Split Ratio
                </Text>
                <Text style={[styles.settingValue, { color: colors.text.secondary }]}>
                  {splitRatio} / {100 - splitRatio}
                </Text>
              </View>
              <TouchableOpacity style={styles.editBtn} activeOpacity={0.7}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingIconWrap}>
                <View style={[styles.settingIcon, { backgroundColor: colors.status.success }]}>
                  <Ionicons name="save-outline" size={16} color="#FFF" />
                </View>
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.text.primary }]}>
                  Savings Goal
                </Text>
                <Text style={[styles.settingValue, { color: colors.text.secondary }]}>
                  {savingsGoal > 0
                    ? `₹${savingsGoal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} target`
                    : 'No goal set'}
                  {savingsContribution > 0 ? ` · ₹${savingsContribution}/mo each` : ''}
                </Text>
              </View>
              <TouchableOpacity style={styles.editBtn} activeOpacity={0.7}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>NOTIFICATIONS</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.bg.card }]}>
            {NOTIFICATION_ITEMS.map((item, idx) => {
              const val = notifPrefs[item.key] ?? true;
              const isLast = idx === NOTIFICATION_ITEMS.length - 1;
              return (
                <View key={item.key} style={[styles.notifRow, !isLast && styles.notifRowBorder]}>
                  <View style={[styles.notifIcon, { backgroundColor: colors.accent.primary }]}>
                    <Ionicons name={item.icon} size={14} color="#FFF" />
                  </View>
                  <Text style={[styles.notifLabel, { color: colors.text.primary }]}>
                    {item.label}
                  </Text>
                  <Switch
                    value={val}
                    onValueChange={(v) => handleToggle(item.key, v)}
                    trackColor={{ false: 'rgba(255,255,255,0.12)', true: '#8B5CF6' }}
                    thumbColor={val ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}
                    ios_backgroundColor="rgba(255,255,255,0.12)"
                  />
                </View>
              );
            })}
          </View>
        </View>

        {!partner2Joined ? (
          <TouchableOpacity style={styles.inviteBtn} activeOpacity={0.8} onPress={handleInvite}>
            <View style={[styles.inviteGradient, { backgroundColor: colors.accent.primary }]}>
              <Ionicons name="person-add-outline" size={20} color="#FFF" />
              <Text style={styles.inviteText}>Invite Partner</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.leaveBtn} activeOpacity={0.7} onPress={handleLeaveCouple}>
          <View style={styles.leaveIcon}>
            <Ionicons name="heart-dislike-outline" size={18} color="#FF4D4F" />
          </View>
          <Text style={styles.leaveText}>Leave Couple Space</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.text.tertiary }]}>Dabbu v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  hero: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(20,184,166,0.15)',
  },

  profileSection: {
    paddingHorizontal: 20,
    marginTop: -24,
    marginBottom: 24,
  },
  profileCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmpty: {
    backgroundColor: '#F9731625',
    borderWidth: 2,
    borderColor: '#F9731640',
    borderStyle: 'dashed',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
  },
  heartWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF4D4F12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  coupleName: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  togetherDate: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },

  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  settingRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  settingIconWrap: {
    marginRight: 14,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingValue: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F9731610',
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F97316',
  },

  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  notifRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  notifIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },

  inviteBtn: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  inviteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  inviteText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },

  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,77,79,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  leaveIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FF4D4F12',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  leaveText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FF4D4F',
  },

  version: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF4D4F12',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FF4D4F',
    flex: 1,
  },
});
