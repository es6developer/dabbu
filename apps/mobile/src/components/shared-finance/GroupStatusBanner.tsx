import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, borderRadius, typography } from '../../theme';
import { GroupLifecycleStatus } from '../../services/access-control';

interface GroupStatusBannerProps {
  status: GroupLifecycleStatus;
  groupName: string;
  isAdmin?: boolean;
  onReactivate?: () => void;
  onArchive?: () => void;
  onViewSummary?: () => void;
  dismissible?: boolean;
}

const STATUS_CONFIG: Record<GroupLifecycleStatus, {
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  getTitle: (groupName: string) => string;
  getDescription: () => string;
}> = {
  active: {
    icon: 'checkmark-circle',
    gradient: ['#00B894', '#00cec9'],
    getTitle: () => '',
    getDescription: () => '',
  },
  paused: {
    icon: 'pause-circle',
    gradient: ['#FDCB6E', '#fdcb6e'],
    getTitle: () => 'Group is paused',
    getDescription: () => 'View only mode. Expenses cannot be added or modified.',
  },
  completed: {
    icon: 'checkmark-done-circle',
    gradient: ['#00B894', '#00cec9'],
    getTitle: (groupName) => `${groupName} completed!`,
    getDescription: () => 'All expenses have been settled.',
  },
  archived: {
    icon: 'archive',
    gradient: ['#636e72', '#b2bec3'],
    getTitle: () => 'Group archived',
    getDescription: () => 'This group is archived and no longer active.',
  },
  closed: {
    icon: 'folder',
    gradient: ['#6c5ce7', '#a29bfe'],
    getTitle: (groupName) => `${groupName} closed`,
    getDescription: () => 'This group has been closed by the admin.',
  },
};

export const GroupStatusBanner: React.FC<GroupStatusBannerProps> = ({
  status,
  groupName,
  isAdmin = false,
  onReactivate,
  onArchive,
  onViewSummary,
  dismissible = true,
}) => {
  const { colors, isDark } = useTheme();
  const [dismissed, setDismissed] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDismissed(true);
    });
  }, [slideAnim, opacityAnim]);

  const canDismiss = dismissible && status !== 'closed' && status !== 'archived';

  if (dismissed || status === 'active') return null;

  const config = STATUS_CONFIG[status];
  const isNonCritical = status === 'paused';

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      <LinearGradient
        colors={config.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.iconWrapper}>
            <Ionicons name={config.icon} size={22} color="#FFFFFF" />
          </View>
          <View style={styles.textContent}>
            <Text style={[typography.subheadBold, { color: '#FFFFFF' }]}>
              {config.getTitle(groupName)}
            </Text>
            <Text style={[typography.caption1, { color: 'rgba(255,255,255,0.8)', marginTop: 2 }]}>
              {config.getDescription()}
            </Text>
          </View>
          {canDismiss && (
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>

        {isAdmin && (
          <View style={[styles.adminActions, { borderTopColor: 'rgba(255,255,255,0.15)' }]}>
            {(status === 'paused' || status === 'completed' || status === 'archived') && (
              <TouchableOpacity
                style={[styles.adminButton, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                onPress={onReactivate}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
                <Text style={[typography.caption1, { color: '#FFFFFF', marginLeft: 6, fontWeight: '600' }]}>
                  Reactivate Group
                </Text>
              </TouchableOpacity>
            )}
            {status !== 'archived' && status !== 'closed' && (
              <TouchableOpacity
                style={[styles.adminButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                onPress={onArchive}
                activeOpacity={0.7}
              >
                <Ionicons name="archive-outline" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={[typography.caption1, { color: 'rgba(255,255,255,0.7)', marginLeft: 6 }]}>
                  Archive Group
                </Text>
              </TouchableOpacity>
            )}
            {status === 'completed' && (
              <TouchableOpacity
                style={[styles.adminButton, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                onPress={onViewSummary}
                activeOpacity={0.7}
              >
                <Ionicons name="stats-chart-outline" size={16} color="#FFFFFF" />
                <Text style={[typography.caption1, { color: '#FFFFFF', marginLeft: 6, fontWeight: '600' }]}>
                  View Summary
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: {
    borderRadius: borderRadius.xl,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  adminActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
});
