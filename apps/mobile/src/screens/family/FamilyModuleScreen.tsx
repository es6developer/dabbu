import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';

const MODULE_API_MAP: Record<string, string> = {
  members: '/family-space/members',
  goals: '/family-space/goals',
  bills: '/family-space/bills',
  contributions: '/family-space/contributions',
  budget: '/family-space/budget',
  investments: '/family-space/investments',
  insurance: '/family-space/insurance',
  'emergency-fund': '/family-space/emergency-fund',
  tasks: '/family-space/tasks',
  calendar: '/family-space/calendar',
  documents: '/family-space/documents',
  'ai-advisor': '/family-space/ai-advisor',
  reports: '/family-space/reports',
  vault: '/family-space/vault',
  dashboard: '/family-space',
};

const MODULE_ICONS: Record<string, string> = {
  members: 'team', goals: 'flag', bills: 'filetext1',
  contributions: 'caretup', budget: 'tago', investments: 'barschart',
  insurance: 'Safety', 'emergency-fund': 'warning', tasks: 'checkcircle',
  calendar: 'calendar', documents: 'folder1', 'ai-advisor': 'bulb1',
  reports: 'filetext1', vault: 'lock', dashboard: 'grid-outline',
};

const MODULE_COLORS: Record<string, string> = {
  members: '#3B82F6', goals: '#F59E0B', bills: '#EF4444',
  contributions: '#10B981', budget: '#8B5CF6', investments: '#06B6D4',
  insurance: '#EC4899', 'emergency-fund': '#F97316', tasks: '#14B8A6',
  calendar: '#6366F1', documents: '#A855F7', 'ai-advisor': '#FBBF24',
  reports: '#64748B', vault: '#1E293B', dashboard: '#10B981',
};

function fmt(v: number) {
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function RenderMembers({ data }: { data: any[] }) {
  const { colors } = useTheme();
  if (!data?.length) return <EmptyState icon='team' title="No members" />;
  return (
    <>
      {data.map((m: any, i: number) => (
        <View key={m.id || i} style={memberStyles.card}>
          <View style={[memberStyles.avatar, { backgroundColor: MODULE_COLORS.members + '20' }]}>
            <Text style={[memberStyles.avatarText, { color: MODULE_COLORS.members }]}>
              {(m.user?.firstName?.[0] || m.firstName?.[0] || '?').toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[memberStyles.name, { color: colors.text.primary }]}>{m.user?.firstName || m.firstName} {m.user?.lastName || m.lastName || ''}</Text>
            <Text style={[memberStyles.role, { color: colors.text.tertiary }]}>{m.role || 'member'}</Text>
          </View>
          <View style={[memberStyles.badge, { backgroundColor: m.role === 'owner' ? '#F59E0B20' : m.role === 'admin' ? '#3B82F620' : '#10B98120' }]}>
            <Text style={[memberStyles.badgeText, { color: m.role === 'owner' ? '#F59E0B' : m.role === 'admin' ? '#3B82F6' : '#10B981' }]}>
              {m.role || 'member'}
            </Text>
          </View>
        </View>
      ))}
    </>
  );
}

function RenderGoals({ data }: { data: any[] }) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  if (!data?.length) return <EmptyState icon="flag" title="No goals yet" subtitle="Create a family goal" />;
  return (
    <>
      {data.map((g: any, i: number) => {
        const progress = Math.min(100, Math.max(0, Number(g.progress ?? (g.savedAmount && g.targetAmount ? (Number(g.savedAmount) / Number(g.targetAmount)) * 100 : 0))));
        return (
          <View key={g.id || i} style={goalStyles.card}>
            <View style={goalStyles.header}>
              <Text style={[goalStyles.name, { color: colors.text.primary }]}>{g.name}</Text>
              <Text style={[goalStyles.amount, { color: MODULE_COLORS.goals }]}>{fmt(Number(g.targetAmount || 0))}</Text>
            </View>
            <View style={goalStyles.progressRow}>
              <View style={[goalStyles.progressBg, { backgroundColor: colors.bg.tertiary }]}>
                <View style={[goalStyles.progressFill, { width: `${progress}%`, backgroundColor: MODULE_COLORS.goals }]} />
              </View>
              <Text style={[goalStyles.progressText, { color: colors.text.tertiary }]}>{Math.round(progress)}%</Text>
            </View>
            <Text style={[goalStyles.saved, { color: colors.text.secondary }]}>
              Saved: {fmt(Number(g.savedAmount || 0))} {g.deadline ? `| Due: ${new Date(g.deadline).toLocaleDateString('en-IN')}` : ''}
            </Text>
          </View>
        );
      })}
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.accent.primary }]}
        onPress={() => navigation.navigate('CreateGoal')}
      >
        <AntDesign name="plus" size={18} color="#FFFFFF"  />
        <Text style={styles.createBtnText}>Create Goal</Text>
      </TouchableOpacity>
    </>
  );
}

