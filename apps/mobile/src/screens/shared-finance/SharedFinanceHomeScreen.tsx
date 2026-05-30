import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Card } from '../../components/ui/Card';

interface Group {
  id: string;
  name: string;
  type: 'friends' | 'trip' | 'family' | 'couple' | 'roommates' | 'office';
  description?: string;
  memberCount: number;
  totalSpent: number;
  balance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

interface CoupleProfile {
  id: string;
  partnerName: string;
  totalSpent: number;
  balance: number;
  currency: string;
}

interface GroupsResponse {
  groups: Group[];
  coupleProfile?: CoupleProfile;
}

const GROUP_TYPE_CONFIG: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }
> = {
  friends: { icon: 'people', label: 'Friends', color: '#74B9FF' },
  trip: { icon: 'airplane', label: 'Trip', color: '#00B894' },
  family: { icon: 'home', label: 'Family', color: '#FDCB6E' },
  couple: { icon: 'heart', label: 'Couple', color: '#FF6B6B' },
  roommates: { icon: 'business', label: 'Roommates', color: '#A29BFE' },
  office: { icon: 'briefcase', label: 'Office', color: '#f7892c' },
};

const formatAmount = (amount: number, currency: string = 'INR') => {
  const safeAmount = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(safeAmount));
};

export function SharedFinanceHomeScreen() {
  const { colors, spacing, borderRadius: br, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [coupleProfile, setCoupleProfile] = useState<CoupleProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const data = await api.get<Group[]>('/shared-finance/groups');
      setGroups(data);
      setCoupleProfile(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load groups');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [fetchGroups]),
  );

  const renderGroupCard = ({ item }: { item: Group }) => {
    const config = GROUP_TYPE_CONFIG[item.type] || GROUP_TYPE_CONFIG.friends;
    const firstLetter = item.name.charAt(0).toUpperCase();
    const isOwed = item.balance >= 0;

    return (
      <Card
        variant="elevated"
        padding="lg"
        style={styles.groupCard}
        onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
      >
        <View style={styles.groupCardRow}>
          <View style={[styles.avatar, { backgroundColor: config.color + '25' }]}>
            <Text style={[styles.avatarText, { color: config.color }]}>{firstLetter}</Text>
          </View>
          <View style={styles.groupInfo}>
            <View style={styles.groupNameRow}>
              <Text style={[typography.h4, { color: colors.text.primary }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={[styles.typeBadge, { backgroundColor: config.color + '20' }]}>
                <Ionicons name={config.icon} size={10} color={config.color} />
                <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
              </View>
            </View>
            <View style={styles.groupMetaRow}>
              <Ionicons name="people-outline" size={14} color={colors.text.tertiary} />
              <Text style={[styles.metaText, { color: colors.text.tertiary }]}>
                {item.memberCount} members
              </Text>
              <View style={styles.metaDot} />
              <Text style={[styles.metaText, { color: colors.text.tertiary }]}>
                Total: {formatAmount(item.totalSpent, item.currency)}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
        <View style={styles.balanceRow}>
          <Text style={[typography.callout, { color: colors.text.secondary }]}>Your balance</Text>
          <Text
            style={[
              styles.balanceAmount,
              { color: isOwed ? colors.status.success : colors.status.error },
            ]}
          >
            {isOwed ? '+' : '-'}
            {formatAmount(item.balance, item.currency)}
          </Text>
        </View>
      </Card>
    );
  };

  const renderCoupleCard = () => {
    if (!coupleProfile) {
      return null;
    }
    const isOwed = coupleProfile.balance >= 0;

    return (
      <Card
        variant="premium"
        padding="lg"
        style={[styles.coupleCard, { borderColor: colors.accent.primary + '30' }]}
        onPress={() => navigation.navigate('CoupleFinanceDashboard')}
      >
        <View style={styles.coupleCardHeader}>
          <View style={styles.coupleTitleRow}>
            <Ionicons name="heart" size={20} color={colors.status.error} />
            <Text style={[typography.h4, { color: colors.text.primary, marginLeft: spacing.sm }]}>
              Couple Finance
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
        </View>
        <View
          style={[
            styles.divider,
            { backgroundColor: colors.border.subtle, marginVertical: spacing.md },
          ]}
        />
        <View style={styles.coupleBalanceRow}>
          <Text style={[typography.callout, { color: colors.text.secondary }]}>
            with {coupleProfile.partnerName}
          </Text>
          <Text
            style={[
              styles.balanceAmount,
              { color: isOwed ? colors.status.success : colors.status.error },
            ]}
          >
            {isOwed ? '+' : '-'}
            {formatAmount(coupleProfile.balance, coupleProfile.currency)}
          </Text>
        </View>
        <Text style={[typography.footnote, { color: colors.text.tertiary, marginTop: spacing.xs }]}>
          Total spent: {formatAmount(coupleProfile.totalSpent, coupleProfile.currency)}
        </Text>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.bg.tertiary }]}>
        <Ionicons name="wallet-outline" size={48} color={colors.text.tertiary} />
      </View>
      <Text style={[typography.h3, { color: colors.text.primary, marginTop: spacing.xl }]}>
        No groups yet
      </Text>
      <Text
        style={[
          typography.callout,
          { color: colors.text.tertiary, textAlign: 'center', marginTop: spacing.sm },
        ]}
      >
        Create your first shared finance group{'\n'}to start splitting expenses with friends
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cloud-offline-outline" size={48} color={colors.status.error} />
      <Text style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.md }]}>
        {error}
      </Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
        onPress={() => fetchGroups()}
      >
        <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <>
      {renderCoupleCard()}
      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.text.primary }]}>Your Groups </Text>
        <Text style={[typography.subhead, { color: colors.text.tertiary }]}>
          {(groups || []).length} {(groups || []).length === 1 ? 'group' : 'groups'}
        </Text>
      </View>
    </>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.subtle }]}>
        <Text style={[typography.h1, { color: colors.text.primary }]}>Shared Finance</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.bg.tertiary }]}
            onPress={() => navigation.navigate('CreateGroup')}
          >
            <Ionicons name="add" size={20} color={colors.accent.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.bg.tertiary }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="person" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {error && !(groups || []).length ? (
        renderError()
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroupCard}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchGroups(true)}
              tintColor={colors.accent.primary}
              colors={[colors.accent.primary]}
            />
          }
        />
      )}

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.accent.primary,
            opacity: pressed ? 0.8 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
            bottom: insets.bottom + 120,
          },
        ]}
        onPress={() => navigation.navigate('CreateGroup')}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 140,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  groupCard: {
    marginBottom: 14,
  },
  groupCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  groupInfo: {
    flex: 1,
    marginLeft: 14,
  },
  groupNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  groupMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '400',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 6,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  coupleCard: {
    marginTop: 8,
    marginBottom: 8,
  },
  coupleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coupleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coupleBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f7892c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
