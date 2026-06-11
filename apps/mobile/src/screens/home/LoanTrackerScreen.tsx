import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';

interface Loan {
  id: string;
  name: string;
  totalAmount: number;
  paidAmount: number;
  interestPaid: number;
  monthlyEmi: number;
}

function fmt(v: number) {
  return '\u20B9' + (v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const LOAN_TEMPLATES = [
  { name: 'Home Loan', icon: 'home' },
  { name: 'Car Loan', icon: 'car' },
  { name: 'Personal Loan', icon: 'person' },
  { name: 'Education Loan', icon: 'school' },
];

function LoanCard({
  loan,
  index,
  colors,
  onUpdate,
}: {
  loan: Loan;
  index: number;
  colors: any;
  onUpdate: (i: number, field: keyof Loan, value: string) => void;
}) {
  const remaining = Math.max(0, loan.totalAmount - loan.paidAmount);
  const paidPct = loan.totalAmount > 0 ? (loan.paidAmount / loan.totalAmount) * 100 : 0;
  const totalPaid = loan.paidAmount + loan.interestPaid;

  return (
    <View
      style={[
        styles.loanCard,
        { backgroundColor: colors.bg.card, borderColor: colors.border.default },
      ]}
    >
      <View style={styles.loanCardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.loanIcon, { backgroundColor: `${colors.status.error}12` }]}>
            <Ionicons name="trending-down" size={18} color={colors.status.error} />
          </View>
          <Text style={[styles.loanName, { color: colors.text.primary }]}>{loan.name}</Text>
        </View>
      </View>

      <View style={[styles.loanProgressOuter, { backgroundColor: colors.bg.tertiary }]}>
        <View
          style={[
            styles.loanProgressFill,
            { width: `${Math.min(paidPct, 100)}%`, backgroundColor: colors.accent.primary },
          ]}
        />
      </View>

      <View style={styles.loanStats}>
        <View style={styles.loanStat}>
          <Text style={[styles.loanStatLabel, { color: colors.text.tertiary }]}>Remaining</Text>
          <Text style={[styles.loanStatValue, { color: colors.text.primary }]}>
            {fmt(remaining)}
          </Text>
        </View>
        <View style={styles.loanStat}>
          <Text style={[styles.loanStatLabel, { color: colors.text.tertiary }]}>Monthly EMI</Text>
          <Text style={[styles.loanStatValue, { color: colors.status.error }]}>
            {fmt(loan.monthlyEmi)}
          </Text>
        </View>
      </View>

      <View style={[styles.loanDetailRow, { borderColor: colors.border.subtle }]}>
        <Text style={[styles.loanDetailLabel, { color: colors.text.tertiary }]}>
          Principal Paid
        </Text>
        <Text style={[styles.loanDetailValue, { color: colors.text.primary }]}>
          {fmt(loan.paidAmount)}
        </Text>
      </View>
      <View style={[styles.loanDetailRow, { borderColor: colors.border.subtle }]}>
        <Text style={[styles.loanDetailLabel, { color: colors.text.tertiary }]}>Interest Paid</Text>
        <Text style={[styles.loanDetailValue, { color: colors.status.warning }]}>
          {fmt(loan.interestPaid)}
        </Text>
      </View>
      <View style={[styles.loanDetailRow, { borderColor: colors.border.subtle }]}>
        <Text style={[styles.loanDetailLabel, { color: colors.text.tertiary }]}>Total Paid</Text>
        <Text style={[styles.loanDetailValue, { color: colors.text.primary }]}>
          {fmt(totalPaid)}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
      <Text style={[styles.editSectionTitle, { color: colors.text.tertiary }]}>Edit Details</Text>
      <View style={{ gap: 8, marginTop: 8 }}>
        <View style={styles.editRow}>
          <Text style={[styles.editLabel, { color: colors.text.secondary }]}>Total Amount</Text>
          <TextInput
            style={[
              styles.editInput,
              {
                color: colors.text.primary,
                backgroundColor: colors.bg.tertiary,
                borderColor: colors.border.subtle,
              },
            ]}
            value={loan.totalAmount > 0 ? String(loan.totalAmount) : ''}
            onChangeText={(v) => onUpdate(index, 'totalAmount', v)}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
        <View style={styles.editRow}>
          <Text style={[styles.editLabel, { color: colors.text.secondary }]}>Principal Paid</Text>
          <TextInput
            style={[
              styles.editInput,
              {
                color: colors.text.primary,
                backgroundColor: colors.bg.tertiary,
                borderColor: colors.border.subtle,
              },
            ]}
            value={loan.paidAmount > 0 ? String(loan.paidAmount) : ''}
            onChangeText={(v) => onUpdate(index, 'paidAmount', v)}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
        <View style={styles.editRow}>
          <Text style={[styles.editLabel, { color: colors.text.secondary }]}>Interest Paid</Text>
          <TextInput
            style={[
              styles.editInput,
              {
                color: colors.text.primary,
                backgroundColor: colors.bg.tertiary,
                borderColor: colors.border.subtle,
              },
            ]}
            value={loan.interestPaid > 0 ? String(loan.interestPaid) : ''}
            onChangeText={(v) => onUpdate(index, 'interestPaid', v)}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
        <View style={styles.editRow}>
          <Text style={[styles.editLabel, { color: colors.text.secondary }]}>Monthly EMI</Text>
          <TextInput
            style={[
              styles.editInput,
              {
                color: colors.text.primary,
                backgroundColor: colors.bg.tertiary,
                borderColor: colors.border.subtle,
              },
            ]}
            value={loan.monthlyEmi > 0 ? String(loan.monthlyEmi) : ''}
            onChangeText={(v) => onUpdate(index, 'monthlyEmi', v)}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
      </View>
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
  const [savingId, setSavingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        try {
          if (accessToken) {
            setAccessToken(accessToken);
          }
          const res = await api.get('/loans');
          const body = res as any;
          setLoans(body?.data?.loans ?? body?.data ?? []);
        } catch {
          /* ignore */
        } finally {
          setLoading(false);
        }
      })();
    }, [accessToken]),
  );

  async function addLoan(name: string) {
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const res = await api.post('/loans', {
        name,
        totalAmount: 0,
        paidAmount: 0,
        interestPaid: 0,
        monthlyEmi: 0,
      });
      const body = res as any;
      const created = body?.data ?? body;
      setLoans((prev) => [...prev, created]);
    } catch {
      /* ignore */
    }
  }

  async function updateLoan(index: number, field: keyof Loan, value: string) {
    const num = parseFloat(value) || 0;
    const updated = [...loans];
    const loan = { ...updated[index], [field]: num };
    updated[index] = loan;
    setLoans(updated);
    setSavingId(loan.id);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.patch(`/loans/${loan.id}`, { [field]: num });
    } catch {
      /* ignore */
    } finally {
      setSavingId(null);
    }
  }

  async function removeLoan(index: number) {
    const loan = loans[index];
    setLoans((prev) => prev.filter((_, i) => i !== index));
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.delete(`/loans/${loan.id}`);
    } catch {
      /* ignore */
    }
  }

  const totalRemaining = loans.reduce((s, l) => s + Math.max(0, l.totalAmount - l.paidAmount), 0);
  const totalEmi = loans.reduce((s, l) => s + l.monthlyEmi, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Loan Tracker</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {loans.length > 0 && (
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default },
              ]}
            >
              <View style={styles.summaryRow}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>
                    Total Loans
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
                    {loans.length}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border.subtle }]} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>
                    Remaining
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.status.error }]}>
                    {fmt(totalRemaining)}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border.subtle }]} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>
                    Total EMI/mo
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.status.warning }]}>
                    {fmt(totalEmi)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {loans.map((loan, i) => (
            <View key={loan.id}>
              <TouchableOpacity
                onPress={() => removeLoan(i)}
                style={{ alignSelf: 'flex-end', marginBottom: 4 }}
              >
                <Text style={{ fontSize: 12, color: colors.status.error, fontWeight: '600' }}>
                  Remove
                </Text>
              </TouchableOpacity>
              <LoanCard loan={loan} index={i} colors={colors} onUpdate={updateLoan} />
            </View>
          ))}

          {loans.length === 0 && (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.default },
              ]}
            >
              <Ionicons name="trending-down-outline" size={48} color={colors.text.tertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>
                No Loans Tracked
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
                Add loans to track your principal, interest, and EMIs
              </Text>
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: colors.text.primary, marginTop: 24 }]}>
            Add a Loan
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {LOAN_TEMPLATES.map((t) => (
              <TouchableOpacity
                key={t.name}
                style={[
                  styles.templateChip,
                  { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
                ]}
                activeOpacity={0.7}
                onPress={() => addLoan(t.name)}
              >
                <Ionicons name={t.icon as any} size={16} color={colors.accent.primary} />
                <Text style={[styles.templateChipText, { color: colors.text.primary }]}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
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
  loanCard: { borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 12 },
  loanCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  loanIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loanName: { fontSize: 16, fontWeight: '700' },
  loanProgressOuter: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 14 },
  loanProgressFill: { height: '100%', borderRadius: 2 },
  loanStats: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  loanStat: { flex: 1 },
  loanStatLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  loanStatValue: { fontSize: 16, fontWeight: '800' },
  loanDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  loanDetailLabel: { fontSize: 13, fontWeight: '500' },
  loanDetailValue: { fontSize: 14, fontWeight: '700' },
  divider: { height: 1, marginVertical: 14 },
  editSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
  editInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '600',
    width: 110,
    textAlign: 'right',
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  templateChipText: { fontSize: 13, fontWeight: '600' },
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
