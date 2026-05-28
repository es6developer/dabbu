import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Modal, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, spacing, borderRadius, typography } from '../../theme';
import { useAuth } from '../../store/AuthContext';
import { useDeepLinks } from '../../hooks/useDeepLinks';
import { joinGroupViaInvite } from '../../services/external-sharing';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface DeepLinkHandlerProps {
  onNavigateToAuth?: () => void;
}

export const DeepLinkHandler: React.FC<DeepLinkHandlerProps> = ({
  onNavigateToAuth,
}) => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    type, token, inviteData, isValid,
    loading, error,
  } = useDeepLinks();

  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  const handleAcceptInvite = useCallback(async () => {
    if (!token) return;

    if (!isAuthenticated) {
      onNavigateToAuth?.();
      return;
    }

    setJoining(true);
    setJoinError(null);
    try {
      const result = await joinGroupViaInvite(token);
      setJoined(true);
      setTimeout(() => {
        navigation.navigate('GroupDetail', { groupId: result.groupId });
      }, 500);
    } catch (err: any) {
      setJoinError(err?.message || 'Failed to join group. Please try again.');
    } finally {
      setJoining(false);
    }
  }, [token, isAuthenticated, onNavigateToAuth, navigation]);

  if (!token || type !== 'invite') return null;

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.lg }]}>
            Validating invite link...
          </Text>
        </View>
      );
    }

    if (error || !inviteData || !isValid) {
      return (
        <View style={styles.centerContent}>
          <View style={[styles.errorIcon, { backgroundColor: colors.status.errorLight }]}>
            <Ionicons name="link-outline" size={32} color={colors.status.error} />
          </View>
          <Text style={[typography.h4, { color: colors.text.primary, marginTop: spacing.lg, textAlign: 'center' }]}>
            Invalid or Expired Invite
          </Text>
          <Text style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.sm, textAlign: 'center' }]}>
            {error || 'This invite link is no longer valid. Please ask the group admin for a new one.'}
          </Text>
          <TouchableOpacity
            style={[styles.dismissButton, { backgroundColor: colors.bg.glassLight, borderRadius: borderRadius.lg }]}
            onPress={() => {}}
          >
            <Text style={[typography.buttonSmall, { color: colors.text.primary }]}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (joined) {
      return (
        <View style={styles.centerContent}>
          <View style={[styles.successIcon, { backgroundColor: colors.status.successLight }]}>
            <Ionicons name="checkmark-circle" size={48} color={colors.status.success} />
          </View>
          <Text style={[typography.h3, { color: colors.text.primary, marginTop: spacing.lg, textAlign: 'center' }]}>
            You've joined {inviteData.groupName}!
          </Text>
        </View>
      );
    }

    return (
      <>
        <View style={styles.inviteHeader}>
          <View style={[styles.groupAvatar, { backgroundColor: colors.accent.primary + '20' }]}>
            <Ionicons name="people" size={28} color={colors.accent.primary} />
          </View>
          <Text style={[typography.h3, { color: colors.text.primary, textAlign: 'center', marginTop: spacing.md }]}>
            {inviteData.groupName}
          </Text>
          <View style={styles.inviteMeta}>
            <View style={[styles.metaBadge, { backgroundColor: colors.bg.glassLight }]}>
              <Ionicons name="people-outline" size={14} color={colors.text.secondary} />
              <Text style={[typography.subhead, { color: colors.text.secondary, marginLeft: 4 }]}>
                {inviteData.memberCount} members
              </Text>
            </View>
            <View style={[styles.metaBadge, { backgroundColor: colors.bg.glassLight }]}>
              <Ionicons name="pricetag-outline" size={14} color={colors.text.secondary} />
              <Text style={[typography.subhead, { color: colors.text.secondary, marginLeft: 4 }]}>
                {inviteData.groupType.charAt(0).toUpperCase() + inviteData.groupType.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        <Card variant="glass" padding="lg" style={styles.infoCard}>
          <Text style={[typography.callout, { color: colors.text.secondary, textAlign: 'center' }]}>
            You've been invited to track shared expenses with {inviteData.groupName}. Join now to see balances, add expenses, and settle up.
          </Text>
        </Card>

        {joinError && (
          <Text style={[typography.subhead, { color: colors.status.error, textAlign: 'center', marginTop: spacing.md }]}>
            {joinError}
          </Text>
        )}

        <View style={styles.actions}>
          <Button
            title={isAuthenticated ? 'Join Group' : 'Sign In to Join'}
            onPress={handleAcceptInvite}
            loading={joining}
            fullWidth
            size="lg"
          />
        </View>
      </>
    );
  };

  return (
    <Modal visible transparent animationType="slide">
      <StatusBar barStyle="light-content" />
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)' }]}>
        <View style={[styles.sheet, { backgroundColor: colors.bg.primary }]}>
          <View style={[styles.handle, { backgroundColor: colors.border.subtle }]} />
          <View style={styles.sheetContent}>
            {renderContent()}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    minHeight: 300,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  sheetContent: {
    padding: spacing.xl,
    paddingBottom: spacing['5xl'],
  },
  centerContent: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  inviteHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  groupAvatar: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteMeta: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  infoCard: {
    marginTop: spacing.sm,
  },
  actions: {
    marginTop: spacing['2xl'],
  },
  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['3xl'],
  },
});
