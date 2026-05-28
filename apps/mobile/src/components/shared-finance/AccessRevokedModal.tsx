import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, StatusBar, Modal, Linking, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, spacing, borderRadius, typography } from '../../theme';
import { MemberRevocationReason } from '../../services/access-control';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AccessRevokedModalProps {
  visible: boolean;
  onDismiss: () => void;
  reason: MemberRevocationReason;
  groupName: string;
  hasOutstandingBalance?: boolean;
  outstandingAmount?: number;
  onContactAdmin?: () => void;
  onViewReceipt?: () => void;
}

const REVOCATION_CONFIG: Record<MemberRevocationReason, {
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  getTitle: (groupName: string) => string;
  getDescription: (groupName: string) => string;
}> = {
  member_removed: {
    icon: 'lock-closed',
    gradient: ['#FF6B6B', '#ee5a24'],
    getTitle: () => 'Access Revoked',
    getDescription: (groupName) => `You've been removed from ${groupName}`,
  },
  group_closed: {
    icon: 'folder-open',
    gradient: ['#6c5ce7', '#a29bfe'],
    getTitle: (groupName) => `${groupName} has been closed`,
    getDescription: () => 'This group is no longer active. All pending expenses have been settled.',
  },
  group_completed: {
    icon: 'checkmark-circle',
    gradient: ['#00B894', '#00cec9'],
    getTitle: (groupName) => `${groupName} is complete!`,
    getDescription: () => 'All expenses have been settled. Great work!',
  },
  invite_expired: {
    icon: 'time-outline',
    gradient: ['#FDCB6E', '#fdcb6e'],
    getTitle: (groupName) => `Your invite to ${groupName} has expired`,
    getDescription: () => 'The invite link is no longer valid. Please request a new one.',
  },
  session_expired: {
    icon: 'log-out-outline',
    gradient: ['#f7892c', '#f9a85c'],
    getTitle: () => 'Your session has expired',
    getDescription: () => 'Please sign in again to continue using Dabbu.',
  },
};

const formatAmount = (amount: number, currency: string = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const AccessRevokedModal: React.FC<AccessRevokedModalProps> = ({
  visible,
  onDismiss,
  reason,
  groupName,
  hasOutstandingBalance = false,
  outstandingAmount = 0,
  onContactAdmin,
  onViewReceipt,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const config = REVOCATION_CONFIG[reason];
  const title = config.getTitle(groupName);
  const description = config.getDescription(groupName);

  useEffect(() => {
    if (visible) {
      StatusBar.setBarStyle('light-content');
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 9,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const handleInstall = useCallback(() => {
    const url = Platform.OS === 'ios'
      ? 'https://apps.apple.com/app/dabbu/id123456789'
      : 'https://play.google.com/store/apps/details?id=com.dabbu.app';
    Linking.openURL(url).catch(() => {});
  }, []);

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.backdrop, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)', opacity: backdropAnim }]} />
      <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={handleDismiss}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bg.secondary,
              paddingBottom: insets.bottom || spacing['3xl'],
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity activeOpacity={1}>
            <View style={[styles.handle, { backgroundColor: colors.border.subtle }]} />
            <LinearGradient
              colors={config.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <View style={styles.iconContainer}>
                <Ionicons name={config.icon} size={36} color="#FFFFFF" />
              </View>
              <Text style={[typography.h2, { color: '#FFFFFF', textAlign: 'center', marginTop: spacing.lg }]}>
                {title}
              </Text>
              <Text style={[typography.callout, { color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 }]}>
                {description}
              </Text>
            </LinearGradient>

            <View style={styles.actions}>
              {hasOutstandingBalance && outstandingAmount > 0 && (
                <View style={[styles.balanceWarning, { backgroundColor: colors.status.warningLight, borderColor: colors.status.warning + '30' }]}>
                  <Ionicons name="alert-circle" size={18} color={colors.status.warning} />
                  <Text style={[typography.subhead, { color: colors.text.primary, marginLeft: spacing.sm, flex: 1 }]}>
                    Outstanding balance: {formatAmount(outstandingAmount)} — please settle before leaving.
                  </Text>
                </View>
              )}

              {reason === 'member_removed' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: colors.accent.primary }]}
                    onPress={onContactAdmin || handleDismiss}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFFFFF" />
                    <Text style={[typography.button, { color: '#FFFFFF', marginLeft: spacing.sm }]}>Contact Admin</Text>
                  </TouchableOpacity>
                </View>
              )}

              {reason === 'group_completed' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { backgroundColor: colors.bg.glassLight, borderColor: colors.border.default }]}
                    onPress={onViewReceipt || handleDismiss}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="receipt-outline" size={18} color={colors.accent.primary} />
                    <Text style={[typography.button, { color: colors.accent.primary, marginLeft: spacing.sm }]}>View Receipt</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.conversionSection}>
                <Text style={[typography.subhead, { color: colors.text.tertiary, textAlign: 'center' }]}>
                  Want to create your own groups?
                </Text>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.accent.primary, marginTop: spacing.md }]}
                  onPress={handleInstall}
                  activeOpacity={0.8}
                >
                  <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                  <Text style={[typography.button, { color: '#FFFFFF', marginLeft: spacing.sm }]}>Install Dabbu</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.textButton}
                  onPress={handleDismiss}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={[typography.subhead, { color: colors.text.link }]}>Sign Up Free</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.gotItButton}
                onPress={handleDismiss}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={[typography.callout, { color: colors.text.tertiary }]}>Got it</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropTouch: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: SCREEN_HEIGHT * 0.85,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.md,
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  headerGradient: {
    alignItems: 'center',
    paddingTop: spacing['5xl'],
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['3xl'],
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  primaryButton: {
    flexDirection: 'row',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  secondaryButton: {
    flexDirection: 'row',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flex: 1,
  },
  balanceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  conversionSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  textButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  gotItButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
});