function RenderBills({ data }: { data: any[] }) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  if (!data?.length) return <EmptyState icon="filetext1" title="No bills" subtitle="Add your first family bill" />;
  const upcoming = data.filter((b: any) => !b.isPaid);
  const paid = data.filter((b: any) => b.isPaid);
  return (
    <>
      {upcoming.length > 0 && (
        <>
          <Text style={[billStyles.sectionLabel, { color: colors.text.secondary }]}>UPCOMING ({upcoming.length})</Text>
          {upcoming.map((b: any, i: number) => (
            <View key={b.id || i} style={[billStyles.card, { borderLeftColor: '#EF4444' }]}>
              <View style={billStyles.row}>
                <Text style={[billStyles.name, { color: colors.text.primary }]}>{b.name}</Text>
                <Text style={[billStyles.amount, { color: colors.text.primary }]}>{fmt(Number(b.amount || 0))}</Text>
              </View>
              {b.dueDate && <Text style={[billStyles.due, { color: colors.text.tertiary }]}>Due: {new Date(b.dueDate).toLocaleDateString('en-IN')}</Text>}
            </View>
          ))}
        </>
      )}
      {paid.length > 0 && (
        <>
          <Text style={[billStyles.sectionLabel, { color: colors.text.secondary, marginTop: 16 }]}>PAID ({paid.length})</Text>
          {paid.map((b: any, i: number) => (
            <View key={b.id || i} style={[billStyles.card, { borderLeftColor: '#10B981', opacity: 0.6 }]}>
              <View style={billStyles.row}>
                <Text style={[billStyles.name, { color: colors.text.primary }]}>{b.name}</Text>
                <Text style={[billStyles.amount, { color: colors.text.primary }]}>{fmt(Number(b.amount || 0))}</Text>
              </View>
            </View>
          ))}
        </>
      )}
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.accent.primary }]}
        onPress={() => navigation.navigate('CreateBill')}
      >
        <AntDesign name="plus" size={18} color="#FFFFFF"  />
        <Text style={styles.createBtnText}>Create Bill</Text>
      </TouchableOpacity>
    </>
  );
}

function RenderContributions({ data }: { data: any }) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const contributions = Array.isArray(data) ? data : data?.contributions || [];
  const periodTotal = data?.total || 0;
  if (!contributions.length) return <EmptyState icon='caretup' title="No contributions yet" />;
  return (
    <>
      {periodTotal > 0 && (
        <View style={[contStyles.totalCard, { backgroundColor: MODULE_COLORS.contributions + '10' }]}>
          <Text style={[contStyles.totalLabel, { color: colors.text.secondary }]}>Total This Period</Text>
          <Text style={[contStyles.totalAmount, { color: MODULE_COLORS.contributions }]}>{fmt(periodTotal)}</Text>
        </View>
      )}
      {contributions.map((c: any, i: number) => (
        <View key={c.id || i} style={contStyles.card}>
          <Text style={[contStyles.name, { color: colors.text.primary }]}>{c.user?.firstName || c.name || 'Member'}</Text>
          <Text style={[contStyles.amount, { color: MODULE_COLORS.contributions }]}>{fmt(Number(c.amount || 0))}</Text>
        </View>
      ))}
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.accent.primary }]}
        onPress={() => navigation.navigate('CreateContribution')}
      >
        <AntDesign name="plus" size={18} color="#FFFFFF"  />
        <Text style={styles.createBtnText}>Record Contribution</Text>
      </TouchableOpacity>
    </>
  );
}

function RenderInvestments({ data }: { data: any[] }) {
  const { colors } = useTheme();
  if (!data?.length) return <EmptyState icon='barschart' title="No investments tracked" />;
  return (
    <>
      {data.map((inv: any, i: number) => (
        <View key={inv.id || i} style={invStyles.card}>
          <View style={invStyles.row}>
            <View style={[invStyles.iconBox, { backgroundColor: MODULE_COLORS.investments + '20' }]}>
              <AntDesign name="caretup" size={16} color={MODULE_COLORS.investments}  />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[invStyles.name, { color: colors.text.primary }]}>{inv.name}</Text>
              <Text style={[invStyles.type, { color: colors.text.tertiary }]}>{inv.type}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[invStyles.value, { color: colors.text.primary }]}>{fmt(Number(inv.currentValue || inv.amount || 0))}</Text>
              {inv.returns !== undefined && (
                <Text style={{ fontSize: 12, color: Number(inv.returns) >= 0 ? '#10B981' : '#EF4444' }}>
                  {Number(inv.returns) >= 0 ? '+' : ''}{Number(inv.returns).toFixed(1)}%
                </Text>
              )}
            </View>
          </View>
        </View>
      ))}
    </>
  );
}

