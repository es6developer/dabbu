import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BaseScreen } from '../../components/ui/BaseScreen';
import { useTheme, typography as typographyStyles } from '../../theme';
import { spacing } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';

type ToggleKey =
  | 'expenseAlerts'
  | 'groupAlerts'
  | 'goalAlerts'
  | 'emiReminders'
  | 'subscriptionReminders'
  | 'dailyDigest'
  | 'weeklyDigest'
  | 'monthlyReports'
  | 'marketingNotifications';

interface Section {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: {
    key: ToggleKey;
    label: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    gradient: [string, string];
  }[];
}

function getSections(primary: string, hover: string): Section[] {
  return [
  {
    title: 'Alerts & Reminders',
    icon: 'notifications',
    items: [
      {
        key: 'expenseAlerts',
        label: 'Expense Alerts',
        description: 'Get notified when expenses are recorded',
        icon: 'card-outline',
        gradient: [primary, primary],
      },
      {
        key: 'groupAlerts',
        label: 'Group Alerts',
        description: 'Activity in shared groups & splits',
        icon: 'people-outline',
        gradient: ['#06B6D4', '#0891B2'],
      },
      {
        key: 'goalAlerts',
        label: 'Goal Alerts',
        description: 'Progress updates on your financial goals',
        icon: 'trophy-outline',
        gradient: [primary, hover],
      },
      {
        key: 'emiReminders',
        label: 'EMI Reminders',
        description: 'Upcoming EMI payment notifications',
        icon: 'calendar-outline',
        gradient: ['#10B981', '#059669'],
      },
      {
        key: 'subscriptionReminders',
        label: 'Subscription Reminders',
        description: 'Renewal alerts for subscriptions',
        icon: 'reload-outline',
        gradient: ['#EC4899', '#DB2777'],
      },
      {
        key: 'dailyDigest',
        label: 'Daily Digest',
        description: 'End-of-day spending summary',
        icon: 'newspaper-outline',
        gradient: [primary, hover],
      },
    ],
  },
  {
    title: 'Reports',
    icon: 'stats-chart',
    items: [
      {
        key: 'weeklyDigest',
        label: 'Weekly Digest',
        description: 'Weekly spending trends & insights',
        icon: 'bar-chart-outline',
        gradient: ['#14B8A6', '#0D9488'],
      },
      {
        key: 'monthlyReports',
        label: 'Monthly Reports',
        description: 'Comprehensive monthly financial report',
        icon: 'document-text-outline',
        gradient: [primary, hover],
      },
    ],
  },
  {
    title: 'Marketing',
    icon: 'megaphone',
    items: [
      {
        key: 'marketingNotifications',
        label: 'Marketing Notifications',
        description: 'Tips, offers & product updates',
        icon: 'megaphone-outline',
        gradient: ['#78716C', '#57534E'],
      },
    ],
  },
];
}

const BACKEND_KEY_MAP: Record<ToggleKey, string> = {
  expenseAlerts: 'pushNotifications',
  groupAlerts: 'pushNotifications',
  goalAlerts: 'pushNotifications',
  emiReminders: 'pushNotifications',
  subscriptionReminders: 'pushNotifications',
  dailyDigest: 'emailNotifications',
  weeklyDigest: 'weeklyReport',
  monthlyReports: 'monthlyReport',
  marketingNotifications: 'emailNotifications',
};

const PUSH_TOGGLES: ToggleKey[] = [
  'expenseAlerts',
  'groupAlerts',
  'goalAlerts',
  'emiReminders',
  'subscriptionReminders',
];

const EMAIL_TOGGLES: ToggleKey[] = ['dailyDigest', 'marketingNotifications'];

type Preferences = Record<string, boolean>;

function getDefaultToggles(): Record<ToggleKey, boolean> {
  return {
    expenseAlerts: true,
    groupAlerts: true,
    goalAlerts: true,
    emiReminders: true,
    subscriptionReminders: true,
    dailyDigest: true,
    weeklyDigest: true,
    monthlyReports: true,
    marketingNotifications: false,
  };
}

function mapBackendToToggles(prefs: Preferences): Record<ToggleKey, boolean> {
  const toggles = getDefaultToggles();
  const push = prefs.pushNotifications ?? true;
  const email = prefs.emailNotifications ?? true;

  for (const key of PUSH_TOGGLES) {
    toggles[key] = push;
  }
  for (const key of EMAIL_TOGGLES) {
    toggles[key] = email;
  }
  toggles.weeklyDigest = prefs.weeklyReport ?? true;
  toggles.monthlyReports = prefs.monthlyReport ?? true;
  return toggles;
}

