import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { UpgradeBanner } from '../../components/ui/UpgradeBanner';
import { useToast } from '../../store/ToastContext';

const { width: SCREEN_W } = Dimensions.get('window');

function fmt(v: number) {
  return `\u20B9${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface IncomeCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface IncomeEntry {
  id: string;
  source: string;
  amount: number;
  date: string;
  categoryId: string | null;
  category: IncomeCategory | null;
  assignedTo: string | null;
  creator: { id: string; firstName: string; lastName: string } | null;
}

export function CoupleIncomeScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incomes, setIncomes] = useState<IncomeEntry[]>([]);
  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [groupInfo, setGroupInfo] = useState<{
    id: string;
    partner1Id: string;
    partner2Id: string;
    partner1Name: string;
    partner2Name: string;
  } | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedCategory, setSelectedCategory] = useState<IncomeCategory | null>(null);
  const [selectedPartner, setSelectedPartner] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const coupleGroup = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (!coupleGroup) {
        setIncomes([]);
        setGroupInfo(null);
        return;
      }
      const groupId = coupleGroup.id;
      const dashboard = await api.get<any>(`/shared-finance/groups/${groupId}/couple/dashboard`);
      const profile = dashboard?.profile;
      let p1Name = 'Partner 1',
        p2Name = 'Partner 2',
        p1Id = 'p1',
        p2Id = 'p2';
      if (profile) {
        p1Name = profile.partner1?.firstName || profile.partner1?.email || 'Partner 1';
        p2Name = profile.partner2?.firstName || profile.partner2?.email || 'Partner 2';
        p1Id = profile.partner1?.id || 'p1';
        p2Id = profile.partner2?.id || 'p2';
      }
      setGroupInfo({
        id: groupId,
        partner1Id: p1Id,
        partner2Id: p2Id,
        partner1Name: p1Name,
        partner2Name: p2Name,
      });

      const catData = await api.get<any[]>('/categories?type=income');
      if (Array.isArray(catData)) {
        setCategories(catData);
      }

      const incomeResp = await api.get<any>(`/shared-finance/groups/${groupId}/couple/incomes`);
      const incomeList: IncomeEntry[] =
        incomeResp?.incomes || (Array.isArray(incomeResp) ? incomeResp : []);
      setIncomes(incomeList);
    } catch (e: any) {
      if (e.message !== 'Session expired. Please login again.') {
        Alert.alert('Error', e.message || 'Failed to load data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAddIncome() {
    if (!source.trim()) {
      Alert.alert('Missing', 'Please enter a source');
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      Alert.alert('Invalid', 'Please enter a valid amount');
      return;
    }
    if (!date) {
      Alert.alert('Missing', 'Please select a date');
      return;
    }
    if (!selectedPartner) {
      Alert.alert('Missing', 'Please assign to a partner');
      return;
    }
    if (!groupInfo) {
      Alert.alert('Error', 'No couple group found');
      return;
    }

    setSubmitting(true);
    try {
      const newIncome = await api.post<any>(
        `/shared-finance/groups/${groupInfo.id}/couple/incomes`,
        {
          source: source.trim(),
          amount: amt,
          date,
          categoryId: selectedCategory?.id || null,
          assignedTo: selectedPartner,
        },
      );
      if (newIncome) {
        setIncomes((prev) => [newIncome, ...prev]);
      }
      setModalVisible(false);
      resetForm();
      showToast('Income added');
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
    setSelectedCategory(null);
    setSelectedPartner('');
  }

  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const p1Income = incomes
    .filter((i) => i.assignedTo === groupInfo?.partner1Id)
    .reduce((sum, i) => sum + i.amount, 0);
  const p2Income = incomes
    .filter((i) => i.assignedTo === groupInfo?.partner2Id)
    .reduce((sum, i) => sum + i.amount, 0);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData(true);
            }}
            tintColor={colors.accent.primary}
          />
        }
      >
        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <View style={[styles.summaryCard, { backgroundColor: '#FFEBB4' }]}>
            <Text style={styles.summaryTotalLabel}>Total Monthly Income</Text>
            <Text style={styles.summaryTotalAmount}>{fmt(totalIncome)}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <View style={[styles.summaryDot, { backgroundColor: colors.accent.primary }]} />
                <Text style={styles.summaryPartnerLabel}>
                  {groupInfo?.partner1Name || 'Partner 1'}
                </Text>
                <Text style={styles.summaryPartnerAmount}>{fmt(p1Income)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <View style={[styles.summaryDot, { backgroundColor: colors.accent.primary }]} />
                <Text style={styles.summaryPartnerLabel}>
                  {groupInfo?.partner2Name || 'Partner 2'}
                </Text>
                <Text style={styles.summaryPartnerAmount}>{fmt(p2Income)}</Text>
              </View>
            </View>
          </View>
        </View>

        <UpgradeBanner message="Premium analytics, reports & AI insights for couple finance" />

        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.8}
            onPress={() => setModalVisible(true)}
          >
            <AntDesign  name="pluscircleo" size={20} color="#FFF" />
            <Text style={styles.addBtnText}>Add Income</Text>
          </TouchableOpacity>
        </View>

        {incomes.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <AntDesign  name="wallet" size={52} color={colors.text.tertiary} />
            <Text style={[styles.emptyText, { color: colors.text.secondary, marginTop: 12 }]}>
              No income entries yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.text.tertiary }]}>
              Tap "Add Income" to get started
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 10 }}>
            {incomes.map((item) => {
              const cat = item.category;
              const iconName = cat?.icon || (item.categoryId ? 'wallet' : 'wallet');
              const catColor = cat?.color || colors.text.secondary;
              return (
                <View
                  key={item.id}
                  style={[styles.incomeCard, { backgroundColor: colors.bg.card }]}
                >
                  <View style={[styles.incomeIconWrap, { backgroundColor: `${catColor}18` }]}>
                    <AntDesign name={iconName as any} size={20} color={catColor} />
                  </View>
                  <View style={styles.incomeInfo}>
                    <Text style={[styles.incomeSource, { color: colors.text.primary }]}>
                      {item.source}
                    </Text>
                    {cat ? (
                      <Text style={[styles.incomeCategoryLabel, { color: catColor }]}>
                        {cat.name}
                      </Text>
                    ) : null}
                    <Text style={[styles.incomeDate, { color: colors.text.tertiary }]}>
                      {fmtDate(item.date)}
                    </Text>
                  </View>
                  <View style={styles.incomeRight}>
                    <Text style={[styles.incomeAmount, { color: colors.status.success }]}>
                      +{fmt(item.amount)}
                    </Text>
                    {groupInfo && (
                      <View
                        style={[
                          styles.partnerChip,
                          { backgroundColor: `${colors.accent.primary}18` },
                        ]}
                      >
                        <Text style={[styles.partnerChipText, { color: colors.accent.primary }]}>
                          {item.assignedTo === groupInfo.partner1Id
                            ? groupInfo.partner1Name
                            : groupInfo.partner2Name}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
              style={[
                styles.input,
                {
                  backgroundColor: colors.bg.tertiary,
                  color: colors.text.primary,
                  borderColor: colors.border.default,
                },
              ]}
              value={source}
              onChangeText={setSource}
              placeholder="e.g. Salary, Freelance"
              placeholderTextColor={colors.text.tertiary}
            />

            <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Amount</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bg.tertiary,
                  color: colors.text.primary,
                  borderColor: colors.border.default,
                },
              ]}
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Date</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bg.tertiary,
                  color: colors.text.primary,
                  borderColor: colors.border.default,
                },
              ]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.text.tertiary}
            />

            <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Category</Text>
            {categories.length > 0 ? (
              <View style={styles.categoryGrid}>
                {categories.map((cat) => {
                  const isSelected = selectedCategory?.id === cat.id;
                  const catColor = cat.color || colors.accent.primary;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: isSelected ? catColor : colors.bg.tertiary,
                          borderColor: isSelected ? catColor : colors.border.default,
                        },
                      ]}
                      onPress={() => setSelectedCategory(isSelected ? null : cat)}
                    >
                      <AntDesign
                        name={(cat.icon || 'wallet') as any}
                        size={16}
                        color={isSelected ? '#FFF' : catColor}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          { color: isSelected ? '#FFF' : colors.text.primary },
                        ]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Assign to</Text>
            <View style={styles.segmentRow}>
              {groupInfo && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.segmentBtn,
                      {
                        backgroundColor:
                          selectedPartner === groupInfo.partner1Id
                            ? colors.accent.primary
                            : colors.bg.tertiary,
                      },
                    ]}
                    onPress={() => setSelectedPartner(groupInfo.partner1Id)}
                  >
                    <AntDesign
                       name="user"
                      size={16}
                      color={
                        selectedPartner === groupInfo.partner1Id ? '#FFF' : colors.text.secondary
                      }
                    />
                    <Text
                      style={[
                        styles.segmentText,
                        {
                          color:
                            selectedPartner === groupInfo.partner1Id
                              ? '#FFF'
                              : colors.text.secondary,
                        },
                      ]}
                    >
                      {groupInfo.partner1Name}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segmentBtn,
                      {
                        backgroundColor:
                          selectedPartner === groupInfo.partner2Id
                            ? colors.accent.primary
                            : colors.bg.tertiary,
                      },
                    ]}
                    onPress={() => setSelectedPartner(groupInfo.partner2Id)}
                  >
                    <AntDesign
                       name="user"
                      size={16}
                      color={
                        selectedPartner === groupInfo.partner2Id ? '#FFF' : colors.text.secondary
                      }
                    />
                    <Text
                      style={[
                        styles.segmentText,
                        {
                          color:
                            selectedPartner === groupInfo.partner2Id
                              ? '#FFF'
                              : colors.text.secondary,
                        },
                      ]}
                    >
                      {groupInfo.partner2Name}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: colors.accent.primary, opacity: submitting ? 0.7 : 1 },
              ]}
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


  summaryCard: {
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  summaryTotalLabel: { fontSize: 12, fontWeight: '600', color: '#F97316', letterSpacing: 0.3 },
  summaryTotalAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F97316',
    letterSpacing: -1,
    marginTop: 4,
    marginBottom: 18,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryDot: { width: 8, height: 8, borderRadius: 4 },
  summaryPartnerLabel: { fontSize: 11, fontWeight: '600', color: '#F97316', marginTop: 2 },
  summaryPartnerAmount: { fontSize: 16, fontWeight: '800', color: '#F97316' },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(93,56,181,0.15)',
    marginHorizontal: 12,
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F97316',
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  addBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  incomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  incomeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeInfo: { flex: 1, gap: 2 },
  incomeSource: { fontSize: 15, fontWeight: '700' },
  incomeCategoryLabel: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  incomeDate: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  incomeRight: { alignItems: 'flex-end', gap: 6 },
  incomeAmount: { fontSize: 16, fontWeight: '800' },
  partnerChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  partnerChipText: { fontSize: 10, fontWeight: '700' },

  emptyText: { fontSize: 17, fontWeight: '700' },
  emptySubtext: { fontSize: 13, marginTop: 4 },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'center',
    marginBottom: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },

  inputLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    fontWeight: '500',
  },
  segmentRow: { flexDirection: 'row', gap: 10 },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  segmentText: { fontSize: 13, fontWeight: '700' },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  categoryChipText: { fontSize: 13, fontWeight: '600' },

  submitBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