function RenderDocuments({ data }: { data: any[] }) {
  const { colors } = useTheme();
  if (!data?.length) return <EmptyState icon="folder1" title="No documents" subtitle="Upload family documents" />;
  return (
    <>
      {data.map((d: any, i: number) => (
        <View key={d.id || i} style={docStyles.card}>
          <View style={[docStyles.icon, { backgroundColor: MODULE_COLORS.documents + '20' }]}>
            <AntDesign name="file1" size={20} color={MODULE_COLORS.documents}  />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[docStyles.name, { color: colors.text.primary }]}>{d.name}</Text>
            <Text style={[docStyles.meta, { color: colors.text.tertiary }]}>{d.type} · {(d.fileSize ? (d.fileSize / 1024).toFixed(0) + ' KB' : '')}</Text>
          </View>
        </View>
      ))}
    </>
  );
}

function RenderAIAdvisor({ data }: { data: any }) {
  const { colors } = useTheme();
  const insights = Array.isArray(data) ? data : data?.insights || data?.recommendations || [];
  if (!insights.length) return <EmptyState icon='bulb1' title="No insights yet" subtitle="AI will analyze your family finances" />;
  return (
    <>
      {data?.score !== undefined && (
        <View style={[aiStyles.scoreCard, { backgroundColor: MODULE_COLORS['ai-advisor'] + '10' }]}>
          <Text style={[aiStyles.scoreLabel, { color: colors.text.secondary }]}>Family Health Score</Text>
          <Text style={[aiStyles.scoreValue, { color: MODULE_COLORS['ai-advisor'] }]}>{data.score}/100</Text>
        </View>
      )}
      {insights.map((ins: any, i: number) => (
        <View key={i} style={[aiStyles.insightCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <View style={[aiStyles.bullet, { backgroundColor: MODULE_COLORS['ai-advisor'] }]} />
          <View style={{ flex: 1 }}>
            <Text style={[aiStyles.insightTitle, { color: colors.text.primary }]}>{ins.title || ins.message || 'Insight'}</Text>
            {ins.description && <Text style={[aiStyles.insightDesc, { color: colors.text.secondary }]}>{ins.description}</Text>}
          </View>
        </View>
      ))}
    </>
  );
}

function RenderTasks({ data }: { data: any[] }) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  if (!data?.length) return <EmptyState icon="checkbox-outline" title="No tasks" subtitle="Add family tasks" />;
  return (
    <>
      {data.map((t: any, i: number) => (
        <View key={t.id || i} style={taskStyles.card}>
          <AntDesign name={t.status === 'checkcircle' ? 'checkcircle' : 'minuscircleo'} size={20} color={t.status === 'checkcircle' ? '#10B981' : colors.text.tertiary} />
          <View style={{ flex: 1 }}>
            <Text style={[taskStyles.title, { color: colors.text.primary, textDecorationLine: t.status === 'checkcircle' ? 'line-through' : 'none' }]}>{t.title}</Text>
            {t.assignedTo && <Text style={[taskStyles.assigned, { color: colors.text.tertiary }]}>Assigned to {t.assignedTo?.firstName || 'someone'}</Text>}
          </View>
          {t.dueDate && <Text style={[taskStyles.due, { color: colors.text.tertiary }]}>{new Date(t.dueDate).toLocaleDateString('en-IN')}</Text>}
        </View>
      ))}
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.accent.primary }]}
        onPress={() => navigation.navigate('CreateTask')}
      >
        <AntDesign name="plus" size={18} color="#FFFFFF"  />
        <Text style={styles.createBtnText}>Create Task</Text>
      </TouchableOpacity>
    </>
  );
}

