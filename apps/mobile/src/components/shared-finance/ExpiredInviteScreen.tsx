import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Linking, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, borderRadius, typography } from '../../theme';
import { resolveInvite, InviteData } from '../../services/external-sharing';

type InviteStatus = 'loading' | 'valid' | 'expired' | 'revoked' | 'completed' | 'archived' | 'error';

interface ExpiredInviteScreenProps {
  inviteToken: string;
  onGoBack: () => void;
}

const formatAmount = (amount: number, currency: string = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStatusConfig = (status: InviteStatus) => {
  const configs: Record<InviteStatus, {
    icon: keyof typeof Ionicons.glyphMap;
    gradient: [string, string];
    title: string;
    description: string;
  }> = {
    loading: {
      icon: 'hourglass-outline',
      gradient: ['#6c5ce7', '#a29bfe'],
      title: 'Checking invite...',
      description: 'Please wait while we verify your invite link.',
    },
    valid: {
      icon: 'checkmark-circle',
      gradient: ['#00B894', '#00cec9'],
      title: 'Invite is valid!',
      description: 'You can join this group.',
    },
    expired: {
      icon: 'time-outline',
      gradient: ['#FDCB6E', '#fdcb6e'],
      title: 'This invite has expired',
      description: 'The invite link is no longer valid. Please ask the group admin for a new one.',
    },
    revoked: {
      icon: 'close-circle',
      gradient: ['#FF6B6B', '#ee5a24'],
      title: 'This invite is no longer active',
      description: 'The invite has been revoked by the group admin.',
    },
    completed: {
      icon: 'flag',
      gradient: ['#00B894', '#00cec9'],
      title: 'Trip completed!',
      description: 'The group has been settled and marked as complete.',
    },
    archived: {
      icon: 'archive-outline',
      gradient: ['#636e72', '#b2bec3'],
      title: 'Group archived',
      description: 'This group has been archived and is no longer accepting members.',
    },
    error: {
      icon: 'cloud-offline-outline',
      gradient: ['#FF6B6B', '#d63031'],
      title: 'Something went wrong',
      description: 'We could not verify this invite. Please try again later.',
    },
  };
  return configs[status];
};

export const ExpiredInviteScreen: React.FC<ExpiredInviteScreenProps> = ({
  inviteToken,
  onGoBack,
}) => {
  const { colors, isDark } = useTheme();
  const [status, setStatus] = useState<InviteStatus>('loading');
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const checkInvite = async () => {
      try {
        const data = await resolveInvite(inviteToken);
        if (!mounted) return;
        setInviteData(data);

        if (!data.isValid) {
          setStatus('expired');
        } else {
          try {
            const groupStatus = await getGroupStatusFromInvite(data.groupId);
            if (!mounted) return;

            if (groupStatus === 'completed') setStatus('completed');
            else if (groupStatus === 'archived') setStatus('archived');
            else if (groupStatus === 'closed') setStatus('revoked');
            else setStatus('valid');
          } catch (_e) {
            setStatus('valid');
          }
        }
      } catch (err: any) {
        if (!mounted) return;
        const msg = err?.message || '';
        if (msg.toLowerCase().includes('expired')) setStatus('expired');
        else if (msg.toLowerCase().includes('revoked')) setStatus('revoked');
        else if (msg.toLowerCase().includes('complete')) setStatus('completed');
        else {
          setStatus('error');
          setErrorMessage(msg);
        }
      }
    };
    checkInvite();
    return () => { mounted = false; };
  }, [inviteToken]);

  const getGroupStatusFromInvite = async (groupId: string): Promise<string> => {
    const { checkGroupAccessStatus } = await import('../../services/access-control');
    const data = await checkGroupAccessStatus(groupId);
    return data.status;
  };

  const handleInstall = useCallback(() => {
    const url = Platform.OS === 'ios'
      ? 'https://apps.apple.com/app/dabbu/id123456789'
      : 'https://play.google.com/store/apps/details?id=com.dabbu.app';
    Linking.openURL(url).catch(() => {});
  }, []);

  const config = getStatusConfig(status);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          <Text style={[typography.callout, { color: colors.text.secondary, marginLeft: spacing.xs }]}>Back</Text>
        </TouchableOpacity>

        <LinearGradient
          colors={config.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.iconWrapper}>
            <Ionicons name={config.icon} size={48} color="#FFFFFF" />
          </View>
          <Text style={[typography.h2, { color: '#FFFFFF', textAlign: 'center', marginTop: spacing.xl }]}>
            {config.title}
          </Text>
          <Text style={[typography.callout, { color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 }]}>
            {errorMessage || config.description}
          </Text>

          {inviteData && status !== 'error' && (
            <View style={[styles.groupPreview, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <View style={[styles.groupAvatar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={styles.groupAvatarText}>
                  {inviteData.groupName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.groupPreviewInfo}>
                <Text style={[typography.bodyBold, { color: '#FFFFFF' }]}>
                  {inviteData.groupName}
                </Text>
                <Text style={[typography.subhead, { color: 'rgba(255,255,255,0.7)', marginTop: 2 }]}>
                  {inviteData.memberCount} members · {inviteData.groupType}
                </Text>
              </View>
            </View>
          )}
        </LinearGradient>

        <View style={styles.actions}>
          {status === 'valid' && (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.accent.primary }]}
              onPress={onGoBack}
              activeOpacity={0.8}
            >
              <Ionicons name="enter-outline" size={20} color="#FFFFFF" />
              <Text style={[typography.button, { color: '#FFFFFF', marginLeft: spacing.sm }]}>Join Group</Text>
            </TouchableOpacity>
          )}

          {status === 'completed' && (
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.bg.glassLight, borderColor: colors.border.default }]}
              onPress={onGoBack}
              activeOpacity={0.8}
            >
              <Ionicons name="receipt-outline" size={18} color={colors.accent.primary} />
              <Text style={[typography.button, { color: colors.accent.primary, marginLeft: spacing.sm }]}>View Summary</Text>
            </TouchableOpacity>
          )}

          {(status === 'expired' || status === 'revoked' || status === 'error') && (
            <View style={styles.conversionSection}>
              <Text style={[typography.subhead, { color: colors.text.tertiary, textAlign: 'center' }]}>
                Want to create your own groups?
              </Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.accent.primary, marginTop: spacing.lg }]}
                onPress={handleInstall}
                activeOpacity={0.8}
              >
                <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                <Text style={[typography.button, { color: '#FFFFFF', marginLeft: spacing.sm }]}>Install Dabbu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.textLink}
                onPress={onGoBack}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={[typography.subhead, { color: colors.text.link }]}>Sign Up Free</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {status === 'loading' && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    flexGrow: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  card: {
    alignItems: 'center',
    padding: spacing['3xl'],
    borderRadius: borderRadius['2xl'],
  },
  iconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xl,
    width: '100%',
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  groupPreviewInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  actions: {
    marginTop: spacing['2xl'],
    gap: spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
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
  conversionSection: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  textLink: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
});
