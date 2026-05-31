import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { GroupLifecycleStatus } from '../../services/access-control';
import { formatAmount } from '../../utils/shared-finance';
import { GroupDetail, Segments } from '../../types/shared-finance';
import { GroupStatusBanner } from './GroupStatusBanner';
import { AccessRevokedModal } from './AccessRevokedModal';
import { PremiumUpgradeModal } from './PremiumUpgradeModal';

type GroupDetailHeaderProps = {
  group: GroupDetail;
  status: GroupLifecycleStatus;
  isAdmin: boolean;
  config: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string };
  activeSegment: Segments;
  onSegmentChange: (segment: Segments) => void;
  onBack: () => void;
  onSettings: () => void;
  onInvite: () => void;
  invitingExternal: boolean;
  showRevokedModal: boolean;
  onRevokedDismiss: () => void;
  revocationReason?: string;
  showUpgradeModal: boolean;
  onUpgradeDismiss: () => void;
  onUpgrade: () => void;
  onViewSummary: () => void;
  onReactivate: () => void;
  onArchive: () => void;
};

const SEGMENTS: { key: Segments; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'expenses', label: 'Expenses', icon: 'receipt-outline' },
  { key: 'balances', label: 'Balances', icon: 'people-outline' },
  { key: 'settlements', label: 'Settlements', icon: 'swap-horizontal-outline' },
];

function StatsRow({ group }: { group: GroupDetail }) {
  const { colors, typography } = useTheme();
  const now = new Date();
  const total = group.expenses.length;
  const categorized = group.expenses.filter((e) => Boolean(e.category)).length;
  const pending = group.settlements.filter((s) => s.status !== 'completed').length;
  const thisMonth = group.expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const items = [
    { label: 'Total', value: total, color: colors.accent.primary },
    { label: 'Categorized', value: categorized, color: colors.status.success },
    { label: 'Pending', value: pending, color: colors.status.warning },
    { label: 'This Month', value: thisMonth, color: colors.text.secondary },
  ];

  return (
    <View style={styles.statsRow}>
      {items.map((item) => (
        <View
          key={item.label}
          style={[
            styles.statCard,
            { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
          ]}
        >
          <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
          <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function GroupDetailHeader(props: GroupDetailHeaderProps) {
  const { colors, spacing, typography } = useTheme();
  const { group, config, activeSegment, onSegmentChange } = props;
  const isOwed = group.balance >= 0;

  return (
    <>
      <GroupStatusBanner
        status={props.status}
        groupName={group.name}
        isAdmin={props.isAdmin}
        onReactivate={props.onReactivate}
        onArchive={props.onArchive}
        onViewSummary={props.onViewSummary}
      />

      <AccessRevokedModal
        visible={props.showRevokedModal}
        onDismiss={props.onRevokedDismiss}
        reason={(props.revocationReason as any) || 'member_removed'}
        groupName={group.name}
      />

      <PremiumUpgradeModal
        visible={props.showUpgradeModal}
        onDismiss={props.onUpgradeDismiss}
        onUpgrade={props.onUpgrade}
        groupName={group.name}
        currentLimit={group.planLimit || 2}
        premiumLimit={30}
      />

      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={props.onBack}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[typography.h2, { color: colors.text.primary }]} numberOfLines={1}>
              {group.name}
            </Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: config.color + '20' }]}>
                <Ionicons name={config.icon} size={12} color={config.color} />
                <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.bg.tertiary }]}>
                <Ionicons name="people-outline" size={12} color={colors.text.secondary} />
                <Text style={[styles.badgeText, { color: colors.text.secondary }]}>
                  {group.memberCount} members
                </Text>
              </View>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: colors.bg.tertiary }]}
          onPress={props.onSettings}
        >
          <Ionicons name="settings-outline" size={22} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.balanceCard}>
        <LinearGradient
          colors={[config.color + '30', colors.bg.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceGradient}
        >
          <View style={styles.balanceTypeRow}>
            <View style={[styles.typeBadge, { backgroundColor: config.color + '25' }]}>
              <Ionicons name={config.icon} size={12} color={config.color} />
              <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
            </View>
          </View>
          <Text
            style={[typography.h3, { color: colors.text.primary, marginTop: spacing.sm }]}
            numberOfLines={1}
          >
            {group.name}
          </Text>
          <Text
            style={[
              typography.amountLarge,
              {
                color: isOwed ? colors.status.success : colors.status.error,
                marginTop: spacing.sm,
              },
            ]}
          >
            {isOwed ? '+' : '-'}
            {formatAmount(group.balance, group.currency)}
          </Text>
          <Text
            style={[typography.footnote, { color: colors.text.tertiary, marginTop: spacing.xs }]}
          >
            {isOwed ? 'You are owed' : 'You owe'}
          </Text>
          <View
            style={[
              styles.divider,
              { backgroundColor: colors.border.subtle, marginVertical: spacing.md },
            ]}
          />
          <View style={styles.totalRow}>
            <Text style={[typography.footnote, { color: colors.text.secondary }]}>Total spent</Text>
            <Text style={[typography.callout, { color: colors.text.primary, fontWeight: '600' }]}>
              {formatAmount(group.totalSpent, group.currency)}
            </Text>
          </View>
        </LinearGradient>
      </View>

      <View
        style={[
          styles.inviteContainer,
          {
            backgroundColor: colors.accent.primary + '12',
            borderColor: colors.accent.primary + '30',
          },
        ]}
      >
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={props.onInvite}
          disabled={props.invitingExternal}
          activeOpacity={0.8}
        >
          {props.invitingExternal ? (
            <ActivityIndicator
              size="small"
              color={colors.accent.primary}
              style={{ marginRight: 8 }}
            />
          ) : (
            <Ionicons name="share-outline" size={16} color={colors.accent.primary} />
          )}
          <Text style={[styles.inviteText, { color: colors.accent.primary }]}>
            {props.invitingExternal ? 'Preparing link...' : 'Share invite link'}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.accent.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.segmentControl, { backgroundColor: colors.bg.tertiary }]}>
        {SEGMENTS.map((segment) => {
          const active = activeSegment === segment.key;
          return (
            <TouchableOpacity
              key={segment.key}
              style={[
                styles.segmentButton,
                active && {
                  backgroundColor: colors.bg.elevated,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.14,
                  shadowRadius: 4,
                  elevation: 4,
                },
              ]}
              onPress={() => onSegmentChange(segment.key)}
            >
              <Ionicons
                name={segment.icon}
                size={16}
                color={active ? colors.accent.primary : colors.text.tertiary}
              />
              <Text
                style={[
                  styles.segmentText,
                  { color: active ? colors.accent.primary : colors.text.tertiary },
                ]}
              >
                {' '}
                {segment.label}{' '}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <StatsRow group={group} />
    </>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  headerInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  balanceCard: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  balanceGradient: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  balanceTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inviteContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 18,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inviteText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginLeft: 10,
  },
  segmentControl: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 14,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
});
