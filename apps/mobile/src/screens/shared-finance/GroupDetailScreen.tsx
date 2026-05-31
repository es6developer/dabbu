import React, { useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { MoneyLoader } from '../../components/shared-finance/MoneyLoader';
import { GroupDetailHeader } from '../../components/shared-finance/GroupDetailHeader';
import { GroupDetailListItem } from '../../components/shared-finance/GroupDetailListItem';
import { useGroupDetail } from '../../hooks/useGroupDetail';

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

export function GroupDetailScreen() {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    group,
    loading,
    refreshing,
    error,
    activeSegment,
    setActiveSegment,
    showRevokedModal,
    setShowRevokedModal,
    showUpgradeModal,
    setShowUpgradeModal,
    invitingExternal,
    status,
    isReadOnly,
    revocationReason,
    fetchGroup,
    handleInviteExternal,
    navigation,
    groupId,
  } = useGroupDetail();

  const isAdmin = useMemo(
    () =>
      group?.members.some((member) => member.role === 'owner' || member.role === 'admin') ?? false,
    [group],
  );

  const config = group
    ? GROUP_TYPE_CONFIG[group.type] || GROUP_TYPE_CONFIG.friends
    : GROUP_TYPE_CONFIG.friends;

  const segmentData = useMemo(() => {
    if (!group) {
      return [];
    }
    if (activeSegment === 'balances') {
      return group.members;
    }
    if (activeSegment === 'settlements') {
      return group.settlements;
    }
    return group.expenses;
  }, [activeSegment, group]);

  const renderHeader = useCallback(() => {
    if (!group) {
      return null;
    }
    return (
      <GroupDetailHeader
        group={group}
        status={status}
        isAdmin={isAdmin}
        config={config}
        activeSegment={activeSegment}
        onSegmentChange={setActiveSegment}
        onBack={() => navigation.goBack()}
        onSettings={() => navigation.navigate('GroupSettings', { groupId })}
        onInvite={handleInviteExternal}
        invitingExternal={invitingExternal}
        showRevokedModal={showRevokedModal}
        onRevokedDismiss={() => {
          setShowRevokedModal(false);
          navigation.navigate('SharedFinanceHome');
        }}
        revocationReason={revocationReason as any}
        showUpgradeModal={showUpgradeModal}
        onUpgradeDismiss={() => setShowUpgradeModal(false)}
        onUpgrade={() => navigation.navigate('Subscription')}
        onViewSummary={() => navigation.navigate('GroupDashboard', { groupId })}
        onReactivate={() => {}}
        onArchive={() => {}}
      />
    );
  }, [
    group,
    status,
    isAdmin,
    config,
    activeSegment,
    setActiveSegment,
    navigation,
    groupId,
    handleInviteExternal,
    invitingExternal,
    showRevokedModal,
    setShowRevokedModal,
    revocationReason,
    showUpgradeModal,
    setShowUpgradeModal,
  ]);

  const currency = group?.currency || 'INR';

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <GroupDetailListItem
        item={item}
        segment={activeSegment}
        group={group}
        config={config}
        currency={currency}
        onExpensePress={(expenseId) =>
          navigation.navigate('GroupExpenseDetail', { groupId, expenseId })
        }
      />
    ),
    [activeSegment, group, config, currency, navigation, groupId],
  );

  const renderEmpty = useCallback(() => {
    const emptyTitle =
      activeSegment === 'expenses'
        ? 'No expenses yet'
        : activeSegment === 'balances'
          ? 'No members yet'
          : 'No settlements yet';
    const emptyIcon =
      activeSegment === 'expenses'
        ? 'receipt-outline'
        : activeSegment === 'balances'
          ? 'people-outline'
          : 'swap-horizontal-outline';

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={emptyIcon} size={40} color={colors.text.tertiary} />
        <Text style={[typography.callout, { color: colors.text.tertiary, marginTop: 16 }]}>
          {emptyTitle}
        </Text>
      </View>
    );
  }, [activeSegment, colors.text.tertiary, typography.callout]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  if (loading && !group) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
        <MoneyLoader />
      </SafeAreaView>
    );
  }

  if (error && !group) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
        <View style={styles.errorView}>
          <Ionicons name="cloud-offline-outline" size={46} color={colors.status.error} />
          <Text style={[typography.callout, { color: colors.text.secondary, marginTop: 16 }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => fetchGroup()}
          >
            <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={segmentData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchGroup(true)}
            tintColor={colors.accent.primary}
          />
        }
      />

      {group?.id && status !== 'completed' && (
        <View style={[styles.fabWrapper, { bottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[
              styles.fabButton,
              styles.fabPrimary,
              {
                backgroundColor: isReadOnly ? colors.bg.tertiary : colors.accent.primary,
                opacity: isReadOnly ? 0.5 : 1,
              },
            ]}
            onPress={() => {
              if (!isReadOnly) {
                navigation.navigate('CreateGroupExpense', { groupId });
              }
            }}
            disabled={isReadOnly}
          >
            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
            <Text style={[typography.buttonSmall, { color: '#FFFFFF', marginLeft: 8 }]}>
              Add Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.fabButton,
              styles.fabSecondary,
              {
                backgroundColor: isReadOnly ? colors.bg.tertiary : colors.bg.glassLight,
                opacity: isReadOnly ? 0.5 : 1,
              },
            ]}
            onPress={() => {
              if (!isReadOnly) {
                navigation.navigate('CreateSettlement', { groupId });
              }
            }}
            disabled={isReadOnly}
          >
            <Ionicons
              name="swap-horizontal"
              size={22}
              color={isReadOnly ? colors.text.tertiary : colors.text.primary}
            />
            <Text
              style={[
                typography.buttonSmall,
                { color: isReadOnly ? colors.text.tertiary : colors.text.primary, marginLeft: 8 },
              ]}
            >
              Settle Up
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {group?.id && status === 'completed' && (
        <TouchableOpacity
          style={[
            styles.summaryButton,
            { backgroundColor: colors.accent.primary, bottom: insets.bottom + 16 },
          ]}
          onPress={() => navigation.navigate('GroupDashboard', { groupId })}
        >
          <Ionicons name="stats-chart-outline" size={22} color="#FFFFFF" />
          <Text style={[typography.buttonSmall, { color: '#FFFFFF', marginLeft: 8 }]}>
            View Summary
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  fabWrapper: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPrimary: {
    backgroundColor: '#3B82F6',
  },
  fabSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  summaryButton: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  errorView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
  },
});