function RenderCalendar({ data }: { data: any[] }) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  if (!data?.length) return <EmptyState icon='calendar' title="No events" subtitle="Add family events" />;
  return (
    <>
      {data.map((e: any, i: number) => (
        <View key={e.id || i} style={calStyles.card}>
          <View style={[calStyles.dateBox, { backgroundColor: MODULE_COLORS.calendar + '15' }]}>
            <Text style={[calStyles.dateDay, { color: MODULE_COLORS.calendar }]}>{new Date(e.startDate || e.date).getDate()}</Text>
            <Text style={[calStyles.dateMonth, { color: MODULE_COLORS.calendar }]}>{new Date(e.startDate || e.date).toLocaleString('en-IN', { month: 'short' })}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[calStyles.title, { color: colors.text.primary }]}>{e.title}</Text>
            {e.description && <Text style={[calStyles.desc, { color: colors.text.tertiary }]}>{e.description}</Text>}
          </View>
        </View>
      ))}
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.accent.primary }]}
        onPress={() => navigation.navigate('CreateCalendarEvent')}
      >
        <AntDesign name="plus" size={18} color="#FFFFFF"  />
        <Text style={styles.createBtnText}>Create Event</Text>
      </TouchableOpacity>
    </>
  );
}

function RenderEmergencyFund({ data }: { data: any }) {
  const { colors } = useTheme();
  const current = Number(data?.current || data?.amount || 0);
  const target = Number(data?.target || 0);
  const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const months = data?.monthsCovered || data?.months || 0;
  return (
    <View style={{ gap: 12 }}>
      <View style={[efStyles.totalCard, { backgroundColor: MODULE_COLORS['emergency-fund'] + '10' }]}>
        <Text style={[efStyles.totalLabel, { color: colors.text.secondary }]}>Emergency Fund</Text>
        <Text style={[efStyles.totalAmount, { color: MODULE_COLORS['emergency-fund'] }]}>{fmt(current)}</Text>
        {target > 0 && <Text style={[efStyles.targetText, { color: colors.text.tertiary }]}>Target: {fmt(target)}</Text>}
        <View style={[efStyles.progressBg, { backgroundColor: colors.bg.tertiary, marginTop: 8 }]}>
          <View style={[efStyles.progressFill, { width: `${progress}%`, backgroundColor: MODULE_COLORS['emergency-fund'] }]} />
        </View>
        <Text style={[efStyles.monthsText, { color: colors.text.secondary }]}>{months} months covered</Text>
      </View>
      {data?.recommendations?.map((r: any, i: number) => (
        <View key={i} style={[efStyles.recoCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
          <AntDesign name="bulb1" size={16} color={MODULE_COLORS['emergency-fund']}  />
          <Text style={[efStyles.recoText, { color: colors.text.primary }]}>{r.title || r}</Text>
        </View>
      ))}
    </View>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={emptyStyles.container}>
      <AntDesign name={icon as any} size={40} color={colors.text.tertiary} />
      <Text style={[emptyStyles.title, { color: colors.text.primary }]}>{title}</Text>
      {subtitle && <Text style={[emptyStyles.subtitle, { color: colors.text.tertiary }]}>{subtitle}</Text>}
    </View>
  );
}

function ModuleContent({ module, data }: { module: string; data: any }) {
  switch (module) {
    case 'members': return <RenderMembers data={data} />;
    case 'goals': return <RenderGoals data={data} />;
    case 'bills': return <RenderBills data={data} />;
    case 'contributions': return <RenderContributions data={data} />;
    case 'investments': return <RenderInvestments data={data} />;
    case 'documents': return <RenderDocuments data={data} />;
    case 'ai-advisor': return <RenderAIAdvisor data={data} />;
    case 'tasks': return <RenderTasks data={data} />;
    case 'calendar': return <RenderCalendar data={data} />;
    case 'emergency-fund': return <RenderEmergencyFund data={data} />;
    default: return <RenderGeneric module={module} data={data} />;
  }
}

function RenderGeneric({ module, data }: { module: string; data: any }) {
  const { colors } = useTheme();
  if (!data) return <EmptyState icon={MODULE_ICONS[module] || 'grid-outline'} title={`No ${module} data`} />;
  const items = Array.isArray(data) ? data : data?.data || data?.items || [];
  if (!items.length) return <EmptyState icon={MODULE_ICONS[module] || 'grid-outline'} title={`No ${module} data`} />;
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.text.secondary, fontSize: 13, fontWeight: '600' }}>{items.length} items</Text>
      {items.slice(0, 5).map((item: any, i: number) => (
        <View key={i} style={genStyles.card}>
          <Text style={[genStyles.label, { color: colors.text.primary }]}>{item.name || item.title || `Item ${i + 1}`}</Text>
        </View>
      ))}
    </View>
  );
}

