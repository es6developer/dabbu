import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';
import { LinearGradient } from 'expo-linear-gradient';

const PURPLE = '#8B5CF6';
const PURPLE_DARK = '#6D28D9';
const GREEN = '#10B981';

const CATEGORY_CHIPS = [
  { name: 'Food', icon: 'fast-food', color: '#F97316' },
  { name: 'Travel', icon: 'airplane', color: '#3B82F6' },
  { name: 'Bills', icon: 'receipt', color: '#14B8A6' },
  { name: 'Shopping', icon: 'cart', color: '#EC4899' },
  { name: 'Groceries', icon: 'basket', color: '#22C55E' },
  { name: 'Entertainment', icon: 'film', color: '#8B5CF6' },
  { name: 'Sports', icon: 'football', color: '#F59E0B' },
  { name: 'Other', icon: 'ellipsis-horizontal', color: '#6B7280' },
];

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

  const isExpense = activeTab === 'expense';

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <KeyboardAvoidingContainer
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 140 }}
        bounces
      >
        {/* Header */}
        <LinearGradient
          colors={[isExpense ? PURPLE : GREEN, isExpense ? PURPLE_DARK : '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={{ paddingTop: 12, paddingBottom: 28, paddingHorizontal: 20 }}>
            <View style={s.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                <Ionicons name="close-outline" size={22} color="#FFF" />
              </TouchableOpacity>
              <Text style={s.headerTitle}>Add {isExpense ? 'Expense' : 'Income'}</Text>
              <TouchableOpacity onPress={handleSave}>
                <Text style={s.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Type Tabs */}
        <View style={s.tabRow}>
          {(['expense', 'income'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                s.tab,
                activeTab === t && { backgroundColor: `${t === 'income' ? GREEN : PURPLE}15` },
              ]}
              onPress={() => setActiveTab(t)}
            >
              <Text
                style={[
                  s.tabText,
                  {
                    color:
                      activeTab === t ? (t === 'income' ? GREEN : PURPLE) : colors.text.tertiary,
                  },
                ]}
              >
                {t === 'expense' ? 'Expenses' : 'Income'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount */}
        <TouchableOpacity onPress={() => inputRef.current?.focus()} style={s.amountSection}>
          <Text style={[s.amountDisplay, { color: isExpense ? PURPLE : GREEN }]}>
            ₹
            {amount
              ? parseFloat(amount).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : '0.00'}
          </Text>
          <Text style={[s.amountHint, { color: colors.text.tertiary }]}>Tap to edit amount</Text>
          <TextInput
            ref={inputRef}
            style={s.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            autoFocus
          />
        </TouchableOpacity>

        {/* Category Chips */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={s.chipRow}>
            {CATEGORY_CHIPS.map((c) => {
              const selected = category === c.name;
              return (
                <TouchableOpacity
                  key={c.name}
                  style={[
                    s.chip,
                    {
                      backgroundColor: selected ? c.color : colors.bg.card,
                      borderColor: selected ? c.color : colors.border.subtle,
                    },
                  ]}
                  onPress={() => setCategory(c.name)}
                >
                  <Ionicons name={c.icon as any} size={16} color={selected ? '#FFF' : c.color} />
                  <Text
                    style={[s.chipText, { color: selected ? '#FFF' : colors.text.secondary }]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Notes */}
          <View
            style={[
              s.notesRow,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
            ]}
          >
            <Ionicons name="create-outline" size={18} color={colors.text.tertiary} />
            <TextInput
              style={[s.notesInput, { color: colors.text.primary }]}
              placeholder="Add a note..."
              placeholderTextColor={colors.text.tertiary}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Upload Bill */}
          <TouchableOpacity style={[s.outlineBtn, { borderColor: colors.border.subtle }]}>
            <Ionicons name="camera-outline" size={20} color={colors.text.secondary} />
            <Text style={[s.outlineBtnText, { color: colors.text.secondary }]}>
              Upload Bill Image
            </Text>
          </TouchableOpacity>

          {/* Date */}
          <TouchableOpacity style={[s.outlineBtn, { borderColor: colors.border.subtle }]}>
            <Ionicons name="calendar-outline" size={20} color={colors.text.secondary} />
            <Text style={[s.outlineBtnText, { color: colors.text.secondary }]}>Today</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingContainer>

      {/* Bottom Save - fixed at bottom, outside KeyboardAvoidingContainer */}
      <View
        style={[
          s.bottomBar,
          {
            backgroundColor: colors.bg.secondary,
            paddingBottom: Math.max(32, insets.bottom + 32),
          },
        ]}
      >
        <TouchableOpacity onPress={handleSave} activeOpacity={0.85}>
          <LinearGradient
            colors={[isExpense ? PURPLE : GREEN, isExpense ? PURPLE_DARK : '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.saveBtnGrad}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
            <Text style={s.saveBtnText}>Save {isExpense ? 'Expense' : 'Income'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  saveText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  tabRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },

  amountSection: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  amountDisplay: { fontSize: 44, fontWeight: '800', letterSpacing: -2 },
  amountHint: { fontSize: 12, fontWeight: '500' },
  amountInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },

  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  notesInput: { flex: 1, fontSize: 15, paddingVertical: 14 },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  outlineBtnText: { fontSize: 14, fontWeight: '500' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
  saveBtnGrad: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
