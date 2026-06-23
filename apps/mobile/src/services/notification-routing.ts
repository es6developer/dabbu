export interface NotificationActionData {
  type?: string;
  clickAction?: string;
  actionUrl?: string;
  groupId?: string;
  goalId?: string;
  billId?: string;
  reminderId?: string;
  settlementId?: string;
  transactionId?: string;
  expenseId?: string;
  [key: string]: any;
}

function normalizeType(type?: string): string {
  return String(type || '').toLowerCase();
}

function actionFromUrl(actionUrl?: string): NotificationActionData {
  if (!actionUrl) {
    return {};
  }

  const parts = actionUrl.split('?')[0].split('/').filter(Boolean);
  const [section, id] = parts;

  if (section === 'reminders' && id) {
    return { clickAction: 'OPEN_REMINDER', reminderId: id };
  }
  if (section === 'bills' && id) {
    return { clickAction: 'OPEN_BILL', billId: id };
  }
  if (section === 'goals' && id) {
    return { clickAction: 'OPEN_GOAL', goalId: id };
  }
  if ((section === 'groups' || section === 'shared') && id) {
    return { clickAction: 'OPEN_GROUP', groupId: id };
  }
  if (section === 'settings') {
    return { clickAction: 'OPEN_SETTINGS', settingsSection: id };
  }

  return {};
}

export function getNotificationActionLabel(data: NotificationActionData = {}): string {
  const clickAction = String(data.clickAction || '').toUpperCase();
  const type = normalizeType(data.type);

  if (clickAction === 'OPEN_REMINDER' || data.reminderId) {
    return 'View reminder';
  }
  if (clickAction === 'OPEN_GROUP' || data.groupId) {
    return 'Open group';
  }
  if (clickAction === 'OPEN_GOAL' || data.goalId) {
    return 'View goal';
  }
  if (clickAction === 'OPEN_BILL' || data.billId) {
    return 'View bill';
  }
  if (clickAction === 'OPEN_SETTLEMENT' || data.settlementId || type.includes('settlement')) {
    return 'Settle up';
  }
  if (clickAction === 'OPEN_SUBSCRIPTIONS' || type.includes('subscription')) {
    return 'View subscriptions';
  }
  if (type.includes('digest') || type.includes('report') || type.includes('insight')) {
    return 'Read insight';
  }

  return 'Open';
}

export function navigateToNotification(
  navigation: any,
  rawData: NotificationActionData = {},
): void {
  const fromUrl = actionFromUrl(rawData.actionUrl);
  const data = { ...rawData, ...fromUrl };
  const clickAction = String(data.clickAction || '').toUpperCase();
  const type = normalizeType(data.type);

  if (clickAction === 'OPEN_REMINDER' || data.reminderId) {
    navigation.navigate('WalletTab', { screen: 'BillsList' });
    return;
  }

  if (clickAction === 'OPEN_GROUP' || data.groupId) {
    navigation.navigate('SpacesTab', {
      screen: 'SharedGroupDetail',
      params: { groupId: data.groupId },
    });
    return;
  }

  if (clickAction === 'OPEN_SETTLEMENT' || data.settlementId || type.includes('settlement')) {
    navigation.navigate('SpacesTab', {
      screen: 'Settlement',
      params: { groupId: data.groupId, settlementId: data.settlementId },
    });
    return;
  }

  if (clickAction === 'OPEN_GOAL' || data.goalId || type.includes('goal')) {
    navigation.navigate(
      'HomeTab',
      data.goalId
        ? { screen: 'GoalDetail', params: { goalId: data.goalId } }
        : { screen: 'GoalsList' },
    );
    return;
  }

  if (clickAction === 'OPEN_BILL' || data.billId || type.includes('bill') || type.includes('emi')) {
    navigation.navigate(
      'WalletTab',
      data.billId
        ? { screen: 'BillDetail', params: { billId: data.billId } }
        : { screen: 'BillsList' },
    );
    return;
  }

  if (clickAction === 'OPEN_SUBSCRIPTIONS' || type.includes('subscription')) {
    navigation.navigate('WalletTab', { screen: 'Subscriptions' });
    return;
  }

  if (clickAction === 'OPEN_SETTINGS') {
    navigation.navigate('ProfileTab');
    return;
  }

  if (data.transactionId || data.expenseId || type.includes('expense')) {
    navigation.navigate(
      'WalletTab',
      data.transactionId || data.expenseId
        ? {
            screen: 'TransactionDetail',
            params: { transactionId: data.transactionId || data.expenseId },
          }
        : { screen: 'MyWallet' },
    );
    return;
  }

  navigation.navigate('HomeTab', { screen: 'NotificationCenter' });
}
