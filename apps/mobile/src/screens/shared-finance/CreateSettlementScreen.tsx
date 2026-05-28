import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';

const METHODS = ['UPI', 'Bank Transfer', 'Cash', 'Other'] as const;

interface Member {
  id: string;
  name: string;
  avatar?: string;
}

interface SimplifiedSettlement {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

export function CreateSettlementScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();
  const { groupId } = route.params || {};

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [fromUserId, setFromUserId] = useState<string | null>(null);
  const [toUserId, setToUserId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('UPI');
  const [note, setNote] = useState('');
  const [simplified, setSimplified] = useState<SimplifiedSettlement[] | null>(null);
  const [showPickFrom, setShowPickFrom] = useState(false);
  const [showPickTo, setShowPickTo] = useState(false);

  useEffect(() => {
    if (accessToken) setAccessToken(accessToken);
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      const res = await api.get<any>(`/shared-finance/groups/${groupId}`);
      setMembers(res.data.members || res.data.participants || []);
      if (res.data.members?.length > 0) {
        setFromUserId(res.data.members[0].id);
        if (res.data.members.length > 1) setToUserId(res.data.members[1].id);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }

  async function handleOptimize() {
    setOptimizing(true);
    try {
      if (accessToken) setAccessToken(accessToken);
      const res = await api.get<any>(`/shared-finance/groups/${groupId}/settlements/simplify`);
      setSimplified(res.data || []);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to optimize settlements');
    } finally {
      setOptimizing(false);
    }
  }

  function applySimplified(s: SimplifiedSettlement) {
    setFromUserId(s.from);
    setToUserId(s.to);
    setAmount(String(s.amount));
    setSimplified(null);
  }

  async function handleCreate() {
    if (!fromUserId || !toUserId) {
      Alert.alert('Error', 'Please select both parties');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (fromUserId === toUserId) {
      Alert.alert('Error', 'Payer and receiver must be different');
      return;
    }

    setSubmitting(true);
    try {
      if (accessToken) setAccessToken(accessToken);
      await api.post(`/shared-finance/groups/${groupId}/settlements`, {
        from: fromUserId,
        to: toUserId,
        amount: parseFloat(amount),
        method,
        note: note.trim(),
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create settlement');
    } finally {
      setSubmitting(false);
    }
  }

  function MemberPicker({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
    return (
      <View style={styles.pickerGrid}>
        {members.map(m => {
          const isSelected = selected === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              style={[styles.pickerChip, { backgroundColor: isSelected ? colors.accent.primary + '20' : colors.bg.card, borderColor: isSelected ? colors.accent.primary : colors.border.subtle }]}
              onPress={() => onSelect(m.id)}
            >
              <View style={[styles.avatarSmall, { backgroundColor: colors.accent.primary + '30' }]}>
                <Text style={[styles.avatarTextSmall, { color: colors.accent.primary }]}>{(m.name || '?')[0].toUpperCase()}</Text>
              </View>
              <Text style={[styles.pickerName, { color: isSelected ? colors.accent.primary : colors.text.secondary }]}>{m.name}</Text>
              {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.accent.primary} />}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  if (loading) return (
    <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
      <ActivityIndicator color={colors.accent.primary} size="large" />
    </View>
  );

  const fromMember = members.find(m => m.id === fromUserId);
  const toMember = members.find(m => m.id === toUserId);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
          <Ionicons name="close" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>New Settlement</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Who pays?</Text>
        <MemberPicker selected={fromUserId} onSelect={setFromUserId} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Who gets paid?</Text>
        <MemberPicker selected={toUserId} onSelect={setToUserId} />
      </View>

      <View style={[styles.amountCard, { backgroundColor: colors.bg.tertiary }]}>
        <Text style={[styles.currencySymbol, { color: colors.text.secondary }]}>₹</Text>
        <TextInput
          style={[styles.amountInput, { color: colors.text.primary }]}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.text.tertiary}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Settlement Method</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.methodsRow}>
          {METHODS.map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.methodChip, { backgroundColor: method === m ? colors.accent.primary + '20' : colors.bg.card, borderColor: method === m ? colors.accent.primary : colors.border.subtle }]}
              onPress={() => setMethod(m)}
            >
              <Text style={[styles.methodText, { color: method === m ? colors.accent.primary : colors.text.secondary }]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Note (optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
          value={note}
          onChangeText={setNote}
          placeholder="Add a note..."
          placeholderTextColor={colors.text.tertiary}
        />
      </View>

      <TouchableOpacity
        style={[styles.optimizeBtn, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}
        onPress={handleOptimize}
        disabled={optimizing}
      >
        {optimizing ? (
          <ActivityIndicator color={colors.accent.primary} size="small" />
        ) : (
          <>
            <Ionicons name="flash-outline" size={18} color={colors.accent.primary} />
            <Text style={[styles.optimizeText, { color: colors.accent.primary }]}>Optimize Settlements</Text>
          </>
        )}
      </TouchableOpacity>

      {simplified && simplified.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Suggested Optimized Settlements</Text>
          {simplified.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.simplifiedCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
              onPress={() => applySimplified(s)}
            >
              <View style={styles.simplifiedTop}>
                <View style={styles.simplifiedUsers}>
                  <Text style={[styles.simplifiedName, { color: colors.status.error }]}>{s.fromName}</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.text.tertiary} />
                  <Text style={[styles.simplifiedName, { color: colors.status.success }]}>{s.toName}</Text>
                </View>
                <Ionicons name="add-circle-outline" size={20} color={colors.accent.primary} />
              </View>
              <Text style={[styles.simplifiedAmount, { color: colors.text.primary }]}>₹{Number(s.amount).toLocaleString('en-IN')}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.accent.primary, opacity: submitting ? 0.6 : 1 }]}
        onPress={handleCreate}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.createBtnInner}>
            <Ionicons name="swap-horizontal" size={20} color="#fff" />
            <Text style={styles.createBtnText}>Create Settlement</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12, marginBottom: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, gap: 8 },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarTextSmall: { fontSize: 11, fontWeight: '700' },
  pickerName: { fontSize: 13, fontWeight: '500' },
  amountCard: { marginHorizontal: 20, marginBottom: 20, paddingVertical: 24, paddingHorizontal: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  currencySymbol: { fontSize: 32, fontWeight: '700', marginTop: -4 },
  amountInput: { fontSize: 40, fontWeight: '700', textAlign: 'center', minWidth: 120, letterSpacing: -1 },
  methodsRow: { gap: 8, flexDirection: 'row' },
  methodChip: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1 },
  methodText: { fontSize: 14, fontWeight: '600' },
  input: { padding: 16, borderRadius: 14, fontSize: 15, borderWidth: 1, fontWeight: '500' },
  optimizeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, paddingVertical: 14, borderRadius: 14, borderWidth: 1, gap: 8, marginBottom: 16 },
  optimizeText: { fontSize: 14, fontWeight: '600' },
  simplifiedCard: { padding: 16, borderRadius: 14, marginBottom: 8, borderWidth: 1 },
  simplifiedTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  simplifiedUsers: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  simplifiedName: { fontSize: 13, fontWeight: '600' },
  simplifiedAmount: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  createBtn: { marginHorizontal: 20, paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  createBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  createBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
