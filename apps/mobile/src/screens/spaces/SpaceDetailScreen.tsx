import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useSpaceStore } from '../../store/spaceStore';
import { useAuth } from '../../store/AuthContext';
import { useAIStore } from '../../store/aiStore';
import { useToast } from '../../store/ToastContext';
import { TimelineItem } from '../../components/ui/TimelineItem';
import { CreateGoalModal } from '../goals/CreateGoalModal';

type Tab = 'overview' | 'money' | 'goals' | 'tasks' | 'timeline' | 'ai';

function HelpTip({ icon, title, message, colors }: { icon: string; title: string; message: string; colors: any }) {
  return (
    <View style={[s.helpCard, { backgroundColor: colors.accent.primary + '08', borderColor: colors.accent.primary + '20' }]}>
      <View style={[s.helpIconWrap, { backgroundColor: colors.accent.primary + '15' }]}>
        <AntDesign name={icon as any} size={20} color={colors.accent.primary} />
      </View>
      <Text style={[s.helpTitle, { color: colors.text.primary }]}>{title}</Text>
      <Text style={[s.helpMessage, { color: colors.text.tertiary }]}>{message}</Text>
    </View>
  );
}

function EmptyState({ icon, title, subtitle, colors }: { icon: string; title: string; subtitle: string; colors: any }) {
  return (
    <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 20 }}>
      <View style={[s.emptyIconWrap, { backgroundColor: colors.bg.tertiary }]}>
        <AntDesign name={icon as any} size={32} color={colors.text.tertiary} />
      </View>
      <Text style={[s.emptyTitle, { color: colors.text.secondary }]}>{title}</Text>
      <Text style={[s.emptySubtitle, { color: colors.text.tertiary }]}>{subtitle}</Text>
    </View>
  );
}

