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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';

const CATEGORY_COLORS: Record<string, string[]> = {
  Food: ['#FF6B35', '#F7931E'],
  Travel: ['#4A90D9', '#357ABD'],
  Shopping: ['#E056A0', '#C94D8B'],
  Medical: ['#00B894', '#00A381'],
  Fuel: ['#FDCB6E', '#F0A830'],
  Rent: ['#6C5CE7', '#5A4BD1'],
  EMI: ['#E17055', '#D63031'],
  Bills: ['#0984E3', '#0768B8'],
  Entertainment: ['#A29BFE', '#817CE8'],
  Education: ['#55EFC4', '#00CEC9'],
  Grocery: ['#81ECEC', '#00CEC9'],
  Investment: ['#74B9FF', '#4D96FF'],
  Salary: ['#00B894', '#00A381'],
  Transfer: ['#DFE6E9', '#B2BEC3'],
};

export function TransactionDetailScreen() {
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const { transactionId } = route.params || {};
  const [txn, setTxn] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

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
    } catch (e) {
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
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }
  if (!txn) {
    return (
      <View style={[s.loading, { backgroundColor: colors.bg.primary }]}>
        <Text style={{ color: colors.status.error, fontSize: 16 }}>Transaction not found</Text>
      </View>
    );
  }

  const isCredit = txn.type === 'income';
  const sign = isCredit ? '+' : '-';
  const fmt = (val: number) => '₹' + val.toLocaleString('en-IN');
  const cat = txn.category?.name || txn.category || 'Other';
  const catColors = CATEGORY_COLORS[cat] || ['#F7892C', '#F9A44A'];

  return (
    <View style={[s.container, { backgroundColor: colors.bg.primary }]}>
      <LinearGradient
        colors={['#1A1A3E', '#12121A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.hero, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <View style={s.backBtnInner}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </View>
        </TouchableOpacity>
        <LinearGradient
          colors={catColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroIcon}
        >
          <Ionicons name={getIcon(cat)} size={32} color="#FFF" />
        </LinearGradient>
        <Text style={s.heroLabel}>{isCredit ? 'Income' : 'Expense'}</Text>
        <Text style={s.heroAmount}>
          {sign}
          {fmt(Number(txn.amount))}
        </Text>
        {txn.description && <Text style={s.heroDesc}>{txn.description}</Text>}
        <View style={s.heroBadge}>
          <View
            style={[s.badgeDot, { backgroundColor: txn.isReconciled ? '#00B894' : '#FDCB6E' }]}
          />
          <Text style={s.badgeText}>{txn.isReconciled ? 'Reconciled' : 'Pending'}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={s.body}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.section, { backgroundColor: colors.bg.secondary }]}>
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
            icon="card-outline"
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
            icon="calendar-outline"
            color={colors.text.secondary}
          />
          <Row
            colors={colors}
            label="Type"
            value={txn.type}
            icon="swap-horizontal-outline"
            color={isCredit ? '#00B894' : '#FF6B6B'}
          />
          {txn.reference && (
            <Row
              colors={colors}
              label="Reference"
              value={txn.reference}
              icon="receipt-outline"
              color={colors.text.secondary}
            />
          )}
          {txn.notes && (
            <View style={[s.row, { borderBottomWidth: 0 }]}>
              <View style={s.rowLeft}>
                <Ionicons name="document-text-outline" size={18} color={colors.text.tertiary} />
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
            style={[s.actionBtn, { backgroundColor: colors.bg.secondary }]}
            onPress={() => navigation.push('CreateTransaction', { transaction: txn })}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[`${colors.accent.primary}20`, `${colors.accent.primary}08`]}
              style={s.actionIcon}
            >
              <Ionicons name="create-outline" size={20} color={colors.accent.primary} />
            </LinearGradient>
            <Text style={[s.actionLabel, { color: colors.text.primary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.bg.secondary }]}
            onPress={() =>
              navigation.navigate('CreateTransaction', {
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
            <LinearGradient colors={[`#6C5CE720`, `#6C5CE708`]} style={s.actionIcon}>
              <Ionicons name="copy-outline" size={20} color="#6C5CE7" />
            </LinearGradient>
            <Text style={[s.actionLabel, { color: colors.text.primary }]}>Duplicate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.bg.secondary }]}
            onPress={handleDelete}
            disabled={deleting}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[`${colors.status.error}20`, `${colors.status.error}08`]}
              style={s.actionIcon}
            >
              {deleting ? (
                <ActivityIndicator color={colors.status.error} />
              ) : (
                <Ionicons name="trash-outline" size={20} color={colors.status.error} />
              )}
            </LinearGradient>
            <Text style={[s.actionLabel, { color: colors.status.error }]}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function getIcon(cat: string): any {
  const map: Record<string, string> = {
    Food: 'fast-food',
    Travel: 'airplane',
    Shopping: 'cart',
    Medical: 'medkit',
    Fuel: 'flame',
    Rent: 'home',
    EMI: 'card',
    Bills: 'receipt',
    Entertainment: 'tv',
    Education: 'school',
    Grocery: 'basket',
    Investment: 'trending-up',
    Salary: 'cash',
    Transfer: 'swap-horizontal',
  };
  return map[cat] || 'ellipse';
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
        <Ionicons name={icon as any} size={18} color={color} />
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
  backBtn: { alignSelf: 'flex-start', marginLeft: 12, marginBottom: 16 },
  backBtnInner: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -1,
    marginBottom: 4,
  },
  heroDesc: { fontSize: 16, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 12 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  body: { flex: 1, paddingHorizontal: 16, marginTop: 20 },
  section: { borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
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
  actionBtn: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 20, gap: 8 },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 13, fontWeight: '600' },
});
