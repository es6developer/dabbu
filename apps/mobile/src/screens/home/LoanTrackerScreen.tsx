import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';

interface Loan {
  id: string;
  name: string;
  type: string;
  totalAmount: number;
  paidAmount: number;
  interestPaid: number;
  interestRate: number;
  monthlyEmi: number;
  tenureMonths: number | null;
  emiDay: number | null;
  startDate: string | null;
  nextEmiDate: string | null;
  remaining: number;
}

interface EmiPayment {
  id: string;
  loanId: string;
  amount: number;
  paidDate: string;
  principal: number;
  interest: number;
  notes: string | null;
}

interface AmortizationRow {
  month: number;
  emi: number;
  principal: number;
  interest: number;
  balance: number;
}

interface ProjectionScenario {
  label: string;
  extraPerMonth: number;
  totalEmi: number;
  monthsToPayoff: number;
  totalInterest: number;
  interestSaved: number;
  monthsSaved: number;
}

const LOAN_TYPES = [
  { type: 'home', name: 'Home Loan', icon: 'home', color: '#F97316' },
  { type: 'car', name: 'Car Loan', icon: 'car', color: '#14B8A6' },
  { type: 'personal', name: 'Personal Loan', icon: 'user', color: '#4F6EF7' },
  { type: 'education', name: 'Education Loan', icon: 'school', color: '#8B5CF6' },
  { type: 'other', name: 'Other Loan', icon: 'caretdown', color: '#6B7280' },
];

const LOAN_ICONS: Record<string, string> = {
  home: 'home', car: 'car', personal: 'user', education: 'school', other: 'caretdown',
};

