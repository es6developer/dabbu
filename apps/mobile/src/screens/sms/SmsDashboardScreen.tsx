import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { ListSkeleton } from '../../components/ui/AnimatedSkeleton';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { syncAndUpload, setSyncTimestamp } from '../../services/sms';
import { isSmsModuleAvailable, checkSmsPermission } from '../../services/sms/smsService';
import { getCategoryIcon } from '../../config/categoryIcons';

interface Detection {
  id: string;
  sender: string;
  messageBody: string;
  detectedAmount: number | null;
  detectedCurrency: string | null;
  detectedType: string | null;
  confidence: number | null;
  isProcessed: boolean;
  processedAt: string | null;
  transactionId: string | null;
  createdAt: string;
  category?: { name: string } | null;
}

type FilterMode = 'all' | 'pending' | 'added';

function getCatIcon(name: string | undefined | null): string {
  if (!name) {
    return 'ellipse';
  }
  return getCategoryIcon(name, 'ellipse');
}

export function SmsDashboardScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();

  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('pending');
  const [newBanner, setNewBanner] = useState<string | null>(null);
  const syncLockRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      loadDetections();
      const poll = setInterval(loadDetections, 5000);
      return () => {
        clearInterval(poll);
      };
    }, [accessToken]),
  );

  const prevCount = useRef(0);
  useEffect(() => {
    if (detections.length > prevCount.current && prevCount.current > 0) {
      const newCount = detections.length - prevCount.current;
      setNewBanner(`${newCount} new message${newCount > 1 ? 's' : ''} detected`);
      setTimeout(() => setNewBanner(null), 4000);
    }
    prevCount.current = detections.length;
  }, [detections.length]);

  async function loadDetections() {
    try {
      const res = await api.get<any>('/sms-detection');
      const data = Array.isArray(res) ? res : [];
      setDetections(data);
    } catch (_e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTransaction(detectionId: string) {
    setAddingId(detectionId);
    try {
      await api.post(`/sms-detection/${detectionId}/add-transaction`);
      setNewBanner('Transaction added successfully');
      setTimeout(() => setNewBanner(null), 3000);
      await loadDetections();
    } catch (_e: any) {
      const msg = _e?.response?.data?.message || _e?.message || 'Failed to add transaction';
      Alert.alert('Error', msg);
    } finally {
      setAddingId(null);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setNewBanner(null);
    try {
      setSyncTimestamp(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const moduleOk = isSmsModuleAvailable();
      if (!moduleOk) {
        setNewBanner('SMS module not available — build with native SMS module first');
        setSyncing(false);
        return;
      }
      const permission = await checkSmsPermission();
      if (permission !== 'granted') {
        setNewBanner('SMS permission not granted — go to Settings or use ADB');
        setSyncing(false);
        return;
      }
      const result = await syncAndUpload();
      const msgCount = result.raw.length;
      if (msgCount === 0) {
        setNewBanner('No financial messages found in inbox');
      } else {
        setNewBanner(`${msgCount} message${msgCount > 1 ? 's' : ''} detected — review & add`);
      }
      setTimeout(() => setNewBanner(null), 6000);

      await loadDetections();
    } catch (_e) {
      setNewBanner('Sync failed — check SMS permission and backend connection');
      setTimeout(() => setNewBanner(null), 5000);
    } finally {
      setSyncing(false);
    }
  }

  function formatCurrency(val: number | null): string {
    if (val === null || val === undefined) {
      return '';
    }
    const prefix = val >= 0 ? '\u20B9' : '-\u20B9';
    return (
      prefix +
      Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  }

  const stats = {
    total: detections.length,
    pending: detections.filter((d) => !d.isProcessed).length,
    added: detections.filter((d) => d.isProcessed).length,
  };

  const filtered = detections.filter((d) => {
    if (filter === 'pending') {
      return !d.isProcessed;
    }
    if (filter === 'added') {
      return d.isProcessed;
    }
    return true;
  });

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <ListSkeleton />
      </View>
    );
  }

  function renderDetection({ item }: { item: Detection }) {
    const catName = item.category?.name || 'Expense';
    const isIncome = item.detectedType === 'income';
    const iconName = getCatIcon(catName);
    const catColors: Record<string, string> = {
      'Food & Dining': '#FF6B6B',
      Groceries: '#00B894',
      Shopping: '#14B8A6',
      Transportation: '#FDCB6E',
      Entertainment: '#E17055',
      'Bills & Utilities': '#636E72',
      Housing: '#0984E3',
      Income: '#00B894',
      Subscriptions: '#F39C12',
      'Health & Medical': '#E74C3C',
      Education: '#14B8A6',
      Travel: '#1ABC9C',
      Financial: '#34495E',
      Transfers: '#2D3436',
      Refunds: '#00CEC9',
      Pets: '#FD79A8',
      Clothing: '#14B8A6',
      'Other Income': '#55EFC4',
      'Other Expenses': '#636E72',
    };
    const catColor = catColors[catName] || colors.accent.primary;

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
        ]}
      >
        <View style={styles.cardRow}>
          <View style={[styles.iconBox, { backgroundColor: `${catColor}18` }]}>
            <AntDesign name={iconName as any} size={18} color={catColor} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.merchant, { color: colors.text.primary }]} numberOfLines={1}>
              {item.sender || 'Unknown'}
            </Text>
            <Text style={[styles.category, { color: catColor }]} numberOfLines={1}>
              {catName}
            </Text>
          </View>
          <View style={styles.rightCol}>
            {item.detectedAmount !== null && item.detectedAmount !== undefined && (
              <Text
                style={[
                  styles.amount,
                  { color: isIncome ? colors.status.success : colors.status.error },
                ]}
              >
                {isIncome ? '+' : '-'}
                {formatCurrency(item.detectedAmount)}
              </Text>
            )}
            <Text style={[styles.date, { color: colors.text.tertiary }]}>
              {new Date(item.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          </View>
        </View>
        {!item.isProcessed && item.detectedAmount !== null && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.accent.primary }]}
            onPress={() => handleAddTransaction(item.id)}
            disabled={addingId === item.id}
          >
            {addingId === item.id ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <AntDesign  name="pluscircleo" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add as {isIncome ? 'Income' : 'Expense'}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        <View style={[styles.cardFooter, { borderTopColor: colors.border.subtle }]}>
          {item.isProcessed ? (
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: `${colors.status.success}18` }]}>
                <AntDesign  name="checkcircleo" size={12} color={colors.status.success} />
                <Text style={[styles.badgeText, { color: colors.status.success }]}>Added</Text>
              </View>
            </View>
          ) : (
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: `${colors.status.warning}18` }]}>
                <AntDesign  name="clockcircleo" size={12} color={colors.status.warning} />
                <Text style={[styles.badgeText, { color: colors.status.warning }]}>Pending</Text>
              </View>
            </View>
          )}
          {item.confidence !== null && item.confidence !== undefined && (
            <Text style={[styles.conf, { color: colors.text.tertiary }]}>
              {Math.round(item.confidence * 100)}% match
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, paddingBottom: 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>SMS Intelligence</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: `${colors.accent.primary}15` }]}
            onPress={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={colors.accent.primary} />
            ) : (
              <AntDesign  name="sync" size={18} color={colors.accent.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
            ]}
            onPress={() => navigation.navigate('SmsPermission')}
          >
            <AntDesign  name="setting" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {newBanner && (
        <View style={[styles.newBanner, { backgroundColor: colors.accent.primary }]}>
          <AntDesign  name="star" size={14} color="#FFFFFF" />
          <Text style={styles.newBannerText}>{newBanner}</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(d) => d.id}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={loadDetections}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={
          filtered.length === 0
            ? styles.emptyContainer
            : { paddingHorizontal: 16, paddingBottom: 100 }
        }
        ListHeaderComponent={
          detections.length > 0 ? (
            <View>
              <View style={styles.statsRow}>
                {[
                  { label: 'Total', value: stats.total, color: colors.accent.primary },
                  { label: 'Pending', value: stats.pending, color: colors.status.warning },
                  { label: 'Added', value: stats.added, color: colors.status.success },
                ].map((s, i) => (
                  <View
                    key={i}
                    style={[
                      styles.statCard,
                      { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
                    ]}
                  >
                    <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>
                      {s.label}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.filterRow}>
                {(['pending', 'all', 'added'] as FilterMode[]).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: filter === f ? colors.accent.primary : 'transparent',
                        borderColor: filter === f ? colors.accent.primary : colors.border.subtle,
                      },
                    ]}
                    onPress={() => setFilter(f)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        { color: filter === f ? '#FFFFFF' : colors.text.secondary },
                      ]}
                    >
                      {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Added'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null
        }
        renderItem={renderDetection}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: `${colors.accent.primary}15` }]}>
              <AntDesign  name="message1" size={40} color={colors.accent.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              {filter === 'added' ? 'No added transactions yet' : 'No pending detections'}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              {filter === 'pending'
                ? 'Tap Sync to scan your SMS for financial transactions. Review each one and tap Add to record it.'
                : 'Detected SMS messages will appear here for you to review and add.'}
            </Text>
            {detections.length === 0 && (
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.accent.primary }]}
                onPress={() => navigation.navigate('SmsPermission')}
              >
                <AntDesign  name="setting" size={16} color="#FFFFFF" />
                <Text style={styles.emptyBtnText}>Set Up SMS Sync</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        windowSize={10}
        maxToRenderPerBatch={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 12 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  newBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  newBannerText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 12, fontWeight: '600' },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  merchant: { fontSize: 15, fontWeight: '600' },
  category: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  rightCol: { alignItems: 'flex-end', gap: 2 },
  amount: { fontSize: 17, fontWeight: '700' },
  date: { fontSize: 11 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  badgeRow: { flexDirection: 'row', gap: 6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  conf: { fontSize: 11, fontWeight: '500' },
  emptyContainer: { flexGrow: 1, paddingHorizontal: 16 },
  empty: { alignItems: 'center', gap: 12, paddingHorizontal: 32, paddingTop: 40 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
