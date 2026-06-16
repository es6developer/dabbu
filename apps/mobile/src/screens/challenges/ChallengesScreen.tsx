import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

export function ChallengesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { accessToken } = useAuth();
  const [challenges, setChallenges] = useState<any>({ active: [], completed: [], totalCompleted: 0, totalActive: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await api.get<any>('/challenges');
      if (res?.data) setChallenges(res.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { loadData(); }, [loadData]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 100, paddingHorizontal: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.brand.primary} />
        }
      >
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text.primary, marginBottom: 4 }}>Challenges</Text>
        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.tertiary, marginBottom: 20 }}>
          {challenges.totalCompleted}/{challenges.totalActive} completed
        </Text>

        {challenges.active.length > 0 && (
          <>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Active</Text>
            {challenges.active.map((c: any) => (
              <ChallengeCard key={c.id} challenge={c} colors={colors} />
            ))}
          </>
        )}

        {challenges.completed.length > 0 && (
          <>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 }}>Completed</Text>
            {challenges.completed.map((c: any) => (
              <ChallengeCard key={c.id} challenge={c} colors={colors} />
            ))}
          </>
        )}

        {!loading && challenges.totalActive === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <AntDesign name="star" size={48} color={colors.text.tertiary} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.secondary, marginTop: 12 }}>No challenges yet</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ChallengeCard({ challenge, colors }: { challenge: any; colors: any }) {
  const pct = challenge.target > 0 ? Math.min(Math.round((challenge.progress / challenge.target) * 100), 100) : 0;
  const isComplete = challenge.completed;

  return (
    <View style={{ backgroundColor: colors.bg.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border.default, padding: 14, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 28 }}>{challenge.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>{challenge.title}</Text>
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text.tertiary, marginTop: 2 }}>{challenge.description}</Text>
        </View>
        {isComplete && (
          <View style={{ backgroundColor: colors.status.success + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.status.success }}>Done</Text>
          </View>
        )}
      </View>

      <View style={{ height: 6, backgroundColor: colors.border.subtle, borderRadius: 99, marginTop: 10, overflow: 'hidden' }}>
        <View style={{ width: `${Math.min(pct, 100)}%`, height: '100%', backgroundColor: isComplete ? colors.status.success : colors.brand.primary, borderRadius: 99 }} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary }}>{challenge.progress}/{challenge.target}</Text>
        <Text style={{ fontSize: 11, fontWeight: '700', color: isComplete ? colors.status.success : colors.brand.primary }}>{pct}%</Text>
      </View>
    </View>
  );
}
