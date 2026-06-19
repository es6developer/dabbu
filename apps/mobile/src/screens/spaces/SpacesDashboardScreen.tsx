import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useSpaceStore, Space } from '../../store/spaceStore';
import { useAuth } from '../../store/AuthContext';

function SpaceCard({ space, onPress }: { space: Space; onPress: () => void }) {
  const { colors } = useTheme();
  const isCouple = space.type === 'couple';

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <View style={{
        backgroundColor: isCouple ? colors.accent.primary : colors.bg.card,
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 10,
              backgroundColor: isCouple ? 'rgba(255,255,255,0.15)' : `${colors.accent.primary}10`,
            }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: isCouple ? '#fff' : colors.text.secondary,
              }}>{space.type}</Text>
            </View>
          </View>
          <Text style={{
            fontSize: 11,
            color: isCouple ? 'rgba(255,255,255,0.5)' : colors.text.tertiary,
          }}>
            {space.memberCount} members
          </Text>
        </View>
        <Text style={{
          fontSize: 17,
          fontWeight: '700',
          color: isCouple ? '#fff' : colors.text.primary,
          marginBottom: 4,
        }}>
          {space.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function SpacesDashboardScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { spaces, loading, fetchSpaces } = useSpaceStore();
  const { accessToken } = useAuth();

  useEffect(() => {
    fetchSpaces(accessToken);
  }, [accessToken]);

  const activeSpaces = spaces.length;

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <View style={{ paddingTop: insets.top + 12, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary, letterSpacing: -0.5 }}>Spaces</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.text.tertiary }}>
              across {activeSpaces} {activeSpaces === 1 ? 'space' : 'spaces'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchSpaces(accessToken)} />}
      >
        {loading && spaces.length === 0 ? (
          <ActivityIndicator size="large" color={colors.accent.primary} style={{ marginTop: 40 }} />
        ) : (
          spaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              onPress={() => navigation?.navigate('SpaceDetail', { spaceId: space.id })}
            />
          ))
        )}

        <TouchableOpacity
          style={{ marginTop: 8 }}
          activeOpacity={0.8}
          onPress={() => navigation?.navigate('CreateSpace')}
        >
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 16,
            borderRadius: 16,
            backgroundColor: colors.accent.primary,
          }}>
            <AntDesign name="plus" size={20} color="#FFF" />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>Create new space</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
});
