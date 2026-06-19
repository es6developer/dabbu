import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useSpaceStore } from '../../store/spaceStore';
import { useAuth } from '../../store/AuthContext';
import { useAIStore } from '../../store/aiStore';
import { TimelineItem } from '../../components/ui/TimelineItem';

type Tab = 'overview' | 'money' | 'goals' | 'timeline' | 'ai';

export function SpaceDetailScreen({ route, navigation }: any) {
  const { spaceId } = route?.params ?? {};
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { activeSpace, dashboard, pinnedSpaceIds, togglePinSpace, detailLoading, dashboardLoading, fetchSpaceDetail, fetchDashboard, setActiveSpace } = useSpaceStore();
  const { accessToken } = useAuth();
  const { insights, loading: aiLoading, fetchInsights } = useAIStore();
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    if (spaceId) setActiveSpace(spaceId);
  }, [spaceId]);

  useEffect(() => {
    if (spaceId || !spaceId) {
      fetchSpaceDetail(accessToken);
      fetchDashboard(accessToken);
    }
  }, [spaceId]);

  useEffect(() => {
    if (tab === 'ai' && accessToken && spaceId) {
      fetchInsights(accessToken, spaceId);
    }
  }, [tab, accessToken, spaceId]);

  const isPinned = spaceId ? pinnedSpaceIds.includes(spaceId) : false;

  if (detailLoading || !activeSpace) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  const isCouple = activeSpace.type === 'COUPLE';

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'appstore1' },
    { key: 'money', label: 'Money', icon: 'wallet' },
    { key: 'goals', label: 'Goals', icon: 'flag' },
    { key: 'timeline', label: 'Timeline', icon: 'clockcircleo' },
    { key: 'ai', label: 'AI', icon: 'bulb1' },
  ];

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      {/* ─── Header ─── */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <AntDesign name="arrowleft" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary }}>{activeSpace.name}</Text>
            <Text style={{ fontSize: 13, color: colors.text.tertiary }}>{activeSpace.type} · {activeSpace.memberCount} members</Text>
          </View>
          <TouchableOpacity onPress={() => spaceId && togglePinSpace(spaceId)} style={{ padding: 4 }}>
            <AntDesign name={isPinned ? 'pushpin' : 'pushpino'} size={22} color={isPinned ? colors.accent.primary : colors.text.tertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Members row (wireframe: between title and tabs) ─── */}
      {activeSpace.members && activeSpace.members.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {activeSpace.members.map((m) => (
              <View key={m.id} style={{ alignItems: 'center', gap: 4 }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: colors.accent.primary + '20',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent.primary }}>
                    {(m.user.firstName?.[0] || '').toUpperCase()}
                  </Text>
                </View>
                <Text style={{ fontSize: 10, color: colors.text.tertiary }} numberOfLines={1}>
                  {m.user.firstName}
                </Text>
              </View>
            ))}
            <TouchableOpacity style={{ alignItems: 'center', gap: 4 }} onPress={() => {}}>
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                borderWidth: 1.5, borderColor: colors.border.default, borderStyle: 'dashed',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <AntDesign name="plus" size={14} color={colors.text.tertiary} />
              </View>
              <Text style={{ fontSize: 10, color: colors.text.tertiary }}>Add</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* ─── Tabs ─── */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8 }}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: tab === t.key ? colors.accent.primary : colors.bg.tertiary,
              marginRight: 8,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: tab === t.key ? '#fff' : colors.text.secondary }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {tab === 'overview' && (
          <View>
            {dashboard && (
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <View style={[s.statTile, { backgroundColor: colors.bg.card, flex: 1 }]}>
                  <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Balance</Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary }}>
                    ₹{Number(dashboard.money.balance).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={[s.statTile, { backgroundColor: colors.bg.card, flex: 1 }]}>
                  <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Transactions</Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary }}>
                    {dashboard.money.transactionCount}
                  </Text>
                </View>
              </View>
            )}

            {dashboard && (
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <View style={[s.statTile, { backgroundColor: colors.bg.card, flex: 1 }]}>
                  <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Income</Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: colors.status.success }}>
                    ₹{Number(dashboard.money.totalIncome).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={[s.statTile, { backgroundColor: colors.bg.card, flex: 1 }]}>
                  <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Expense</Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: colors.status.error }}>
                    ₹{Number(dashboard.money.totalExpense).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            )}

            {dashboard?.goals && (
              <View style={[s.card, { backgroundColor: colors.bg.card }]}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary, marginBottom: 8 }}>Goals</Text>
                <Text style={{ fontSize: 13, color: colors.text.tertiary }}>
                  {dashboard.goals.count} goals · ₹{Number(dashboard.goals.saved).toLocaleString('en-IN')} saved of ₹{Number(dashboard.goals.total).toLocaleString('en-IN')}
                </Text>
              </View>
            )}
          </View>
        )}

        {tab === 'money' && (
          <View>
            {dashboardLoading ? (
              <ActivityIndicator size="large" color={colors.accent.primary} />
            ) : dashboard?.recentTransactions?.length ? (
              dashboard.recentTransactions.map((t: any) => (
                <View key={t.id} style={[s.card, { backgroundColor: colors.bg.card, marginBottom: 8 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, color: colors.text.primary, flex: 1 }}>{t.description || 'Transaction'}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: t.type === 'income' ? colors.status.success : colors.status.error }}>
                      {t.type === 'income' ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 4 }}>{t.date?.slice(0, 10)}</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: colors.text.tertiary, textAlign: 'center', marginTop: 40 }}>No transactions yet</Text>
            )}
          </View>
        )}

        {tab === 'goals' && (
          <View>
            {dashboard?.goals?.items?.length ? (
              dashboard.goals.items.map((g: any) => (
                <View key={g.id} style={[s.card, { backgroundColor: colors.bg.card, marginBottom: 8 }]}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>{g.name}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                    <Text style={{ fontSize: 13, color: colors.text.tertiary }}>
                      ₹{Number(g.currentAmount).toLocaleString('en-IN')} / ₹{Number(g.targetAmount).toLocaleString('en-IN')}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent.primary }}>
                      {Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100)}%
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ color: colors.text.tertiary, textAlign: 'center', marginTop: 40 }}>No goals yet</Text>
            )}
          </View>
        )}

        {tab === 'timeline' && (
          <View>
            <TimelineItem
              title="Space created"
              description={`${activeSpace.name} was created`}
              time={activeSpace.createdAt ? new Date(activeSpace.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined}
              icon="addfolder"
              color={colors.status.success}
            />
            {activeSpace.members?.slice(0, 3).map((m, i) => (
              <TimelineItem
                key={m.id}
                title="Member joined"
                description={`${m.user.firstName} ${m.user.lastName} joined as ${m.role}`}
                time={m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined}
                icon="adduser"
                color={colors.accent.primary}
                isLast={i === Math.min(activeSpace.members.length, 3) - 1}
              />
            ))}
            {(!activeSpace.members || activeSpace.members.length === 0) && (
              <Text style={{ color: colors.text.tertiary, textAlign: 'center', marginTop: 40 }}>No timeline events yet</Text>
            )}
          </View>
        )}

        {tab === 'ai' && (
          <View>
            {aiLoading ? (
              <ActivityIndicator size="large" color={colors.accent.primary} style={{ marginTop: 40 }} />
            ) : insights.length > 0 ? (
              insights.map((insight) => (
                <View key={insight.id} style={[s.card, { backgroundColor: colors.bg.card, marginBottom: 12 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <AntDesign
                      name={insight.severity === 'critical' ? 'warning' : insight.severity === 'high' ? 'exclamationcircleo' : 'infocirlceo'}
                      size={16}
                      color={insight.severity === 'critical' ? colors.status.error : insight.severity === 'high' ? colors.status.warning : colors.accent.primary}
                    />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary, flex: 1 }}>{insight.title}</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: colors.text.tertiary, lineHeight: 18 }}>{insight.description}</Text>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary, marginTop: 8 }}>
                    {new Date(insight.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              ))
            ) : (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <AntDesign name="bulb1" size={40} color={colors.text.tertiary} />
                <Text style={{ color: colors.text.tertiary, textAlign: 'center', marginTop: 12 }}>No AI insights yet</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    padding: 16,
    borderRadius: 16,
  },
  statTile: {
    padding: 16,
    borderRadius: 12,
  },
});
