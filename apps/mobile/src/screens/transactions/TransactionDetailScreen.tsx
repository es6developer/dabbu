import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { DetailSkeleton } from '../../components/ui/AnimatedSkeleton';
import { AntDesign } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import { useTheme } from '../../theme';
import { getCategoryIcon } from '../../config/categoryIcons';

function getDetailColors(primary: string): Record<string, [string, string]> {
  return {
    Food: [primary, primary],
    Travel: ['#4A90D9', '#357ABD'],
    Shopping: ['#E056A0', '#C94D8B'],
    Medical: ['#00B894', '#00A381'],
    Fuel: ['#F59E0B', '#14B8A6'],
    Rent: ['#14B8A6', '#E8C47A'],
    EMI: ['#E17055', '#D63031'],
    Bills: ['#0984E3', '#0768B8'],
    Entertainment: ['#14B8A6', '#E8C47A'],
    Education: ['#55EFC4', '#00CEC9'],
    Grocery: ['#81ECEC', '#00CEC9'],
    Investment: ['#74B9FF', '#4D96FF'],
    Salary: ['#00B894', '#00A381'],
    Transfer: ['#DFE6E9', '#B2BEC3'],
  };
}

function getIcon(cat: string): string {
  return getCategoryIcon(cat, 'ellipse');
}

function getCatColors(cat: string, primary: string): [string, string] {
  return getDetailColors(primary)[cat] || [primary, primary];
}

