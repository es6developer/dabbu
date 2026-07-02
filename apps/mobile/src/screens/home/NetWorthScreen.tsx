import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSilentRefresh } from '../../hooks/useSilentRefresh';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { onDataRefresh } from '../../services/dataRefresh';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import { PremiumGate } from '../../components/ui/PremiumGate';

const ASSET_CATEGORIES = [
  { key: 'bank', label: 'Bank Balance', icon: 'wallet' },
  { key: 'wallet', label: 'Cash', icon: 'wallet' },
  { key: 'gold', label: 'Gold', icon: 'star' },
  { key: 'property', label: 'Property', icon: 'home' },
  { key: 'investments', label: 'Stocks & Mutual Funds', icon: 'linechart' },
  { key: 'fixedDeposits', label: 'Fixed Deposits', icon: 'lock' },
  { key: 'epf', label: 'EPF / NPS', icon: 'Safety' },
  { key: 'crypto', label: 'Crypto', icon: 'rocket1' },
];

const LIABILITY_CATEGORIES = [
  { key: 'homeLoan', label: 'Home Loan', icon: 'home' },
  { key: 'personalLoan', label: 'Personal Loan', icon: 'user' },
  { key: 'creditCard', label: 'Credit Card Debt', icon: 'creditcard' },
  { key: 'otherLoan', label: 'Other Loans', icon: 'solution1' },
];

