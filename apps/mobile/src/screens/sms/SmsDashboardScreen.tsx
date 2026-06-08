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
import { Ionicons } from '@expo/vector-icons';
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

type FilterMode = 'all' | 'categorized' | 'uncategorized';

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
  const [autoCreating, setAutoCreating] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [newBanner, setNewBanner] = useState<string | null>(null);
  const creatingRef = useRef(false);
  const syncLockRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      loadDetections();
      const poll = setInterval(loadDetections, 5000);
      const liveSync = setInterval(() => {
        if (!syncLockRef.current) {
          liveReadSync();
        }
      }, 45000);
      return () => {
        clearInterval(poll);
        clearInterval(liveSync);
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

  async function autoCreateFresh(pending: Detection[]) {
    if (creatingRef.current || pending.length === 0) {
      return;
    }
    creatingRef.current = true;
    setAutoCreating(true);
    const cutoff = Date.now() - 120000;
    const fresh = pending.filter((d) => new Date(d.createdAt).getTime() > cutoff);
    for (const d of fresh) {
      try {
        await api.post('/sms-detection/detect', {
          message: d.messageBody,
          sender: d.sender,
        });
      } catch (_e) {
        /* ignore */
      }
    }
    if (fresh.length > 0) {
      await loadDetections();
    }
    setAutoCreating(false);
    creatingRef.current = false;
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
      const uploadSuccess = result.upload.success;
      const uploadFailed = result.upload.failed;
      const uploadErrors = result.upload.errors;
      if (msgCount === 0) {
        setNewBanner('No financial messages found in inbox');
      } else if (uploadFailed > 0) {
        const topErrors = [...new Set(uploadErrors)].slice(0, 2).join(', ');
        setNewBanner(
          `Synced ${msgCount} — ${uploadSuccess} created, ${uploadFailed} failed (${topErrors})`,
        );
      } else {
        setNewBanner(`Synced ${msgCount} — ${uploadSuccess} created`);
      }
      setTimeout(() => setNewBanner(null), 6000);

      const res = await api.get<any>('/sms-detection');
      const data = Array.isArray(res) ? res : [];
      setDetections(data);
      autoCreateFresh(data.filter((d: Detection) => !d.isProcessed));
    } catch (_e) {
      setNewBanner('Sync failed — check SMS permission and backend connection');
      setTimeout(() => setNewBanner(null), 5000);
    } finally {
      setSyncing(false);
    }
  }

  async function liveReadSync() {
    syncLockRef.current = true;
    try {
      const moduleOk = isSmsModuleAvailable();
      if (!moduleOk) {
        return;
      }
      const permission = await checkSmsPermission();
      if (permission !== 'granted') {
        return;
      }
      const result = await syncAndUpload();
      if (result.raw.length === 0) {
        return;
      }
      const res = await api.get<any>('/sms-detection');
      const data = Array.isArray(res) ? res : [];
      setDetections(data);
      autoCreateFresh(data.filter((d: Detection) => !d.isProcessed));
    } catch (_e) {
      void _e;
    } finally {
      syncLockRef.current = false;
    }
  }

  function formatCurrency(val: number | null): string {
    if (val === null || val === undefined) {
      return '';
    }
    const prefix = val >= 0 ? '₹' : '-₹';
    return (
      prefix +
      Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  }

  const stats = {
    total: detections.length,
    categorized: detections.filter((d) => d.category?.name).length,
    pending: detections.filter((d) => !d.isProcessed).length,
    thisMonth: detections.filter((d) => {
      const dDate = new Date(d.createdAt);
      const now = new Date();
      return dDate.getMonth() === now.getMonth() && dDate.getFullYear() === now.getFullYear();
    }).length,
  };

  const filtered = detections.filter((d) => {
    if (filter === 'categorized') {
      return !!d.category?.name;
    }
    if (filter === 'uncategorized') {
      return !d.category?.name;
    }
    return true;
  });

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
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
      Shopping: '#FF6B00',
      Transportation: '#FDCB6E',
      Entertainment: '#E17055',
      'Bills & Utilities': '#636E72',
      Housing: '#0984E3',
      Income: '#00B894',
      Subscriptions: '#F39C12',
      'Health & Medical': '#E74C3C',
      Education: '#FF6B00',
      Travel: '#1ABC9C',
      Financial: '#34495E',
      Transfers: '#2D3436',
      Refunds: '#00CEC9',
      Pets: '#FD79A8',
      Clothing: '#FF914D',
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
            <Ionicons name={iconName as any} size={18} color={catColor} />
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
        <View style={[styles.cardFooter, { borderTopColor: colors.border.subtle }]}>
          {item.isProcessed ? (
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: `${colors.status.success}18` }]}>
                <Ionicons name="checkmark-circle" size={12} color={colors.status.success} />
                <Text style={[styles.badgeText, { color: colors.status.success }]}>Synced</Text>
              </View>
            </View>
          ) : (
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: `${colors.status.warning}18` }]}>
                <Ionicons name="time" size={12} color={colors.status.warning} />
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
          {autoCreating && (
            <ActivityIndicator
              color={colors.accent.primary}
              size="small"
              style={{ marginRight: 4 }}
            />
          )}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: `${colors.accent.primary}15` }]}
            onPress={handleSync}
            disabled={syncing}
          >
            <Ionicons name="sync" size={18} color={colors.accent.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
            ]}
            onPress={() => navigation.navigate('SmsPermission')}
          >
            <Ionicons name="settings-outline" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {newBanner && (
        <View style={[styles.newBanner, { backgroundColor: colors.accent.primary }]}>
          <Ionicons name="sparkles" size={14} color="#FFFFFF" />
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
                  { label: 'Categorized', value: stats.categorized, color: colors.status.success },
                  { label: 'Pending', value: stats.pending, color: colors.status.warning },
                  { label: 'This Month', value: stats.thisMonth, color: colors.text.secondary },
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
                {(['all', 'categorized', 'uncategorized'] as FilterMode[]).map((f) => (
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
                      {f === 'all' ? 'All' : f === 'categorized' ? 'Categorized' : 'Uncategorized'}
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
              <Ionicons name="chatbubbles-outline" size={40} color={colors.accent.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              Automatically track expenses
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              Enable SMS sync to automatically detect and categorize financial transactions from
              your messages. No manual entry needed.
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.accent.primary }]}
              onPress={() => navigation.navigate('SmsPermission')}
            >
              <Ionicons name="settings-outline" size={16} color="#FFFFFF" />
              <Text style={styles.emptyBtnText}>Set Up SMS Sync</Text>
            </TouchableOpacity>
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
  empty: { alignItems: 'center', gap: 12, paddingHorizontal: 32 },
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
