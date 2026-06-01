import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { DatePickerField } from '../../components/ui/DatePickerField';
import { PageContainer } from '../../components/ui/PageContainer';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

const CATEGORIES = [
  'Groceries',
  'Dining',
  'Transport',
  'Shopping',
  'Utilities',
  'Entertainment',
  'Health',
  'Education',
  'Rent',
  'Other',
];

interface BillItem {
  name: string;
  quantity: number;
  price: number;
}

interface Bill {
  id: string;
  merchantName: string;
  category: string;
  billDate: string;
  totalAmount: number;
  items: BillItem[];
  notes: string;
  confidence: number;
  rawText: string;
  imageUrl?: string;
}

function getConfidenceColor(score: number, colors: any): string {
  if (score >= 0.7) {
    return colors.status.success;
  }
  if (score >= 0.4) {
    return colors.status.warning;
  }
  return colors.status.error;
}

export function BillDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accessToken } = useAuth();
  const { billId } = route.params;

  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showOcr, setShowOcr] = useState(false);

  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<BillItem[]>([]);

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    fetchBill();
  }, [accessToken, billId]);

  async function fetchBill() {
    try {
      const res = await api.get<any>(`/bills/${billId}`);
      if (res.success && res.data) {
        const b = res.data as Bill;
        setBill(b);
        setMerchant(b.merchantName || '');
        setCategory(b.category || '');
        setDate(b.billDate || '');
        setNotes(b.notes || '');
        setItems(b.items || []);
      } else {
        throw new Error('Bill not found');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load bill');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  function updateItem(index: number, field: keyof BillItem, value: string) {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === 'name' ? value : Number(value) || 0,
      };
      return updated;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, { name: '', quantity: 1, price: 0 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function calculateTotal(): number {
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  }

  async function handleSave() {
    if (!merchant.trim()) {
      Alert.alert('Validation', 'Merchant name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        merchantName: merchant.trim(),
        category,
        billDate: date,
        notes: notes.trim(),
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      };
      const res = await api.patch<any>(`/bills/${billId}`, payload);
      if (res.success) {
        Alert.alert('Saved', 'Bill updated successfully.');
        navigation.goBack();
      } else {
        throw new Error('Save failed');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete Bill',
      'Are you sure you want to delete this bill? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ],
    );
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/bills/${billId}`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not delete bill.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <View style={[styles.centered, { backgroundColor: colors.bg.primary }]}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </PageContainer>
    );
  }

  const total = calculateTotal();

  return (
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <View style={styles.container}>
          {bill && (
            <View
              style={[
                styles.confidenceBadge,
                { backgroundColor: `${getConfidenceColor(bill.confidence, colors)}22` },
              ]}
            >
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={getConfidenceColor(bill.confidence, colors)}
              />
              <Text
                style={[
                  styles.confidenceText,
                  { color: getConfidenceColor(bill.confidence, colors) },
                ]}
              >
                AI Confidence: {Math.round(bill.confidence * 100)}%
              </Text>
            </View>
          )}

          <View
            style={[
              styles.card,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
          >
            <Text style={[styles.fieldLabel, { color: colors.text.tertiary }]}>Merchant</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: colors.text.primary,
                  borderColor: colors.border.subtle,
                  backgroundColor: colors.bg.tertiary,
                },
              ]}
              value={merchant}
              onChangeText={setMerchant}
              placeholder="Merchant name"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
          >
            <Text style={[styles.fieldLabel, { color: colors.text.tertiary }]}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor:
                        category === cat ? `${colors.accent.primary}22` : colors.bg.tertiary,
                      borderColor: category === cat ? colors.accent.primary : colors.border.subtle,
                    },
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: category === cat ? colors.accent.primary : colors.text.secondary },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
          >
            <DatePickerField label="Date" value={date} onChange={setDate} />
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.fieldLabel, { color: colors.text.tertiary }]}>Items</Text>
              <TouchableOpacity
                onPress={addItem}
                style={[styles.addItemBtn, { backgroundColor: `${colors.accent.primary}15` }]}
              >
                <Ionicons name="add" size={18} color={colors.accent.primary} />
                <Text style={[styles.addItemText, { color: colors.accent.primary }]}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {items.map((item, index) => (
              <View key={index} style={[styles.itemRow, { borderColor: colors.border.subtle }]}>
                <View style={styles.itemFields}>
                  <TextInput
                    style={[
                      styles.itemNameInput,
                      {
                        color: colors.text.primary,
                        borderColor: colors.border.subtle,
                        backgroundColor: colors.bg.tertiary,
                      },
                    ]}
                    value={item.name}
                    onChangeText={(v) => updateItem(index, 'name', v)}
                    placeholder="Item name"
                    placeholderTextColor={colors.text.tertiary}
                  />
                  <View style={styles.itemNumericRow}>
                    <TextInput
                      style={[
                        styles.itemNumericInput,
                        {
                          color: colors.text.primary,
                          borderColor: colors.border.subtle,
                          backgroundColor: colors.bg.tertiary,
                        },
                      ]}
                      value={String(item.quantity)}
                      onChangeText={(v) => updateItem(index, 'quantity', v)}
                      keyboardType="numeric"
                      placeholder="Qty"
                      placeholderTextColor={colors.text.tertiary}
                    />
                    <TextInput
                      style={[
                        styles.itemNumericInput,
                        {
                          color: colors.text.primary,
                          borderColor: colors.border.subtle,
                          backgroundColor: colors.bg.tertiary,
                        },
                      ]}
                      value={String(item.price)}
                      onChangeText={(v) => updateItem(index, 'price', v)}
                      keyboardType="numeric"
                      placeholder="Price"
                      placeholderTextColor={colors.text.tertiary}
                    />
                  </View>
                </View>
                <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeItem}>
                  <Ionicons name="trash-outline" size={18} color={colors.status.error} />
                </TouchableOpacity>
              </View>
            ))}

            {items.length > 0 && (
              <View style={[styles.totalRow, { borderTopColor: colors.border.subtle }]}>
                <Text style={[styles.totalLabel, { color: colors.text.secondary }]}>Total</Text>
                <Text style={[styles.totalValue, { color: colors.text.primary }]}>
                  ₹
                  {total.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            )}
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
            ]}
          >
            <Text style={[styles.fieldLabel, { color: colors.text.tertiary }]}>Notes</Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  color: colors.text.primary,
                  borderColor: colors.border.subtle,
                  backgroundColor: colors.bg.tertiary,
                },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes..."
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {bill?.rawText ? (
            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle },
              ]}
              onPress={() => setShowOcr(!showOcr)}
            >
              <View style={styles.ocrHeader}>
                <Ionicons name="document-text-outline" size={18} color={colors.text.secondary} />
                <Text style={[styles.ocrTitle, { color: colors.text.secondary }]}>
                  Raw OCR Text
                </Text>
                <Ionicons
                  name={showOcr ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.text.tertiary}
                />
              </View>
              {showOcr && (
                <Text
                  style={[
                    styles.ocrText,
                    { color: colors.text.tertiary, borderTopColor: colors.border.subtle },
                  ]}
                >
                  {bill.rawText}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: colors.status.success, opacity: saving ? 0.6 : 1 },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deleteBtn,
              { borderColor: colors.status.error, opacity: deleting ? 0.6 : 1 },
            ]}
            onPress={confirmDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={colors.status.error} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color={colors.status.error} />
                <Text style={[styles.deleteBtnText, { color: colors.status.error }]}>
                  Delete Bill
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 16,
  },
  confidenceText: { fontSize: 12, fontWeight: '600' },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 80,
  },
  categoryScroll: { flexDirection: 'row', marginBottom: 4 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: { fontSize: 13, fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addItemText: { fontSize: 13, fontWeight: '600' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  itemFields: { flex: 1 },
  itemNameInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 6,
  },
  itemNumericRow: { flexDirection: 'row', gap: 8 },
  itemNumericInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  removeItem: { padding: 8, marginTop: 4 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: 14, fontWeight: '600' },
  totalValue: { fontSize: 18, fontWeight: '700' },
  ocrHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ocrTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  ocrText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '600' },
});
