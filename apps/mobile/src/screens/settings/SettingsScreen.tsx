import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useAuth } from '../../store/AuthContext';
import { usePremium } from '../../store/PremiumContext';
import { Avatar } from '../../components/ui/Avatar';
import { CoupleModeToggle } from '../../components/ui/CoupleModeToggle';
import { useAppLock } from '../../store/LockContext';

import { ConfirmDialog } from '../../components/ui';
import { PADDING, borderRadius, shadows } from '../../theme/design';
import { COUPLE_COLORS } from '../../hooks/useCoupleMode';

type IconName = string;

interface SectionItem {
  label: string;
  icon: IconName;
  screen: string;
  premium?: boolean;
  action?: 'lock';
}

interface GroupConfig {
  title: string;
  icon: IconName;
  desc: string;
  items: SectionItem[];
}

const GROUPS: GroupConfig[] = [
  {
    title: 'Wealth Tools',
    icon: 'barschart',
    desc: 'Reports, budgets & data tools',
    items: [
      { label: 'Financial Reports', icon: 'barschart', screen: 'Reports', premium: true },
      { label: 'Export Data', icon: 'download', screen: 'DataExport' },
      { label: 'Budgets', icon: 'piechart', screen: 'BudgetsList' },
    ],
  },
  {
    title: 'Your Progress',
    icon: 'star',
    desc: 'Achievements & milestones',
    items: [
      { label: 'Streaks & Achievements', icon: 'star', screen: 'Streaks' },
      { label: 'Year in Review', icon: 'calendar', screen: 'YearlySummary' },
    ],
  },
  {
    title: 'Account',
    icon: 'user',
    desc: 'Profile, partner, contacts & referrals',
    items: [
      { label: 'Profile', icon: 'person-circle-outline', screen: 'Profile' },
      { label: 'Partner Management', icon: 'heart-circle-outline', screen: 'AddPartner' },
      { label: 'Favorite Contacts', icon: 'staro', screen: 'FavoriteContacts' },
      { label: 'Refer & Earn', icon: 'gift', screen: 'Referral' },
    ],
  },
  {
    title: 'Premium',
    icon: 'star',
    desc: 'Plans, billing & couple space',
    items: [
      { label: 'Premium Plan', icon: 'star', screen: 'Premium' },
      { label: 'Couple Space', icon: 'hearto', screen: 'CoupleSpace' },
    ],
  },
  {
    title: 'Preferences',
    icon: 'setting',
    desc: 'Theme, security & notifications',
    items: [
      { label: 'Theme', icon: 'color-palette-outline', screen: 'Theme' },
      { label: 'Notifications', icon: 'bells', screen: 'NotificationSettings' },
      { label: 'Security', icon: 'shield-checkmark-outline', screen: 'Security' },
      { label: 'Lock App', icon: 'lock', screen: 'Security', action: 'lock' },
    ],
  },
  {
    title: 'Support',
    icon: 'questioncircleo',
    desc: 'Help, contact & privacy',
    items: [
      { label: 'Help Center', icon: 'questioncircleo', screen: 'HelpCenter' },
      { label: 'Contact Us', icon: 'message1', screen: 'Support' },
      { label: 'Privacy Policy', icon: 'filetext1', screen: 'Privacy' },
    ],
  },
];

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, logout, fetchCoupleRequests, approveCoupleRequest, rejectCoupleRequest } =
    useAuth();
  const { isPremium, subscription, loading, refresh } = usePremium();
  const { lockApp } = useAppLock();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.isCouple) {
      setPendingRequests([]);
    } else {
      fetchCoupleRequests()
        .then((res: any) => {
          const pending = (res?.received || []).filter((r: any) => r.status === 'pending');
          setPendingRequests(pending);
        })
        .catch(() => {});
    }
  }, [user?.isCouple, fetchCoupleRequests]);

  useFocusEffect(
    React.useCallback(() => {
      if (!user?.isCouple) {
        fetchCoupleRequests()
          .then((res: any) => {
            const pending = (res?.received || []).filter((r: any) => r.status === 'pending');
            setPendingRequests(pending);
          })
          .catch(() => {});
      } else {
        setPendingRequests([]);
      }
    }, [user?.isCouple, fetchCoupleRequests]),
  );

  useEffect(() => {
    refresh();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleNav = (screen: string, premium?: boolean, action?: 'lock') => {
    if (action === 'lock') {
      lockApp();
      return;
    }
    const registered = [
      'Profile',
      'AddPartner',
      'Security',
      'Premium',
      'Theme',
      'CustomiseDashboard',
      'CustomiseBottomMenu',
      'Help',
      'Contact',
      'Privacy',
      'Analytics',
      'Reports',
      'BudgetsList',
      'NotificationSettings',
      'FavoriteContacts',
      'Referral',
      'CoupleSpace',
      'Streaks',
      'DataExport',
      'Support',
      'YearlySummary',
    ];
    if (!registered.includes(screen)) {
      Alert.alert('Coming Soon', `${screen} settings will be available soon`);
      return;
    }
    if (premium && !isPremium) {
      Alert.alert('Premium Feature', 'This feature is available on Premium plan.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Plans', onPress: () => navigation.navigate('SubscriptionCenter') },
      ]);
      return;
    }
    navigation.navigate(screen);
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Profile Header */}
        <View
          style={{ paddingTop: insets.top + 16, paddingHorizontal: PADDING, paddingBottom: 24 }}
        >
          <View
            style={{
              backgroundColor: colors.bg.card,
              borderRadius: borderRadius.xl,
              padding: 20,
              ...shadows.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Avatar
                uri={user?.avatarUrl}
                name={`${user?.firstName || ''} ${user?.lastName || ''}`}
                size={56}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: colors.text.primary,
                    letterSpacing: -0.3,
                  }}
                >
                  {user?.firstName || 'User'} {user?.lastName || ''}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '500',
                    color: colors.text.tertiary,
                    marginTop: 2,
                  }}
                >
                  {user?.email || 'No email'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleNav('Profile')}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: `${colors.accent.primary}10`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AntDesign name="right" size={18} color={colors.accent.primary} />
              </TouchableOpacity>
            </View>
            <View
              style={{
                flexDirection: 'row',
                marginTop: 16,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: colors.border.subtle,
                gap: 12,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: isPremium ? `${colors.accent.primary}12` : colors.bg.tertiary,
                }}
              >
                <AntDesign
                  name={isPremium ? 'star' : 'user'}
                  size={14}
                  color={isPremium ? colors.accent.primary : colors.text.tertiary}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: isPremium ? colors.accent.primary : colors.text.tertiary,
                  }}
                >
                  {isPremium ? 'Premium' : 'Free'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Security')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: colors.bg.tertiary,
                }}
              >
                <AntDesign name="checkcircle" size={14} color={colors.text.tertiary} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text.tertiary }}>
                  Security
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Pending Couple Requests */}
          {pendingRequests.length > 0 && (
            <View style={{ paddingHorizontal: PADDING, marginBottom: 16 }}>
              <View
                style={{
                  backgroundColor: COUPLE_COLORS.bg,
                  borderRadius: borderRadius.xl,
                  borderWidth: 1,
                  borderColor: COUPLE_COLORS.border,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: COUPLE_COLORS.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AntDesign name="hearto" size={18} color={COUPLE_COLORS.primary} />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '800',
                      color: COUPLE_COLORS.text,
                      flex: 1,
                    }}
                  >
                    Couple Request{pendingRequests.length > 1 ? 's' : ''}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: COUPLE_COLORS.primary,
                    }}
                  >
                    {pendingRequests.length} pending
                  </Text>
                </View>
                {pendingRequests.map((req: any) => (
                  <View
                    key={req.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: COUPLE_COLORS.border,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        backgroundColor: `${COUPLE_COLORS.primary}15`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <AntDesign name="user" size={18} color={COUPLE_COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: COUPLE_COLORS.text,
                        }}
                      >
                        {req.sender?.firstName || 'Someone'} wants to connect!
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '500',
                          color: COUPLE_COLORS.textSecondary,
                          marginTop: 1,
                        }}
                      >
                        {req.sender?.phone || req.sender?.email || ''}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          backgroundColor: '#10B981',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        disabled={processingReqId === req.id}
                        onPress={async () => {
                          setProcessingReqId(req.id);
                          try {
                            const result = await approveCoupleRequest(req.id);
                            if (result?.user) {
                              setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
                              Alert.alert(
                                'Connected!',
                                "You're in a couple! Couple Mode is active.",
                                [
                                  {
                                    text: 'Go to Home',
                                    onPress: () => navigation.navigate('Dashboard'),
                                  },
                                ],
                              );
                            }
                          } catch (e: any) {
                            Alert.alert('Error', e?.message || 'Failed to approve');
                          } finally {
                            setProcessingReqId(null);
                          }
                        }}
                      >
                        {processingReqId === req.id ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <AntDesign name="check" size={16} color="#FFF" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          backgroundColor: '#FF475720',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: '#FF475740',
                        }}
                        onPress={async () => {
                          try {
                            await rejectCoupleRequest(req.id);
                            setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
                          } catch {
                            // ignore
                          }
                        }}
                      >
                        <AntDesign name="close" size={16} color="#FF4757" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    paddingVertical: 10,
                  }}
                  onPress={() => navigation.navigate('AddPartner')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: COUPLE_COLORS.primary,
                    }}
                  >
                    View All
                  </Text>
                  <AntDesign name="right" size={14} color={COUPLE_COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Upgrade Banner */}
          {!loading && !isPremium && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Premium')}
              activeOpacity={0.85}
              style={{
                marginHorizontal: PADDING,
                marginBottom: 24,
                borderRadius: borderRadius.xl,
                overflow: 'hidden',
                backgroundColor: isDark ? '#1E1B4B' : '#F5F3FF',
                borderWidth: 1,
                borderColor: isDark ? '#2E1065' : '#E9D5FF',
              }}
            >
              <View
                style={{
                  height: 4,
                  backgroundColor: '#FFD700',
                }}
              />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 20,
                  gap: 14,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: '#FFD700',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AntDesign name="star" size={24} color="#0A0A0A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '800',
                      color: colors.text.primary,
                      letterSpacing: -0.3,
                    }}
                  >
                    Upgrade to Premium
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '500',
                      color: colors.text.tertiary,
                      marginTop: 2,
                    }}
                  >
                    Unlock reports, analytics & exclusive features
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 20,
                    backgroundColor: '#FFD700',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '800',
                      color: '#0A0A0A',
                    }}
                  >
                    Upgrade
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* Couple Mode Toggle */}
          <CoupleModeToggle />

          {/* Group Cards */}
          <View style={{ paddingHorizontal: PADDING, gap: 12, marginBottom: 24 }}>
            {GROUPS.map((group, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('SettingsGroup', {
                    group: JSON.stringify({ title: group.title, items: group.items }),
                  })
                }
                style={{
                  backgroundColor: colors.bg.card,
                  borderRadius: borderRadius.xl,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  ...shadows.md,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: `${colors.accent.primary}12`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AntDesign name={group.icon as any} size={22} color={colors.accent.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                    {group.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '500',
                      color: colors.text.tertiary,
                      marginTop: 2,
                    }}
                  >
                    {group.desc} · {group.items.length} items
                  </Text>
                  {/* Preview chips */}
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {group.items.slice(0, 3).map((item, j) => (
                      <View
                        key={j}
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                          backgroundColor: `${colors.accent.primary}08`,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '600',
                            color: colors.text.secondary,
                          }}
                        >
                          {item.label}
                        </Text>
                      </View>
                    ))}
                    {group.items.length > 3 && (
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '600',
                          color: colors.text.tertiary,
                          alignSelf: 'center',
                        }}
                      >
                        +{group.items.length - 3}
                      </Text>
                    )}
                  </View>
                </View>
                <AntDesign name="right" size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              marginHorizontal: PADDING,
              padding: 16,
              backgroundColor: colors.bg.card,
              borderRadius: borderRadius.lg,
              ...shadows.sm,
            }}
            onPress={() => setShowLogoutDialog(true)}
            activeOpacity={0.6}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: `${colors.status.error}10`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AntDesign name="logout" size={18} color={colors.status.error} />
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.status.error }}>
              Sign Out
            </Text>
            <AntDesign name="right" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>

          <Text
            style={{
              textAlign: 'center',
              fontSize: 12,
              fontWeight: '500',
              color: colors.text.tertiary,
              marginTop: 24,
              marginBottom: 8,
            }}
          >
            Dabbu v1.0.0
          </Text>
        </Animated.View>
      </ScrollView>

      <ConfirmDialog
        visible={showLogoutDialog}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign Out"
        destructive
        icon="logout"
        onConfirm={() => {
          setShowLogoutDialog(false);
          logout().catch(() => {});
        }}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
});