export function SpaceDetailScreen({ route, navigation }: any) {
  const { spaceId } = route?.params ?? {};
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { activeSpace, dashboard, pinnedSpaceIds, togglePinSpace, spaceTasks, addSpaceTask, toggleSpaceTask, deleteSpaceTask, detailLoading, dashboardLoading, fetchSpaceDetail, fetchDashboard, setActiveSpace, addMember } = useSpaceStore();
  const { accessToken, user } = useAuth();
  const { insights, loading: aiLoading, fetchInsights } = useAIStore();
  const [tab, setTab] = useState<Tab>('overview');
  const [showGoalModal, setShowGoalModal] = useState(false);

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

  const handleInvite = useCallback(async () => {
    if (!spaceId) return;
    try {
      await Share.share({
        message: `Join my "${activeSpace?.name || 'Dabbu'}" space on Dabbu! Use invite code: ${spaceId.slice(0, 8).toUpperCase()}`,
        title: `Invite to ${activeSpace?.name || 'Dabbu'}`,
      });
      showToast('Invite link shared!', 'info');
    } catch {
      // user cancelled
    }
  }, [spaceId, activeSpace, showToast]);

  const handleAddExpense = useCallback(() => {
    navigation.navigate('WalletTab', { screen: 'AddExpense', params: { spaceId } });
  }, [navigation, spaceId]);

  if (detailLoading || !activeSpace) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'appstore1' },
    { key: 'money', label: 'Money', icon: 'wallet' },
    { key: 'goals', label: 'Goals', icon: 'flag' },
    { key: 'tasks', label: 'Tasks', icon: 'checkcircleo' },
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

      {/* ─── Members row ─── */}
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
            <TouchableOpacity style={{ alignItems: 'center', gap: 4 }} onPress={handleInvite}>
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                borderWidth: 1.5, borderColor: colors.border.default, borderStyle: 'dashed',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <AntDesign name="plus" size={14} color={colors.text.tertiary} />
              </View>
              <Text style={{ fontSize: 10, color: colors.text.tertiary }}>Invite</Text>
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

            <HelpTip
              icon="infocirlceo"
              title="About this Space"
              message={`This is a ${activeSpace.type} space. Track shared finances, set goals, assign tasks, and get AI-powered insights — all in one place.`}
              colors={colors}
            />
          </View>
        )}

        {tab === 'money' && (
          <View>
            <TouchableOpacity
              onPress={handleAddExpense}
              style={[s.actionButton, { backgroundColor: colors.accent.primary }]}
            >
              <AntDesign name="plus" size={16} color="#fff" />
              <Text style={[s.actionButtonText, { color: '#fff' }]}>Add Expense</Text>
            </TouchableOpacity>

            {dashboardLoading ? (
              <ActivityIndicator size="large" color={colors.accent.primary} style={{ marginTop: 20 }} />
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
              <EmptyState
                icon="wallet"
                title="No transactions yet"
                subtitle="Tap the button above to add your first expense or income to this space."
                colors={colors}
              />
            )}
          </View>
        )}

        {tab === 'goals' && (
          <View>
            <TouchableOpacity
              onPress={() => setShowGoalModal(true)}
              style={[s.actionButton, { backgroundColor: colors.accent.primary }]}
            >
              <AntDesign name="plus" size={16} color="#fff" />
              <Text style={[s.actionButtonText, { color: '#fff' }]}>Add Goal</Text>
            </TouchableOpacity>

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
              <EmptyState
                icon="flag"
                title="No goals yet"
                subtitle="Set a financial goal for this space — save for a trip, an emergency fund, or anything that matters."
                colors={colors}
              />
            )}
          </View>
        )}

        {tab === 'tasks' && (
          <View>
            <TasksPanel spaceId={spaceId} tasks={spaceTasks[spaceId || ''] || []} onAdd={addSpaceTask} onToggle={toggleSpaceTask} onDelete={deleteSpaceTask} colors={colors} showToast={showToast} />
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
              <EmptyState
                icon="clockcircleo"
                title="No timeline events"
                subtitle="Events like member joins and milestones will appear here as your space grows."
                colors={colors}
              />
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
                <Text style={{ color: colors.text.tertiary, textAlign: 'center', marginTop: 12, fontSize: 15, fontWeight: '600' }}>
                  No AI insights yet
                </Text>
                <Text style={{ color: colors.text.tertiary, textAlign: 'center', marginTop: 6, fontSize: 13, paddingHorizontal: 20 }}>
                  Add more transactions and goals to get personalized AI-powered insights about your finances.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <CreateGoalModal
        visible={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        onCreated={() => { setShowGoalModal(false); fetchDashboard(accessToken); showToast('Goal created!', 'success'); }}
        prefill={null}
      />
    </View>
  );
}

function TasksPanel({ spaceId, tasks, onAdd, onToggle, onDelete, colors, showToast }: any) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const title = input.trim();
    if (!title) return;
    if (!spaceId) {
      showToast?.('Could not add task — space not ready', 'error');
      return;
    }
    onAdd(spaceId, title);
    setInput('');
    showToast?.('Task added!', 'success');
  };

  const pending = tasks.filter((t: any) => !t.completed);
  const done = tasks.filter((t: any) => t.completed);

  return (
    <View>
      {/* ─── Section help tip ─── */}
      <View style={[s.helpCard, { backgroundColor: colors.accent.primary + '08', borderColor: colors.accent.primary + '20', marginBottom: 16 }]}>
        <Text style={{ fontSize: 13, color: colors.text.tertiary, lineHeight: 18 }}>
          Tasks are saved locally for this space. Use them to track to-dos and action items with your members.
        </Text>
      </View>

      {/* ─── New task input ─── */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Add a task…"
          placeholderTextColor={colors.text.tertiary}
          onSubmitEditing={handleAdd}
          style={{
            flex: 1,
            backgroundColor: colors.bg.card,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            fontSize: 14,
            color: colors.text.primary,
          }}
        />
        <TouchableOpacity
          onPress={handleAdd}
          style={{
            backgroundColor: colors.accent.primary,
            paddingHorizontal: 16,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AntDesign name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ─── Pending tasks ─── */}
      {pending.length > 0 && (
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text.tertiary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Pending ({pending.length})
        </Text>
      )}
      {pending.map((t: any) => (
        <TaskRow key={t.id} task={t} onToggle={onToggle} onDelete={onDelete} spaceId={spaceId} colors={colors} />
      ))}

      {/* ─── Completed tasks ─── */}
      {done.length > 0 && (
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text.tertiary, marginTop: 16, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Completed ({done.length})
        </Text>
      )}
      {done.map((t: any) => (
        <TaskRow key={t.id} task={t} onToggle={onToggle} onDelete={onDelete} spaceId={spaceId} colors={colors} />
      ))}

      {tasks.length === 0 && (
        <EmptyState
          icon="checkcircleo"
          title="No tasks yet"
          subtitle="Type a task above and press + to add it. Tasks are saved automatically on this device."
          colors={colors}
        />
      )}
    </View>
  );
}

function TaskRow({ task, onToggle, onDelete, spaceId, colors }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.card, padding: 12, borderRadius: 12, marginBottom: 6, gap: 10 }}>
      <TouchableOpacity onPress={() => onToggle(spaceId, task.id)}>
        <View style={{
          width: 22, height: 22, borderRadius: 11,
          borderWidth: 2,
          borderColor: task.completed ? colors.status.success : colors.border.default,
          backgroundColor: task.completed ? colors.status.success : 'transparent',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {task.completed && <AntDesign name="check" size={12} color="#fff" />}
        </View>
      </TouchableOpacity>
      <Text style={{
        flex: 1, fontSize: 14, color: colors.text.primary,
        textDecorationLine: task.completed ? 'line-through' : 'none',
        opacity: task.completed ? 0.5 : 1,
      }}>
        {task.title}
      </Text>
      <TouchableOpacity onPress={() => onDelete(spaceId, task.id)}>
        <AntDesign name="close" size={16} color={colors.text.tertiary} />
      </TouchableOpacity>
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  helpCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  helpIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  helpTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  helpMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
