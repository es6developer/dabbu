import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useAuth } from '../../store/AuthContext';
import { Avatar } from '../../components/ui/Avatar';
import { CoupleModeToggle } from '../../components/ui/CoupleModeToggle';
import { useAppLock } from '../../store/LockContext';
import { usePreferences } from '../../store/PreferencesContext';
import { api, setAccessToken, getAccessToken } from '../../services/api';
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

const SECTIONS: Array<{ title: string; items: SectionItem[] }> = [
  {
    title: 'Wealth Tools',
    items: [
      { label: 'Financial Reports', icon: 'linechart', screen: 'Reports', premium: true },
      { label: 'Export Data', icon: 'download', screen: 'Analytics', premium: true },
      { label: 'Budgets', icon: 'piechart', screen: 'BudgetsList' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', icon: 'user', screen: 'Profile' },
      { label: 'Partner Management', icon: 'heart', screen: 'AddPartner' },
      { label: 'Favorite Contacts', icon: 'star', screen: 'FavoriteContacts' },
      { label: 'Refer & Earn', icon: 'gift', screen: 'Referral' },
    ],
  },
  {
    title: 'Premium',
    items: [
      { label: 'Premium Plan', icon: 'star', screen: 'Premium' },
      { label: 'Couple Space', icon: 'heart', screen: 'CoupleSpace' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { label: 'Theme', icon: 'skin', screen: 'Theme' },
      { label: 'Notifications', icon: 'bells', screen: 'NotificationSettings' },
      { label: 'Security', icon: 'Safety', screen: 'Security' },
      { label: 'Lock App', icon: 'lock', screen: 'Security', action: 'lock' },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Help Center', icon: 'questioncircle', screen: 'Help' },
      { label: 'Contact Us', icon: 'message1', screen: 'Contact' },
      { label: 'Privacy Policy', icon: 'filetext1', screen: 'Privacy' },
    ],
  },
];

const ROW_META: Record<string, { icon: IconName }> = {
  Profile: { icon: 'user' },
  'Partner Management': { icon: 'heart' },
  'Premium Plan': { icon: 'star' },
  'Favorite Contacts': { icon: 'star' },
  'Refer & Earn': { icon: 'gift' },
  Security: { icon: 'Safety' },
  'Lock App': { icon: 'lock' },
  'Financial Reports': { icon: 'linechart' },
  'Export Data': { icon: 'download' },
  Budgets: { icon: 'piechart' },
  'Couple Space': { icon: 'heart' },
  Theme: { icon: 'skin' },
  Notifications: { icon: 'bells' },
  'Help Center': { icon: 'questioncircle' },
  'Contact Us': { icon: 'message1' },
  'Privacy Policy': { icon: 'filetext1' },
};

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const {
    user,
    logout,
    refreshPremiumStatus,
    fetchCoupleRequests,
    approveCoupleRequest,
    rejectCoupleRequest,
  } = useAuth();
  const { lockApp } = useAppLock();
  const { bottomBarVisible, quickActionVisible, setBottomBarVisibility, setQuickActionVisibility } = usePreferences();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [subscription, setSubscription] = useState<any | null>(undefined);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);

  const filteredSECTIONS: typeof SECTIONS = useMemo(() => {
    return SECTIONS;
  }, []);

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
    loadSubscription();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  async function loadSubscription() {
    try {
      setAccessToken(getAccessToken());
      const res = await api.get<any>('/premium/current');
      setSubscription(res);
    } catch {
      setSubscription(null);
    }
    refreshPremiumStatus();
  }

  const isPremium = !!subscription && subscription.status === 'active';

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
    ];
    if (!registered.includes(screen)) {
      Alert.alert('Coming Soon', `${screen} settings will be available soon`);
      return;
    }
    if (premium && !isPremium) {
      Alert.alert('Premium Feature', 'This feature is available on Premium plan.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Plans', onPress: () => navigation.navigate('Subscription') },
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
                <AntDesign  name="right" size={18} color={colors.accent.primary} />
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
                  name={isPremium ? 'star' : 'user' as any}
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
                <AntDesign  name="checkcircle" size={14} color={colors.text.tertiary} />
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
                  <AntDesign  name="heart" size={18} color={COUPLE_COLORS.primary} />
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
                      <AntDesign  name="user" size={18} color={COUPLE_COLORS.primary} />
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
                          <AntDesign  name="check" size={16} color="#FFF" />
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
                        <AntDesign  name="close" size={16} color="#FF4757" />
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
                  <AntDesign  name="right" size={14} color={COUPLE_COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Upgrade Banner */}
          {subscription !== undefined && !isPremium && (
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
                  <AntDesign  name="star" size={24} color="#0A0A0A" />
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

          {/* Navigation Visibility */}
          <View style={{ marginBottom: 24, paddingHorizontal: PADDING }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: colors.text.tertiary,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                marginBottom: 10,
                paddingLeft: 2,
              }}
            >
              Navigation
            </Text>
            <View
              style={{
                backgroundColor: colors.bg.card,
                borderRadius: borderRadius.xl,
                overflow: 'hidden',
                ...shadows.md,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 15,
                  paddingHorizontal: 18,
                  gap: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border.subtle,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: `${colors.accent.primary}10`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AntDesign name="bars" size={18} color={colors.accent.primary} />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: '600',
                    color: colors.text.primary,
                  }}
                >
                  Bottom Bar
                </Text>
                <Switch
                  value={bottomBarVisible}
                  onValueChange={setBottomBarVisibility}
                  trackColor={{ false: colors.border.subtle, true: `${colors.accent.primary}60` }}
                  thumbColor={bottomBarVisible ? colors.accent.primary : colors.text.tertiary}
                />
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 15,
                  paddingHorizontal: 18,
                  gap: 14,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: `${colors.accent.primary}10`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AntDesign name="pluscircleo" size={18} color={colors.accent.primary} />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: '600',
                    color: colors.text.primary,
                  }}
                >
                  Quick Action Sheet
                </Text>
                <Switch
                  value={quickActionVisible}
                  onValueChange={setQuickActionVisibility}
                  trackColor={{ false: colors.border.subtle, true: `${colors.accent.primary}60` }}
                  thumbColor={quickActionVisible ? colors.accent.primary : colors.text.tertiary}
                />
              </View>
            </View>
          </View>

          {/* Sections */}
          {filteredSECTIONS.map((section, i) => (
            <View key={i} style={{ marginBottom: 24, paddingHorizontal: PADDING }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: colors.text.tertiary,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  marginBottom: 10,
                  paddingLeft: 2,
                }}
              >
                {section.title}
              </Text>
              <View
                style={{
                  backgroundColor: colors.bg.card,
                  borderRadius: borderRadius.xl,
                  overflow: 'hidden',
                  ...shadows.md,
                }}
              >
                {section.items.map((item, j) => {
                  const meta = ROW_META[item.label];
                  return (
                    <TouchableOpacity
                      key={j}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 15,
                        paddingHorizontal: 18,
                        gap: 14,
                        borderBottomWidth: j < section.items.length - 1 ? 1 : 0,
                        borderBottomColor: colors.border.subtle,
                      }}
                      onPress={() => handleNav(item.screen, item.premium, item.action)}
                      activeOpacity={0.6}
                    >
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          backgroundColor: `${colors.accent.primary}10`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <AntDesign
                          name={(meta?.icon as any) || item.icon}
                          size={18}
                          color={colors.accent.primary}
                        />
                      </View>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 15,
                          fontWeight: '600',
                          color: colors.text.primary,
                        }}
                      >
                        {item.label}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {item.premium && !isPremium && (
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 3,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                              backgroundColor: `${colors.accent.primary}10`,
                            }}
                          >
                            <AntDesign  name="lock" size={10} color={colors.accent.primary} />
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: colors.accent.primary,
                              }}
                            >
                              Premium
                            </Text>
                          </View>
                        )}
                        <AntDesign  name="right" size={16} color={colors.text.tertiary} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

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
              <AntDesign  name="logout" size={18} color={colors.status.error} />
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.status.error }}>
              Sign Out
            </Text>
            <AntDesign  name="right" size={16} color={colors.text.tertiary} />
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
