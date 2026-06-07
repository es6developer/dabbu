import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { SplitSummaryCard } from '../../components/ui/SplitSummaryCard';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

const SPLIT_METHODS = [
  { key: 'equal', label: 'Equal', icon: 'reorder-three-outline', desc: 'Split equally among all' },
  { key: 'percentage', label: 'Percentage', icon: 'pie-chart-outline', desc: 'Split by percentage' },
  { key: 'manual', label: 'Manual', icon: 'create-outline', desc: 'Enter custom amounts' },
];

const MEMBERS = [
  { name: 'Karthik', id: '1' },
  { name: 'Jayasri', id: '2' },
];

export function SplitExpenseScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [expenseName, setExpenseName] = useState('');
  const [amount, setAmount] = useState('');
  const [splitMethod, setSplitMethod] = useState('equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(['1', '2']);

  function toggleMember(id: string) {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  }

  const totalAmount = parseFloat(amount) || 0;
  const activeMembers = MEMBERS.filter(m => selectedMembers.includes(m.id));
  const sharePerPerson = activeMembers.length > 0 ? totalAmount / activeMembers.length : 0;

  function handleCreateSplit() {
    if (!expenseName.trim()) { Alert.alert('Error', 'Please enter an expense name'); return; }
    if (totalAmount <= 0) { Alert.alert('Error', 'Please enter a valid amount'); return; }
    if (activeMembers.length < 2) { Alert.alert('Error', 'Please select at least 2 members'); return; }
    Alert.alert('Success', 'Split created successfully!');
    navigation.goBack();
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingContainer>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <LinearGradient
            colors={['#6C3EF4', '#8B5CF6']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ paddingTop: insets.top + 12, paddingBottom: 28, paddingHorizontal: 20 }}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Create Split</Text>
              <View style={{ width: 32 }} />
            </View>
          </LinearGradient>

          <View style={{ padding: 20 }}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Expense Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
              placeholder="e.g. Dinner at restaurant"
              placeholderTextColor={colors.text.tertiary}
              value={expenseName}
              onChangeText={setExpenseName}
            />

            <Text style={[styles.label, { color: colors.text.secondary, marginTop: 16 }]}>Amount</Text>
            <View style={[styles.amountRow, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <Text style={[styles.currency, { color: colors.text.primary }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text.primary }]}
                placeholder="0"
                placeholderTextColor={colors.text.tertiary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={[styles.label, { color: colors.text.secondary, marginTop: 16 }]}>Members</Text>
            <View style={styles.memberRow}>
              {MEMBERS.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.memberChip, { borderColor: selectedMembers.includes(m.id) ? '#6C3EF4' : colors.border.subtle, backgroundColor: selectedMembers.includes(m.id) ? '#6C3EF415' : colors.bg.card }]}
                  onPress={() => toggleMember(m.id)}
                >
                  <View style={[styles.memberAvatar, { backgroundColor: selectedMembers.includes(m.id) ? '#6C3EF4' : colors.text.tertiary }]}>
                    <Text style={styles.memberAvatarText}>{m.name[0]}</Text>
                  </View>
                  <Text style={[styles.memberName, { color: selectedMembers.includes(m.id) ? '#6C3EF4' : colors.text.secondary }]}>{m.name}</Text>
                  {selectedMembers.includes(m.id) && <Ionicons name="checkmark-circle" size={16} color="#6C3EF4" />}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.text.secondary, marginTop: 16 }]}>Split Method</Text>
            <View style={styles.methodGrid}>
              {SPLIT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.methodCard, { borderColor: splitMethod === m.key ? '#6C3EF4' : colors.border.subtle, backgroundColor: splitMethod === m.key ? '#6C3EF4' : colors.bg.card }]}
                  onPress={() => setSplitMethod(m.key)}
                >
                  <Ionicons name={m.icon as any} size={22} color={splitMethod === m.key ? '#FFF' : colors.text.secondary} />
                  <Text style={[styles.methodLabel, { color: splitMethod === m.key ? '#FFF' : colors.text.primary }]}>{m.label}</Text>
                  <Text style={[styles.methodDesc, { color: splitMethod === m.key ? 'rgba(255,255,255,0.7)' : colors.text.tertiary }]}>{m.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {totalAmount > 0 && activeMembers.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>Split Preview</Text>
                <SplitSummaryCard
                  totalAmount={totalAmount}
                  members={activeMembers.map(m => ({
                    name: m.name,
                    amount: splitMethod === 'equal' ? sharePerPerson : Math.round(totalAmount * (100 / activeMembers.length) / 100),
                  }))}
                  splitMethod={splitMethod}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.createBtn]}
              onPress={handleCreateSplit}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#6C3EF4', '#8B5CF6']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.createBtnGrad}
              >
                <Ionicons name="swap-horizontal" size={18} color="#FFF" />
                <Text style={styles.createBtnText}>Create Split</Text>
              </LinearGradient>
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
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { fontSize: 15, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 16 },
  currency: { fontSize: 22, fontWeight: '700', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 24, fontWeight: '700', paddingVertical: 14 },
  memberRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  memberChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  memberAvatar: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  memberName: { fontSize: 13, fontWeight: '600' },
  methodGrid: { gap: 10 },
  methodCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1 },
  methodLabel: { fontSize: 15, fontWeight: '700', flex: 1 },
  methodDesc: { fontSize: 11, fontWeight: '500' },
  createBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 24 },
  createBtnGrad: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
