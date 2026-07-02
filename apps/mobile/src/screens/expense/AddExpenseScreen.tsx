import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { triggerDataRefresh } from '../../services/dataRefresh';

const EXPENSE_CATEGORIES = [
  { name: 'Food & Dining', icon: 'rest' as const, color: '#F97316' },
  { name: 'Groceries', icon: 'shoppingcart' as const, color: '#22C55E' },
  { name: 'Transport', icon: 'car' as const, color: '#3B82F6' },
  { name: 'Shopping', icon: 'tags' as const, color: '#EC4899' },
  { name: 'Bills & Utilities', icon: 'filetext1' as const, color: '#14B8A6' },
  { name: 'Entertainment', icon: 'playcircleo' as const, color: '#8B5CF6' },
  { name: 'Health & Fitness', icon: 'hearto' as const, color: '#EF4444' },
  { name: 'Education', icon: 'book' as const, color: '#6366F1' },
  { name: 'Travel', icon: 'earth' as const, color: '#06B6D4' },
  { name: 'Rent', icon: 'home' as const, color: '#F59E0B' },
  { name: 'Insurance', icon: 'Safety' as const, color: '#10B981' },
  { name: 'Other', icon: 'ellipsis1' as const, color: '#6B7280' },
];

const INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'wallet' as const, color: '#22C55E' },
  { name: 'Freelance', icon: 'laptop' as const, color: '#3B82F6' },
  { name: 'Business', icon: 'bank' as const, color: '#6366F1' },
  { name: 'Investments', icon: 'linechart' as const, color: '#8B5CF6' },
  { name: 'Rental Income', icon: 'home' as const, color: '#F59E0B' },
  { name: 'Refund', icon: 'retweet' as const, color: '#14B8A6' },
  { name: 'Gift', icon: 'gift' as const, color: '#EC4899' },
  { name: 'Other Income', icon: 'pluscircleo' as const, color: '#6B7280' },
];

const PAYMENT_METHODS = [
  { label: 'UPI', value: 'upi', icon: 'mobile1' as const, color: '#8B5CF6' },
  { label: 'Cash', value: 'cash', icon: 'wallet' as const, color: '#22C55E' },
  { label: 'Debit Card', value: 'debit_card', icon: 'creditcard' as const, color: '#6366F1' },
  { label: 'Credit Card', value: 'credit_card', icon: 'creditcard' as const, color: '#3B82F6' },
  { label: 'Net Banking', value: 'net_banking', icon: 'bank' as const, color: '#F59E0B' },
  { label: 'Bank Transfer', value: 'bank_transfer', icon: 'swap' as const, color: '#14B8A6' },
  { label: 'Other', value: 'other', icon: 'ellipsis1' as const, color: '#6B7280' },
];

const RECURRING_FREQUENCIES = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

const QUICK_AMOUNTS = ['100', '200', '500', '1000', '2000', '5000'];

const PADDING = 20;

