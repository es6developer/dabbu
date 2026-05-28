import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, spacing, borderRadius, typography } from '../../theme';
import { useAuth } from '../../store/AuthContext';
import { resolveInvite, joinGroupViaInvite, InviteData } from '../../services/external-sharing';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

type InviteParams = {
  InviteAccept: {
    token: string;
  };
};

export function InviteAcceptScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<InviteParams, 'InviteAccept'>>();
  const { token } = route.params;

  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  const fetchInvite = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await resolveInvite(token);
      setInviteData(data);
      if (!data.isValid) {
        setError('This invite link has expired or is no longer valid.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load invite details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInvite();
  }, [fetchInvite]);

  const handleJoin = useCallback(async () => {
    if (!isAuthenticated) {
      navigation.navigate('Auth', { screen: 'Login', params: { redirectIntent: 'join_group', inviteToken: token } });
      return;
    }

    setJoining(true);
    setJoinError(null);
    try {
      const result = await joinGroupViaInvite(token);
      setJoined(true);
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [
            { name: 'SharedFinanceHome' },
            { name: 'GroupDetail', params: { groupId: result.groupId } },
          ],
        });
      }, 800);
    } catch (err: any) {
      setJoinError(err?.message || 'Failed to join group. Please try again.');
    } finally {
      setJoining(false);
    }
  }, [token, isAuthenticated, navigation]);

  const renderLoading = () => (
    <View style={styles.centerContent}>
      <ActivityIndicator size="large" color={colors.accent.primary} />
      <Text style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.xl }]}>
        Validating your invite...
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.centerContent}>
      <View style={[styles.statusIcon, { backgroundColor: colors.status.errorLight }]}>
        <Ionicons name="link-outline" size={40} color={colors.status.error} />
      </View>
      <Text style={[typography.h3, { color: colors.text.primary, marginTop: spacing.xl, textAlign: 'center' }]}>
        Invite Not Found
      </Text>
      <Text style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.sm, textAlign: 'center', lineHeight: 22 }]}>
        {error || 'This invite link is invalid or has expired. Ask the group admin for a new invitation.'}
      </Text>
      <Button
        title="Go Home"
        onPress={() => navigation.navigate('SharedFinanceHome')}
        variant="outline"
        style={{ marginTop: spacing['2xl'] }}
      />
    </View>
  );

  const renderJoined = () => (
    <View style={styles.centerContent}>
      <View style={[styles.statusIcon, { backgroundColor: colors.status.successLight }]}>
        <Ionicons name="checkmark-circle" size={56} color={colors.status.success} />
      </View>
      <Text style={[typography.h2, { color: colors.text.primary, marginTop: spacing.xl, textAlign: 'center' }]}>
        You're in!
      </Text>
      <Text style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.sm, textAlign: 'center' }]}>
        You've successfully joined {inviteData?.groupName}
      </Text>
    </View>
  );

  const renderInvite = () => {
    if (!inviteData) return null;

    const groupTypeLabel = inviteData.groupType.charAt(0).toUpperCase() + inviteData.groupType.slice(1);

    return (
      <>
        <LinearGradient
          colors={[...colors.accent.gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.groupAvatarLarge}>
            <Ionicons name="people" size={40} color="#FFFFFF" />
          </View>
          <Text style={[typography.h1, { color: '#FFFFFF', marginTop: spacing.lg }]}>
            {inviteData.groupName}
          </Text>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Ionicons name="people-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={[typography.subheadBold, { color: 'rgba(255,255,255,0.8)', marginLeft: 6 }]}>
                {inviteData.memberCount} {inviteData.memberCount === 1 ? 'member' : 'members'}
              </Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="pricetag-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={[typography.subheadBold, { color: 'rgba(255,255,255,0.8)', marginLeft: 6 }]}>
                {groupTypeLabel}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Card variant="glass" padding="xl" style={styles.infoCard}>
            <Text style={[typography.calloutBold, { color: colors.text.primary }]}>
              What's this group about?
            </Text>
            <Text style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.sm, lineHeight: 22 }]}>
              Track shared expenses, split bills, and settle up with {inviteData.groupName}. 
              Add expenses, see who owes whom, and keep everyone on the same page.
            </Text>
          </Card>

          {joinError && (
            <Card variant="outlined" padding="md" style={[styles.errorCard, { borderColor: colors.status.error + '30' }]}>
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={18} color={colors.status.error} />
                <Text style={[typography.subhead, { color: colors.status.error, marginLeft: spacing.sm, flex: 1 }]}>
                  {joinError}
                </Text>
              </View>
            </Card>
          )}

          <View style={styles.actions}>
            <Button
              title={isAuthenticated ? 'Join Group' : 'Sign In to Join'}
              onPress={handleJoin}
              loading={joining || authLoading}
              fullWidth
              size="lg"
              haptic
            />
            <TouchableOpacity
              style={styles.backLink}
              onPress={() => navigation.navigate('SharedFinanceHome')}
            >
              <Text style={[typography.callout, { color: colors.text.tertiary }]}>
                Maybe later
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
      <StatusBar barStyle="light-content" />
      {loading && renderLoading()}
      {!loading && error && !inviteData && renderError()}
      {!loading && !error && joined && renderJoined()}
      {!loading && !error && !joined && renderInvite()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  headerGradient: {
    alignItems: 'center',
    paddingTop: spacing['5xl'],
    paddingBottom: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  groupAvatarLarge: {
    width: 88,
    height: 88,
    borderRadius: borderRadius['2xl'],
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing['5xl'],
  },
  infoCard: {
    marginTop: spacing.md,
  },
  errorCard: {
    marginTop: spacing.lg,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    marginTop: spacing['2xl'],
    gap: spacing.md,
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statusIcon: {
    width: 96,
    height: 96,
    borderRadius: borderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
});