export function FamilyModuleScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { module, title } = route.params || {};
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const apiPath = MODULE_API_MAP[module] || '/family-space';
  const icon = MODULE_ICONS[module] || 'grid-outline';
  const color = MODULE_COLORS[module] || colors.accent.primary;

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get(apiPath);
      setData((res as any)?.data || res);
    } catch {
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [apiPath, module]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.subtle }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <AntDesign name="arrowleft" size={22} color={colors.text.primary}  />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.headerIcon, { backgroundColor: `${color}15` }]}>
            <AntDesign name={icon as any} size={20} color={color} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{title || module}</Text>
        </View>
        <TouchableOpacity onPress={() => loadData(true)} style={styles.refreshBtn}>
          <AntDesign name="reload1" size={20} color={colors.text.secondary}  />
        </TouchableOpacity>
      </View>

      {loading && !data ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.accent.primary} /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
        >
          <ModuleContent module={module} data={data} />
        </ScrollView>
      )}
    </View>
  );
}


const memberStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 14, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  name: { fontSize: 15, fontWeight: '600' },
  role: { fontSize: 12, marginTop: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
});

const goalStyles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 10, backgroundColor: 'transparent', borderWidth: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '600' },
  amount: { fontSize: 15, fontWeight: '700' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, fontWeight: '600', minWidth: 35, textAlign: 'right' },
  saved: { fontSize: 12, marginTop: 4 },
});

const billStyles = StyleSheet.create({
  sectionLabel: { fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },
  card: { borderRadius: 12, borderLeftWidth: 3, padding: 14, marginBottom: 6, backgroundColor: 'transparent', borderWidth: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '500' },
  amount: { fontSize: 14, fontWeight: '700' },
  due: { fontSize: 11, marginTop: 4 },
});

const contStyles = StyleSheet.create({
  totalCard: { borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16 },
  totalLabel: { fontSize: 12, fontWeight: '600' },
  totalAmount: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },
  name: { fontSize: 15, fontWeight: '500' },
  amount: { fontSize: 16, fontWeight: '700' },
});

const invStyles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, marginBottom: 8, backgroundColor: 'transparent', borderWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '600' },
  type: { fontSize: 11, marginTop: 1 },
  value: { fontSize: 14, fontWeight: '700' },
});

const docStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 11, marginTop: 2 },
});

const aiStyles = StyleSheet.create({
  scoreCard: { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  scoreLabel: { fontSize: 13, fontWeight: '600' },
  scoreValue: { fontSize: 36, fontWeight: '800', marginTop: 4 },
  insightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  bullet: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  insightTitle: { fontSize: 14, fontWeight: '600' },
  insightDesc: { fontSize: 12, marginTop: 2 },
});

const taskStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 4 },
  title: { fontSize: 14, fontWeight: '500' },
  assigned: { fontSize: 11, marginTop: 2 },
  due: { fontSize: 11 },
});

const calStyles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, paddingVertical: 10, paddingHorizontal: 4, marginBottom: 8 },
  dateBox: { width: 44, height: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 18, fontWeight: '800' },
  dateMonth: { fontSize: 10, fontWeight: '600' },
  title: { fontSize: 14, fontWeight: '600' },
  desc: { fontSize: 12, marginTop: 1 },
});

const efStyles = StyleSheet.create({
  totalCard: { borderRadius: 20, padding: 24, alignItems: 'center' },
  totalLabel: { fontSize: 13, fontWeight: '600' },
  totalAmount: { fontSize: 32, fontWeight: '800', marginTop: 4 },
  targetText: { fontSize: 13, marginTop: 4 },
  progressBg: { width: '100%', height: 10, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  monthsText: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  recoCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, padding: 14 },
  recoText: { fontSize: 13, fontWeight: '500', flex: 1 },
});

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  title: { fontSize: 17, fontWeight: '700' },
  subtitle: { fontSize: 13 },
});

const genStyles = StyleSheet.create({
  card: { borderRadius: 12, padding: 14, marginBottom: 6 },
  label: { fontSize: 14, fontWeight: '500' },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  headerIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', flex: 1 },
  refreshBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 14, marginTop: 16 },
  createBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  welcomeCard: {
    alignItems: 'center', gap: 8, padding: 24, borderRadius: 20, borderWidth: 1, marginBottom: 16,
  },
  welcomeTitle: { fontSize: 20, fontWeight: '800' },
  welcomeDesc: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  contentCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  contentLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  contentValue: { fontSize: 16, fontWeight: '600' },
});
