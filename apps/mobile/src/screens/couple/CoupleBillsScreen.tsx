import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Switch,
  Platform,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { useToast } from '../../store/ToastContext';

import { getCategoryIcon } from '../../config/categoryIcons';

const { width } = Dimensions.get('window');

const BILL_CATEGORIES = [
  'Utilities',
  'Housing',
  'Groceries',
  'Healthcare',
  'Transportation',
  'Financial',
  'Shopping',
  'Entertainment',
  'Other',
];

const RECURRING_OPTIONS = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

function fmt(v: number) {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function daysUntil(date: string): number {
  const now = new Date();
  const due = new Date(date);
  const diff = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function CoupleBillsScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'paid'>('upcoming');
  const [bills, setBills] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [error, setError] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formCategory, setFormCategory] = useState('Other');
  const [formRecurring, setFormRecurring] = useState(false);
  const [formRecurringInterval, setFormRecurringInterval] = useState('monthly');
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const scaleAnim = useRef(new Animated.Value(0)).current;

  const fetchBills = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const coupleGroup = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (!coupleGroup) {
        setError('No couple space found.');
        setBills([]);
        return;
      }
      const [billsData, profileData] = await Promise.all([
        api.get<any[]>(`/shared-finance/groups/${coupleGroup.id}/household/bills`),
        api.get<any>(`/shared-finance/groups/${coupleGroup.id}/couple/dashboard`),
      ]);
      setBills(Array.isArray(billsData) ? billsData : []);
      if (profileData?.profile) {
        const p1 = profileData.profile.partner1;
        const p2 = profileData.profile.partner2;
        setPartners([
          { id: 'partner1', name: p1?.firstName || 'Partner 1' },
          { id: 'partner2', name: p2?.firstName || 'Partner 2' },
        ]);
      }
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load bills');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  useEffect(() => {
    if (modalVisible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [modalVisible, scaleAnim]);

  const markAsPaid = async (billId: string) => {
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const coupleGroup = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (!coupleGroup) {
        return;
      }
      await api.post(`/shared-finance/household/bills/${billId}/mark-paid`);
      setBills((prev) =>
        prev.map((b) =>
          b.id === billId ? { ...b, status: 'paid', paidAt: new Date().toISOString() } : b,
        ),
      );
      showToast('Bill marked as paid');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to mark bill as paid');
    }
  };

  const handleAddBill = async () => {
    if (!formName.trim() || !formAmount.trim()) {
      Alert.alert('Validation', 'Name and amount are required.');
      return;
    }
    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount.');
      return;
    }
    setSubmitting(true);
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const coupleGroup = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (!coupleGroup) {
        Alert.alert('Error', 'No couple space found.');
        return;
      }
      const payload: any = {
        name: formName.trim(),
        amount,
        dueDate:
          formDueDate ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: formCategory,
        status: 'upcoming',
      };
      if (formRecurring) {
        payload.recurring = true;
        payload.recurringInterval = formRecurringInterval;
      }
      if (formAssignedTo) {
        payload.assignedTo = formAssignedTo;
      }
      const created = await api.post(
        `/shared-finance/groups/${coupleGroup.id}/household/bills`,
        payload,
      );
      setBills((prev) => [...prev, created]);
      setModalVisible(false);
      resetForm();
      showToast('Bill added');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add bill');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormAmount('');
    setFormDueDate('');
    setFormCategory('Other');
    setFormRecurring(false);
    setFormRecurringInterval('monthly');
    setFormAssignedTo('');
  };

  const upcomingBills = bills
    .filter((b) => b.status !== 'paid')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const paidBills = bills
    .filter((b) => b.status === 'paid')
    .sort(
      (a, b) =>
        new Date(b.paidAt || b.updatedAt).getTime() - new Date(a.paidAt || b.updatedAt).getTime(),
    );

  const totalUpcoming = upcomingBills.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalPaid = paidBills.reduce((sum, b) => sum + (b.amount || 0), 0);
  const now = new Date();
  const thisMonthBills = upcomingBills.filter((b) => {
    const d = new Date(b.dueDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalThisMonth = thisMonthBills.reduce((sum, b) => sum + (b.amount || 0), 0);

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
              fetchBills(true);
            }}
            tintColor={colors.accent.primary}
          />
        }
      >
        <View style={{ paddingTop: insets.top + 12, paddingBottom: 24, paddingHorizontal: 20 }}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.backBtn, { backgroundColor: colors.bg.tertiary }]}
            >
              <AntDesign  name="arrowleft" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Bills</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              style={[styles.backBtn, { backgroundColor: colors.bg.tertiary }]}
            >
              <AntDesign  name="plus" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: -12, gap: 12 }}>
          <View style={[styles.summaryCard, { backgroundColor: '#FFEBB4' }]}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Upcoming</Text>
                <Text style={styles.summaryAmount}>{fmt(totalUpcoming)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>This Month</Text>
                <Text style={styles.summaryAmount}>{fmt(totalThisMonth)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'upcoming' && [
                  styles.tabActive,
                  { borderBottomColor: colors.accent.primary },
                ],
              ]}
              onPress={() => setActiveTab('upcoming')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: colors.text.secondary },
                  activeTab === 'upcoming' && [
                    styles.tabTextActive,
                    { color: colors.accent.primary },
                  ],
                ]}
              >
                Upcoming
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'paid' && [
                  styles.tabActive,
                  { borderBottomColor: colors.accent.primary },
                ],
              ]}
              onPress={() => setActiveTab('paid')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: colors.text.secondary },
                  activeTab === 'paid' && [styles.tabTextActive, { color: colors.accent.primary }],
                ]}
              >
                Paid
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'upcoming' && (
            <>
              {error && !bills.length ? (
                <View style={styles.emptyWrap}>
                  <AntDesign  name="calendar" size={48} color={colors.text.tertiary} />
                  <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>
                    No upcoming bills
                  </Text>
                  <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>{error}</Text>
                </View>
              ) : upcomingBills.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <AntDesign  name="calendar" size={48} color={colors.text.tertiary} />
                  <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>
                    No upcoming bills
                  </Text>
                  <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
                    Tap + to add your first bill
                  </Text>
                </View>
              ) : (
                upcomingBills.map((bill) => {
                  const due = daysUntil(bill.dueDate);
                  const overdue = due < 0;
                  const icon = getCategoryIcon(bill.category, 'filetext1');
                  return (
                    <View
                      key={bill.id || bill._id}
                      style={[styles.billCard, { backgroundColor: colors.bg.card }]}
                    >
                      <View style={styles.billCardTop}>
                        <View
                          style={[
                            styles.categoryIconWrap,
                            {
                              backgroundColor: isDark
                                ? 'rgba(93,56,181,0.2)'
                                : 'rgba(93,56,181,0.1)',
                            },
                          ]}
                        >
                          <AntDesign name={icon as any} size={20} color={colors.accent.primary} />
                        </View>
                        <View style={styles.billInfo}>
                          <View style={styles.billNameRow}>
                            <Text style={[styles.billName, { color: colors.text.primary }]}>
                              {bill.name}
                            </Text>
                            {overdue && <View style={styles.overdueDot} />}
                          </View>
                          <Text style={[styles.billCategory, { color: colors.text.tertiary }]}>
                            {((bill.category as any)?.name || bill.category || '')}
                          </Text>
                        </View>
                        <Text style={[styles.billAmount, { color: colors.text.primary }]}>
                          {fmt(bill.amount)}
                        </Text>
                      </View>
                      <View style={styles.billCardBottom}>
                        <View style={styles.dueDateWrap}>
                          <AntDesign
                             name="clockcircleo"
                            size={14}
                            color={overdue ? '#FF4D4F' : colors.text.tertiary}
                          />
                          <Text
                            style={[
                              styles.dueDateText,
                              { color: overdue ? '#FF4D4F' : colors.text.tertiary },
                            ]}
                          >
                            {overdue
                              ? `Overdue by ${Math.abs(due)} day${Math.abs(due) !== 1 ? 's' : ''}`
                              : `Due in ${due} day${due !== 1 ? 's' : ''}`}
                          </Text>
                          <Text style={[styles.dueDateValue, { color: colors.text.tertiary }]}>
                            {formatDate(bill.dueDate)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.markPaidBtn}
                          activeOpacity={0.7}
                          onPress={() => markAsPaid(bill.id || bill._id)}
                        >
                          <Text style={styles.markPaidText}>Mark as Paid</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}

          {activeTab === 'paid' && (
            <>
              {paidBills.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <AntDesign  name="check" size={48} color={colors.text.tertiary} />
                  <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>
                    No paid bills yet
                  </Text>
                  <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
                    Mark bills as paid to see them here
                  </Text>
                </View>
              ) : (
                paidBills.map((bill) => {
                  const icon = getCategoryIcon(bill.category, 'filetext1');
                  return (
                    <View
                      key={bill.id || bill._id}
                      style={[styles.billCard, { backgroundColor: colors.bg.card }]}
                    >
                      <View style={styles.billCardTop}>
                        <View
                          style={[
                            styles.categoryIconWrap,
                            { backgroundColor: 'rgba(52,199,89,0.12)' },
                          ]}
                        >
                          <AntDesign name={icon as any} size={20} color="#34C759" />
                        </View>
                        <View style={styles.billInfo}>
                          <View style={styles.billNameRow}>
                            <AntDesign
                               name="checkcircleo"
                              size={16}
                              color="#34C759"
                              style={{ marginRight: 4 }}
                            />
                            <Text style={[styles.billName, { color: colors.text.primary }]}>
                              {bill.name}
                            </Text>
                          </View>
                          <Text style={[styles.billCategory, { color: colors.text.tertiary }]}>
                            {((bill.category as any)?.name || bill.category || '')}
                          </Text>
                        </View>
                        <Text style={[styles.billAmount, { color: colors.text.primary }]}>
                          {fmt(bill.amount)}
                        </Text>
                      </View>
                      <View style={styles.billCardBottom}>
                        <View style={styles.dueDateWrap}>
                          <AntDesign  name="checkcircle" size={14} color="#34C759" />
                          <Text style={[styles.dueDateText, { color: colors.text.tertiary }]}>
                            Paid {bill.paidAt ? formatDate(bill.paidAt) : ''}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <Animated.View
            style={[
              styles.modalContainer,
              { backgroundColor: colors.bg.secondary, transform: [{ scale: scaleAnim }] },
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Add Bill</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <AntDesign  name="close" size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Bill Name</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.bg.tertiary,
                      color: colors.text.primary,
                      borderColor: colors.border.default,
                    },
                  ]}
                  placeholder="e.g. Electricity Bill"
                  placeholderTextColor={colors.text.tertiary}
                  value={formName}
                  onChangeText={setFormName}
                />

                <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
                  Amount (₹)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.bg.tertiary,
                      color: colors.text.primary,
                      borderColor: colors.border.default,
                    },
                  ]}
                  placeholder="e.g. 1500"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="numeric"
                  value={formAmount}
                  onChangeText={setFormAmount}
                />

                <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
                  Due Date (YYYY-MM-DD)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.bg.tertiary,
                      color: colors.text.primary,
                      borderColor: colors.border.default,
                    },
                  ]}
                  placeholder="e.g. 2026-07-15"
                  placeholderTextColor={colors.text.tertiary}
                  value={formDueDate}
                  onChangeText={setFormDueDate}
                />

                <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Category</Text>
                <View style={styles.categoryRow}>
                  {BILL_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor:
                            formCategory === cat ? colors.accent.primary : colors.bg.tertiary,
                          borderColor:
                            formCategory === cat ? colors.accent.primary : colors.border.default,
                        },
                      ]}
                      onPress={() => setFormCategory(cat)}
                    >
                      <AntDesign
                        name={getCategoryIcon(cat, 'filetext1') as any}
                        size={14}
                        color={formCategory === cat ? '#FFF' : colors.text.secondary}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          { color: formCategory === cat ? '#FFF' : colors.text.secondary },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.recurringRow}>
                  <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
                    Recurring
                  </Text>
                  <Switch
                    value={formRecurring}
                    onValueChange={setFormRecurring}
                    trackColor={{
                      false: colors.border.default,
                      true: `${colors.accent.primary}80`,
                    }}
                    thumbColor={formRecurring ? colors.accent.primary : '#f4f3f4'}
                  />
                </View>

                {formRecurring && (
                  <>
                    <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>
                      Repeat
                    </Text>
                    <View style={styles.categoryRow}>
                      {RECURRING_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          style={[
                            styles.categoryChip,
                            {
                              backgroundColor:
                                formRecurringInterval === opt.value
                                  ? colors.accent.primary
                                  : colors.bg.tertiary,
                              borderColor:
                                formRecurringInterval === opt.value
                                  ? colors.accent.primary
                                  : colors.border.default,
                            },
                          ]}
                          onPress={() => setFormRecurringInterval(opt.value)}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              {
                                color:
                                  formRecurringInterval === opt.value
                                    ? '#FFF'
                                    : colors.text.secondary,
                              },
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Assign To</Text>
                <View style={styles.categoryRow}>
                  {partners.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor:
                            formAssignedTo === p.id ? colors.accent.primary : colors.bg.tertiary,
                          borderColor:
                            formAssignedTo === p.id ? colors.accent.primary : colors.border.default,
                        },
                      ]}
                      onPress={() => setFormAssignedTo(p.id === formAssignedTo ? '' : p.id)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          { color: formAssignedTo === p.id ? '#FFF' : colors.text.secondary },
                        ]}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                  activeOpacity={0.8}
                  onPress={handleAddBill}
                  disabled={submitting}
                >
                  <Text style={styles.submitBtnText}>{submitting ? 'Adding...' : 'Add Bill'}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  summaryCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(93,56,181,0.15)',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F97316',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  summaryAmount: { fontSize: 24, fontWeight: '800', color: '#F97316', letterSpacing: -0.5 },

  tabRow: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomWidth: 2 },
  tabText: { fontSize: 14, fontWeight: '600' },
  tabTextActive: { fontWeight: '700' },

  billCard: {
    borderRadius: 20,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  billCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billInfo: { flex: 1 },
  billNameRow: { flexDirection: 'row', alignItems: 'center' },
  billName: { fontSize: 15, fontWeight: '700' },
  billCategory: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  billAmount: { fontSize: 16, fontWeight: '800' },
  overdueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4D4F',
    marginLeft: 6,
  },
  billCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  dueDateWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  dueDateText: { fontSize: 12, fontWeight: '500', flex: 1 },
  dueDateValue: { fontSize: 11, fontWeight: '500' },
  markPaidBtn: {
    backgroundColor: '#F97316',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  markPaidText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalBody: { maxHeight: 400 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500',
    borderWidth: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryChipText: { fontSize: 12, fontWeight: '600' },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  modalFooter: { marginTop: 20 },
  submitBtn: {
    backgroundColor: '#F97316',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
