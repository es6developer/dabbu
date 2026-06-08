import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl,
  Modal, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

const { width: SCREEN_W } = Dimensions.get('window');

function fmt(v: number) {
  return `\u20B9${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface IncomeEntry {
  id: string;
  source: string;
  amount: number;
  date: string;
  type: 'salary' | 'other';
  partnerId: string;
  partnerName: string;
}

export function CoupleIncomeScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incomes, setIncomes] = useState<IncomeEntry[]>([]);
  const [partner1Name, setPartner1Name] = useState('Partner 1');
  const [partner2Name, setPartner2Name] = useState('Partner 2');
  const [partner1Id, setPartner1Id] = useState('partner1');
  const [partner2Id, setPartner2Id] = useState('partner2');

  const [modalVisible, setModalVisible] = useState(false);
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [incomeType, setIncomeType] = useState<'salary' | 'other'>('salary');
  const [selectedPartner, setSelectedPartner] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchIncomes = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const coupleGroup = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (!coupleGroup) {
        setIncomes([]);
        return;
      }
      const groupId = coupleGroup.id;
      const dashboard = await api.get<any>(`/shared-finance/groups/${groupId}/couple/dashboard`);
      const profile = dashboard?.profile;
      if (profile) {
        const p1 = profile.partner1;
        const p2 = profile.partner2;
        setPartner1Name(p1?.firstName || p1?.email || 'Partner 1');
        setPartner2Name(p2?.firstName || p2?.email || 'Partner 2');
        setPartner1Id(p1?.id || 'partner1');
        setPartner2Id(p2?.id || 'partner2');
      }
      const incomeData = await api.get<IncomeEntry[]>(`/shared-finance/groups/${groupId}/couple/incomes`);
      if (Array.isArray(incomeData)) {
        setIncomes(incomeData);
      } else {
        setIncomes([]);
      }
    } catch (e: any) {
      if (e.message !== 'Session expired. Please login again.') {
        Alert.alert('Error', e.message || 'Failed to load incomes');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchIncomes(); }, [fetchIncomes]);

  async function handleAddIncome() {
    if (!source.trim()) { Alert.alert('Missing', 'Please enter a source'); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { Alert.alert('Invalid', 'Please enter a valid amount'); return; }
    if (!date) { Alert.alert('Missing', 'Please select a date'); return; }
    if (!selectedPartner) { Alert.alert('Missing', 'Please assign to a partner'); return; }

    setSubmitting(true);
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const coupleGroup = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (!coupleGroup) { Alert.alert('Error', 'No couple group found'); setSubmitting(false); return; }

      const newIncome = await api.post<any>(`/shared-finance/groups/${coupleGroup.id}/couple/incomes`, {
        source: source.trim(),
        amount: amt,
        date,
        type: incomeType,
        partnerId: selectedPartner,
      });
      if (newIncome) {
        setIncomes((prev) => [newIncome, ...prev]);
      }
      setModalVisible(false);
      resetForm();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add income');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSource('');
    setAmount('');
    setDate(new Date().toISOString().slice(0, 10));
    setIncomeType('salary');
    setSelectedPartner('');
  }

  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const p1Income = incomes.filter((i) => i.partnerId === partner1Id).reduce((sum, i) => sum + i.amount, 0);
  const p2Income = incomes.filter((i) => i.partnerId === partner2Id).reduce((sum, i) => sum + i.amount, 0);

  if (loading) return <LoadingScreen />;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchIncomes(true); }}
            tintColor={colors.accent.primary}
          />
        }
      >
        <View
          style={{ paddingTop: insets.top + 12, paddingBottom: 28, paddingHorizontal: 20, backgroundColor: colors.accent.primary }}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.navigate('CoupleSpaceHome')}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Income</Text>
            <View style={{ width: 34 }} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: -16 }}>
          <View style={[styles.summaryCard, { backgroundColor: '#FFEBB4' }]}>
            <Text style={styles.summaryTotalLabel}>Total Monthly Income</Text>
            <Text style={styles.summaryTotalAmount}>{fmt(totalIncome)}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <View style={[styles.summaryDot, { backgroundColor: colors.accent.primary }]} />
                <Text style={styles.summaryPartnerLabel}>{partner1Name}</Text>
                <Text style={styles.summaryPartnerAmount}>{fmt(p1Income)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <View style={[styles.summaryDot, { backgroundColor: colors.accent.primary }]} />
                <Text style={styles.summaryPartnerLabel}>{partner2Name}</Text>
                <Text style={styles.summaryPartnerAmount}>{fmt(p2Income)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.8}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFF" />
            <Text style={styles.addBtnText}>Add Income</Text>
          </TouchableOpacity>
        </View>

        {incomes.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="wallet-outline" size={52} color={colors.text.tertiary} />
            <Text style={[styles.emptyText, { color: colors.text.secondary, marginTop: 12 }]}>
              No income entries yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.text.tertiary }]}>
              Tap "Add Income" to get started
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 10 }}>
            {incomes.map((item) => (
              <View
                key={item.id}
                style={[styles.incomeCard, { backgroundColor: colors.bg.card }]}
              >
                <View style={[styles.incomeIconWrap, { backgroundColor: item.type === 'salary' ? `${colors.status.info}18` : `${colors.status.warning}18` }]}>
                  <Ionicons
                    name={item.type === 'salary' ? 'briefcase-outline' : 'cash-outline'}
                    size={20}
                    color={item.type === 'salary' ? colors.status.info : colors.status.warning}
                  />
                </View>
                <View style={styles.incomeInfo}>
                  <Text style={[styles.incomeSource, { color: colors.text.primary }]}>{item.source}</Text>
                  <Text style={[styles.incomeDate, { color: colors.text.tertiary }]}>{fmtDate(item.date)}</Text>
                </View>
                <View style={styles.incomeRight}>
                  <Text style={[styles.incomeAmount, { color: colors.status.success }]}>+{fmt(item.amount)}</Text>
                  <View style={[styles.partnerChip, { backgroundColor: `${item.partnerId === partner1Id ? colors.accent.primary : colors.accent.primary}18` }]}>
                    <Text style={[styles.partnerChipText, { color: item.partnerId === partner1Id ? colors.accent.primary : colors.accent.primary }]}>
                      {item.partnerName || (item.partnerId === partner1Id ? partner1Name : partner2Name)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.bg.secondary }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Add Income</Text>

            <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Source</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.default }]}
              value={source}
              onChangeText={setSource}
              placeholder="e.g. Salary, Freelance"
              placeholderTextColor={colors.text.tertiary}
            />

            <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Amount</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.default }]}
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg.tertiary, color: colors.text.primary, borderColor: colors.border.default }]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.text.tertiary}
            />

            <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Type</Text>
            <View style={styles.segmentRow}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  { backgroundColor: incomeType === 'salary' ? colors.accent.primary : colors.bg.tertiary },
                ]}
                onPress={() => setIncomeType('salary')}
              >
                <Ionicons name="briefcase-outline" size={16} color={incomeType === 'salary' ? '#FFF' : colors.text.secondary} />
                <Text style={[styles.segmentText, { color: incomeType === 'salary' ? '#FFF' : colors.text.secondary }]}>Salary</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  { backgroundColor: incomeType === 'other' ? colors.accent.primary : colors.bg.tertiary },
                ]}
                onPress={() => setIncomeType('other')}
              >
                <Ionicons name="cash-outline" size={16} color={incomeType === 'other' ? '#FFF' : colors.text.secondary} />
                <Text style={[styles.segmentText, { color: incomeType === 'other' ? '#FFF' : colors.text.secondary }]}>Other</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Assign to</Text>
            <View style={styles.segmentRow}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  { backgroundColor: selectedPartner === partner1Id ? colors.accent.primary : colors.bg.tertiary },
                ]}
                onPress={() => setSelectedPartner(partner1Id)}
              >
                <Ionicons name="person-outline" size={16} color={selectedPartner === partner1Id ? '#FFF' : colors.text.secondary} />
                <Text style={[styles.segmentText, { color: selectedPartner === partner1Id ? '#FFF' : colors.text.secondary }]}>{partner1Name}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  { backgroundColor: selectedPartner === partner2Id ? colors.accent.primary : colors.bg.tertiary },
                ]}
                onPress={() => setSelectedPartner(partner2Id)}
              >
                <Ionicons name="person-outline" size={16} color={selectedPartner === partner2Id ? '#FFF' : colors.text.secondary} />
                <Text style={[styles.segmentText, { color: selectedPartner === partner2Id ? '#FFF' : colors.text.secondary }]}>{partner2Name}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.accent.primary, opacity: submitting ? 0.7 : 1 }]}
              onPress={handleAddIncome}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Add Income</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  summaryCard: {
    borderRadius: 24, padding: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6,
  },
  summaryTotalLabel: { fontSize: 12, fontWeight: '600', color: '#F97316', letterSpacing: 0.3 },
  summaryTotalAmount: { fontSize: 32, fontWeight: '800', color: '#F97316', letterSpacing: -1, marginTop: 4, marginBottom: 18 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryDot: { width: 8, height: 8, borderRadius: 4 },
  summaryPartnerLabel: { fontSize: 11, fontWeight: '600', color: '#F97316', marginTop: 2 },
  summaryPartnerAmount: { fontSize: 16, fontWeight: '800', color: '#F97316' },
  summaryDivider: { width: 1, height: 36, backgroundColor: 'rgba(93,56,181,0.15)', marginHorizontal: 12 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F97316', paddingVertical: 16, borderRadius: 18,
    shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  addBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  incomeCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  incomeIconWrap: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  incomeInfo: { flex: 1, gap: 2 },
  incomeSource: { fontSize: 15, fontWeight: '700' },
  incomeDate: { fontSize: 11, fontWeight: '500' },
  incomeRight: { alignItems: 'flex-end', gap: 6 },
  incomeAmount: { fontSize: 16, fontWeight: '800' },
  partnerChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  partnerChipText: { fontSize: 10, fontWeight: '700' },

  emptyText: { fontSize: 17, fontWeight: '700' },
  emptySubtext: { fontSize: 13, marginTop: 4 },

  modalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'center', marginBottom: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },

  inputLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  input: {
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    borderWidth: 1, fontWeight: '500',
  },
  segmentRow: { flexDirection: 'row', gap: 10 },
  segmentBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 14,
  },
  segmentText: { fontSize: 13, fontWeight: '700' },

  submitBtn: {
    paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    marginTop: 12,
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
