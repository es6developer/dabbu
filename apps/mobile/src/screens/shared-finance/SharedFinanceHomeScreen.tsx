import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

interface GroupsResponse {
  groups: Group[];
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchGroups = useCallback(
    async (isRefresh = false) => {
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
      } catch (err: any) {
        setError(err.message || 'Failed to load groups');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken],
  );

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [fetchGroups]),
  );

  const filteredGroups = useMemo(
    () => groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())),
    [groups, search],
  );

  const totalOwed = groups.reduce((s, g) => s + Math.max(Number(g.balance) || 0, 0), 0);
  const totalDebt = groups.reduce((s, g) => s + Math.max(-(Number(g.balance) || 0), 0), 0);

  const renderGroupCard = ({ item }: { item: Group }) => {
    const config = GROUP_TYPE_CONFIG[item.type] || GROUP_TYPE_CONFIG.friends;
    const isOwed = Number(item.balance) >= 0;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
        style={[styles.groupCard, { backgroundColor: colors.bg.card }]}
      >
        <View style={styles.groupCardLeft}>
          <LinearGradient
            colors={[config.color + '30', config.color + '10']}
            style={[styles.groupAvatar]}
          >
            <Ionicons name={config.icon} size={22} color={config.color} />
          </LinearGradient>
        </View>
        <View style={styles.groupCardCenter}>
          <Text style={[typography.bodyBold, { color: colors.text.primary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.groupMeta}>
            <Ionicons name="people-outline" size={12} color={colors.text.tertiary} />
            <Text style={[styles.metaText, { color: colors.text.tertiary }]}>
              {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
            </Text>
            <View style={[styles.metaDot, { backgroundColor: colors.text.tertiary + '40' }]} />
            <Text style={[styles.metaText, { color: colors.text.tertiary }]} numberOfLines={1}>
              Spent {formatAmount(item.totalSpent, item.currency)}
            </Text>
          </View>
          <View style={styles.groupTypeRow}>
            <View style={[styles.typePill, { backgroundColor: config.color + '20' }]}>
              <Text style={[styles.typePillText, { color: config.color }]}>{config.label}</Text>
            </View>
          </View>
        </View>
        <View style={styles.groupCardRight}>
          <Text
            style={[
              styles.balanceAmount,
              { color: isOwed ? colors.status.success : colors.status.error },
            ]}
          >
            {isOwed ? '+' : '-'}
            {formatAmount(item.balance, item.currency)}
          </Text>
          <Text style={[styles.balanceLabel, { color: colors.text.tertiary }]}>
            {isOwed ? 'gets back' : 'owes'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.bg.tertiary }]}>
        <Ionicons name="wallet-outline" size={44} color={colors.text.tertiary} />
      </View>
      <Text style={[typography.h3, { color: colors.text.primary, marginTop: spacing.xl }]}>
        {search ? 'No groups found' : 'No groups yet'}
      </Text>
      <Text
        style={[
          typography.callout,
          {
            color: colors.text.tertiary,
            textAlign: 'center',
            marginTop: spacing.sm,
            lineHeight: 20,
          },
        ]}
      >
        {search
          ? 'Try a different search term'
          : 'Create your first shared group to start\nsplitting expenses with friends'}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <>
      <LinearGradient
        colors={[colors.accent.primary + '20', colors.bg.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.summaryCard}
      >
        <Text style={[typography.footnote, { color: colors.text.secondary }]}>Your Groups</Text>
        <Text style={[typography.amountLarge, { color: colors.text.primary, marginTop: 4 }]}>
          {groups.length} {groups.length === 1 ? 'group' : 'groups'}
        </Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[typography.h4, { color: colors.status.success }]}>
              +{formatAmount(totalOwed)}
            </Text>
            <Text style={[typography.caption, { color: colors.text.tertiary }]}>total owed</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border.subtle }]} />
          <View style={styles.summaryItem}>
            <Text style={[typography.h4, { color: colors.status.error }]}>
              -{formatAmount(totalDebt)}
            </Text>
            <Text style={[typography.caption, { color: colors.text.tertiary }]}>total owe</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.bg.tertiary }]}>
          <Ionicons name="search-outline" size={16} color={colors.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="Search groups..."
            placeholderTextColor={colors.text.tertiary}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: colors.accent.primary }]}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={[styles.quickActionText, { color: '#FFF' }]}>New Group</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionSecondary, { backgroundColor: colors.accent.primary + '15' }]}
          onPress={() => navigation.navigate('Invitations')}
        >
          <Ionicons name="mail-outline" size={18} color={colors.accent.primary} />
          <Text style={[styles.quickActionText, { color: colors.accent.primary }]}>
            Invitations
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
        <View style={styles.headerBar}>
          <Text style={[typography.h1, { color: colors.text.primary }]}>Groups</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.headerBar, { borderBottomColor: colors.border.subtle }]}>
        <Text style={[typography.h1, { color: colors.text.primary }]}>Groups</Text>
        <TouchableOpacity
          style={[styles.settingsBtn, { backgroundColor: colors.bg.tertiary }]}
          onPress={() => navigation.navigate('Invitations')}
        >
          <Ionicons name="mail-outline" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {error && !groups.length ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.status.error} />
          <Text
            style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.md }]}
          >
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => fetchGroups()}
          >
            <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredGroups}
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
            bottom: insets.bottom + 24,
          },
        ]}
        onPress={() => navigation.navigate('CreateGroup')}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  summaryCard: {
    marginTop: 12,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 32,
  },
  searchContainer: {
    paddingHorizontal: 0,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  quickActionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  groupCardLeft: {
    marginRight: 14,
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupCardCenter: {
    flex: 1,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
    marginHorizontal: 4,
  },
  groupTypeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  groupCardRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  balanceAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  balanceLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
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
    right: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
