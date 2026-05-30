import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

interface Invitation {
  id: string;
  groupId: string;
  groupName: string;
  groupType?: string;
  invitedBy?: string;
  status: string;
  createdAt: string;
}

export function InvitationPendingScreen() {
  const { colors, isDark } = useTheme();
  const { accessToken } = useAuth();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    fetchInvitations();
  }, []);

  async function fetchInvitations() {
    try {
      const data = await api.get<Invitation[]>('/shared-finance/invitations/pending');
      setInvitations(data || []);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load invitations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvitations();
  }, []);

  async function handleAccept(id: string) {
    setActionLoading(id);
    try {
      await api.post(`/shared-finance/invitations/${id}/accept`);
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to accept invitation');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: string) {
    setActionLoading(id);
    try {
      await api.post(`/shared-finance/invitations/${id}/reject`);
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to reject invitation');
    } finally {
      setActionLoading(null);
    }
  }

  function renderSkeleton() {
    return (
      <View style={styles.skeletonContainer}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.skeleton.base }]}>
            <View style={styles.skeletonRow}>
              <View
                style={[styles.skeletonAvatar, { backgroundColor: colors.skeleton.highlight }]}
              />
              <View style={{ flex: 1, gap: 6 }}>
                <View
                  style={[
                    styles.skeletonLine,
                    { width: '60%', backgroundColor: colors.skeleton.highlight },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLine,
                    { width: '40%', backgroundColor: colors.skeleton.highlight },
                  ]}
                />
              </View>
            </View>
            <View style={styles.skeletonActions}>
              <View style={[styles.skeletonBtn, { backgroundColor: colors.skeleton.highlight }]} />
              <View style={[styles.skeletonBtn, { backgroundColor: colors.skeleton.highlight }]} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  function renderEmpty() {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.status.successLight }]}>
          <Ionicons name="checkmark-circle-outline" size={48} color={colors.status.success} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>All Clear</Text>
        <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
          You have no pending invitations
        </Text>
      </View>
    );
  }

  function renderInvitation({ item }: { item: Invitation }) {
    const isLoading = actionLoading === item.id;

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.bg.tertiary,
            borderColor: colors.border.subtle,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.accent.primary + '20' }]}>
            <Ionicons name="people" size={22} color={colors.accent.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.groupName, { color: colors.text.primary }]}>{item.groupName}</Text>
            {item.invitedBy && (
              <Text style={[styles.invitedBy, { color: colors.text.tertiary }]}>
                Invited by {item.invitedBy}
              </Text>
            )}
          </View>
          {item.groupType && (
            <View style={[styles.typeBadge, { backgroundColor: colors.bg.card }]}>
              <Text style={[styles.typeText, { color: colors.text.tertiary }]}>
                {item.groupType}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.acceptBtn,
              { backgroundColor: colors.accent.primary },
              isLoading && { opacity: 0.6 },
            ]}
            onPress={() => handleAccept(item.id)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.btnText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.rejectBtn,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
              isLoading && { opacity: 0.6 },
            ]}
            onPress={() => handleReject(item.id)}
            disabled={isLoading}
          >
            <Ionicons name="close" size={16} color={colors.text.secondary} />
            <Text style={[styles.rejectBtnText, { color: colors.text.secondary }]}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
        {renderSkeleton()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={invitations}
        keyExtractor={(item) => item.id}
        renderItem={renderInvitation}
        contentContainerStyle={[
          styles.listContent,
          invitations.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
  },
  invitedBy: {
    fontSize: 12,
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  skeletonContainer: {
    padding: 20,
    paddingTop: 40,
  },
  skeletonCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    marginRight: 12,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
  skeletonActions: {
    flexDirection: 'row',
    gap: 10,
  },
  skeletonBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