export function TransactionDetailScreen() {
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const { transactionId } = route.params || {};
  const [txn, setTxn] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadTransaction();
  }, [transactionId]);

  async function loadTransaction() {
    try {
      const res = await api.get<any>(`/transactions/${transactionId}`);
      setTxn(res);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    Alert.alert('Delete Transaction', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            if (accessToken) {
              setAccessToken(accessToken);
            }
            await api.delete(`/transactions/${transactionId}`);
            showToast('Transaction deleted');
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={[s.loading, { backgroundColor: colors.bg.primary }]}>
        <DetailSkeleton />
      </View>
    );
  }
  if (!txn) {
    return (
      <View style={[s.loading, { backgroundColor: colors.bg.primary }]}>
        <Text style={{ color: '#FF4D4F', fontSize: 16 }}>Transaction not found</Text>
      </View>
    );
  }

  const isCredit = txn.type === 'income';
  const sign = isCredit ? '+' : '-';
  const fmtVal = (val: number) => '₹' + val.toLocaleString('en-IN');
  const cat = txn.category?.name || txn.category || 'Other';
  const catColors = getCatColors(cat, colors.accent.primary);

  return (
    <View style={[s.container, { backgroundColor: colors.bg.primary }]}>
      <View style={[s.hero, { paddingTop: insets.top + 8, backgroundColor: colors.bg.card }]}>
        <View style={s.heroTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[s.backBtn, { backgroundColor: colors.bg.tertiary }]}
          >
            <AntDesign  name="left" size={22} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={[s.heroIcon, { backgroundColor: catColors[0] }]}>
          <AntDesign name={getIcon(cat) as any} size={32} color="#FFF" />
        </View>
        <Text style={[s.heroLabel, { color: colors.text.secondary }]}>
          {isCredit ? 'Income' : 'Expense'}
        </Text>
        <Text style={[s.heroAmount, { color: colors.text.primary }]}>
          {sign}
          {fmtVal(Number(txn.amount))}
        </Text>
        {txn.description && (
          <Text style={[s.heroDesc, { color: colors.text.secondary }]}>{txn.description}</Text>
        )}
        <View style={[s.heroBadge, { backgroundColor: colors.bg.tertiary }]}>
          <View
            style={[s.badgeDot, { backgroundColor: txn.isReconciled ? '#34C759' : '#F59E0B' }]}
          />
          <Text style={[s.badgeText, { color: colors.text.secondary }]}>
            {txn.isReconciled ? 'Reconciled' : 'Pending'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={s.body}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.section, { backgroundColor: colors.bg.card }]}>
          <Row
            colors={colors}
            label="Category"
            value={cat}
            icon={getIcon(cat)}
            color={catColors[0]}
          />
          <Row
            colors={colors}
            label="Payment"
            value={txn.paymentMethod || txn.metadata?.paymentType || '-'}
            icon="creditcard"
            color={colors.text.secondary}
          />
          <Row
            colors={colors}
            label="Date"
            value={new Date(txn.date || txn.createdAt).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            icon="calendar"
            color={colors.text.secondary}
          />
          <Row
            colors={colors}
            label="Type"
            value={txn.type}
            icon="swap"
            color={isCredit ? '#34C759' : '#FF4D4F'}
          />
          {txn.reference && (
            <Row
              colors={colors}
              label="Reference"
              value={txn.reference}
              icon="filetext1"
              color={colors.text.secondary}
            />
          )}
          {txn.notes && (
            <View
              style={[s.row, { borderBottomWidth: 0, borderBottomColor: colors.border.subtle }]}
            >
              <View style={s.rowLeft}>
                <AntDesign  name="filetext1" size={18} color={colors.text.tertiary} />
                <Text style={[s.rowLabel, { color: colors.text.secondary }]}>Notes</Text>
              </View>
              <Text
                style={[s.rowValue, { color: colors.text.primary, flex: 1, textAlign: 'right' }]}
              >
                {txn.notes}
              </Text>
            </View>
          )}
        </View>

        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.bg.card }]}
            onPress={() => navigation.push('AddExpense', { transaction: txn })}
            activeOpacity={0.7}
          >
            <View style={[s.actionIcon, { backgroundColor: `${colors.accent.primary}15` }]}>
              <AntDesign  name="edit" size={20} color={colors.accent.primary} />
            </View>
            <Text style={[s.actionLabel, { color: colors.text.primary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.bg.card }]}
            onPress={() =>
              navigation.navigate('AddExpense', {
                prefill: {
                  amount: Number(txn.amount),
                  description: txn.description,
                  categoryName: cat,
                  date: new Date(txn.date || txn.createdAt).toISOString().split('T')[0],
                  groupId: txn.expenseGroupId,
                },
              })
            }
            activeOpacity={0.7}
          >
            <View style={[s.actionIcon, { backgroundColor: `${colors.accent.primary}15` }]}>
              <AntDesign  name="copy1" size={20} color={colors.accent.primary} />
            </View>
            <Text style={[s.actionLabel, { color: colors.text.primary }]}>Duplicate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.bg.card }]}
            onPress={handleDelete}
            disabled={deleting}
            activeOpacity={0.7}
          >
            <View style={[s.actionIcon, { backgroundColor: '#FF4D4F15' }]}>
              {deleting ? (
                <ActivityIndicator color="#FF4D4F" />
              ) : (
                <AntDesign  name="delete" size={20} color="#FF4D4F" />
              )}
            </View>
            <Text style={[s.actionLabel, { color: '#FF4D4F' }]}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({
  colors,
  label,
  value,
  icon,
  color,
}: {
  colors: any;
  label: string;
  value: string;
  icon: string;
  color: string;
}) {
  return (
    <View style={[s.row, { borderBottomColor: colors.border.subtle }]}>
      <View style={s.rowLeft}>
        <AntDesign name={icon as any} size={18} color={color} />
        <Text style={[s.rowLabel, { color: colors.text.secondary }]}>{label}</Text>
      </View>
      <Text style={[s.rowValue, { color }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: {
    paddingBottom: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroTopRow: { width: '100%', marginBottom: 16 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 4,
  },
  heroDesc: { fontSize: 16, fontWeight: '500', marginBottom: 12 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  body: { flex: 1, paddingHorizontal: 16, marginTop: 20 },
  section: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '500' },
  rowValue: { fontSize: 14, fontWeight: '600', textAlign: 'right' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 13, fontWeight: '600' },
});
