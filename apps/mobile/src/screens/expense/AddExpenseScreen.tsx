import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../config/categoryIcons';
import { api, setAccessToken, getAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_PAD = 20;
const GRID_GAP = 10;
const ITEM_W = (SCREEN_W - CARD_PAD * 2 - GRID_GAP * 3) / 4;

const FREQUENT_CATEGORIES = ['Food & Dining', 'Groceries', 'Transportation', 'Shopping', 'Bills', 'Utilities'];

export function AddExpenseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { accessToken } = useAuth();

  const prefill = route.params?.prefill;
  const editingTransaction = route.params?.transaction;
  const isEditing = Boolean(editingTransaction?.id);

  const [amount, setAmount] = useState(isEditing ? String(editingTransaction?.amount ?? '') : prefill?.amount ? String(prefill.amount) : '');
  const [category, setCategory] = useState(isEditing ? (editingTransaction?.category?.name || editingTransaction?.category || '') : (prefill?.categoryName || route.params?.category || ''));
  const [notes, setNotes] = useState(isEditing ? (editingTransaction?.description || '') : (prefill?.description || ''));
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>(isEditing ? (editingTransaction?.type || 'expense') : (prefill?.type === 'income' || route.params?.type === 'income' ? 'income' : 'expense'));
  const [showAllCats, setShowAllCats] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const tabAnim = useRef(new Animated.Value(activeTab === 'income' ? 1 : 0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  const categories = useMemo(
    () => (activeTab === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES),
    [activeTab],
  );

  const frequentCats = useMemo(
    () => categories.filter((c) => FREQUENT_CATEGORIES.includes(c.name)),
    [categories],
  );
  const otherCats = useMemo(
    () => categories.filter((c) => !FREQUENT_CATEGORIES.includes(c.name)),
    [categories],
  );

  const switchTab = useCallback(
    (tab: 'expense' | 'income') => {
      setActiveTab(tab);
      setCategory('');
      Animated.spring(tabAnim, {
        toValue: tab === 'income' ? 1 : 0,
        useNativeDriver: false,
        tension: 100,
        friction: 10,
      }).start();
    },
    [tabAnim],
  );

  const toggleExpand = useCallback(() => {
    setShowAllCats((prev) => {
      Animated.timing(expandAnim, {
        toValue: prev ? 0 : 1,
        duration: 250,
        useNativeDriver: false,
      }).start();
      return !prev;
    });
  }, [expandAnim]);

  async function handleSave() {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }
    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    setSaving(true);
    if (accessToken) setAccessToken(accessToken);
    try {
      const data: any = {
        amount: parseFloat(amount),
        type: activeTab,
        description: notes.trim() || `${category} ${activeTab}`,
        category: category,
      };
      if (prefill?.groupId) {
        data.expenseGroupId = prefill.groupId;
      }
      if (isEditing) {
        await api.patch(`/transactions/${editingTransaction.id}`, data);
        showToast('Transaction updated');
      } else {
        await api.post('/transactions', data);
        showToast('Transaction created');
      }
      if (!isEditing && prefill?.returnTo) {
        navigation.navigate(prefill.returnTo, { groupId: prefill.groupId, groupName: prefill.groupName });
      } else {
        navigation.goBack();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const isExpense = activeTab === 'expense';
  const accentColor = isExpense ? '#7C3AED' : '#34C759';
  const accentDark = isExpense ? '#6D28D9' : '#28A745';

  const displayAmount = amount
    ? parseFloat(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00';

  const tabIndicatorLeft = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_W / 2 - CARD_PAD],
  });

  const tabIndicatorW = (SCREEN_W - CARD_PAD * 2) / 2;

  const renderCategoryItem = useCallback(
    (cat: { name: string; icon: string; color: string }, index: number) => {
      const selected = category === cat.name;
      return (
        <TouchableOpacity
          key={`${cat.name}-${index}`}
          activeOpacity={0.7}
          onPress={() => setCategory(cat.name)}
          style={[
            s.catItem,
            {
              backgroundColor: selected ? cat.color : colors.bg.card,
              borderColor: selected ? cat.color : colors.border.subtle,
              width: ITEM_W,
            },
          ]}
        >
          <View
            style={[
              s.catIconWrap,
              {
                backgroundColor: selected
                  ? 'rgba(255,255,255,0.25)'
                  : `${cat.color}18`,
              },
            ]}
          >
            <AntDesign
              name={cat.icon as any}
              size={22}
              color={selected ? '#FFF' : cat.color}
            />
          </View>
          <Text
            style={[
              s.catLabel,
              { color: selected ? '#FFF' : colors.text.secondary },
            ]}
            numberOfLines={1}
          >
            {cat.name === 'Food & Dining' ? 'Dining' : cat.name}
          </Text>
        </TouchableOpacity>
      );
    },
    [category, colors],
  );

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <LinearGradient
          colors={[accentColor, accentDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={{ paddingTop: insets.top + 8, paddingBottom: 20, paddingHorizontal: CARD_PAD }}>
            <View style={s.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                <AntDesign name="close" size={20} color="#FFF" />
              </TouchableOpacity>
              <Text style={s.headerTitle}>{isEditing ? 'Edit Transaction' : 'Add Transaction'}</Text>
              <TouchableOpacity onPress={handleSave} disabled={saving} style={s.headerSave}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={s.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Type Tabs */}
        <View style={[s.tabContainer, { backgroundColor: colors.bg.primary }]}>
          <View style={[s.tabTrack, { backgroundColor: colors.bg.tertiary }]}>
            <Animated.View
              style={[
                s.tabIndicator,
                {
                  width: tabIndicatorW,
                  backgroundColor: accentColor,
                  left: tabIndicatorLeft,
                },
              ]}
            />
            {(['expense', 'income'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={s.tabBtn}
                onPress={() => switchTab(t)}
                activeOpacity={0.7}
              >
                <AntDesign
                  name={t === 'expense' ? 'arrowdown' : 'arrowup'}
                  size={14}
                  color={activeTab === t ? '#FFF' : colors.text.tertiary}
                />
                <Text
                  style={[
                    s.tabLabel,
                    {
                      color: activeTab === t ? '#FFF' : colors.text.tertiary,
                      fontWeight: activeTab === t ? '700' : '500',
                    },
                  ]}
                >
                  {t === 'expense' ? 'Expense' : 'Income'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Amount */}
        <TouchableOpacity
          onPress={() => inputRef.current?.focus()}
          style={[s.amountCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
          activeOpacity={0.95}
        >
          <Text style={[s.currencySymbol, { color: colors.text.tertiary }]}>₹</Text>
          <Text style={[s.amountValue, { color: accentColor }]}>{displayAmount}</Text>
          <Text style={[s.amountTapHint, { color: colors.text.tertiary }]}>
            {amount ? '' : 'Tap to enter amount'}
          </Text>
          <TextInput
            ref={inputRef}
            style={s.hiddenInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            autoFocus
          />
        </TouchableOpacity>

        {/* Categories */}
        <View style={{ paddingHorizontal: CARD_PAD, marginTop: 8 }}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.text.primary }]}>Category</Text>
            {category ? (
              <TouchableOpacity onPress={() => setCategory('')}>
                <Text style={[s.clearBtn, { color: colors.text.tertiary }]}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={[s.subSectionLabel, { color: colors.text.tertiary }]}>Frequently Used</Text>
          <View style={s.catGrid}>
            {frequentCats.map((cat, i) => renderCategoryItem(cat, i))}
          </View>

          <TouchableOpacity
            onPress={toggleExpand}
            style={[s.expandBtn, { borderColor: colors.border.subtle }]}
            activeOpacity={0.7}
          >
            <Text style={[s.expandBtnText, { color: colors.text.secondary }]}>
              {showAllCats ? 'Show Less' : `All Categories (${otherCats.length})`}
            </Text>
            <AntDesign
              name={showAllCats ? 'up' : 'down'}
              size={12}
              color={colors.text.tertiary}
            />
          </TouchableOpacity>

          {showAllCats && (
            <View style={[s.catGrid, { marginTop: 8 }]}>
              {otherCats.map((cat, i) => renderCategoryItem(cat, i))}
            </View>
          )}

          <View
            style={[
              s.notesRow,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
            ]}
          >
            <AntDesign name="edit" size={18} color={colors.text.tertiary} />
            <TextInput
              style={[s.notesInput, { color: colors.text.primary }]}
              placeholder="Add a note..."
              placeholderTextColor={colors.text.tertiary}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
            >
              <AntDesign name="calendar" size={16} color={colors.text.secondary} />
              <Text style={[s.actionBtnText, { color: colors.text.secondary }]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}
            >
              <AntDesign name="camera" size={16} color={colors.text.secondary} />
              <Text style={[s.actionBtnText, { color: colors.text.secondary }]}>Add Bill</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          s.bottomBar,
          {
            backgroundColor: colors.bg.secondary,
            paddingBottom: Math.max(insets.bottom + 12, 28),
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving || !amount || !category}
        >
          <LinearGradient
            colors={[accentColor, accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              s.saveBtnGrad,
              { opacity: amount && category ? 1 : 0.5 },
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <AntDesign name="checkcircleo" size={18} color="#FFF" />
                <Text style={s.saveBtnText}>
                  {isEditing ? 'Update' : 'Add'} {isExpense ? 'Expense' : 'Income'} • ₹{displayAmount}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  headerSave: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  saveText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  tabContainer: {
    paddingHorizontal: CARD_PAD,
    paddingVertical: 12,
  },
  tabTrack: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 11,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
    zIndex: 1,
  },
  tabLabel: { fontSize: 14 },

  amountCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginHorizontal: CARD_PAD,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 24,
    position: 'relative',
  },
  currencySymbol: { fontSize: 28, fontWeight: '600' },
  amountValue: { fontSize: 40, fontWeight: '800', letterSpacing: -1.5 },
  amountTapHint: {
    position: 'absolute',
    bottom: 8,
    right: 24,
    fontSize: 11,
    fontWeight: '500',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  clearBtn: { fontSize: 12, fontWeight: '600' },
  subSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },

  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  catItem: {
    width: ITEM_W,
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  catIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },

  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  expandBtnText: { fontSize: 12, fontWeight: '600' },

  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    marginBottom: 10,
  },
  notesInput: { flex: 1, fontSize: 15, paddingVertical: 14 },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  actionBtnText: { fontSize: 13, fontWeight: '600' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: CARD_PAD,
    paddingTop: 12,
  },
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
