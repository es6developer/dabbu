import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { SplitSummaryCard } from '../../components/ui/SplitSummaryCard';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';
import { palette } from '../../theme/colors';

import { alertService } from "../../components/ui";
const { width: SCREEN_W } = Dimensions.get('window');
const PURPLE = palette.brand.primary;
const PURPLE_DARK = palette.brand.hover;

const SPLIT_METHODS = [
  { key: 'equal', label: 'Equal', icon: 'menufold', desc: 'Split equally among all' },
  {
    key: 'percentage',
    label: 'Percentage',
    icon: 'piechart',
    desc: 'Split by percentage',
  },
  { key: 'manual', label: 'Manual', icon: 'edit', desc: 'Enter custom amounts' },
];

interface RouteParams {
  members?: { name: string; id: string }[];
}

export function SplitExpenseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
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
      alertService.alert('Error', 'Please enter an expense name');
      return;
    }
    if (totalAmount <= 0) {
      alertService.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (activeMembers.length < 2) {
      alertService.alert('Error', 'Please select at least 2 members');
      return;
    }
    alertService.alert('Success', 'Split created successfully!');
    navigation.goBack();
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingContainer>
        <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{}}
        >
          {/* Header */}
          <View style={{ backgroundColor: colors.accent.primary }}>
            <View style={{ paddingTop: insets.top + 12, paddingBottom: 28, paddingHorizontal: 20 }}>
              <View style={s.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                  <AntDesign  name="close" size={22} color="#FFF" />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Split Bill</Text>
                <View style={{ width: 34 }} />
              </View>
              <Text style={s.headerSub}>Split expenses between members</Text>
            </View>
          </View>

          <View style={{ padding: 20, gap: 16 }}>
            {/* Split Name + Amount */}
            <View
              style={[
                s.summaryCard,
                { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
              ]}
            >
              <View style={s.flexRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: colors.text.tertiary }]}>SPLIT NAME</Text>
                  <TextInput
                    style={[s.nameInput, { color: colors.text.primary }]}
                    placeholder="Dinner at Olive Garden"
                    placeholderTextColor={colors.text.tertiary}
                    value={expenseName}
                    onChangeText={setExpenseName}
                  />
                </View>
              </View>
              <View style={[s.divider, { backgroundColor: colors.border.subtle }]} />
              <Text style={[s.label, { color: colors.text.tertiary }]}>TOTAL AMOUNT</Text>
              <View style={s.amountRow}>
                <Text style={[s.currencyLabel, { color: colors.text.tertiary }]}>₹</Text>
                <TextInput
                  style={[s.amountInput, { color: colors.text.primary }]}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.text.tertiary}
                />
              </View>
            </View>

            {/* Members */}
            <View
              style={[
                s.card,
                { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
              ]}
            >
              <Text style={[s.cardTitle, { color: colors.text.primary }]}>Members</Text>
              {routeMembers.length === 0 && (
                <View style={{ gap: 8, marginBottom: 12 }}>
                  {manualMembers.map((name, i) => (
                    <View
                      key={i}
                      style={[s.manualRow, { borderBottomColor: colors.border.subtle }]}
                    >
                      <TextInput
                        style={[s.manualInput, { color: colors.text.primary }]}
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
                      <AntDesign  name="user" size={20} color={colors.text.tertiary} />
                    </View>
                  ))}
                  <TouchableOpacity
                    onPress={() => setManualMembers((prev) => [...prev, ''])}
                    style={s.addBtn}
                  >
                    <AntDesign  name="pluscircleo" size={16} color={PURPLE} />
                    <Text style={[s.addBtnText, { color: PURPLE }]}>Add member</Text>
                  </TouchableOpacity>
                </View>
              )}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {members.map((m) => {
                  const selected = selectedMembers.includes(m.id);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        s.memberChip,
                        {
                          borderColor: selected ? PURPLE : colors.border.subtle,
                          backgroundColor: selected ? `${PURPLE}12` : colors.bg.tertiary,
                        },
                      ]}
                      onPress={() => toggleMember(m.id)}
                    >
                      <View
                        style={[
                          s.avatar,
                          { backgroundColor: selected ? PURPLE : colors.text.tertiary },
                        ]}
                      >
                        <Text style={s.avatarText}>{m.name[0]}</Text>
                      </View>
                      <Text
                        style={[s.memberName, { color: selected ? PURPLE : colors.text.secondary }]}
                      >
                        {m.name}
                      </Text>
                      {selected && <AntDesign  name="checkcircleo" size={14} color={PURPLE} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Split Method */}
            <Text style={[s.sectionLabel, { color: colors.text.primary }]}>Split Method</Text>
            <View style={s.methodRow}>
              {SPLIT_METHODS.map((m) => {
                const active = splitMethod === m.key;
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[
                      s.methodCard,
                      {
                        borderColor: active ? PURPLE : colors.border.subtle,
                        backgroundColor: active ? PURPLE : colors.bg.card,
                      },
                    ]}
                    onPress={() => setSplitMethod(m.key)}
                  >
                    <AntDesign
                      name={m.icon as any}
                      size={22}
                      color={active ? '#FFF' : colors.text.secondary}
                    />
                    <Text style={[s.methodLabel, { color: active ? '#FFF' : colors.text.primary }]}>
                      {m.label}
                    </Text>
                    <Text
                      style={[
                        s.methodDesc,
                        { color: active ? 'rgba(255,255,255,0.7)' : colors.text.tertiary },
                      ]}
                    >
                      {m.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Paid By + Tax */}
            <View
              style={[
                s.card,
                { backgroundColor: colors.bg.card, borderColor: colors.border.subtle, gap: 0 },
              ]}
            >
              <View style={s.infoRow}>
                <AntDesign  name="user" size={16} color={colors.text.tertiary} />
                <Text style={[s.infoLabel, { color: colors.text.secondary }]}>Paid By</Text>
                <TouchableOpacity style={[s.pill, { backgroundColor: colors.bg.tertiary }]}>
                  <Text style={[s.pillText, { color: colors.text.primary }]}>You</Text>
                  <AntDesign  name="down" size={12} color={colors.text.tertiary} />
                </TouchableOpacity>
              </View>
              <View style={[s.divider, { backgroundColor: colors.border.subtle }]} />
              <View style={s.infoRow}>
                <AntDesign  name="filetext1" size={16} color={colors.text.tertiary} />
                <Text style={[s.infoLabel, { color: colors.text.secondary }]}>Tax & Tip</Text>
                <TouchableOpacity style={[s.pill, { backgroundColor: colors.bg.tertiary }]}>
                  <Text style={[s.pillText, { color: colors.text.tertiary }]}>None</Text>
                  <AntDesign  name="down" size={12} color={colors.text.tertiary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Split Preview */}
            {totalAmount > 0 && activeMembers.length > 0 && (
              <View>
                <Text style={[s.sectionLabel, { color: colors.text.primary }]}>Preview</Text>
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

          </View>
        </ScrollView>

        <View style={{ paddingBottom: insets.bottom + 16, paddingHorizontal: 20, paddingTop: 12 }}>
          <TouchableOpacity
            onPress={handleCreateSplit}
            activeOpacity={0.85}
          >
            <View style={[s.createGrad, { backgroundColor: colors.accent.primary }]}>
              <AntDesign  name="swap" size={18} color="#FFF" />
              <Text style={s.createText}>Confirm Split</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingContainer>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },

  summaryCard: { borderRadius: 20, padding: 18, borderWidth: 1, gap: 4 },
  flexRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  nameInput: { fontSize: 16, fontWeight: '700', paddingVertical: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  currencyLabel: { fontSize: 28, fontWeight: '300' },
  amountInput: { fontSize: 32, fontWeight: '800', letterSpacing: -1, flex: 1, paddingVertical: 0 },

  card: { borderRadius: 20, padding: 18, borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },

  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
  },
  manualInput: { flex: 1, fontSize: 14, fontWeight: '600', paddingVertical: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  addBtnText: { fontSize: 13, fontWeight: '700' },

  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  memberName: { fontSize: 13, fontWeight: '600' },

  sectionLabel: { fontSize: 14, fontWeight: '700' },

  methodRow: { flexDirection: 'row', gap: 10 },
  methodCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  methodLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  methodDesc: { fontSize: 10, fontWeight: '500', textAlign: 'center', lineHeight: 14 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  infoLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pillText: { fontSize: 13, fontWeight: '600' },

  createGrad: {
    flexDirection: 'row',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
  },
  createText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
