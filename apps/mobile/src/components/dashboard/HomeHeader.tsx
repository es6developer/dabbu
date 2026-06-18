import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { Avatar } from '../ui/Avatar';

interface HomeHeaderProps {
  userName: string;
  streak: number;
  unreadCount: number;
  userAvatar?: string;
  userFullName?: string;
}

export function HomeHeader({ userName, streak, unreadCount, userAvatar, userFullName }: HomeHeaderProps) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View>
        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary }}>
          {getGreeting()}
        </Text>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary, marginTop: 1 }}>
          {userName}
        </Text>
      </View>
      {streak > 0 && (
        <View style={{
          backgroundColor: '#FF6B6B20', paddingHorizontal: 10, paddingVertical: 4,
          borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 4,
        }}>
          <AntDesign name="heart" size={13} color="#FF6B6B" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FF6B6B' }}>{streak} days</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: `${colors.accent.primary}10`,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <AntDesign name="bells" size={18} color={colors.accent.primary} />
          {unreadCount > 0 && (
            <View style={{
              position: 'absolute', top: -4, right: -4,
              minWidth: 16, height: 16, borderRadius: 8,
              backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: 3,
            }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFF' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Avatar uri={userAvatar} name={userFullName} size={36} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}
