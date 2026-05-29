import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, StatusBar, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, spacing, borderRadius, typography } from '../../theme';
import { logOnboardingEvent, startPremiumTrial } from '../../services/external-sharing';

type ConversionTrigger = 'settlement_threshold' | 'multi_use' | 'locked_feature' | 'trial_expiring' | 'referral_eligible';

interface ConversionModalProps {
  visible: boolean;
  trigger: ConversionTrigger;
  data?: Record<string, any>;
  tempUserId?: string;
  onClose: () => void;
  onSignUp: () => void;
  onStartTrial?: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const TRIGGER_CONFIG: Record<ConversionTrigger, {
  icon: keyof typeof Ionicons.glyphMap;
  getTitle: (data?: Record<string, any>) => string;
  getDescription: (data?: Record<string, any>) => string;
}> = {
  settlement_threshold: {
    icon: 'cash-outline',
    getTitle: (data) => `You settled ₹${data?.amount || 'X'}!`,
    getDescription: () => 'Track all your expenses in Dabbu. Get insights, split bills, and never lose track of your money again.',
  },
  multi_use: {
    icon: 'repeat-outline',
    getTitle: (data) => `You've used splits ${data?.count || 5} times!`,
    getDescription: () => 'Unlock premium features including unlimited groups, advanced analytics, and AI-powered insights.',
  },
  locked_feature: {
    icon: 'lock-closed-outline',
    getTitle: () => 'Premium Feature',
    getDescription: (data) => data?.featureName
      ? `${data.featureName} is a premium feature. Upgrade to unlock it and more.`
      : 'This feature is available exclusively for premium users. Upgrade now to access it.',
  },
  trial_expiring: {
    icon: 'timer-outline',
    getTitle: () => 'Your trial is ending',
    getDescription: (data) => data?.daysLeft
      ? `${data.daysLeft} days left in your trial. Subscribe to keep enjoying premium features.`
      : 'Your premium trial is ending soon. Subscribe to continue enjoying all features.',
  },
  referral_eligible: {
    icon: 'gift-outline',
    getTitle: () => 'Invite friends, earn rewards',
    getDescription: (data) => data?.rewardAmount
      ? `Get ₹${data.rewardAmount} for every friend who joins Dabbu using your referral link.`
      : 'Refer your friends to Dabbu and earn rewards for every sign-up.',
  },
};

export const ConversionModal: React.FC<ConversionModalProps> = ({
  visible,
  trigger,
  data,
  tempUserId,
  onClose,
  onSignUp,
  onStartTrial,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const config = TRIGGER_CONFIG[trigger];
  const title = config.getTitle(data);
  const description = config.getDescription(data);

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

  useEffect(() => {
    if (visible && tempUserId) {
      logOnboardingEvent({
        eventType: 'banner_shown',
        source: `conversion_${trigger}`,
        tempUserId,
      }).catch(() => {});
    }
  }, [visible, trigger, tempUserId]);

  const handleStartTrial = useCallback(async () => {
    if (tempUserId) {
      try {
        await startPremiumTrial(tempUserId, trigger);
        await logOnboardingEvent({
          eventType: 'trial_started',
          source: trigger,
          tempUserId,
        });
      } catch (_e) {
        // ignore
      }
    }
    onStartTrial?.();
  }, [tempUserId, trigger, onStartTrial]);

  const handleSignUp = useCallback(async () => {
    if (tempUserId) {
      await logOnboardingEvent({
        eventType: 'sign_up',
        source: trigger,
        tempUserId,
      }).catch(() => {});
    }
    onSignUp();
  }, [tempUserId, trigger, onSignUp]);

  const handleClose = useCallback(async () => {
    if (tempUserId) {
      await logOnboardingEvent({
        eventType: 'banner_dismissed',
        source: `conversion_${trigger}`,
        tempUserId,
      }).catch(() => {});
    }
    onClose();
  }, [tempUserId, trigger, onClose]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.backdrop, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)', opacity: backdropAnim }]} />
      <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={handleClose}>
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
              colors={[...colors.accent.gradient]}
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
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.accent.primary }]}
                onPress={handleSignUp}
                activeOpacity={0.8}
              >
                <Text style={[typography.button, { color: '#FFFFFF' }]}>Sign Up Free</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.bg.glassLight, borderColor: colors.border.default }]}
                onPress={handleStartTrial}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles" size={18} color={colors.accent.primary} />
                <Text style={[typography.button, { color: colors.accent.primary, marginLeft: spacing.sm }]}>
                  Get Premium Free Trial
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.laterButton}
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={[typography.callout, { color: colors.text.tertiary }]}>Maybe Later</Text>
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
    maxHeight: SCREEN_HEIGHT * 0.75,
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
    gap: spacing.md,
  },
  primaryButton: {
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    flexDirection: 'row',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
});
