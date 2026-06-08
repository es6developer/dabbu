import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { SplitSummaryCard } from '../../components/ui/SplitSummaryCard';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

const SPLIT_METHODS = [
  { key: 'equal', label: 'Equal', icon: 'reorder-three-outline', desc: 'Split equally among all' },
  {
    key: 'percentage',
    label: 'Percentage',
    icon: 'pie-chart-outline',
    desc: 'Split by percentage',
  },
  { key: 'manual', label: 'Manual', icon: 'create-outline', desc: 'Enter custom amounts' },
];

interface RouteParams {
  members?: { name: string; id: string }[];
}

export function SplitExpenseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const routeMembers = (route.params as RouteParams)?.members || [];

  const [expenseName, setExpenseName] = useState('');
  const [amount, setAmount] = useState('');
  const [splitMethod, setSplitMethod] = useState('equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(routeMembers.map((m) => m.id));
  const [manualMembers, setManualMembers] = useState<string[]>(
    routeMembers.length === 0 ? [''] : [],
  );

  const members =
    routeMembers.length > 0
      ? routeMembers
      : manualMembers.filter(Boolean).map((name, i) => ({ name, id: `manual-${i}` }));

  function toggleMember(id: string) {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  const totalAmount = parseFloat(amount) || 0;
  const activeMembers = members.filter((m) => selectedMembers.includes(m.id));
  const sharePerPerson = activeMembers.length > 0 ? totalAmount / activeMembers.length : 0;

  function handleCreateSplit() {
    if (!expenseName.trim()) {
      Alert.alert('Error', 'Please enter an expense name');
      return;
    }
    if (totalAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (activeMembers.length < 2) {
      Alert.alert('Error', 'Please select at least 2 members');
      return;
    }
    Alert.alert('Success', 'Split created successfully!');
    navigation.goBack();
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingContainer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(40, insets.bottom + 40) }}
        >
          <View
            style={{
              paddingTop: insets.top + 12,
              paddingBottom: 20,
              paddingHorizontal: 20,
              backgroundColor: '#1A1528',
            }}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Split Bill</Text>
              <View style={{ width: 32 }} />
            </View>
          </View>

          <View style={{ padding: 20, gap: 16 }}>
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: colors.bg.card,
                  borderColor: colors.border.default,
                  shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.06)',
                },
              ]}
            >
              <Text style={[styles.label, { color: colors.text.secondary }]}>Split Name</Text>
              <TextInput
                style={[styles.nameInput, { color: colors.text.primary }]}
                placeholder="Dinner Split"
                placeholderTextColor={colors.text.tertiary}
                value={expenseName}
                onChangeText={setExpenseName}
              />
              <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
              <Text style={[styles.label, { color: colors.text.secondary }]}>Total Amount</Text>
              <Text style={[styles.totalAmount, { color: colors.text.primary }]}>
                ₹{totalAmount.toLocaleString('en-IN')}
              </Text>
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.bg.card,
                  borderColor: colors.border.default,
                  shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.06)',
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.text.primary }]}>Members</Text>
              {routeMembers.length === 0 && (
                <View style={{ gap: 8, marginBottom: 12 }}>
                  {manualMembers.map((name, i) => (
                    <TextInput
                      key={i}
                      style={[
                        styles.nameInput,
                        {
                          color: colors.text.primary,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border.subtle,
                        },
                      ]}
                      placeholder="Enter name"
                      placeholderTextColor={colors.text.tertiary}
                      value={name}
                      onChangeText={(t) => {
                        const next = [...manualMembers];
                        next[i] = t;
                        setManualMembers(next);
                      }}
                      onSubmitEditing={() => setManualMembers((prev) => [...prev, ''])}
                    />
                  ))}
                  <TouchableOpacity
                    onPress={() => setManualMembers((prev) => [...prev, ''])}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={colors.accent.primary} />
                    <Text style={{ color: colors.accent.primary, fontSize: 13, fontWeight: '600' }}>
                      Add member
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.memberRow}>
                {members.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.memberChip,
                      {
                        borderColor: selectedMembers.includes(m.id)
                          ? colors.accent.primary
                          : colors.border.subtle,
                        backgroundColor: selectedMembers.includes(m.id)
                          ? `${colors.accent.primary}10`
                          : 'transparent',
                      },
                    ]}
                    onPress={() => toggleMember(m.id)}
                  >
                    <View style={[styles.memberAvatar, { backgroundColor: colors.bg.secondary }]}>
                      <Text style={styles.memberAvatarText}>{m.name[0]}</Text>
                    </View>
                    <Text
                      style={[
                        styles.memberName,
                        {
                          color: selectedMembers.includes(m.id)
                            ? colors.accent.primary
                            : colors.text.secondary,
                        },
                      ]}
                    >
                      {m.name}
                    </Text>
                    {selectedMembers.includes(m.id) && (
                      <Ionicons name="checkmark-circle" size={16} color={colors.accent.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>Split Mode</Text>
            <View style={styles.methodRow}>
              {SPLIT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[
                    styles.methodCard,
                    {
                      borderColor:
                        splitMethod === m.key ? colors.accent.primary : colors.border.subtle,
                      backgroundColor:
                        splitMethod === m.key ? colors.accent.primary : colors.bg.card,
                    },
                  ]}
                  onPress={() => setSplitMethod(m.key)}
                >
                  <Ionicons
                    name={m.icon as any}
                    size={24}
                    color={splitMethod === m.key ? '#FFF' : colors.text.secondary}
                  />
                  <Text
                    style={[
                      styles.methodLabel,
                      { color: splitMethod === m.key ? '#FFF' : colors.text.primary },
                    ]}
                  >
                    {m.label}
                  </Text>
                  <Text
                    style={[
                      styles.methodDesc,
                      {
                        color:
                          splitMethod === m.key ? 'rgba(255,255,255,0.7)' : colors.text.tertiary,
                      },
                    ]}
                  >
                    {m.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.bg.card,
                  borderColor: colors.border.default,
                  shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.06)',
                },
              ]}
            >
              <View style={styles.paidRow}>
                <Ionicons name="person-outline" size={18} color={colors.text.secondary} />
                <Text style={[styles.paidLabel, { color: colors.text.secondary }]}>Paid By</Text>
                <TouchableOpacity
                  style={[styles.paidValue, { backgroundColor: colors.bg.tertiary }]}
                >
                  <Text style={[styles.paidText, { color: colors.text.primary }]}>You</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.text.tertiary} />
                </TouchableOpacity>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
              <View style={styles.paidRow}>
                <Ionicons name="receipt-outline" size={18} color={colors.text.secondary} />
                <Text style={[styles.paidLabel, { color: colors.text.secondary }]}>
                  Tax (Optional)
                </Text>
                <TouchableOpacity
                  style={[styles.paidValue, { backgroundColor: colors.bg.tertiary }]}
                >
                  <Text style={[styles.paidText, { color: colors.text.tertiary }]}>None</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.text.tertiary} />
                </TouchableOpacity>
              </View>
            </View>

            {totalAmount > 0 && activeMembers.length > 0 && (
              <View>
                <Text style={[styles.sectionLabel, { color: colors.text.primary }]}>
                  Split Preview
                </Text>
                <SplitSummaryCard
                  totalAmount={totalAmount}
                  members={activeMembers.map((m) => ({
                    name: m.name,
                    amount:
                      splitMethod === 'equal'
                        ? sharePerPerson
                        : Math.round((totalAmount * (100 / activeMembers.length)) / 100),
                  }))}
                  splitMethod={splitMethod}
                />
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.createBtn,
                { backgroundColor: colors.accent.primary, borderColor: colors.border.default },
              ]}
              onPress={handleCreateSplit}
              activeOpacity={0.85}
            >
              <Ionicons name="swap-horizontal" size={18} color="#FFF" />
              <Text style={styles.createBtnText}>Confirm Split</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, marginBottom: 6 },
  nameInput: { fontSize: 16, fontWeight: '600', paddingVertical: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  totalAmount: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },

  card: {
    borderRadius: 20,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: '700' },

  memberRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  memberName: { fontSize: 13, fontWeight: '600' },

  sectionLabel: { fontSize: 15, fontWeight: '700', marginTop: 4 },

  methodRow: { flexDirection: 'row', gap: 10 },
  methodCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  methodLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  methodDesc: { fontSize: 10, fontWeight: '500', textAlign: 'center', lineHeight: 14 },

  paidRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  paidLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
  paidValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  paidText: { fontSize: 13, fontWeight: '600' },

  createBtn: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
