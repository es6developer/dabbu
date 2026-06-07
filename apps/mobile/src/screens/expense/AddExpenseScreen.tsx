import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

const CATEGORY_CHIPS = ['Food', 'Travel', 'Bills', 'Shopping', 'Groceries', 'Entertainment'];

export function AddExpenseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const initialCategory = route.params?.category || 'Food';
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const inputRef = useRef<TextInput>(null);

  async function handleSave() {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }
    Alert.alert('Success', 'Expense added successfully!');
    navigation.goBack();
  }

  const fmtAmount = amount ? `₹${parseFloat(amount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00';

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingContainer>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <LinearGradient
            colors={['#6C3EF4', '#8B5CF6']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ paddingTop: insets.top + 12, paddingBottom: 28, paddingHorizontal: 20 }}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Add Expense</Text>
              <TouchableOpacity onPress={handleSave}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'expense' && styles.tabActive]}
              onPress={() => setActiveTab('expense')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'expense' ? '#6C3EF4' : colors.text.tertiary }]}>Expenses</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'income' && styles.tabActive]}
              onPress={() => setActiveTab('income')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'income' ? '#6C3EF4' : colors.text.tertiary }]}>Income</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => inputRef.current?.focus()} style={styles.amountSection}>
            <Text style={styles.amountDisplay}>{fmtAmount}</Text>
            <Text style={[styles.amountHint, { color: colors.text.tertiary }]}>Tap to edit amount</Text>
            <TextInput
              ref={inputRef}
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              autoFocus
            />
          </TouchableOpacity>

          <View style={{ paddingHorizontal: 20 }}>
            <View style={styles.chipRow}>
              {CATEGORY_CHIPS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, { backgroundColor: category === c ? '#6C3EF4' : colors.bg.card, borderColor: category === c ? '#6C3EF4' : colors.border.subtle }]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.chipText, { color: category === c ? '#FFF' : colors.text.secondary }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.notesRow, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <Ionicons name="create-outline" size={18} color={colors.text.tertiary} />
              <TextInput
                style={[styles.notesInput, { color: colors.text.primary }]}
                placeholder="Add a note..."
                placeholderTextColor={colors.text.tertiary}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <TouchableOpacity style={[styles.billBtn, { borderColor: colors.border.subtle }]}>
              <Ionicons name="camera-outline" size={20} color={colors.text.secondary} />
              <Text style={[styles.billBtnText, { color: colors.text.secondary }]}>Upload Bill Image</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.dateBtn, { borderColor: colors.border.subtle }]}>
              <Ionicons name="calendar-outline" size={20} color={colors.text.secondary} />
              <Text style={[styles.dateBtnText, { color: colors.text.secondary }]}>Today</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: colors.bg.secondary }]}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <LinearGradient
              colors={['#6C3EF4', '#8B5CF6']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.saveBtnGrad}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFF" />
              <Text style={styles.saveBtnText}>Save Expense</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  saveText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: 'transparent' },
  tabActive: { backgroundColor: '#6C3EF415' },
  tabText: { fontSize: 14, fontWeight: '600' },
  amountSection: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  amountDisplay: { fontSize: 44, fontWeight: '800', color: '#6C3EF4', letterSpacing: -2 },
  amountHint: { fontSize: 12, fontWeight: '500' },
  amountInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  notesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  notesInput: { flex: 1, fontSize: 15, paddingVertical: 14 },
  billBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', marginBottom: 12 },
  billBtnText: { fontSize: 14, fontWeight: '500' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  dateBtnText: { fontSize: 14, fontWeight: '500' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32 },
  saveBtn: { borderRadius: 16, overflow: 'hidden' },
  saveBtnGrad: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