function fmt(v: number) {
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtShort(v: number) {
  if (v >= 10000000) return '₹' + (v / 10000000).toFixed(1) + 'Cr';
  if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L';
  if (v >= 1000) return '₹' + (v / 1000).toFixed(1) + 'K';
  return '₹' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function EmiHistoryModal({ visible, payments, colors, onClose }: {
  visible: boolean; payments: EmiPayment[]; colors: any; onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', zIndex: 100 }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={{ backgroundColor: colors.bg.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%' }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border.subtle, alignSelf: 'center', marginBottom: 16 }} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: 12 }}>EMI Payment History</Text>
        <ScrollView style={{ maxHeight: 400 }}>
          {payments.length === 0 ? (
            <Text style={{ fontSize: 14, color: colors.text.tertiary, textAlign: 'center', paddingVertical: 20 }}>No payments recorded yet</Text>
          ) : (
            payments.map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>{fmt(p.amount)}</Text>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>{p.paidDate}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 12, color: colors.accent.success }}>Principal: {fmt(p.principal)}</Text>
                  <Text style={{ fontSize: 12, color: colors.status.warning }}>Interest: {fmt(p.interest)}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
        <TouchableOpacity onPress={onClose} style={{ marginTop: 12, paddingVertical: 12, backgroundColor: colors.bg.tertiary, borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary }}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AddLoanModal({ visible, colors, onClose, onAdd }: {
  visible: boolean; colors: any; onClose: () => void; onAdd: (name: string, type: string) => void;
}) {
  const [selected, setSelected] = useState<string>('personal');
  const [customName, setCustomName] = useState('');
  if (!visible) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', zIndex: 100 }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={{ backgroundColor: colors.bg.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border.subtle, alignSelf: 'center', marginBottom: 16 }} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: 16 }}>Add a Loan</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {LOAN_TYPES.map((lt) => (
            <TouchableOpacity key={lt.type} activeOpacity={0.7} onPress={() => { setSelected(lt.type); setCustomName(''); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: selected === lt.type ? lt.color : colors.border.subtle, backgroundColor: selected === lt.type ? lt.color + '15' : colors.bg.card }}>
              <AntDesign name={lt.icon as any} size={16} color={selected === lt.type ? lt.color : colors.text.secondary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: selected === lt.type ? lt.color : colors.text.primary }}>{lt.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={{ borderWidth: 1, borderColor: colors.border.subtle, borderRadius: 12, padding: 12, fontSize: 14, color: colors.text.primary, backgroundColor: colors.bg.tertiary, marginBottom: 16 }}
          placeholder="Custom name (optional)" placeholderTextColor={colors.text.tertiary} value={customName} onChangeText={setCustomName} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={onClose} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.bg.tertiary, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.secondary }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { onAdd(customName || LOAN_TYPES.find((l) => l.type === selected)?.name || 'Loan', selected); onClose(); }}
            style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.accent.primary, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function RecordEmiModal({ visible, loan, colors, onClose, onRecord }: {
  visible: boolean; loan: Loan | null; colors: any; onClose: () => void; onRecord: (loanId: string, amount: number) => void;
}) {
  const [amount, setAmount] = useState('');
  if (!visible || !loan) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', zIndex: 100 }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={{ backgroundColor: colors.bg.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border.subtle, alignSelf: 'center', marginBottom: 16 }} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: 4 }}>Record EMI Payment</Text>
        <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 16 }}>{loan.name} — Expected EMI: {fmt(loan.monthlyEmi)}</Text>
        <TextInput style={{ borderWidth: 1, borderColor: colors.border.subtle, borderRadius: 12, padding: 14, fontSize: 18, fontWeight: '700', color: colors.text.primary, backgroundColor: colors.bg.tertiary, marginBottom: 16, textAlign: 'center' }}
          value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={String(loan.monthlyEmi)} placeholderTextColor={colors.text.tertiary} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={onClose} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.bg.tertiary, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.secondary }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { const amt = parseFloat(amount) || loan.monthlyEmi; if (amt > 0) { onRecord(loan.id, amt); setAmount(''); } }}
            style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.accent.success, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Record</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function LoanDetailScreen({ loan, colors, onBack, onRefresh }: {
  loan: Loan; colors: any; onBack: () => void; onRefresh: () => void;
}) {
  const [schedule, setSchedule] = useState<AmortizationRow[]>([]);
  const [projection, setProjection] = useState<ProjectionScenario[]>([]);
  const [payments, setPayments] = useState<EmiPayment[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [showEmiHistory, setShowEmiHistory] = useState(false);
  const [showRecordEmi, setShowRecordEmi] = useState(false);
  const [showAmort, setShowAmort] = useState(false);
  const { showToast } = useToast();

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoadingDetail(true);
      try {
        const [amortRes, projRes, emiRes] = await Promise.all([
          api.get(`/loans/${loan.id}/amortization`).catch(() => ({ data: null })),
          api.get(`/loans/${loan.id}/projection`).catch(() => ({ data: null })),
          api.get(`/loans/${loan.id}/emi-history`).catch(() => ({ data: [] })),
        ]);
        setSchedule((amortRes as any)?.data?.schedule || []);
        setProjection((projRes as any)?.data?.scenarios || []);
        setPayments((emiRes as any)?.data || []);
      } catch { /* ignore */ }
      setLoadingDetail(false);
    })();
  }, [loan.id]));

  async function recordEmi(loanId: string, amount: number) {
    try {
      await api.post(`/loans/${loanId}/emi-payments`, { amount, paidDate: new Date().toISOString().split('T')[0] });
      showToast('EMI recorded');
      setShowRecordEmi(false);
      onRefresh();
    } catch { showToast('Failed to record EMI'); }
  }

  const config = LOAN_TYPES.find((l) => l.type === loan.type) || LOAN_TYPES[4];
  const paidPct = loan.totalAmount > 0 ? Math.min((loan.paidAmount / loan.totalAmount) * 100, 100) : 0;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8 }}>
        <TouchableOpacity onPress={onBack} style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
          <AntDesign  name="left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary, flex: 1 }}>{loan.name}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: config.color + '20', alignItems: 'center', justifyContent: 'center' }}>
            <AntDesign name={config.icon as any} size={24} color={config.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>{config.name}</Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text.primary, marginTop: 2 }}>{fmt(loan.remaining)}</Text>
            <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 1 }}>Remaining balance</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          <TouchableOpacity onPress={() => setShowRecordEmi(true)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.accent.success + '15', borderRadius: 12, paddingVertical: 12 }}>
            <AntDesign  name="checkcircleo" size={18} color={colors.accent.success} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent.success }}>Pay EMI</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowEmiHistory(true)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.bg.tertiary, borderRadius: 12, paddingVertical: 12 }}>
            <AntDesign  name="clockcircleo" size={18} color={colors.text.secondary} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.secondary }}>History</Text>
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: colors.bg.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border.default, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>Progress</Text>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.bg.tertiary, overflow: 'hidden', marginBottom: 12 }}>
            <View style={{ width: `${paidPct}%`, height: '100%', backgroundColor: config.color, borderRadius: 4 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Paid: {fmt(loan.paidAmount)}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text.primary }}>{paidPct.toFixed(1)}%</Text>
          </View>
          <View style={{ height: 1, backgroundColor: colors.border.subtle, marginVertical: 12 }} />

          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: colors.text.secondary }}>Total Amount</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.primary }}>{fmt(loan.totalAmount)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: colors.text.secondary }}>Monthly EMI</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.status.error }}>{fmt(loan.monthlyEmi)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: colors.text.secondary }}>Interest Rate</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.primary }}>{loan.interestRate}%</Text>
            </View>
            {loan.tenureMonths && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: colors.text.secondary }}>Tenure</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text.primary }}>{loan.tenureMonths} months</Text>
              </View>
            )}
            {loan.nextEmiDate && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: colors.text.secondary }}>Next EMI</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.status.warning }}>{loan.nextEmiDate}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: colors.text.secondary }}>Interest Paid</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.status.warning }}>{fmt(loan.interestPaid)}</Text>
            </View>
          </View>
        </View>

        {projection.length > 0 && (
          <View style={{ backgroundColor: colors.bg.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border.default, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 12 }}>Payoff Projections</Text>
            {projection.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: i < projection.length - 1 ? 1 : 0, borderBottomColor: colors.border.subtle }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === 0 ? config.color : colors.border.subtle }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>{s.label}</Text>
                  {s.extraPerMonth > 0 && <Text style={{ fontSize: 11, color: colors.accent.success }}>+{fmt(s.extraPerMonth)}/mo extra</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}>{s.monthsToPayoff}m</Text>
                  {s.interestSaved > 0 && <Text style={{ fontSize: 11, color: colors.accent.success }}>Save {fmt(s.interestSaved)}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {schedule.length > 0 && (
          <TouchableOpacity onPress={() => setShowAmort(!showAmort)} style={{ backgroundColor: colors.bg.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border.default, padding: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>Amortization Schedule</Text>
              <AntDesign name={showAmort ? 'up' : 'down'} size={18} color={colors.text.tertiary} />
            </View>
            {showAmort && (
              <View style={{ marginTop: 12 }}>
                {schedule.filter((_, i) => i % Math.ceil(schedule.length / 12) === 0 || i === schedule.length - 1).map((row) => (
                  <View key={row.month} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
                    <Text style={{ fontSize: 12, color: colors.text.secondary, width: 40 }}>#{row.month}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text.primary, width: 80, textAlign: 'right' }}>{fmtShort(row.emi)}</Text>
                    <Text style={{ fontSize: 12, color: colors.accent.success, width: 80, textAlign: 'right' }}>{fmtShort(row.principal)}</Text>
                    <Text style={{ fontSize: 12, color: colors.status.warning, width: 80, textAlign: 'right' }}>{fmtShort(row.interest)}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text.secondary, width: 60, textAlign: 'right' }}>{fmtShort(row.balance)}</Text>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 }}>
                  <Text style={{ fontSize: 10, color: colors.text.tertiary }}>Month</Text>
                  <Text style={{ fontSize: 10, color: colors.text.tertiary, width: 80, textAlign: 'right' }}>EMI</Text>
                  <Text style={{ fontSize: 10, color: colors.text.tertiary, width: 80, textAlign: 'right' }}>Principal</Text>
                  <Text style={{ fontSize: 10, color: colors.text.tertiary, width: 80, textAlign: 'right' }}>Interest</Text>
                  <Text style={{ fontSize: 10, color: colors.text.tertiary, width: 60, textAlign: 'right' }}>Balance</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        )}

        {loadingDetail && <ActivityIndicator size="small" color={colors.accent.primary} style={{ marginVertical: 20 }} />}
      </ScrollView>

      <EmiHistoryModal visible={showEmiHistory} payments={payments} colors={colors} onClose={() => setShowEmiHistory(false)} />
      <RecordEmiModal visible={showRecordEmi} loan={loan} colors={colors} onClose={() => setShowRecordEmi(false)} onRecord={recordEmi} />
    </View>
  );
}

export function LoanTrackerScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { accessToken } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingLoan, setEditingLoan] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});

  useFocusEffect(
    useCallback(() => {
      loadLoans();
    }, [accessToken]),
  );

  async function loadLoans() {
    setLoading(true);
    try {
      if (accessToken) setAccessToken(accessToken);
      const res = await api.get('/loans');
      const body = res as any;
      setLoans(body?.data?.loans ?? body?.data ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function addLoan(name: string, type: string) {
    try {
      if (accessToken) setAccessToken(accessToken);
      await api.post('/loans', { name, type });
      showToast('Loan created');
      loadLoans();
    } catch { showToast('Failed to create loan'); }
  }

  function startEdit(loan: Loan) {
    setEditingLoan(loan.id);
    setEditValues({
      totalAmount: String(loan.totalAmount),
      paidAmount: String(loan.paidAmount),
      interestPaid: String(loan.interestPaid),
      interestRate: String(loan.interestRate),
      monthlyEmi: String(loan.monthlyEmi),
      tenureMonths: loan.tenureMonths ? String(loan.tenureMonths) : '',
      emiDay: loan.emiDay ? String(loan.emiDay) : '',
    });
  }

  async function saveEdit(id: string) {
    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(editValues)) {
      const num = parseFloat(v);
      if (!isNaN(num) && v !== '') payload[k] = num;
    }
    try {
      if (accessToken) setAccessToken(accessToken);
      await api.patch(`/loans/${id}`, payload);
      showToast('Loan updated');
      setEditingLoan(null);
      loadLoans();
    } catch { showToast('Failed to update'); }
  }

  async function removeLoan(id: string) {
    Alert.alert('Delete Loan', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setLoans((prev) => prev.filter((l) => l.id !== id));
        try {
          if (accessToken) setAccessToken(accessToken);
          await api.delete(`/loans/${id}`);
          showToast('Loan deleted');
        } catch { loadLoans(); }
      }},
    ]);
  }

  const totalRemaining = loans.reduce((s, l) => s + Math.max(0, l.totalAmount - l.paidAmount), 0);
  const totalEmi = loans.reduce((s, l) => s + l.monthlyEmi, 0);

  if (selectedLoan) {
    return <LoanDetailScreen loan={selectedLoan} colors={colors} onBack={() => setSelectedLoan(null)} onRefresh={loadLoans} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <AntDesign  name="left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Loan Tracker</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={[styles.backBtn, { backgroundColor: colors.accent.primary + '15' }]}>
          <AntDesign  name="plus" size={22} color={colors.accent.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {loans.length > 0 && (
            <View style={[styles.summaryCard, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
              <View style={styles.summaryRow}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>Loans</Text>
                  <Text style={[styles.summaryValue, { color: colors.text.primary }]}>{loans.length}</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border.subtle }]} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>Outstanding</Text>
                  <Text style={[styles.summaryValue, { color: colors.status.error }]}>{fmtShort(totalRemaining)}</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border.subtle }]} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>Total EMI/mo</Text>
                  <Text style={[styles.summaryValue, { color: colors.status.warning }]}>{fmtShort(totalEmi)}</Text>
                </View>
              </View>
            </View>
          )}

          {loans.map((loan) => {
            const config = LOAN_TYPES.find((l) => l.type === loan.type) || LOAN_TYPES[4];
            const paidPct = loan.totalAmount > 0 ? Math.min((loan.paidAmount / loan.totalAmount) * 100, 100) : 0;
            const isEditing = editingLoan === loan.id;
            return (
              <View key={loan.id} style={{ marginBottom: 12 }}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedLoan(loan)}>
                  <View style={[styles.loanCard, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
                    <View style={styles.loanCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={[styles.loanIcon, { backgroundColor: config.color + '15' }]}>
                          <AntDesign name={config.icon as any} size={18} color={config.color} />
                        </View>
                        <View>
                          <Text style={[styles.loanName, { color: colors.text.primary }]}>{loan.name}</Text>
                          <Text style={{ fontSize: 11, color: colors.text.tertiary, textTransform: 'capitalize' }}>{loan.type} · {loan.interestRate}%</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <TouchableOpacity onPress={() => startEdit(loan)} style={{ padding: 4 }}>
                          <AntDesign  name="edit" size={18} color={colors.text.tertiary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeLoan(loan.id)} style={{ padding: 4 }}>
                          <AntDesign  name="delete" size={18} color={colors.status.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={[styles.loanProgressOuter, { backgroundColor: colors.bg.tertiary }]}>
                      <View style={[styles.loanProgressFill, { width: `${Math.min(paidPct, 100)}%`, backgroundColor: config.color }]} />
                    </View>
                    <View style={styles.loanStats}>
                      <View style={styles.loanStat}>
                        <Text style={[styles.loanStatLabel, { color: colors.text.tertiary }]}>Remaining</Text>
                        <Text style={[styles.loanStatValue, { color: colors.text.primary }]}>{fmtShort(loan.remaining)}</Text>
                      </View>
                      <View style={styles.loanStat}>
                        <Text style={[styles.loanStatLabel, { color: colors.text.tertiary }]}>EMI</Text>
                        <Text style={[styles.loanStatValue, { color: colors.status.error }]}>{fmt(loan.monthlyEmi)}</Text>
                      </View>
                      <View style={styles.loanStat}>
                        <Text style={[styles.loanStatLabel, { color: colors.text.tertiary }]}>Due</Text>
                        <Text style={[styles.loanStatValue, { color: colors.status.warning, fontSize: 13 }]}>{loan.nextEmiDate || '—'}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>

                {isEditing && (
                  <View style={[styles.editPanel, { backgroundColor: colors.bg.card, borderColor: colors.border.default, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
                    {Object.entries(editValues).map(([field, val]) => (
                      <View key={field} style={styles.editRow}>
                        <Text style={[styles.editLabel, { color: colors.text.secondary }]}>{field.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</Text>
                        <TextInput style={[styles.editInput, { color: colors.text.primary, backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}
                          value={val} onChangeText={(v) => setEditValues((prev) => ({ ...prev, [field]: v }))} keyboardType="decimal-pad" placeholderTextColor={colors.text.tertiary} />
                      </View>
                    ))}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TouchableOpacity onPress={() => setEditingLoan(null)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.bg.tertiary, alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => saveEdit(loan.id)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.accent.primary, alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {loans.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
              <AntDesign  name="linechart" size={48} color={colors.text.tertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>No Loans Tracked</Text>
              <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
                Track your home, car, personal, and education loans with amortization, payoff projections, and EMI history
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <AddLoanModal visible={showAdd} colors={colors} onClose={() => setShowAdd(false)} onAdd={addLoan} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  summaryCard: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 20 },
  summaryRow: { flexDirection: 'row' },
  summaryLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '800' },
  summaryDivider: { width: 1, marginHorizontal: 12 },
  loanCard: { borderRadius: 20, borderWidth: 1, padding: 16 },
  loanCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  loanIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loanName: { fontSize: 15, fontWeight: '700' },
  loanProgressOuter: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 12 },
  loanProgressFill: { height: '100%', borderRadius: 2 },
  loanStats: { flexDirection: 'row', gap: 12 },
  loanStat: { flex: 1 },
  loanStatLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  loanStatValue: { fontSize: 15, fontWeight: '800' },
  editPanel: { borderRadius: 20, borderWidth: 1, padding: 14, marginTop: -12, paddingTop: 20 },
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  editLabel: { fontSize: 12, fontWeight: '500', flex: 1 },
  editInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 13,
    fontWeight: '600',
    width: 100,
    textAlign: 'right',
  },
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 32, lineHeight: 18 },
});