function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function NetWorthScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { accessToken } = useAuth();

  const [assets, setAssets] = useState<Record<string, string>>({
    bank: '',
    cash: '',
    gold: '',
    property: '',
    investments: '',
    fixedDeposits: '',
    epf: '',
    crypto: '',
  });
  const [liabilities, setLiabilities] = useState<Record<string, string>>({
    homeLoan: '',
    personalLoan: '',
    creditCard: '',
    otherLoan: '',
  });
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, []);

  const loadData = useCallback(
    async (silent = false, refresh = false) => {
      try {
        if (refresh) {
          setRefreshing(true);
        } else if (!silent) {
          setLoading(true);
        }
        if (accessToken) {
          setAccessToken(accessToken);
        }
        const res = await api.get('/net-worth');
        const body = res as any;
        const data = body?.data ?? body;
        if (data) {
          setAssets({
            bank: String(data.bank ?? ''),
            cash: String(data.cash ?? ''),
            gold: String(data.gold ?? ''),
            property: String(data.property ?? ''),
            investments: String(data.investments ?? ''),
            fixedDeposits: String(data.fixedDeposits ?? ''),
            epf: String(data.epf ?? ''),
            crypto: String(data.crypto ?? ''),
          });
          setLiabilities({
            homeLoan: String(data.homeLoan ?? ''),
            personalLoan: String(data.personalLoan ?? ''),
            creditCard: String(data.creditCardDebt ?? ''),
            otherLoan: String(data.otherLiabilities ?? ''),
          });
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken],
  );

  useSilentRefresh(
    useCallback(
      (isInitial) => {
        loadData(!isInitial);
      },
      [loadData],
    ),
  );

  useEffect(() => {
    const unsub = onDataRefresh(() => {
      loadData(true);
    });
    return unsub;
  }, [loadData]);

  async function save() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(async () => {
      if (!mountedRef.current) {
        return;
      }
      setIsSaving(true);
      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }
        const payload: Record<string, string> = {};
        for (const [k, v] of [...Object.entries(assets), ...Object.entries(liabilities)]) {
          if (v) {
            payload[k] = v;
          }
        }
        payload.creditCardDebt = payload.creditCard || '0';
        payload.otherLiabilities = payload.otherLoan || '0';
        delete payload.creditCard;
        delete payload.otherLoan;
        await api.patch('/net-worth', payload);
        showToast('Net worth updated');
      } catch {
        /* ignore */
      } finally {
        if (mountedRef.current) {
          setIsSaving(false);
        }
      }
    }, 800);
  }

  const totalAssets = Object.values(assets).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const totalLiabilities = Object.values(liabilities).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  function updateAsset(key: string, value: string) {
    const cleaned = value.replace(/[^0-9.]/g, '');
    setAssets((prev) => ({ ...prev, [key]: cleaned }));
    save();
  }

  function updateLiability(key: string, value: string) {
    const cleaned = value.replace(/[^0-9.]/g, '');
    setLiabilities((prev) => ({ ...prev, [key]: cleaned }));
    save();
  }

  return (
    <PremiumGate featureKey="net_worth">
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <AntDesign name="left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Net Worth</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 44 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                try {
                  await loadData(false, true);
                } finally {
                  setRefreshing(false);
                }
              }}
              tintColor={colors.accent?.primary || colors.brand?.primary}
            />
          }
        >
          <View
            style={[
              styles.netWorthCard,
              { backgroundColor: colors.bg.card, borderColor: colors.border.default },
            ]}
          >
            <Text style={[styles.netWorthLabel, { color: colors.text.tertiary }]}>Net Worth</Text>
            <Text
              style={[
                styles.netWorthValue,
                { color: netWorth >= 0 ? colors.status.success : colors.status.error },
              ]}
            >
              {netWorth >= 0 ? '' : '-'}
              {fmt(Math.abs(netWorth))}
            </Text>
            <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownItem}>
                <AntDesign name="up" size={14} color={colors.status.success} />
                <Text style={[styles.breakdownLabel, { color: colors.text.tertiary }]}>Assets</Text>
                <Text style={[styles.breakdownValue, { color: colors.status.success }]}>
                  {fmt(totalAssets)}
                </Text>
              </View>
              <View style={[styles.breakdownDivider, { backgroundColor: colors.border.subtle }]} />
              <View style={styles.breakdownItem}>
                <AntDesign name="down" size={14} color={colors.status.error} />
                <Text style={[styles.breakdownLabel, { color: colors.text.tertiary }]}>
                  Liabilities
                </Text>
                <Text style={[styles.breakdownValue, { color: colors.status.error }]}>
                  {fmt(totalLiabilities)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text.primary, marginTop: 28 }]}>
            Assets
          </Text>
          {ASSET_CATEGORIES.map((cat) => (
            <View
              key={cat.key}
              style={[
                styles.inputRow,
                { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
              ]}
            >
              <View style={styles.inputRowLeft}>
                <AntDesign name={cat.icon as any} size={18} color={colors.status.success} />
                <Text style={[styles.inputLabel, { color: colors.text.primary }]}>{cat.label}</Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text.primary,
                    backgroundColor: colors.bg.tertiary,
                    borderColor: colors.border.subtle,
                  },
                ]}
                value={assets[cat.key]}
                onChangeText={(v) => updateAsset(cat.key, v)}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
          ))}

          <Text style={[styles.sectionTitle, { color: colors.text.primary, marginTop: 28 }]}>
            Liabilities
          </Text>
          {LIABILITY_CATEGORIES.map((cat) => (
            <View
              key={cat.key}
              style={[
                styles.inputRow,
                { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
              ]}
            >
              <View style={styles.inputRowLeft}>
                <AntDesign name={cat.icon as any} size={18} color={colors.status.error} />
                <Text style={[styles.inputLabel, { color: colors.text.primary }]}>{cat.label}</Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text.primary,
                    backgroundColor: colors.bg.tertiary,
                    borderColor: colors.border.subtle,
                  },
                ]}
                value={liabilities[cat.key]}
                onChangeText={(v) => updateLiability(cat.key, v)}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 19, fontWeight: '700' },
  netWorthCard: {
    borderRadius: 32,
    borderWidth: 1.5,
    padding: 28,
    alignItems: 'center',
  },
  netWorthLabel: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  netWorthValue: { fontSize: 40, fontWeight: '800', letterSpacing: -1.5 },
  divider: { height: 1, width: '100%', marginVertical: 22 },
  breakdownRow: { flexDirection: 'row', width: '100%' },
  breakdownItem: { flex: 1, alignItems: 'center', gap: 4 },
  breakdownLabel: { fontSize: 12, fontWeight: '600' },
  breakdownValue: { fontSize: 19, fontWeight: '800' },
  breakdownDivider: { width: 1, marginHorizontal: 20 },
  sectionTitle: { fontSize: 19, fontWeight: '700', marginBottom: 14 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 8,
  },
  inputRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  inputLabel: { fontSize: 16, fontWeight: '600' },
  input: {
    borderWidth: 1.5,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '700',
    width: 120,
    textAlign: 'right',
  },
});
