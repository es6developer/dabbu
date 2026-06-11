import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import ReAnimated, { FadeInUp } from 'react-native-reanimated';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Skeleton } from '../../components/ui/AnimatedSkeleton';
import { useAiColors, AiCard, SeverityBadge } from './components/AiShared';

interface MilestoneItem {
  milestoneType: string;
  title: string;
  description: string;
  isAchieved: boolean;
  achievedAt?: string;
}

interface LifeEventItem {
  eventType: string;
  title: string;
  description: string;
  confidence: number;
  detectedAt: string;
  isConfirmed: boolean;
}

interface NotificationSection {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  data: {
    title: string;
    desc: string;
    severity: 'critical' | 'warning' | 'success' | 'info';
    time: string;
  }[];
}

export function SmartNotificationScreen() {
  const AI_COLORS = useAiColors();
  const s = useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1 },
        header: { paddingHorizontal: 20, paddingBottom: 16, gap: 6 },
        headerTitle: {
          fontSize: 28,
          fontWeight: '800',
          color: AI_COLORS.text,
          letterSpacing: -0.5,
        },
        headerSub: { fontSize: 13, color: AI_COLORS.textSecondary },
        sectionHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 10,
          marginTop: 8,
        },
        sectionIcon: {
          width: 30,
          height: 30,
          borderRadius: 8,
          justifyContent: 'center',
          alignItems: 'center',
        },
        sectionTitle: { fontSize: 16, fontWeight: '700', color: AI_COLORS.text },
        sectionCount: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8 },
        sectionCountText: { fontSize: 12, fontWeight: '700' },
        notifDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
        notifTitle: { fontSize: 14, fontWeight: '600', color: AI_COLORS.text, flex: 1 },
        notifDesc: { fontSize: 12, color: AI_COLORS.textSecondary, marginTop: 4, lineHeight: 17 },
        notifTime: { fontSize: 11, color: AI_COLORS.textTertiary, marginTop: 6 },
      }),
    [AI_COLORS],
  );
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const [sections, setSections] = useState<NotificationSection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [milestonesRes, eventsRes] = await Promise.allSettled([
        api.get<any>('/ai/milestones'),
        api.get<any>('/ai/life-events'),
      ]);

      const result: NotificationSection[] = [];

      if (milestonesRes.status === 'fulfilled') {
        const ms = milestonesRes.value?.data ?? milestonesRes.value;
        if (Array.isArray(ms)) {
          const achieved = ms.filter((m: MilestoneItem) => m.isAchieved);
          if (achieved.length > 0) {
            result.push({
              title: 'Milestones',
              icon: 'trophy-outline',
              color: AI_COLORS.warning,
              data: achieved.map((m: MilestoneItem) => ({
                title: m.title,
                desc: m.description,
                severity: 'success' as const,
                time: m.achievedAt ? new Date(m.achievedAt).toLocaleDateString() : 'Achieved',
              })),
            });
          }
        }
      }

      if (eventsRes.status === 'fulfilled') {
        const ev = eventsRes.value?.data ?? eventsRes.value;
        if (Array.isArray(ev)) {
          const unconfirmed = ev.filter((e: LifeEventItem) => !e.isConfirmed);
          if (unconfirmed.length > 0) {
            result.push({
              title: 'Life Events',
              icon: 'calendar-outline',
              color: AI_COLORS.primary,
              data: unconfirmed.map((e: LifeEventItem) => ({
                title: e.title ?? e.eventType,
                desc: e.description,
                severity: (e.confidence >= 0.8 ? 'warning' : 'info') as 'warning' | 'info',
                time: new Date(e.detectedAt).toLocaleDateString(),
              })),
            });
          }
        }
      }

      setSections(result);
    } catch {
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadData = useCallback(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    setLoading(true);
    fetchData();
  }, [accessToken, fetchData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  if (loading) {
    return (
      <View style={[s.screen, { backgroundColor: AI_COLORS.bg, paddingTop: insets.top + 60 }]}>
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton width="50%" height={24} borderRadius={8} />
          <Skeleton width="100%" height={80} borderRadius={14} />
          <Skeleton width="100%" height={80} borderRadius={14} />
        </View>
      </View>
    );
  }

  if (sections.length === 0) {
    return (
      <View style={[s.screen, { backgroundColor: AI_COLORS.bg, paddingTop: insets.top + 60 }]}>
        <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
          <Ionicons name="notifications-off-outline" size={48} color={AI_COLORS.textTertiary} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: AI_COLORS.text }}>
            No notifications
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: AI_COLORS.textSecondary,
              textAlign: 'center',
              paddingHorizontal: 32,
            }}
          >
            You're all caught up! AI notifications will appear here when there's something to know.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: AI_COLORS.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <ReAnimated.View
          entering={FadeInUp.duration(400)}
          style={[s.header, { paddingTop: insets.top + 16 }]}
        >
          <Text style={s.headerTitle}>Notifications</Text>
          <Text style={s.headerSub}>AI-powered smart alerts</Text>
        </ReAnimated.View>

        {sections.map((section, si) => (
          <View key={section.title}>
            <View style={s.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[s.sectionIcon, { backgroundColor: `${section.color}20` }]}>
                  <Ionicons name={section.icon} size={16} color={section.color} />
                </View>
                <Text style={s.sectionTitle}>{section.title}</Text>
              </View>
              <View style={[s.sectionCount, { backgroundColor: `${section.color}20` }]}>
                <Text style={[s.sectionCountText, { color: section.color }]}>
                  {section.data.length}
                </Text>
              </View>
            </View>
            <View style={{ paddingHorizontal: 16, gap: 8 }}>
              {section.data.map((item, i) => {
                const clr =
                  item.severity === 'critical'
                    ? AI_COLORS.danger
                    : item.severity === 'warning'
                      ? AI_COLORS.warning
                      : item.severity === 'success'
                        ? AI_COLORS.success
                        : AI_COLORS.info;
                return (
                  <ReAnimated.View
                    key={`${si}-${i}`}
                    entering={FadeInUp.duration(300).delay(i * 50)}
                  >
                    <TouchableOpacity activeOpacity={0.8}>
                      <AiCard padding={14}>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <View style={[s.notifDot, { backgroundColor: clr }]} />
                          <View style={{ flex: 1 }}>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                marginBottom: 2,
                              }}
                            >
                              <Text style={s.notifTitle}>{item.title}</Text>
                              <SeverityBadge severity={item.severity} />
                            </View>
                            <Text style={s.notifDesc}>{item.desc}</Text>
                            <Text style={s.notifTime}>{item.time}</Text>
                          </View>
                        </View>
                      </AiCard>
                    </TouchableOpacity>
                  </ReAnimated.View>
                );
              })}
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
