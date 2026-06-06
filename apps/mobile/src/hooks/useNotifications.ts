import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../store/AuthContext';
import { registerForPushNotifications } from '../services/notifications';
import { api, setAccessToken } from '../services/api';

type NotificationType =
  | 'expense'
  | 'shared_finance'
  | 'goal'
  | 'emi'
  | 'subscription'
  | 'settlement'
  | 'system'
  | 'reminder'
  | 'monthly_report'
  | 'weekly_digest'
  | 'daily_digest';

interface NotificationData {
  type: NotificationType;
  groupId?: string;
  goalId?: string;
  expenseId?: string;
  reminderId?: string;
  settlementId?: string;
  notificationId?: string;
  [key: string]: any;
}

export function useNotifications() {
  const { accessToken, user } = useAuth();
  const navigation = useNavigation<any>();
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | null>(
    null,
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationResponseListener = useRef<Notifications.Subscription | null>(null);
  const appState = useRef(AppState.currentState);

  const requestPermission = useCallback(async () => {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    setPermissionStatus(status);
    return status;
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.get<{ count: number }>('/notifications/unread-count');
      setUnreadCount(res?.count ?? 0);
    } catch (_e) {
      void _e;
    }
  }, [accessToken]);

  const handleNotificationData = useCallback(
    (data: NotificationData) => {
      if (!data?.type) {
        return;
      }

      switch (data.type) {
        case 'expense':
        case 'shared_finance':
          if (data.groupId) {
            navigation.navigate('Spaces', {
              screen: 'SharedGroupDetail',
              params: { groupId: data.groupId },
            });
          }
          break;
        case 'goal':
          if (data.goalId) {
            navigation.navigate('Dashboard', {
              screen: 'GoalDetail',
              params: { goalId: data.goalId },
            });
          }
          break;
        case 'settlement':
          if (data.groupId) {
            navigation.navigate('Spaces', {
              screen: 'Settlement',
              params: { groupId: data.groupId },
            });
          }
          break;
        case 'reminder':
        case 'emi':
          if (data.reminderId) {
            navigation.navigate('Dashboard', {
              screen: 'ReminderDetail',
              params: { reminderId: data.reminderId },
            });
          }
          break;
        case 'subscription':
          navigation.navigate('Dashboard', { screen: 'Subscriptions' });
          break;
        case 'monthly_report':
        case 'weekly_digest':
        case 'daily_digest':
        case 'system':
          navigation.navigate('Dashboard', { screen: 'NotificationCenter' });
          break;
        default:
          navigation.navigate('Dashboard', { screen: 'NotificationCenter' });
          break;
      }
    },
    [navigation],
  );

  useEffect(() => {
    if (accessToken && user) {
      registerForPushNotifications(accessToken).catch(() => {});
      fetchUnreadCount();
    }
  }, [accessToken, user, fetchUnreadCount]);

  useEffect(() => {
    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification?.request?.content?.data as NotificationData;
        if (data?.notificationId) {
          api.patch(`/notifications/${data.notificationId}/read`).catch(() => {});
        }
        handleNotificationData(data);
        fetchUnreadCount();
      },
    );

    return () => {
      if (notificationResponseListener.current) {
        Notifications.removeNotificationSubscription(notificationResponseListener.current);
      }
    };
  }, [handleNotificationData, fetchUnreadCount]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        fetchUnreadCount();
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [fetchUnreadCount]);

  return {
    permissionStatus,
    unreadCount,
    requestPermission,
    fetchUnreadCount,
    handleNotificationData,
  };
}