function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function AddExpenseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const rawType = route.params?.type || 'expense';
  const initialType = rawType === 'income' ? 'income' : 'expense';
  const expenseGroupId = route.params?.expenseGroupId;
  const returnTo = route.params?.returnTo as string | undefined;
  const transactionId = route.params?.transactionId as string | undefined;
  const prefillAmount = route.params?.amount as string | undefined;
  const prefillDescription = route.params?.description as string | undefined;
  const prefillCategory = route.params?.category as string | undefined;
  const prefillDate = route.params?.date as string | undefined;
  const [amount, setAmount] = useState(prefillAmount || '');
  const [error, setError] = useState('');
  const keyRef = useRef(0);
  const [type, setType] = useState<'expense' | 'income'>(initialType);
  const initialCategory = initialType === 'expense' ? 'Food & Dining' : 'Salary';
  const [category, setCategory] = useState(prefillCategory || initialCategory);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [dateStr, setDateStr] = useState(fmtDate(new Date()));
  const [showPicker, setShowPicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly');
  const [saving, setSaving] = useState(false);

  const [loadingEdit, setLoadingEdit] = useState(!!transactionId);

  useEffect(() => {
    if (transactionId) {
      (async () => {
        try {
          const res = await api.get<any>(`/transactions/${transactionId}`);
          const txn = res?.data ?? res;
          if (txn) {
            setAmount(String(Number(txn.amount)));
            setType(txn.type === 'income' ? 'income' : 'expense');
            setCategory(txn.category || initialCategory);
            setDescription(txn.description || '');
            const d = new Date(txn.date || txn.createdAt || new Date());
            setDate(d);
            setDateStr(fmtDate(d));
            setPaymentMethod(txn.paymentMethod || 'upi');
            setIsRecurring(!!txn.isRecurring);
            if (txn.recurringFrequency) setFrequency(txn.recurringFrequency);
          }
        } catch {
          // silent
        } finally {
          setLoadingEdit(false);
        }
      })();
    } else if (prefillAmount) {
      setAmount(prefillAmount);
      if (prefillDescription) setDescription(prefillDescription);
      if (prefillCategory) setCategory(prefillCategory);
      if (prefillDate) {
        const d = new Date(prefillDate);
        if (!isNaN(d.getTime())) { setDate(d); setDateStr(fmtDate(d)); }
      }
    }
  }, [transactionId]);

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const accentColor = type === 'expense' ? colors.status.error : colors.status.success;

  const handleTypeChange = useCallback((t: 'expense' | 'income') => {
    setType(t);
    setCategory(t === 'expense' ? 'Food & Dining' : 'Salary');
  }, []);

  const handleDateChange = useCallback((_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
      setDateStr(fmtDate(selectedDate));
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter an amount');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    if (date > new Date()) {
      setError('Expense date cannot be in the future');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    setError('');
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      const payload: Record<string, any> = {
        amount: parseFloat(amount),
        type,
        category,
        date: date.toISOString(),
      };
      if (expenseGroupId) {
        payload.expenseGroupId = expenseGroupId;
      }
      if (description) {
        payload.description = description;
      }
      if (paymentMethod) {
        payload.paymentMethod = paymentMethod;
      }
      if (isRecurring) {
        payload.isRecurring = true;
        payload.recurringFrequency = frequency;
      }
      if (transactionId) {
        await api.patch(`/transactions/${transactionId}`, payload);
      } else {
        await api.post('/transactions', payload);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      triggerDataRefresh('add-expense');
      if (returnTo) {
        navigation.navigate(returnTo as any);
      } else {
        navigation.goBack();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save transaction';
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSaving(false);
    }
  }, [
    amount,
    type,
    category,
    date,
    description,
    paymentMethod,
    isRecurring,
    frequency,
    navigation,
    transactionId,
    expenseGroupId,
    returnTo,
  ]);

  if (loadingEdit) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <LinearGradient
        colors={isDark ? ['#1A0A2E', colors.bg.primary] : ['#F0E6FF', colors.bg.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.15]}
        style={{ flex: 1 }}
      >
        <View
          style={{
            paddingTop: insets.top + 6,
            paddingHorizontal: PADDING,
            paddingBottom: 4,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 28,
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(10,10,15,0.05)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AntDesign name="arrowleft" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              fontSize: 18,
              fontWeight: '700',
              color: colors.text.primary,
              textAlign: 'center',
              marginRight: 38,
            }}
          >
            {type === 'expense' ? 'Add Expense' : 'Add Income'}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: PADDING, paddingTop: 14, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: colors.bg.tertiary,
              borderRadius: 28,
              padding: 3,
              marginBottom: 16,
            }}
          >
            {(['expense', 'income'] as const).map((t) => {
              const active = type === t;
              const tColor = t === 'expense' ? colors.status.error : colors.status.success;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => handleTypeChange(t)}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 12,
                    borderRadius: 26,
                    backgroundColor: active ? tColor : 'transparent',
                  }}
                >
                  <AntDesign
                    name={t === 'expense' ? 'arrowdown' : 'arrowup'}
                    size={14}
                    color={active ? '#FFF' : colors.text.tertiary}
                  />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '700',
                      color: active ? '#FFF' : colors.text.secondary,
                    }}
                  >
                    {t === 'expense' ? 'Expense' : 'Income'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {error ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                padding: 14,
                borderRadius: 28,
                backgroundColor: colors.status.error + '10',
                marginBottom: 16,
              }}
            >
              <AntDesign name="exclamationcircle" size={14} color={colors.status.error} />
              <Text
                style={{ fontSize: 15, fontWeight: '600', color: colors.status.error, flex: 1 }}
              >
                {error}
              </Text>
            </View>
          ) : null}

          <View
            style={{
              borderRadius: 28,
              borderWidth: 1.5,
              borderColor: colors.border.subtle,
              padding: 18,
              backgroundColor: colors.bg.card,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                color: colors.text.tertiary,
                marginBottom: 8,
              }}
            >
              Amount
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text.primary, marginRight: 6 }}>
                ₹
              </Text>
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 28,
                  fontWeight: '700',
                  color: colors.text.primary,
                  padding: 0,
                }}
                value={amount}
                onChangeText={(t) => {
                  setAmount(t.replace(/[^0-9.]/g, ''));
                  setError('');
                }}
                placeholder="0.00"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
            {amount.length > 0 && (
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.tertiary, marginTop: 2 }}>
                ₹{parseFloat(amount || '0').toLocaleString('en-IN')}
              </Text>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {QUICK_AMOUNTS.map((q) => (
                <TouchableOpacity
                  key={q}
                  onPress={() => { setAmount(q); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 7,
                    borderRadius: 24,
                    borderWidth: 1.5,
                    backgroundColor: amount === q ? `${accentColor}15` : colors.bg.secondary,
                    borderColor: amount === q ? accentColor : colors.border.subtle,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: amount === q ? accentColor : colors.text.secondary,
                    }}
                  >
                    ₹{q}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  color: colors.text.tertiary,
                  marginBottom: 6,
                }}
              >
                Date
              </Text>
              <TouchableOpacity
                onPress={() => setShowPicker(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  borderRadius: 28,
                  borderWidth: 1.5,
                  backgroundColor: colors.bg.card,
                  borderColor: colors.border.subtle,
                }}
              >
                <AntDesign name="calendar" size={16} color={colors.accent.primary} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary, flex: 1 }}>
                  {dateStr}
                </Text>
                <AntDesign name="down" size={10} color={colors.text.tertiary} />
              </TouchableOpacity>
              {showPicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  color: colors.text.tertiary,
                  marginBottom: 6,
                }}
              >
                Recurring
              </Text>
              <TouchableOpacity
                onPress={() => setIsRecurring(!isRecurring)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  borderRadius: 28,
                  borderWidth: 1.5,
                  backgroundColor: isRecurring ? `${accentColor}12` : colors.bg.card,
                  borderColor: isRecurring ? accentColor : colors.border.subtle,
                }}
              >
                <AntDesign
                  name={isRecurring ? 'checkcircle' : 'clockcircleo'}
                  size={15}
                  color={isRecurring ? accentColor : colors.text.tertiary}
                />
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: isRecurring ? accentColor : colors.text.secondary,
                  }}
                >
                  {isRecurring ? 'Recurring' : 'One-time'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                color: colors.text.tertiary,
                marginBottom: 6,
              }}
            >
              Payment Method
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {PAYMENT_METHODS.map((pm) => {
                const active = paymentMethod === pm.value;
                return (
                  <TouchableOpacity
                    key={pm.value}
                    onPress={() => {
                      setPaymentMethod(pm.value);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 28,
                      borderWidth: 1.5,
                      backgroundColor: active ? `${pm.color}15` : colors.bg.card,
                      borderColor: active ? pm.color : colors.border.subtle,
                    }}
                  >
                    <AntDesign name={pm.icon} size={13} color={active ? pm.color : colors.text.tertiary} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: active ? pm.color : colors.text.secondary,
                      }}
                    >
                      {pm.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                color: colors.text.tertiary,
                marginBottom: 6,
              }}
            >
              Category
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {categories.map((cat) => {
                const active = category === cat.name;
                return (
                  <TouchableOpacity
                    key={cat.name}
                    onPress={() => {
                      setCategory(cat.name);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 28,
                      borderWidth: 1.5,
                      backgroundColor: active ? `${cat.color}18` : colors.bg.card,
                      borderColor: active ? cat.color : colors.border.subtle,
                    }}
                  >
                    <AntDesign name={cat.icon} size={13} color={active ? cat.color : colors.text.tertiary} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: active ? cat.color : colors.text.secondary,
                      }}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                color: colors.text.tertiary,
                marginBottom: 6,
              }}
            >
              {type === 'expense' ? 'Description (optional)' : 'Source (optional)'}
            </Text>
            <TextInput
              style={{
                fontSize: 16,
                fontWeight: '500',
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderRadius: 28,
                borderWidth: 1.5,
                backgroundColor: colors.bg.card,
                borderColor: colors.border.subtle,
                color: colors.text.primary,
              }}
              value={description}
              onChangeText={setDescription}
              placeholder={
                type === 'expense' ? 'What did you spend on?' : 'Where did the money come from?'
              }
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {isRecurring && (
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  color: colors.text.tertiary,
                  marginBottom: 6,
                }}
              >
                Frequency
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {RECURRING_FREQUENCIES.map((f) => {
                  const active = frequency === f.value;
                  return (
                    <TouchableOpacity
                      key={f.value}
                      onPress={() => setFrequency(f.value)}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        paddingVertical: 12,
                        borderRadius: 28,
                        borderWidth: 1.5,
                        backgroundColor: active ? `${accentColor}15` : colors.bg.card,
                        borderColor: active ? accentColor : colors.border.subtle,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: active ? accentColor : colors.text.secondary,
                        }}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !amount}
            activeOpacity={0.85}
            style={{
              borderRadius: 28,
              overflow: 'hidden',
              marginTop: 8,
              opacity: saving || !amount ? 0.6 : 1,
            }}
          >
            <LinearGradient
              colors={[accentColor, accentColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 18,
              }}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <AntDesign
                    name={type === 'expense' ? 'arrowdown' : 'arrowup'}
                    size={18}
                    color="#FFF"
                  />
                  <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '800' }}>
                    {type === 'expense' ? 'Save Expense' : 'Save Income'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}
