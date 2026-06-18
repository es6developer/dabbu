import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Animated,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { API_URL } from '../../config/api';
import { useAuth } from '../../store/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RED = '#EF4444';
const GREEN = '#22C55E';

const fmt = (n: number) => {
  const prefix = n < 0 ? '-₹' : '₹';
  const abs = Math.abs(n);
  if (abs >= 10000000) return prefix + (abs / 10000000).toFixed(1) + 'Cr';
  if (abs >= 100000) return prefix + (abs / 100000).toFixed(1) + 'L';
  return prefix + abs.toLocaleString('en-IN');
};

function groupByDate(txns: any[]) {
  const groups: Record<string, any[]> = {};
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  for (const t of txns) {
    const d = new Date(t.date || t.createdAt); d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = 'Today';
    else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
    else label = `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`;
    if (!groups[label]) groups[label] = [];
    groups[label].push(t);
  }
  return Object.entries(groups).sort(([a], [b]) => {
    const order = ['Today', 'Yesterday'];
    const ai = order.indexOf(a), bi = order.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1; if (bi !== -1) return 1;
    return b.localeCompare(a);
  }).map(([title, data]) => ({ title, data }));
}

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList);

export function MyWalletScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<any>(null);
  const [exporting, setExporting] = useState<'file1' | 'excel' | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    abortRef.current?.abort();
    const ctrl = new AbortController(); abortRef.current = ctrl;
    if (accessToken) setAccessToken(accessToken);
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res: any = await api.post('/devices/test-push', {
        title: 'Test Push',
        body: 'This is a test notification from Dabbu',
      });
      const detailLines = (res?.devices || [])
        .filter((d: any) => !d.success)
        .map((d: any) => `  ${d.deviceName || d.platform}: ${d.error}`);
      const msg = res?.message || 'Request sent.';
      Alert.alert('Test Push', detailLines.length > 0 ? `${msg}\n\nErrors:\n${detailLines.join('\n')}` : msg);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to send test push');
    } finally {
      if (refresh) setRefreshing(false); else setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const safeCat = (t: any) => { const c = t.category; return typeof c === 'string' ? c : c?.name || ''; };

  const filtered = useMemo(() => {
    let list = transactions;
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(t => (t.description || '').toLowerCase().includes(q) || safeCat(t).toLowerCase().includes(q)); }
    return groupByDate(list);
  }, [transactions, search]);

  const balance = summary.totalIncome - summary.totalExpense;

  const monthlyReport = useMemo(() => {
    const now = new Date();
    const m = transactions.filter(t => { const d = new Date(t.date || t.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    return { income: m.filter(t => t.type === 'arrowdown').reduce((s, t) => s + Number(t.amount), 0), expense: m.filter(t => t.type === 'wallet').reduce((s, t) => s + Number(t.amount), 0), count: m.length };
  }, [transactions]);

  const buildReport = useCallback((month: number, year: number) => {
    const monthly = transactions.filter(t => {
      const d = new Date(t.date || t.createdAt);
      return !isNaN(d.getTime()) && d.getMonth() + 1 === month && d.getFullYear() === year;
    });
    const totalIncome = monthly.filter(t => t.type === 'arrowdown').reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalExpense = monthly.filter(t => t.type === 'wallet').reduce((s, t) => s + Number(t.amount || 0), 0);
    const catMap: Record<string, number> = {};
    monthly.forEach(t => {
      const cat = typeof t.category === 'string' ? t.category : t.category?.name || 'Other';
      catMap[cat] = (catMap[cat] || 0) + Number(t.amount || 0);
    });
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionCount: monthly.length,
      categories: Object.entries(catMap).map(([name, amount]) => ({ name, amount })),
    };
  }, [transactions]);

  useEffect(() => {
    if (reportOpen) setReportData(buildReport(reportMonth, reportYear));
  }, [reportOpen, reportMonth, reportYear, buildReport]);

  const handleExport = useCallback(async (format: 'file1' | 'excel') => {
    setExporting(format);
    try {
      const ext = format === 'file1' ? 'file1' : 'xlsx';
      const filename = `report-${reportYear}-${reportMonth}.${ext}`;
      const mimeType = format === 'file1' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const downloadUrl = `${API_URL}/transactions/export/${format}?year=${reportYear}&month=${reportMonth}`;
      const headers: Record<string, string> = {};
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
      const uri = await FileSystem.downloadAsync(downloadUrl, FileSystem.documentDirectory + filename, { headers });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri.uri, { mimeType });
      } else {
        Alert.alert('Downloaded', `Report saved to ${uri.uri}`);
      }
    } catch (e: any) {
      Alert.alert('Export failed', e.message || 'Try again');
    } finally { setExporting(null) }
  }, [reportYear, reportMonth, accessToken]);

  if (loading) {
    return (
      <View style={[st.wrapper, { backgroundColor: colors.bg.primary }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm }}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={{ color: colors.text.tertiary, fontSize: 14, fontWeight: '500' }}>Loading wallet...</Text>
        </View>
      </View>
    );
  }

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 60], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={[st.wrapper, { backgroundColor: colors.bg.primary }]}>
      <AnimatedSectionList
        sections={filtered}
        keyExtractor={(item, i) => `${(item as any).id || i}`}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.accent.primary} colors={[colors.accent.primary]} />}
        contentContainerStyle={transactions.length === 0 && !search ? st.emptyContainer : { paddingBottom: 100, paddingHorizontal: spacing.xl }}
        ListHeaderComponent={
          <View>
            <Animated.View style={[st.header, { paddingTop: insets.top + spacing.sm, opacity: headerOpacity }]}>
              <View>
                <Text style={[st.greeting, { color: colors.text.tertiary }]}>
                  {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}
                </Text>
                <Text style={[st.headerTitle, { color: colors.text.primary }]}>My Wallet</Text>
              </View>
            </Animated.View>

            <View style={[st.balanceCard, { backgroundColor: colors.bg.secondary }]}>
              <Text style={[st.balanceLabel, { color: colors.text.tertiary }]}>Net Balance</Text>
              <Text style={[st.balanceAmount, { color: colors.text.primary }]}>{fmt(balance)}</Text>
              <View style={st.balanceRow}>
                <View style={st.balanceItem}>
                  <Text style={[st.balanceItemLabel, { color: colors.text.tertiary }]}>Income</Text>
                  <Text style={[st.balanceItemValue, { color: colors.status.success }]}>{fmt(summary.totalIncome)}</Text>
                </View>
                <View style={st.balanceItem}>
                  <Text style={[st.balanceItemLabel, { color: colors.text.tertiary }]}>Expenses</Text>
                  <Text style={[st.balanceItemValue, { color: colors.status.error }]}>{fmt(summary.totalExpense)}</Text>
                </View>
              </View>
            </View>

            <View style={st.addRow}>
              <TouchableOpacity style={[st.addBtn, { backgroundColor: colors.accent.primary }]} onPress={() => navigation.navigate('AddExpense', { prefill: { type: 'wallet' } })} activeOpacity={0.85}>
                <Text style={st.addBtnText}>+ Add Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.addBtn, { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.subtle }]} onPress={() => navigation.navigate('AddExpense', { prefill: { type: 'arrowdown' } })} activeOpacity={0.85}>
                <Text style={[st.addBtnSecondaryText, { color: colors.text.primary }]}>+ Add Income</Text>
              </TouchableOpacity>
            </View>

            <View style={[st.reportCard, { backgroundColor: colors.bg.secondary }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[st.reportTitle, { color: colors.text.primary }]}>This Month</Text>
                <TouchableOpacity onPress={() => setReportOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <AntDesign name="filetext1" size={14} color={colors.accent.primary} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent.primary }}>Report</Text>
                </TouchableOpacity>
              </View>
              <View style={st.reportRow}>
                <View style={st.reportItem}>
                  <Text style={[st.reportLabel, { color: colors.text.tertiary }]}>Income</Text>
                  <Text style={[st.reportValue, { color: colors.status.success }]}>{fmt(monthlyReport.income)}</Text>
                </View>
                <View style={st.reportItem}>
                  <Text style={[st.reportLabel, { color: colors.text.tertiary }]}>Expenses</Text>
                  <Text style={[st.reportValue, { color: colors.status.error }]}>{fmt(monthlyReport.expense)}</Text>
                </View>
                <View style={st.reportItem}>
                  <Text style={[st.reportLabel, { color: colors.text.tertiary }]}>Count</Text>
                  <Text style={[st.reportValue, { color: colors.text.primary }]}>{monthlyReport.count}</Text>
                </View>
              </View>
            </View>

            <View style={[st.searchBox, { backgroundColor: colors.bg.secondary }]}>
              <AntDesign name="search1" size={14} color={colors.text.tertiary} />
              <TextInput placeholder="Search transactions..." placeholderTextColor={colors.text.tertiary} style={[st.searchInput, { color: colors.text.primary }]} value={search} onChangeText={setSearch} />
              {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><AntDesign name="closecircleo" size={14} color={colors.text.tertiary} /></TouchableOpacity>}
            </View>
          </View>
        }
        renderSectionHeader={({ section }: any) => (
          <Text style={[st.sectionHeader, { color: colors.text.secondary, backgroundColor: colors.bg.primary }]}>{section.title}</Text>
        )}
        renderItem={({ item }: any) => {
          const isExpense = item.type === 'wallet';
          return (
            <TouchableOpacity
              style={[st.txCard, { backgroundColor: colors.bg.tertiary }]}
              onPress={() => navigation.navigate('TransactionDetail', { transactionId: item.id })}
              activeOpacity={0.7}
            >
              <View style={st.txLeft}>
                <View
                  style={[st.txIcon, { backgroundColor: isExpense ? `${RED}15` : `${GREEN}15` }]}
                >
                  <AntDesign
                    name={(isExpense ? 'arrowup' : 'arrowdown') as any}
                    size={16}
                    color={isExpense ? RED : GREEN}
                  />
                </View>
                <View style={st.txInfo}>
                  <Text style={[st.txDesc, { color: colors.text.primary }]} numberOfLines={1}>
                    {item.description || 'No description'}
                  </Text>
                  <Text style={[st.txCat, { color: colors.text.tertiary }]}>
                    {item.category?.name || item.category || 'Uncategorized'}
                  </Text>
                </View>
              </View>
              <Text style={[st.txAmount, { color: isExpense ? colors.status.error : colors.status.success }]}>
                {isExpense ? '-' : '+'}₹{Math.abs(Number(item.amount)).toLocaleString('en-IN')}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={st.empty}>
            <AntDesign name="wallet" size={48} color={colors.text.tertiary} />
            <Text style={[st.emptyTitle, { color: colors.text.primary }]}>No transactions yet</Text>
            <Text style={[st.emptyDesc, { color: colors.text.tertiary }]}>Tap one of the buttons above to add your first expense or income.</Text>
          </View>
        }
      />

      <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => setReportOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.bg.primary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary }}>Monthly Report</Text>
              <TouchableOpacity onPress={() => setReportOpen(false)}>
                <AntDesign name="close" size={22} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <TouchableOpacity onPress={() => { const m = reportMonth - 1; if (m < 1) { setReportMonth(12); setReportYear(reportYear - 1) } else setReportMonth(m); }} style={{ padding: 8, borderRadius: 10, backgroundColor: colors.bg.tertiary }}>
                <AntDesign name="left" size={16} color={colors.text.primary} />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][reportMonth - 1]} {reportYear}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { const m = reportMonth + 1; if (m > 12) { setReportMonth(1); setReportYear(reportYear + 1) } else setReportMonth(m); }} style={{ padding: 8, borderRadius: 10, backgroundColor: colors.bg.tertiary }}>
                <AntDesign name="right" size={16} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {reportData ? (
                <>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                    <View style={{ flex: 1, alignItems: 'center', padding: 14, backgroundColor: `${colors.status.success}10`, borderRadius: 14 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary, marginBottom: 4 }}>Income</Text>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.status.success }}>{fmt(reportData.totalIncome || 0)}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center', padding: 14, backgroundColor: `${colors.status.error}10`, borderRadius: 14 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary, marginBottom: 4 }}>Expense</Text>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.status.error }}>{fmt(reportData.totalExpense || 0)}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center', padding: 14, backgroundColor: `${colors.bg.tertiary}`, borderRadius: 14 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary, marginBottom: 4 }}>Net</Text>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text.primary }}>{fmt(reportData.balance || 0)}</Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.tertiary, marginBottom: 4 }}>{reportData.transactionCount} transactions</Text>

                  {reportData.categories?.length > 0 && (
                    <View style={{ marginTop: 12, marginBottom: 16 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary, marginBottom: 8 }}>Categories</Text>
                      {reportData.categories.map((c: any, i: number) => (
                        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle }}>
                          <Text style={{ fontSize: 13, color: colors.text.secondary }}>{c.name}</Text>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.primary }}>{fmt(c.amount)}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 20 }}>
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: '#FF4D4F' }}
                      onPress={() => handleExport('file1')}
                      disabled={exporting !== null}
                    >
                      {exporting === 'file1' ? <ActivityIndicator size="small" color="#FFF" /> : <AntDesign name="filetext1" size={16} color="#FFF" />}
                      <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>PDF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: '#34C759' }}
                      onPress={() => handleExport('excel')}
                      disabled={exporting !== null}
                    >
                      {exporting === 'excel' ? <ActivityIndicator size="small" color="#FFF" /> : <AntDesign name="copy1" size={16} color="#FFF" />}
                      <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Excel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  wrapper: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  greeting: { fontSize: 13, fontWeight: '500' },
  headerTitle: { fontSize: 24, fontWeight: '700', marginTop: spacing.xs },
  balanceCard: { paddingHorizontal: spacing.xl, paddingVertical: spacing['2xl'], borderRadius: borderRadius['3xl'], marginBottom: spacing.lg },
  balanceLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  balanceAmount: { fontSize: 34, fontWeight: '800', marginTop: spacing.sm, letterSpacing: -1 },
  balanceRow: { flexDirection: 'row', marginTop: spacing['2xl'], gap: spacing['3xl'] },
  balanceItem: { gap: spacing.xs },
  balanceItemLabel: { fontSize: 12, fontWeight: '500' },
  balanceItemValue: { fontSize: 18, fontWeight: '700' },
  addRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  addBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: borderRadius['2xl'] },
  addBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  addBtnSecondaryText: { fontSize: 15, fontWeight: '600' },
  reportCard: { borderRadius: borderRadius['2xl'], padding: spacing.xl, marginBottom: spacing.lg },
  reportTitle: { fontSize: 15, fontWeight: '700', marginBottom: spacing.md },
  reportRow: { flexDirection: 'row', gap: spacing.sm },
  reportItem: { flex: 1, gap: spacing.xs },
  reportLabel: { fontSize: 11, fontWeight: '500' },
  reportValue: { fontSize: 16, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius['2xl'], paddingHorizontal: spacing.md, height: 40, gap: spacing.sm, marginBottom: spacing.sm },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },
  sectionHeader: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingVertical: spacing.sm },
  txCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: spacing.lg, padding: spacing.md, borderRadius: borderRadius['2xl'] },
  txLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.sm },
  txIcon: { width: 36, height: 36, borderRadius: borderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 15, fontWeight: '600' },
  txCat: { fontSize: 11, marginTop: spacing.xs, fontWeight: '500' },
  txAmount: { fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: spacing['4xl'] },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
});
