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
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme, typography as typographyStyles } from '../../theme';

export function TransactionDetailScreen() {
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors, typography } = useTheme();
  const { transactionId } = route.params || {};
  const [txn, setTxn] = useState<any>(null);
  const amountGradient = txn?.type === 'income'
    ? [...colors.accent.gradient]
    : [colors.bg.secondary, colors.bg.tertiary];
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
      setTxn(res?.data ?? res);
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    Alert.alert('Delete Transaction', 'Are you sure?', [
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

  async function handleMarkSettled() {
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      await api.patch(`/transactions/${transactionId}`, {
        metadata: { ...(txn.metadata || {}), settlementStatus: 'settled' },
      });
      setTxn((prev: any) => ({ ...prev, metadata: { ...(prev.metadata || {}), settlementStatus: 'settled' } }));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to mark settled');
    }
  }

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }
  if (!txn) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <Text style={{ color: colors.status.error, fontSize: 16 }}>Transaction not found</Text>
      </View>
    );
  }

  const isCredit = txn.type === 'income';
  const sign = isCredit ? '+' : '-';
  const formatCurrency = (val: number) => '₹' + val.toLocaleString('en-IN');

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary, paddingTop: insets.top + 16 }]} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.bg.tertiary }]}>
        <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
      </TouchableOpacity>

      <LinearGradient colors={amountGradient} style={styles.amountCard}>
        <Text style={[styles.amoountLabel, { color: colors.text.tertiary }]}>{txn.type} </Text>
        <Text style={styles.amount}>
          {sign}
          {formatCurrency(Number(txn.amount))}
        </Text>
        {txn.description && (
          <Text style={styles.amountDesc}>
            {txn.description}
          </Text>
        )}
      </LinearGradient>

      <View style={styles.section}>
        <DetailRow
          colors={colors}
          label="Category"
          value={txn.category?.name || txn.category || '-'}
        />
        <DetailRow
          colors={colors}
          label="Payment"
          value={txn.paymentMethod || txn.metadata?.paymentType || '-'}
        />
        <DetailRow
          colors={colors}
          label="Date"
          value={new Date(txn.date || txn.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        />
        {txn.tags?.length > 0 && (
          <View style={[styles.detailRow, { borderBottomColor: colors.border.subtle }]}>
            <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Tags</Text>
            <View style={styles.tagsRow}>
              {txn.tags.map((tag: string, i: number) => (
                <View key={i} style={[styles.tag, { backgroundColor: colors.bg.card }]}>
                  <Text style={[styles.tagText, { color: colors.text.tertiary }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        <DetailRow
          colors={colors}
          label="Status"
          value={txn.isReconciled ? 'Reconciled' : 'Pending'}
          valueColor={txn.isReconciled ? colors.status.success : colors.status.warning}
        />
        <DetailRow colors={colors} label="Type" value={txn.type} />
        <DetailRow colors={colors} label="Split" value={txn.metadata?.splitMethod || 'equal'} />
        <DetailRow colors={colors} label="Settlement" value={txn.metadata?.settlementStatus || 'pending'} />
        {txn.reference && <DetailRow colors={colors} label="Reference" value={txn.reference} />}
        {txn.notes && (
          <View style={[styles.detailRow, { borderBottomColor: colors.border.subtle }]}>
            <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Notes</Text>
            <Text style={[styles.detailValue, { color: colors.text.primary, flex: 1.5 }]}>
              {txn.notes}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.bg.tertiary }]}
          onPress={() => navigation.navigate('CreateTransaction', { transaction: txn })}
        >
          <Ionicons name="create-outline" size={18} color={colors.text.primary} />
          <Text style={[styles.actionBtnText, { color: colors.text.primary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.bg.tertiary }]}
          onPress={() => navigation.navigate('CreateTransaction', { prefill: {
            amount: Number(txn.amount),
            description: txn.description,
            categoryName: txn.category?.name,
            date: new Date(txn.date || txn.createdAt).toISOString().split('T')[0],
            tags: txn.tags || [],
            groupId: txn.expenseGroupId,
          } })}
        >
          <Ionicons name="copy-outline" size={18} color={colors.text.primary} />
          <Text style={[styles.actionBtnText, { color: colors.text.primary }]}>Duplicate</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.status.successLight || `${colors.status.success}22` }]}
          onPress={handleMarkSettled}
        >
          <Ionicons name="checkmark-done-outline" size={18} color={colors.status.success} />
          <Text style={[styles.actionBtnText, { color: colors.status.success }]}>Mark Settled</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.status.errorLight }]}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color={colors.status.error} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color={colors.status.error} />
              <Text style={[styles.actionBtnText, { color: colors.status.error }]}>Delete</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function DetailRow({
  colors,
  label,
  value,
  valueColor,
}: {
  colors: any;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border.subtle }]}>
      <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: valueColor || colors.text.primary }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 30 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', margin: 16, marginBottom: 0 },
  amountCard: { margin: 16, padding: 32, borderRadius: 24, alignItems: 'center' },
  amoountLabel: {
    ...typographyStyles.footnote,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  amount: { ...typographyStyles.amount, marginBottom: 8, color: '#FFF' },
  amountDesc: { ...typographyStyles.body, textAlign: 'center', fontFamily: 'Inter-SemiBold', color: 'rgba(255,255,255,0.75)' },
  section: { paddingHorizontal: 16 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: { ...typographyStyles.subhead, flex: 1 },
  detailValue: {
    ...typographyStyles.body,
    fontFamily: 'Inter-Medium',
    flex: 1,
    textAlign: 'right',
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end', flex: 1 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { ...typographyStyles.caption1 },
  actions: { flexDirection: 'row', padding: 16, gap: 12, marginBottom: 40 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: { ...typographyStyles.body, fontFamily: 'Inter-SemiBold' },
});
