import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { formatAmount, formatDate } from '../../utils/shared-finance';
import {
  GroupDetail,
  Expense,
  GroupMember,
  Settlement,
  Segments,
} from '../../types/shared-finance';
import { Card } from '../ui/Card';

type GroupDetailListItemProps = {
  item: Expense | GroupMember | Settlement;
  segment: Segments;
  group: GroupDetail | null;
  config: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string };
  onExpensePress: (expenseId: string) => void;
  currency: string;
};

const SPLIT_TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  equal: 'git-branch-outline',
  exact: 'calculator-outline',
  weighted: 'layers-outline',
  custom: 'options-outline',
};

const ExpenseItem = React.memo(
  ({
    item,
    group,
    onExpensePress,
  }: {
    item: Expense;
    group: GroupDetail | null;
    onExpensePress: (id: string) => void;
  }) => {
    const { colors, typography } = useTheme();
    const iconName = SPLIT_TYPE_ICONS[item.splitType] || 'receipt-outline';
    return (
      <Card
        variant="elevated"
        padding="lg"
        style={styles.listCard}
        onPress={() => onExpensePress(item.id)}
      >
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: colors.bg.tertiary }]}>
            <Ionicons name={iconName} size={18} color={colors.accent.primary} />
          </View>
          <View style={styles.itemContent}>
            <Text style={[typography.bodyBold, { color: colors.text.primary }]} numberOfLines={1}>
              {item.description}
            </Text>
            <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 4 }]}>
              {formatDate(item.date)} · Paid by {item.paidBy.name}
            </Text>
          </View>
          <Text style={[styles.amountText, { color: colors.text.primary }]}>
            {formatAmount(item.amount, group?.currency)}
          </Text>
        </View>
      </Card>
    );
  },
);

const MemberItem = React.memo(
  ({
    item,
    config,
    currency,
  }: {
    item: GroupMember;
    config: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string };
    currency: string;
  }) => {
    const { colors, typography } = useTheme();
    const owed = item.balance >= 0;
    const badgeColor = owed ? colors.status.success : colors.status.error;
    return (
      <Card variant="elevated" padding="lg" style={styles.listCard}>
        <View style={styles.row}>
          <View style={[styles.avatarCircle, { backgroundColor: config.color + '20' }]}>
            <Text style={[styles.avatarText, { color: config.color }]}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.itemContent}>
            <View style={styles.memberTitleRow}>
              <Text style={[typography.bodyBold, { color: colors.text.primary }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.role !== 'member' && (
                <View style={[styles.roleBadge, { backgroundColor: badgeColor + '15' }]}>
                  <Text style={[styles.roleBadgeText, { color: badgeColor }]}>
                    {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[typography.subhead, { color: colors.text.tertiary, marginTop: 4 }]}
              numberOfLines={1}
            >
              {item.email}
            </Text>
          </View>
          <Text
            style={[
              styles.amountText,
              { color: owed ? colors.status.success : colors.status.error },
            ]}
          >
            {owed ? '+' : '-'}
            {formatAmount(item.balance, currency)}
          </Text>
        </View>
      </Card>
    );
  },
);

const SettlementItem = React.memo(({ item, currency }: { item: Settlement; currency: string }) => {
  const { colors, typography } = useTheme();
  const isCompleted = item.status === 'completed';
  return (
    <Card variant="elevated" padding="lg" style={styles.listCard}>
      <View style={styles.row}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isCompleted
                ? colors.status.successLight
                : colors.status.warningLight,
            },
          ]}
        >
          <Ionicons
            name={isCompleted ? 'checkmark-circle' : 'time-outline'}
            size={20}
            color={isCompleted ? colors.status.success : colors.status.warning}
          />
        </View>
        <View style={styles.itemContent}>
          <Text style={[typography.bodyBold, { color: colors.text.primary }]} numberOfLines={1}>
            {item.from.name} → {item.to.name}
          </Text>
          <Text style={[typography.subhead, { color: colors.text.tertiary, marginTop: 4 }]}>
            {formatDate(item.date)}
          </Text>
        </View>
        <View style={styles.settlementRight}>
          <Text style={[typography.callout, { color: colors.text.primary }]}>
            {formatAmount(item.amount, currency)}
          </Text>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isCompleted
                  ? colors.status.successLight
                  : colors.status.warningLight,
              },
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                { color: isCompleted ? colors.status.success : colors.status.warning },
              ]}
            >
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
});

export function GroupDetailListItem(props: GroupDetailListItemProps) {
  const { segment, item, currency } = props;
  if (segment === 'balances') {
    return <MemberItem item={item as GroupMember} config={props.config} currency={currency} />;
  }
  if (segment === 'settlements') {
    return <SettlementItem item={item as Settlement} currency={currency} />;
  }
  return (
    <ExpenseItem item={item as Expense} group={props.group} onExpensePress={props.onExpensePress} />
  );
}

const styles = StyleSheet.create({
  listCard: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  memberTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  settlementRight: {
    alignItems: 'flex-end',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
