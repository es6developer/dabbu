import React from 'react';
import { View, Text } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useOffline } from '../../store/OfflineContext';

export function OfflineBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isOnline, pendingCount } = useOffline();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  const bg = isOnline ? colors.status.warning : colors.status.error;
  const text = '#FFFFFF';
  const icon = isOnline ? 'clouduploado' : 'cloudo';
  const message = isOnline
    ? `${pendingCount} change${pendingCount !== 1 ? 's' : ''} pending sync`
    : 'You are offline — changes will sync automatically';

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: bg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 16,
      }}
    >
      <AntDesign name={icon} size={14} color={text} />
      <Text style={{ fontSize: 12, fontWeight: '600', color: text }}>{message}</Text>
    </View>
  );
}
