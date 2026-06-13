import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { UpgradeBanner } from '../../components/ui/UpgradeBanner';

function InsightCard({
  icon,
  title,
  desc,
  color,
  type,
}: {
  icon: string;
  title: string;
  desc: string;
  color: string;
  type: 'positive' | 'warning' | 'info';
}) {
  return (
    <View
      style={{
        backgroundColor: '#161224',
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        borderLeftWidth: 3,
        borderLeftColor: color,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: `${color}18`,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
          }}
        >
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>{title}</Text>
          <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 4, lineHeight: 18 }}>
            {desc}
          </Text>
        </View>
      </View>
    </View>
  );
}

function SuggestionCard({
  icon,
  title,
  desc,
  action,
  onPress,
}: {
  icon: string;
  title: string;
  desc: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        backgroundColor: '#1E1030',
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          backgroundColor: '#8B5CF620',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon as any} size={20} color="#8B5CF6" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>{title}</Text>
        <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{desc}</Text>
      </View>
      <View
        style={{
          backgroundColor: '#8B5CF6',
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 10,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFF' }}>{action}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function CoupleCoachScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchCoach = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await api.get<any>('/couple/coach');
      setData(res);
    } catch {
      /* silently ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCoach();
  }, [fetchCoach]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0D0B1A' }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchCoach(true)}
          tintColor="#8B5CF6"
        />
      }
    >
      <LinearGradient
        colors={['#1a1428', '#0D0B1A']}
        style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: '#1E293B',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="chevron-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFF' }}>AI Couple Coach</Text>
            <Text style={{ fontSize: 12, color: '#64748B' }}>Personalized daily insights</Text>
          </View>
        </View>
      </LinearGradient>

      {data?.insights?.length > 0 && (
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF', marginBottom: 12 }}>
            Today's Insights
          </Text>
          {data.insights.map((insight: any, i: number) => (
            <InsightCard
              key={i}
              icon={insight.icon}
              title={insight.title}
              desc={insight.description}
              color={
                insight.type === 'positive'
                  ? '#34C759'
                  : insight.type === 'warning'
                    ? '#F59E0B'
                    : '#60A5FA'
              }
              type={insight.type}
            />
          ))}
        </View>
      )}

      {data?.suggestions?.length > 0 && (
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF', marginBottom: 12 }}>
            Suggested Actions
          </Text>
          {data.suggestions.map((sugg: any, i: number) => (
            <SuggestionCard
              key={i}
              icon={sugg.icon}
              title={sugg.title}
              desc={sugg.description}
              action={sugg.action}
              onPress={() => navigation.navigate(sugg.screen)}
            />
          ))}
        </View>
      )}

      {data?.healthBreakdown?.length > 0 && (
        <View style={{ padding: 20, marginTop: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF', marginBottom: 12 }}>
            Financial Health Breakdown
          </Text>
          {data.healthBreakdown.map((item: any, i: number) => {
            const hColor = item.score >= 80 ? '#34C759' : item.score >= 60 ? '#F59E0B' : '#FF6B6B';
            return (
              <View
                key={i}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}
              >
                <Text style={{ width: 130, fontSize: 12, color: '#94A3B8' }}>{item.label}</Text>
                <View style={{ flex: 1, height: 6, backgroundColor: '#1E293B', borderRadius: 3 }}>
                  <View
                    style={{
                      width: `${item.score}%`,
                      height: 6,
                      backgroundColor: hColor,
                      borderRadius: 3,
                    }}
                  />
                </View>
                <Text
                  style={{
                    width: 30,
                    fontSize: 12,
                    fontWeight: '700',
                    color: '#FFF',
                    textAlign: 'right',
                  }}
                >
                  {item.score}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
