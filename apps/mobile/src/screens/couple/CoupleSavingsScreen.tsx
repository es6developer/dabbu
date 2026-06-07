import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
  TextInput, Modal, Alert, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

const { width } = Dimensions.get('window');
const LEDGE_ICON = 40;

function fmt(v: number) {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function CoupleSavingsScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingsData, setSavingsData] = useState<any>(null);
  const [error, setError] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addNote, setAddNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSavings = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const couple = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (!couple) {
        setError('No active couple space found');
        setSavingsData(null);
        return;
      }
      const data = await api.get<any>(`/shared-finance/groups/${couple.id}/couple/savings`);
      setSavingsData(data || {});
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load savings data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchSavings(); }, [fetchSavings]);

  async function handleAddSavings() {
    if (!addAmount || isNaN(Number(addAmount)) || Number(addAmount) <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount greater than 0.');
      return;
    }
    setSubmitting(true);
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const couple = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (!couple) throw new Error('No active couple space');
      await api.post(`/shared-finance/groups/${couple.id}/couple/savings/contribute`, {
        amount: Number(addAmount),
        note: addNote.trim() || undefined,
      });
      setModalVisible(false);
      setAddAmount('');
      setAddNote('');
      await fetchSavings(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add savings');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingScreen />;

  const goal = savingsData?.goal || {};
  const contributions = savingsData?.contributions || [];
  const partners = savingsData?.partners || {};
  const stats = savingsData?.stats || {};

  const targetAmount = goal?.targetAmount || 0;
  const savedAmount = goal?.savedAmount || 0;
  const targetDate = goal?.targetDate || '';
  const progressPct = targetAmount > 0 ? Math.min((savedAmount / targetAmount) * 100, 100) : 0;

  const p1Name = partners?.partner1?.name || 'Partner 1';
  const p2Name = partners?.partner2?.name || 'Partner 2';
  const p1Contrib = partners?.partner1?.contributed || 0;
  const p2Contrib = partners?.partner2?.contributed || 0;

  const totalSaved = stats?.totalSaved ?? savedAmount;
  const thisMonthSaved = stats?.thisMonth ?? 0;
  const remaining = Math.max(targetAmount - savedAmount, 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchSavings(true); }}
            tintColor="#5D38B5"
          />
        }
      >
        <LinearGradient
          colors={['#5D38B5', '#7A52D1']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 12, paddingBottom: 28, paddingHorizontal: 20 }}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Savings</Text>
            <View style={{ width: 34 }} />
          </View>
          <View style={styles.headerSub}>
            <Ionicons name="save-outline" size={28} color="rgba(255,255,255,0.6)" />
            <Text style={styles.headerSubText}>Save together, grow together</Text>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, marginTop: -16, gap: 16 }}>
          <View style={[styles.goalCard, { backgroundColor: '#FFEBB4' }]}>
            <View style={styles.goalHeader}>
              <Ionicons name="trophy-outline" size={22} color="#5D38B5" />
              <Text style={styles.goalTitle}>Savings Goal</Text>
            </View>
            <View style={styles.goalRow}>
              <View style={styles.goalCol}>
                <Text style={styles.goalLabel}>Target</Text>
                <Text style={styles.goalValue}>{fmt(targetAmount)}</Text>
              </View>
              <View style={styles.goalCol}>
                <Text style={styles.goalLabel}>Saved</Text>
                <Text style={styles.goalValue}>{fmt(savedAmount)}</Text>
              </View>
            </View>
            <View style={styles.progressWrap}>
              <View style={[styles.progressBar, { backgroundColor: 'rgba(93,56,181,0.12)' }]}>
                <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(progressPct)}%</Text>
            </View>
            {targetDate ? (
              <Text style={styles.goalDate}>Target date: {formatDate(targetDate)}</Text>
            ) : null}
          </View>

          <View style={[styles.statsRow, { backgroundColor: colors.bg.card }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text.primary }]}>{fmt(totalSaved)}</Text>
              <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Total Saved</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border.default }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.status.success }]}>{fmt(thisMonthSaved)}</Text>
              <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>This Month</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border.default }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.status.warning }]}>{fmt(remaining)}</Text>
              <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Remaining</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Contribution Breakdown</Text>
            <View style={styles.contribRow}>
              <View style={styles.contribAvatar}>
                <Text style={styles.contribAvatarText}>{p1Name[0]}</Text>
              </View>
              <View style={styles.contribInfo}>
                <Text style={[styles.contribName, { color: colors.text.primary }]}>{p1Name}</Text>
                <Text style={[styles.contribAmount, { color: colors.text.secondary }]}>{fmt(p1Contrib)}</Text>
              </View>
            </View>
            <View style={styles.contribRow}>
              <View style={[styles.contribAvatar, { backgroundColor: '#7A52D1' }]}>
                <Text style={styles.contribAvatarText}>{p2Name[0]}</Text>
              </View>
              <View style={styles.contribInfo}>
                <Text style={[styles.contribName, { color: colors.text.primary }]}>{p2Name}</Text>
                <Text style={[styles.contribAmount, { color: colors.text.secondary }]}>{fmt(p2Contrib)}</Text>
              </View>
            </View>
            <View style={[styles.contribTotal, { borderTopColor: colors.border.default }]}>
              <Text style={[styles.contribTotalLabel, { color: colors.text.tertiary }]}>Total Contributions</Text>
              <Text style={[styles.contribTotalAmount, { color: colors.text.primary }]}>{fmt(p1Contrib + p2Contrib)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.8}
            onPress={() => setModalVisible(true)}
          >
            <LinearGradient
              colors={['#5D38B5', '#7A52D1']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.addBtnGradient}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFF" />
              <Text style={styles.addBtnText}>Add to Savings</Text>
            </LinearGradient>
          </TouchableOpacity>

          {contributions.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.bg.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Savings Ledger</Text>
              {contributions.map((entry: any, i: number) => (
                <View
                  key={entry.id || i}
                  style={[
                    styles.ledgerItem,
                    i < contributions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
                  ]}
                >
                  <View style={styles.ledgerLeft}>
                    <View style={[styles.ledgerAvatar, { backgroundColor: entry.contributorId === partners?.partner1?.id ? '#6C3EF4' : '#7A52D1' }]}>
                      <Text style={styles.ledgerAvatarText}>
                        {(entry.contributorName || entry.contributorId || '?')[0]}
                      </Text>
                    </View>
                    <View style={styles.ledgerInfo}>
                      <Text style={[styles.ledgerName, { color: colors.text.primary }]}>
                        {entry.contributorName || 'Partner'}
                      </Text>
                      <Text style={[styles.ledgerDate, { color: colors.text.tertiary }]}>
                        {formatDate(entry.createdAt || entry.date)}
                      </Text>
                      {entry.note ? (
                        <Text style={[styles.ledgerNote, { color: colors.text.secondary }]}>{entry.note}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Text style={[styles.ledgerAmount, { color: colors.status.success }]}>+{fmt(entry.amount)}</Text>
                </View>
              ))}
              {contributions.length === 0 && (
                <Text style={[styles.emptyLedger, { color: colors.text.tertiary }]}>
                  No contributions yet. Start saving together!
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.bg.secondary }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border.default }]} />
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Add to Savings</Text>

            <Text style={[styles.inputLabel, { color: colors.text.tertiary }]}>Amount</Text>
            <View style={[styles.amountInputRow, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.default }]}>
              <Text style={[styles.currencySign, { color: colors.text.tertiary }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text.primary }]}
                placeholder="0"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
                value={addAmount}
                onChangeText={setAddAmount}
              />
            </View>

            <Text style={[styles.inputLabel, { color: colors.text.tertiary }]}>Note (optional)</Text>
            <TextInput
              style={[styles.noteInput, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.default, color: colors.text.primary }]}
              placeholder="What's this for?"
              placeholderTextColor={colors.text.tertiary}
              value={addNote}
              onChangeText={setAddNote}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor: colors.border.default }]}
                onPress={() => { setModalVisible(false); setAddAmount(''); setAddNote(''); }}
              >
                <Text style={[styles.modalCancelText, { color: colors.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmit}
                activeOpacity={0.8}
                onPress={handleAddSavings}
                disabled={submitting}
              >
                <LinearGradient
                  colors={['#5D38B5', '#7A52D1']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.modalSubmitGradient}
                >
                  <Text style={styles.modalSubmitText}>{submitting ? 'Adding...' : 'Add'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  headerSub: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  headerSubText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500' },

  goalCard: { borderRadius: 24, padding: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  goalTitle: { fontSize: 16, fontWeight: '800', color: '#5D38B5' },
  goalRow: { flexDirection: 'row', gap: 24, marginBottom: 14 },
  goalCol: { flex: 1 },
  goalLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(93,56,181,0.6)', marginBottom: 2 },
  goalValue: { fontSize: 24, fontWeight: '800', color: '#5D38B5', letterSpacing: -0.5 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  progressBar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#5D38B5', borderRadius: 4 },
  progressText: { fontSize: 13, fontWeight: '800', color: '#5D38B5', minWidth: 36, textAlign: 'right' },
  goalDate: { fontSize: 11, fontWeight: '500', color: 'rgba(93,56,181,0.5)' },

  statsRow: {
    flexDirection: 'row', borderRadius: 20, paddingVertical: 16, paddingHorizontal: 8,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  statDivider: { width: 1, alignSelf: 'stretch', marginVertical: 4 },

  card: { borderRadius: 20, padding: 18, gap: 12, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },

  contribRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contribAvatar: {
    width: LEDGE_ICON, height: LEDGE_ICON, borderRadius: 12, backgroundColor: '#5D38B5',
    alignItems: 'center', justifyContent: 'center',
  },
  contribAvatarText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  contribInfo: { flex: 1 },
  contribName: { fontSize: 14, fontWeight: '600' },
  contribAmount: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  contribTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4,
  },
  contribTotalLabel: { fontSize: 12, fontWeight: '600' },
  contribTotalAmount: { fontSize: 18, fontWeight: '800' },

  addBtn: { overflow: 'hidden', borderRadius: 18, elevation: 4, shadowColor: '#5D38B5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  addBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16,
  },
  addBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  ledgerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  ledgerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  ledgerAvatar: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  ledgerAvatarText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  ledgerInfo: { flex: 1 },
  ledgerName: { fontSize: 13, fontWeight: '600' },
  ledgerDate: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  ledgerNote: { fontSize: 11, fontWeight: '400', marginTop: 1 },
  ledgerAmount: { fontSize: 15, fontWeight: '800' },
  emptyLedger: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, gap: 16 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },

  inputLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  amountInputRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 16, height: 52,
  },
  currencySign: { fontSize: 20, fontWeight: '700', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '700' },
  noteInput: { borderRadius: 16, borderWidth: 1, padding: 14, fontSize: 15, minHeight: 80, textAlignVertical: 'top' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancel: { flex: 1, borderRadius: 16, borderWidth: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600' },
  modalSubmit: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  modalSubmitGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  modalSubmitText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