function mapTogglesToBackend(toggles: Record<ToggleKey, boolean>): Record<string, boolean> {
  const pushActive = PUSH_TOGGLES.some((k) => toggles[k]);
  const emailActive = EMAIL_TOGGLES.some((k) => toggles[k]);
  return {
    pushNotifications: pushActive,
    emailNotifications: emailActive,
    weeklyReport: toggles.weeklyDigest,
    monthlyReport: toggles.monthlyReports,
  };
}

export function NotificationSettingsScreen() {
  const { colors, isDark, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();

  const [toggles, setToggles] = useState<Record<ToggleKey, boolean> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPreferences = useCallback(async () => {
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const prefs = await api.get<Preferences>('/preferences');
      setToggles(mapBackendToToggles(prefs));
    } catch {
      setToggles(getDefaultToggles());
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleToggle = useCallback(
    async (key: ToggleKey, value: boolean) => {
      if (!toggles) {return;}
      const updated = { ...toggles, [key]: value };
      setToggles(updated);
      setSaving(true);
      try {
        const body = mapTogglesToBackend(updated);
        if (accessToken) {
          setAccessToken(accessToken);
        }
        await api.patch('/preferences', body);
      } catch {
        setToggles(toggles);
        Alert.alert('Error', 'Failed to save preference');
      } finally {
        setSaving(false);
      }
    },
    [toggles, accessToken],
  );

  if (loading) {
    return (
      <BaseScreen noPadding>
        <View
        
        
        
        style={StyleSheet.absoluteFill}
      />
      <View style={{ padding: spacing.lg, paddingTop: insets.top + 60, gap: 20 }}>
          <Skeleton width={160} height={22} />
          <Skeleton width="100%" height={90} borderRadius={16} />
          <Skeleton width="100%" height={90} borderRadius={16} />
          <Skeleton width="100%" height={90} borderRadius={16} />
          <Skeleton width="100%" height={60} borderRadius={16} />
        </View>
      </BaseScreen>
    );
  }

  return (
    <BaseScreen noPadding>
      <View
        
        
        
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <View
          
          
          
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <View style={[styles.headerIconWrap, { backgroundColor: colors.bg.tertiary }]}>
              <Ionicons name="notifications" size={22} color={colors.text.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Notifications</Text>
              <Text style={[styles.headerSub, { color: colors.text.secondary }]}>Manage your alert preferences</Text>
            </View>
            {saving && (
              <View style={[styles.savingBadge, { backgroundColor: colors.bg.tertiary }]}>
                <ActivityIndicator size="small" color={colors.accent.primary} />
              </View>
            )}
          </View>
          <Text style={[styles.headerMetric, { color: colors.text.tertiary }]}>
            Choose which notifications matter most to you.
          </Text>
        </View>

        {getSections(colors.accent.primary, colors.accent.hover).map((section, sIdx) => (
          <View key={sIdx} style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons
                name={section.icon}
                size={14}
                color={colors.text.tertiary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>
                {section.title}
              </Text>
            </View>
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
              ]}
            >
              {section.items.map((item, iIdx) => {
                const val = toggles?.[item.key] ?? true;
                return (
                  <View
                    key={item.key}
                    style={[
                      styles.row,
                      iIdx < section.items.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.border.subtle,
                      },
                    ]}
                  >
                    <View
                      
                      
                      
                      style={styles.rowIcon}
                    >
                      <Ionicons name={item.icon} size={15} color={colors.text.primary} />
                    </View>
                    <View style={styles.rowContent}>
                      <Text style={[styles.rowLabel, { color: colors.text.primary }]}>
                        {item.label}
                      </Text>
                      <Text style={[styles.rowDesc, { color: colors.text.tertiary }]}>
                        {item.description}
                      </Text>
                    </View>
                    <Switch
                      value={val}
                      onValueChange={(v) => handleToggle(item.key, v)}
                      trackColor={{
                        false: colors.border.subtle,
                        true: colors.accent.primary,
                      }}
                      thumbColor={val ? '#FFFFFF' : colors.text.tertiary}
                      ios_backgroundColor={colors.border.subtle}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 24,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typographyStyles.appTitle,
    color: '#FFFFFF',
    fontSize: 28,
    letterSpacing: 0,
  },
  headerSub: {
    ...typographyStyles.body,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 1,
    fontFamily: 'Inter-Medium',
  },
  headerMetric: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 24,
  },
  savingBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionTitle: {
    ...typographyStyles.footnote,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.5,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
    marginRight: 10,
  },
  rowLabel: {
    ...typographyStyles.body,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  rowDesc: {
    ...typographyStyles.footnote,
    fontSize: 11,
    marginTop: 1,
    fontFamily: 'Inter-Medium',
  },
});
