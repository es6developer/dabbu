import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { Card } from '../../components/ui/Card';

type RuleType = 'equal' | 'percentage' | 'salary_ratio' | 'fixed';

interface RuleForm {
  name: string;
  type: RuleType;
  memberValues: Record<string, string>;
}

export function ContributionRulesScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const { groupId } = route.params || {};
  const [rules, setRules] = useState<any[]>([]);
  const [salaryProfiles, setSalaryProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<RuleForm>({ name: '', type: 'equal', memberValues: {} });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadData();
  }, [accessToken, groupId]);

  async function loadData() {
    try {
      const [rulesRes, salaryRes] = await Promise.all([
        api.get<any>(`/shared-finance/groups/${groupId}/contributions/rules`),
        api.get<any>(`/shared-finance/groups/${groupId}/contributions/salary-profiles`),
      ]);
      setRules(Array.isArray(rulesRes.data) ? rulesRes.data : []);
      setSalaryProfiles(Array.isArray(salaryRes.data) ? salaryRes.data : []);
    } catch (e) {
      console.error('ContributionRules load error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function openCreateModal() {
    const members = salaryProfiles.length > 0 ? salaryProfiles : [{ id: '1', name: 'Self' }];
    const initValues: Record<string, string> = {};
    members.forEach((m) => {
      initValues[m.id] = '';
    });
    setForm({ name: '', type: 'equal', memberValues: initValues });
    setShowModal(true);
  }

  function handleFormValueChange(memberId: string, value: string) {
    setForm((prev) => ({ ...prev, memberValues: { ...prev.memberValues, [memberId]: value } }));
  }

  function getPreviewValues(): { memberName: string; value: string }[] {
    const members = salaryProfiles.length > 0 ? salaryProfiles : [{ id: '1', name: 'Self' }];
    if (form.type === 'equal') {
      const equalShare = (100 / members.length).toFixed(1);
      return members.map((m) => ({ memberName: m.name, value: `${equalShare}%` }));
    }
    if (form.type === 'salary_ratio') {
      const totalSalary = members.reduce((s, m) => s + (m.salary || 1), 1);
      return members.map((m) => {
        const pct = (((m.salary || 0) / totalSalary) * 100).toFixed(1);
        return { memberName: m.name, value: `${pct}%` };
      });
    }
    return members.map((m) => ({
      memberName: m.name,
      value: form.memberValues[m.id]
        ? `${form.memberValues[m.id]}${form.type === 'fixed' ? '' : '%'}`
        : '-',
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      return;
    }
    setSaving(true);
    try {
      await api.post(`/shared-finance/groups/${groupId}/contributions/rules`, {
        name: form.name.trim(),
        type: form.type,
        values: Object.entries(form.memberValues).map(([memberId, value]) => ({
          memberId,
          value: value ? Number(value) : 0,
        })),
      });
      setShowModal(false);
      loadData();
    } catch (e) {
      console.error('Failed to create rule:', e);
    } finally {
      setSaving(false);
    }
  }

  async function handleApplyRule(ruleId: string) {
    try {
      await api.post(`/shared-finance/groups/${groupId}/contributions/rules/${ruleId}/apply`);
      navigation.navigate('GroupDetail', { groupId });
    } catch (e) {
      console.error('Failed to apply rule:', e);
    }
  }

  function getRuleTypeBadge(type: string) {
    const map: Record<string, { label: string; color: string }> = {
      equal: { label: 'Equal', color: colors.status.info },
      percentage: { label: 'Percentage', color: colors.status.warning },
      salary_ratio: { label: 'Salary Ratio', color: colors.status.success },
      fixed: { label: 'Fixed', color: colors.accent.primary },
    };
    return map[type] || { label: type, color: colors.text.tertiary };
  }

  const formatCurrency = (val: number) => '₹' + val.toLocaleString('en-IN');
  const ruleTypes: { label: string; value: RuleType; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: 'Equal', value: 'equal', icon: 'people-outline' },
    { label: 'Percentage', value: 'percentage', icon: 'percent-outline' },
    { label: 'Salary Ratio', value: 'salary_ratio', icon: 'trending-up-outline' },
    { label: 'Fixed', value: 'fixed', icon: 'cash-outline' },
  ];

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <ActivityIndicator color={colors.accent.primary} size="large" />
      </View>
    );
  }

  const members = salaryProfiles.length > 0 ? salaryProfiles : [{ id: '1', name: 'Self' }];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={rules}
        keyExtractor={(r) => r.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <LinearGradient
            colors={['#1a1a2e', colors.bg.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.header}
          >
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
              Contribution Rules
            </Text>
            <Text style={[styles.headerSub, { color: colors.text.tertiary }]}>
              {rules.length} rule{rules.length !== 1 ? 's' : ''} configured
            </Text>
          </LinearGradient>
        }
        renderItem={({ item }) => {
          const badge = getRuleTypeBadge(item.type);
          return (
            <Card variant="glass" style={styles.ruleCard} padding="lg">
              <View style={styles.ruleHeader}>
                <View style={styles.ruleInfo}>
                  <Text style={[styles.ruleName, { color: colors.text.primary }]}>
                    {item.name || 'Rule'}
                  </Text>
                  <View style={[styles.ruleBadge, { backgroundColor: badge.color + '20' }]}>
                    <Text style={[styles.ruleBadgeText, { color: badge.color }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={item.active}
                  onValueChange={() => {}}
                  trackColor={{ false: colors.border.default, true: colors.accent.primary + '60' }}
                  thumbColor={item.active ? colors.accent.primary : colors.text.tertiary}
                />
              </View>
              {Array.isArray(item.breakdown) &&
                item.breakdown.map((b: any, i: number) => (
                  <View
                    key={i}
                    style={[styles.breakdownRow, { borderBottomColor: colors.border.subtle }]}
                  >
                    <Text style={[styles.breakdownName, { color: colors.text.secondary }]}>
                      {b.name || 'Member'}
                    </Text>
                    <Text style={[styles.breakdownValue, { color: colors.text.primary }]}>
                      {b.value}% ({formatCurrency(b.amount || 0)})
                    </Text>
                  </View>
                ))}
              <TouchableOpacity
                style={[
                  styles.applyBtn,
                  {
                    borderTopColor: colors.border.subtle,
                    backgroundColor: colors.accent.primary + '10',
                  },
                ]}
                onPress={() => handleApplyRule(item.id)}
              >
                <Ionicons name="flash-outline" size={16} color={colors.accent.primary} />
                <Text style={[styles.applyBtnText, { color: colors.accent.primary }]}>
                  Apply Rule
                </Text>
              </TouchableOpacity>
            </Card>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.accent.primary + '10' }]}>
              <Ionicons name="calculator-outline" size={44} color={colors.accent.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No rules yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              Create contribution rules to split expenses fairly
            </Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity
            style={[styles.createBtn, { borderColor: colors.border.default }]}
            onPress={openCreateModal}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.accent.primary} />
            <Text style={[styles.createBtnText, { color: colors.accent.primary }]}>
              Create Rule
            </Text>
          </TouchableOpacity>
        }
      />

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.bg.primary }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>New Rule</Text>
            <View style={{ width: 24 }} />
          </View>

          <FlatList
            data={[1]}
            keyExtractor={() => 'form'}
            renderItem={() => (
              <View style={styles.modalBody}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>Rule Name</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.bg.tertiary,
                      color: colors.text.primary,
                      borderColor: colors.border.subtle,
                    },
                  ]}
                  value={form.name}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, name: v }))}
                  placeholder="e.g. Equal Split"
                  placeholderTextColor={colors.text.tertiary}
                />

                <Text style={[styles.label, { color: colors.text.secondary }]}>Rule Type</Text>
                <View style={styles.typeRow}>
                  {ruleTypes.map((rt) => (
                    <TouchableOpacity
                      key={rt.value}
                      style={[
                        styles.typeBtn,
                        { borderColor: colors.border.subtle },
                        form.type === rt.value && {
                          backgroundColor: colors.accent.primary + '20',
                          borderColor: colors.accent.primary,
                        },
                      ]}
                      onPress={() => setForm((prev) => ({ ...prev, type: rt.value }))}
                    >
                      <Ionicons
                        name={rt.icon}
                        size={18}
                        color={
                          form.type === rt.value ? colors.accent.primary : colors.text.tertiary
                        }
                      />
                      <Text
                        style={[
                          styles.typeBtnText,
                          { color: colors.text.tertiary },
                          form.type === rt.value && { color: colors.accent.primary },
                        ]}
                      >
                        {rt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { color: colors.text.secondary }]}>Member Values</Text>
                {members.map((m) => (
                  <View key={m.id} style={styles.memberValueRow}>
                    <Text style={[styles.memberValueName, { color: colors.text.secondary }]}>
                      {m.name}
                    </Text>
                    <TextInput
                      style={[
                        styles.memberValueInput,
                        {
                          backgroundColor: colors.bg.tertiary,
                          color: colors.text.primary,
                          borderColor: colors.border.subtle,
                        },
                      ]}
                      value={form.memberValues[m.id] || ''}
                      onChangeText={(v) => handleFormValueChange(m.id, v)}
                      placeholder={form.type === 'fixed' ? 'Amount' : '%'}
                      placeholderTextColor={colors.text.tertiary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                ))}

                <View
                  style={[
                    styles.previewBox,
                    { backgroundColor: colors.bg.glass, borderColor: colors.border.subtle },
                  ]}
                >
                  <Text style={[styles.previewTitle, { color: colors.text.primary }]}>Preview</Text>
                  {getPreviewValues().map((pv, i) => (
                    <View
                      key={i}
                      style={[styles.previewRow, { borderBottomColor: colors.border.subtle }]}
                    >
                      <Text style={[styles.previewName, { color: colors.text.secondary }]}>
                        {pv.memberName}
                      </Text>
                      <Text style={[styles.previewValue, { color: colors.accent.primary }]}>
                        {pv.value}
                      </Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    { backgroundColor: colors.accent.primary },
                    (!form.name.trim() || saving) && { opacity: 0.5 },
                  ]}
                  onPress={handleSave}
                  disabled={!form.name.trim() || saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Rule</Text>
                  )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
              </View>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 120 },
  header: { padding: 24, paddingTop: 20 },
  headerTitle: { fontSize: 26, fontWeight: '700', marginBottom: 4 },
  headerSub: { fontSize: 14, fontWeight: '500' },
  ruleCard: { marginHorizontal: 16, marginBottom: 12 },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ruleInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  ruleName: { fontSize: 15, fontWeight: '600' },
  ruleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  ruleBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  breakdownName: { fontSize: 13, fontWeight: '500' },
  breakdownValue: { fontSize: 13, fontWeight: '600' },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 12,
    borderRadius: 12,
  },
  applyBtnText: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  createBtnText: { fontSize: 15, fontWeight: '600' },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalBody: { padding: 20 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 4,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeBtnText: { fontSize: 12, fontWeight: '500' },
  memberValueRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  memberValueName: { flex: 1, fontSize: 14, fontWeight: '500' },
  memberValueInput: {
    width: 100,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    textAlign: 'center',
  },
  previewBox: { borderRadius: 14, borderWidth: 1, padding: 16, marginTop: 16 },
  previewTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  previewName: { fontSize: 13, fontWeight: '500' },
  previewValue: { fontSize: 13, fontWeight: '700' },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
