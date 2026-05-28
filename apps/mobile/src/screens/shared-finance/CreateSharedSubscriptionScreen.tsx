import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { Card } from '../../components/ui/Card';

const BILLING_CYCLES = ['Monthly', 'Yearly', 'Quarterly'] as const;
const REMINDER_OPTIONS = [1, 3, 7, 14, 30] as const;

type BillingCycle = (typeof BILLING_CYCLES)[number];

export function CreateSharedSubscriptionScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const { groupId } = route.params || {};

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('Monthly');
  const [nextBillingDate, setNextBillingDate] = useState('');
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [reminderDays, setReminderDays] = useState(7);
  const [members, setMembers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadMembers();
  }, [accessToken, groupId]);

  async function loadMembers() {
    try {
      const res = await api.get<any>(`/shared-finance/groups/${groupId}/members`);
      const memberList = Array.isArray(res.data) ? res.data : [];
      setMembers(memberList.map((m: any) => ({ ...m, share: '', shareType: 'equal' as const })));
      if (memberList.length > 0) {
        setPaidBy(memberList[0].id);
      }
    } catch (e) {
      console.error('Failed to load members:', e);
    } finally {
      setLoadingMembers(false);
    }
  }

  function handleShareChange(memberId: string, value: string) {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, share: value } : m)));
  }

  function autoCalculateShares() {
    const active = members.filter((m) => m.id !== paidBy);
    const equalShare = active.length > 0 ? (100 / active.length).toFixed(1) : '0';
    setMembers((prev) =>
      prev.map((m) =>
        m.id === paidBy
          ? { ...m, share: '0', shareType: 'fixed' as const }
          : { ...m, share: equalShare, shareType: 'equal' as const },
      ),
    );
  }

  async function handleSave() {
    if (!name.trim() || !amount.trim()) {
      return;
    }
    setSaving(true);
    try {
      await api.post(`/shared-finance/groups/${groupId}/subscriptions`, {
        name: name.trim(),
        amount: Number(amount),
        billingCycle: billingCycle.toLowerCase(),
        nextBillingDate: nextBillingDate || null,
        paidById: paidBy,
        category: category || null,
        reminderDays,
        shares: members.map((m) => ({ memberId: m.id, share: Number(m.share) || 0 })),
      });
      navigation.goBack();
    } catch (e) {
      console.error('Failed to create subscription:', e);
    } finally {
      setSaving(false);
    }
  }

  const categories = [
    'Entertainment',
    'Productivity',
    'Utilities',
    'Cloud',
    'Music',
    'Video',
    'Other',
  ];
  const formatCurrency = (val: number) => '₹' + val.toLocaleString('en-IN');

  if (loadingMembers) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Card variant="glass" style={styles.sectionCard} padding="xl">
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Service Details</Text>

          <Text style={[styles.label, { color: colors.text.secondary }]}>Service Name</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.bg.tertiary,
                color: colors.text.primary,
                borderColor: colors.border.subtle,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Netflix, Spotify"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={[styles.label, { color: colors.text.secondary }]}>Amount</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.bg.tertiary,
                color: colors.text.primary,
                borderColor: colors.border.subtle,
              },
            ]}
            value={amount}
            onChangeText={setAmount}
            placeholder="199"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="decimal-pad"
          />

          <Text style={[styles.label, { color: colors.text.secondary }]}>Billing Cycle</Text>
          <View style={styles.cycleRow}>
            {BILLING_CYCLES.map((cycle) => (
              <TouchableOpacity
                key={cycle}
                style={[
                  styles.cycleBtn,
                  { borderColor: colors.border.subtle },
                  billingCycle === cycle && {
                    backgroundColor: colors.accent.primary + '20',
                    borderColor: colors.accent.primary,
                  },
                ]}
                onPress={() => setBillingCycle(cycle)}
              >
                <Text
                  style={[
                    styles.cycleBtnText,
                    { color: colors.text.secondary },
                    billingCycle === cycle && { color: colors.accent.primary, fontWeight: '700' },
                  ]}
                >
                  {cycle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text.secondary }]}>Next Billing Date</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.bg.tertiary,
                color: colors.text.primary,
                borderColor: colors.border.subtle,
              },
            ]}
            value={nextBillingDate}
            onChangeText={setNextBillingDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.text.tertiary}
          />
        </Card>

        <Card variant="glass" style={styles.sectionCard} padding="xl">
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Assign Members</Text>

          <Text style={[styles.label, { color: colors.text.secondary }]}>Paid By</Text>
          <View style={styles.paidByRow}>
            {members.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.paidByBtn,
                  { borderColor: colors.border.subtle },
                  paidBy === m.id && {
                    backgroundColor: colors.accent.primary + '20',
                    borderColor: colors.accent.primary,
                  },
                ]}
                onPress={() => setPaidBy(m.id)}
              >
                <Text
                  style={[
                    styles.paidByBtnText,
                    { color: colors.text.secondary },
                    paidBy === m.id && { color: colors.accent.primary, fontWeight: '600' },
                  ]}
                >
                  {m.name || 'Member'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sharesHeader}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Share Split</Text>
            <TouchableOpacity onPress={autoCalculateShares}>
              <Text style={[styles.autoCalcText, { color: colors.accent.primary }]}>
                Auto Calculate
              </Text>
            </TouchableOpacity>
          </View>

          {members.map((m) => (
            <View key={m.id} style={styles.shareRow}>
              <Text style={[styles.shareName, { color: colors.text.secondary }]}>
                {m.name || 'Member'}
              </Text>
              <TextInput
                style={[
                  styles.shareInput,
                  {
                    backgroundColor: colors.bg.tertiary,
                    color: colors.text.primary,
                    borderColor: colors.border.subtle,
                  },
                ]}
                value={m.share}
                onChangeText={(v) => handleShareChange(m.id, v)}
                placeholder="%"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="decimal-pad"
              />
            </View>
          ))}
        </Card>

        <Card variant="glass" style={styles.sectionCard} padding="xl">
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Additional Settings
          </Text>

          <Text style={[styles.label, { color: colors.text.secondary }]}>Category (optional)</Text>
          <View style={styles.categoryRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  { borderColor: colors.border.subtle },
                  category === cat && {
                    backgroundColor: colors.accent.primary + '20',
                    borderColor: colors.accent.primary,
                  },
                ]}
                onPress={() => setCategory(category === cat ? '' : cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: colors.text.tertiary },
                    category === cat && { color: colors.accent.primary },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text.secondary }]}>Renewal Reminder</Text>
          <View style={styles.reminderRow}>
            {REMINDER_OPTIONS.map((days) => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.reminderBtn,
                  { borderColor: colors.border.subtle },
                  reminderDays === days && {
                    backgroundColor: colors.accent.primary + '20',
                    borderColor: colors.accent.primary,
                  },
                ]}
                onPress={() => setReminderDays(days)}
              >
                <Text
                  style={[
                    styles.reminderBtnText,
                    { color: colors.text.tertiary },
                    reminderDays === days && { color: colors.accent.primary },
                  ]}
                >
                  {days}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: colors.accent.primary },
            (!name.trim() || !amount.trim() || saving) && { opacity: 0.5 },
          ]}
          onPress={handleSave}
          disabled={!name.trim() || !amount.trim() || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save Subscription</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionCard: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 4,
  },
  cycleRow: { flexDirection: 'row', gap: 8 },
  cycleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cycleBtnText: { fontSize: 13, fontWeight: '500' },
  paidByRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paidByBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  paidByBtnText: { fontSize: 13 },
  sharesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  autoCalcText: { fontSize: 12, fontWeight: '600' },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  shareName: { flex: 1, fontSize: 14, fontWeight: '500' },
  shareInput: {
    width: 80,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    textAlign: 'center',
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  categoryChipText: { fontSize: 12, fontWeight: '500' },
  reminderRow: { flexDirection: 'row', gap: 8 },
  reminderBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  reminderBtnText: { fontSize: 13, fontWeight: '500' },
  saveBtn: {
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
