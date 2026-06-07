import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl,
  Modal, TextInput, KeyboardAvoidingView, Platform, Dimensions, FlatList, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { LoadingScreen } from '../../components/ui/LoadingScreen';

const { width } = Dimensions.get('window');

const GOAL_ICONS = [
  { key: 'gift', icon: 'gift', label: 'Gift' },
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'car', icon: 'car-sport', label: 'Car' },
  { key: 'airplane', icon: 'airplane', label: 'Travel' },
  { key: 'restaurant', icon: 'restaurant', label: 'Dining' },
  { key: 'fitness', icon: 'fitness', label: 'Fitness' },
  { key: 'school', icon: 'school', label: 'Education' },
  { key: 'medkit', icon: 'medkit', label: 'Health' },
  { key: 'shirt', icon: 'shirt', label: 'Fashion' },
  { key: 'tv', icon: 'tv', label: 'Electronics' },
  { key: 'wallet', icon: 'wallet', label: 'Savings' },
  { key: 'business', icon: 'business', label: 'Business' },
  { key: 'heart', icon: 'heart', label: 'Wedding' },
  { key: 'paw', icon: 'paw', label: 'Pet' },
  { key: 'ellipse', icon: 'ellipse', label: 'Other' },
];

function fmt(v: number) {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function CoupleGoalsScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goals, setGoals] = useState<any[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [contributionModalVisible, setContributionModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);

  const [formName, setFormName] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formIcon, setFormIcon] = useState('gift');
  const [formNotes, setFormNotes] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchGoals = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const coupleGroup = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (!coupleGroup) {
        setGoals([]);
        return;
      }
      const res = await api.get<any>(`/shared-finance/groups/${coupleGroup.id}/couple/dashboard`);
      setGoals(res?.goals || []);
    } catch (e: any) {
      setGoals([]);
      if (e?.message !== 'Session expired') {
        Alert.alert('Error', e?.message || 'Failed to load goals');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const handleAddGoal = async () => {
    if (!formName.trim()) return;
    setSubmitting(true);
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const coupleGroup = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (!coupleGroup) return;
      const payload: any = {
        name: formName.trim(),
        targetAmount: parseFloat(formTarget) || 0,
        icon: formIcon,
        notes: formNotes.trim(),
      };
      if (formDate.trim()) payload.targetDate = formDate.trim();
      await api.post(`/shared-finance/groups/${coupleGroup.id}/goals`, payload);
      setAddModalVisible(false);
      resetForm();
      fetchGoals(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddContribution = async () => {
    if (!selectedGoal || !formAmount.trim()) return;
    setSubmitting(true);
    try {
      const groups: any[] = await api.get('/shared-finance/groups');
      const coupleGroup = Array.isArray(groups)
        ? groups.find((g: any) => g.type === 'couple' && g.status === 'ACTIVE')
        : null;
      if (!coupleGroup) return;
      await api.post(`/shared-finance/goals/${selectedGoal.id}/contribute`, {
        amount: parseFloat(formAmount) || 0,
      });
      setContributionModalVisible(false);
      setFormAmount('');
      setSelectedGoal(null);
      fetchGoals(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add contribution');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormTarget('');
    setFormDate('');
    setFormIcon('gift');
    setFormNotes('');
    setFormAmount('');
  };

  const openContribution = (goal: any) => {
    setSelectedGoal(goal);
    setFormAmount('');
    setContributionModalVisible(true);
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <FlatList
        data={goals}
        keyExtractor={(_, i) => String(i)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 0 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchGoals(true); }}
            tintColor="#6C3EF4"
          />
        }
        ListHeaderComponent={
          <LinearGradient
            colors={['#6C3EF4', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingTop: insets.top + 12, paddingBottom: 28, paddingHorizontal: 20 }}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Shared Goals</Text>
              <TouchableOpacity
                onPress={() => { resetForm(); setAddModalVisible(true); }}
                style={styles.backBtn}
              >
                <Ionicons name="add" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerSubtitle}>
              {goals.length > 0
                ? `${goals.length} goal${goals.length !== 1 ? 's' : ''}`
                : 'Save towards what matters most'}
            </Text>
          </LinearGradient>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['rgba(108,62,244,0.12)', 'rgba(139,92,246,0.06)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyIllustration}
            >
              <Ionicons name="gift-outline" size={56} color="#6C3EF4" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              Add your first shared goal
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              Save together for trips, a home, a wedding, or anything else you dream of.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              activeOpacity={0.8}
              onPress={() => { resetForm(); setAddModalVisible(true); }}
            >
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.emptyBtnText}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const pct = item.targetAmount > 0
            ? Math.min(Math.round((item.savedAmount / item.targetAmount) * 100), 100)
            : 0;
          const hasDate = !!item.targetDate;
          const dateStr = hasDate
            ? new Date(item.targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : '';
          const partners = item.contributions?.partners || [];
          const p1 = partners[0];
          const p2 = partners[1];
          const p1Pct = item.savedAmount > 0 && p1?.amount
            ? Math.round((p1.amount / item.savedAmount) * 100) : 0;
          const p2Pct = item.savedAmount > 0 && p2?.amount
            ? Math.round((p2.amount / item.savedAmount) * 100) : 0;

          return (
            <View style={[styles.goalCard, { backgroundColor: colors.bg.card, borderColor: colors.border.default }]}>
              <View style={styles.goalTopRow}>
                <LinearGradient
                  colors={['#6C3EF4', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.goalIconWrap}
                >
                  <Ionicons name={(item.icon || 'gift') as any} size={22} color="#FFF" />
                </LinearGradient>
                <View style={styles.goalTitleWrap}>
                  <Text style={[styles.goalTitle, { color: colors.text.primary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.goalSubtitle, { color: colors.text.tertiary }]}>
                    Target {fmt(item.targetAmount)}
                  </Text>
                </View>
              </View>

              <View style={styles.goalAmountRow}>
                <View>
                  <Text style={[styles.goalSaved, { color: colors.text.primary }]}>{fmt(item.savedAmount)}</Text>
                  <Text style={[styles.goalSavedLabel, { color: colors.text.tertiary }]}>saved</Text>
                </View>
                <View style={styles.goalPctBadge}>
                  <Text style={styles.goalPctText}>{pct}%</Text>
                </View>
              </View>

              <View style={[styles.progressBar, { backgroundColor: colors.bg.tertiary }]}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>

              <View style={styles.goalMetaRow}>
                <Ionicons name="calendar-outline" size={13} color={colors.text.tertiary} />
                <Text style={[styles.goalMetaText, { color: colors.text.tertiary }]}>
                  {hasDate ? dateStr : 'No deadline'}
                </Text>
              </View>

              {partners.length > 0 && (
                <View style={styles.partnerRow}>
                  <View style={styles.partnerChips}>
                    {p1 && (
                      <View style={[styles.partnerChip, { backgroundColor: colors.bg.tertiary }]}>
                        <View style={[styles.partnerDot, { backgroundColor: '#6C3EF4' }]} />
                        <Text style={[styles.partnerChipText, { color: colors.text.secondary }]} numberOfLines={1}>
                          {p1.name || 'Partner 1'} {p1Pct > 0 ? `(${p1Pct}%)` : ''}
                        </Text>
                      </View>
                    )}
                    {p2 && (
                      <View style={[styles.partnerChip, { backgroundColor: colors.bg.tertiary }]}>
                        <View style={[styles.partnerDot, { backgroundColor: '#F3D28F' }]} />
                        <Text style={[styles.partnerChipText, { color: colors.text.secondary }]} numberOfLines={1}>
                          {p2.name || 'Partner 2'} {p2Pct > 0 ? `(${p2Pct}%)` : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.contributeBtn}
                activeOpacity={0.8}
                onPress={() => openContribution(item)}
              >
                <Ionicons name="add-circle-outline" size={16} color="#FFF" />
                <Text style={styles.contributeBtnText}>Add Contribution</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setAddModalVisible(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.bg.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border.subtle }]} />
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>New Shared Goal</Text>

            <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Goal Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg.secondary, color: colors.text.primary, borderColor: colors.border.default }]}
              placeholder="e.g. Bali Trip"
              placeholderTextColor={colors.text.tertiary}
              value={formName}
              onChangeText={setFormName}
            />

            <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Target Amount (₹)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg.secondary, color: colors.text.primary, borderColor: colors.border.default }]}
              placeholder="e.g. 500000"
              placeholderTextColor={colors.text.tertiary}
              value={formTarget}
              onChangeText={setFormTarget}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Target Date (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg.secondary, color: colors.text.primary, borderColor: colors.border.default }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.text.tertiary}
              value={formDate}
              onChangeText={setFormDate}
            />

            <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Icon</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.iconPicker}
            >
              {GOAL_ICONS.map((g) => (
                <TouchableOpacity
                  key={g.key}
                  style={[
                    styles.iconItem,
                    {
                      backgroundColor: formIcon === g.key ? 'rgba(108,62,244,0.15)' : colors.bg.tertiary,
                      borderColor: formIcon === g.key ? '#6C3EF4' : 'transparent',
                    },
                  ]}
                  onPress={() => setFormIcon(g.key)}
                >
                  <Ionicons
                    name={g.icon as any}
                    size={22}
                    color={formIcon === g.key ? '#6C3EF4' : colors.text.secondary}
                  />
                  <Text
                    style={[
                      styles.iconLabel,
                      { color: formIcon === g.key ? '#6C3EF4' : colors.text.tertiary },
                    ]}
                  >
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, { backgroundColor: colors.bg.secondary, color: colors.text.primary, borderColor: colors.border.default }]}
              placeholder="Any notes about this goal..."
              placeholderTextColor={colors.text.tertiary}
              value={formNotes}
              onChangeText={setFormNotes}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border.default }]}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { opacity: submitting || !formName.trim() ? 0.5 : 1 }]}
                onPress={handleAddGoal}
                disabled={submitting || !formName.trim()}
              >
                <Text style={styles.modalSubmitText}>
                  {submitting ? 'Creating...' : 'Create Goal'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={contributionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setContributionModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setContributionModalVisible(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.bg.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border.subtle }]} />
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Add to {selectedGoal?.name || 'Goal'}
            </Text>

            <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Amount (₹)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg.secondary, color: colors.text.primary, borderColor: colors.border.default }]}
              placeholder="e.g. 5000"
              placeholderTextColor={colors.text.tertiary}
              value={formAmount}
              onChangeText={setFormAmount}
              keyboardType="decimal-pad"
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border.default }]}
                onPress={() => { setContributionModalVisible(false); setSelectedGoal(null); }}
              >
                <Text style={[styles.modalCancelText, { color: colors.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { opacity: submitting || !formAmount.trim() ? 0.5 : 1 }]}
                onPress={handleAddContribution}
                disabled={submitting || !formAmount.trim()}
              >
                <Text style={styles.modalSubmitText}>
                  {submitting ? 'Adding...' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  headerSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 40,
  },
  emptyIllustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6C3EF4',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  goalCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
  },
  goalTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitleWrap: { flex: 1 },
  goalTitle: { fontSize: 16, fontWeight: '700' },
  goalSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  goalAmountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  goalSaved: { fontSize: 26, fontWeight: '800' },
  goalSavedLabel: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  goalPctBadge: {
    backgroundColor: '#6C3EF4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  goalPctText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#6C3EF4', borderRadius: 3 },

  goalMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalMetaText: { fontSize: 12, fontWeight: '500' },

  partnerRow: { marginTop: -2 },
  partnerChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  partnerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  partnerDot: { width: 8, height: 8, borderRadius: 4 },
  partnerChipText: { fontSize: 11, fontWeight: '600', maxWidth: 120 },

  contributeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6C3EF4',
    paddingVertical: 12,
    borderRadius: 14,
  },
  contributeBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '500',
    borderWidth: 1,
  },
  inputMultiline: {
    height: 80,
    paddingTop: 14,
    textAlignVertical: 'top',
  },

  iconPicker: { marginTop: 8, marginBottom: 4 },
  iconItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1.5,
  },
  iconLabel: { fontSize: 10, fontWeight: '600', marginTop: 3 },

  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600' },
  modalSubmitBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#6C3EF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
