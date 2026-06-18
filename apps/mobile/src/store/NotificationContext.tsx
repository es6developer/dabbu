import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useNotifications, InAppNotification } from '../hooks/useNotifications';
import { InAppNotificationBanner } from '../components/ui/InAppNotificationBanner';
import { connectNotificationSocket, disconnectNotificationSocket } from '../services/notificationSocket';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  unreadCount: number;
  inAppNotification: InAppNotification | null;
  clearInAppNotification: () => void;
  fetchUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  inAppNotification: null,
  clearInAppNotification: () => {},
  fetchUnreadCount: async () => {},
});

export function useNotificationContext() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();

  const {
    unreadCount,
    inAppNotification,
    clearInAppNotification,
    fetchUnreadCount,
    handleNotificationData,
    showInAppNotification,
  } = useNotifications();

  const handleBannerPress = useCallback(() => {
    if (inAppNotification?.data) {
      handleNotificationData(inAppNotification.data as any);
    } else {
      navigation.navigate('Dashboard', { screen: 'NotificationCenter' });
    }
  }, [inAppNotification, handleNotificationData, navigation]);

  useEffect(() => {
    if (!accessToken) return;
    const socket = connectNotificationSocket(accessToken);
    socket.on('notification:new', (notification: any) => {
      fetchUnreadCount();
      showInAppNotification(notification);
    });
    return () => {
      socket.off('notification:new');
    };
  }, [accessToken, fetchUnreadCount, showInAppNotification]);

  useEffect(() => {
    return () => {
      disconnectNotificationSocket();
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, inAppNotification, clearInAppNotification, fetchUnreadCount }}>
      {children}
      {inAppNotification && (
        <InAppNotificationBanner
          title={inAppNotification.title}
          body={inAppNotification.body}
          type={inAppNotification.type}
          onPress={handleBannerPress}
          onDismiss={clearInAppNotification}
        />
      )}
    </NotificationContext.Provider>
  );
}
