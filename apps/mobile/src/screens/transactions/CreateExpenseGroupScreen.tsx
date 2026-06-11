import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
  ScrollView,
  Switch,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W } = Dimensions.get('window');
const PURPLE = '#8B5CF6';
const PURPLE_DARK = '#6D28D9';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ICONS = [
  { key: 'people', label: 'People', color: '#8B5CF6' },
  { key: 'home', label: 'Home', color: '#10B981' },
  { key: 'heart', label: 'Heart', color: '#EC4899' },
  { key: 'star', label: 'Star', color: '#F59E0B' },
  { key: 'briefcase', label: 'Work', color: '#3B82F6' },
  { key: 'cart', label: 'Cart', color: '#F97316' },
  { key: 'airplane', label: 'Travel', color: '#06B6D4' },
  { key: 'restaurant', label: 'Food', color: '#F97316' },
  { key: 'car', label: 'Car', color: '#14B8A6' },
  { key: 'fitness', label: 'Fitness', color: '#22C55E' },
];

const COUNTRY_CODE = '+91';

export function CreateExpenseGroupScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('people');
  const [members, setMembers] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pullRecurring, setPullRecurring] = useState(false);
  const [recurringTx, setRecurringTx] = useState<any[]>([]);
  const [selectedRecurring, setSelectedRecurring] = useState<Set<string>>(new Set());
  const [loadingRecurring, setLoadingRecurring] = useState(false);
  const inputsRef = useRef<(TextInput | null)[]>([]);
  const searchTimeoutRef = useRef<{ [key: number]: ReturnType<typeof setTimeout> }>({});
  const [searchResults, setSearchResults] = useState<{ [key: number]: any[] }>({});

  const updateMember = useCallback((index: number, value: string) => {
    const digits = value.replace(/[^0-9]/g, '');
    setMembers((prev) => {
      const n = [...prev];
      n[index] = digits;
      return n;
    });
    if (searchTimeoutRef.current[index]) {
      clearTimeout(searchTimeoutRef.current[index]);
    }
    if (digits.length >= 3) {
      searchTimeoutRef.current[index] = setTimeout(async () => {
        try {
          const res = await api.get<any>(`/users/search?query=${COUNTRY_CODE}${digits}`);
          setSearchResults((prev) => ({
            ...prev,
            [index]: Array.isArray(res) ? res : res?.data || [],
          }));
        } catch {
          setSearchResults((prev) => ({ ...prev, [index]: [] }));
        }
      }, 400);
    } else {
      setSearchResults((prev) => {
        const n = { ...prev };
        delete n[index];
        return n;
      });
    }
  }, []);

  const addRow = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMembers((prev) => [...prev, '']);
    setTimeout(() => inputsRef.current[inputsRef.current.length - 1]?.focus(), 150);
  }, []);

  const removeRow = useCallback((index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const selectUser = useCallback(
    (index: number, user: any) => {
      const phone = (user.phone || '')
        .replace(COUNTRY_CODE, '')
        .replace(/[^0-9]/g, '')
        .slice(0, 10);
      setMembers((prev) => {
        const n = [...prev];
        n[index] = phone;
        return n;
      });
      setSearchResults((prev) => {
        const n = { ...prev };
        delete n[index];
        return n;
      });
      const nextIndex = index + 1;
      if (nextIndex >= members.length) {
        addRow();
      } else {
        setTimeout(() => inputsRef.current[nextIndex]?.focus(), 150);
      }
    },
    [members.length],
  );

  const isValidPhone = (phone: string) => phone.length === 10;

  useEffect(() => {
    if (pullRecurring && recurringTx.length === 0 && !loadingRecurring) {
      loadRecurringTransactions();
    }
  }, [pullRecurring]);

  async function loadRecurringTransactions() {
    setLoadingRecurring(true);
    try {
      if (accessToken) {
        setAccessToken(accessToken);
      }
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const res = await api.get<any>(
        `/transactions?startDate=${lastMonth.toISOString()}&endDate=${lastMonthEnd.toISOString()}&recurring=true`,
      );
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setRecurringTx(list);
      setSelectedRecurring(new Set(list.map((t: any) => t.id)));
    } catch {
      /* silent */
    } finally {
      setLoadingRecurring(false);
    }
  }

  function toggleRecurring(id: string) {
    setSelectedRecurring((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    const validPhones = members.map((m) => m.trim()).filter(Boolean);
    const invalid = validPhones.filter((p) => !isValidPhone(p));
    if (invalid.length > 0) {
      setError(`Invalid phone${invalid.length > 1 ? 's' : ''}: ${invalid.join(', ')}`);
      return;
    }
    setError('');
    setSaving(true);
    if (accessToken) {
      setAccessToken(accessToken);
    }
    try {
      const payload: any = { name: name.trim(), icon, currency: 'INR' };
      if (description.trim()) {
        payload.description = description.trim();
      }
      if (validPhones.length > 0) {
        payload.memberPhones = validPhones.map((p) => `${COUNTRY_CODE}${p}`);
      }
      if (pullRecurring && selectedRecurring.size > 0) {
        payload.importRecurringIds = Array.from(selectedRecurring);
      }
      await api.post('/expense-groups', payload);
      navigation.goBack();
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('limit')) {
        Alert.alert('Plan Limit', msg, [
          {
            text: 'Upgrade',
            onPress: () => navigation.navigate('Settings', { screen: 'Subscription' }),
          },
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else {
        setError(msg || 'Failed to create group');
      }
    } finally {
      setSaving(false);
    }
  }

  const activeIcon = ICONS.find((i) => i.key === icon);

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      {/* Header */}
      <LinearGradient colors={[PURPLE, PURPLE_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 52, paddingBottom: 28 }}>
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Ionicons name="close" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>New Split Group</Text>
            <View style={{ width: 34 }} />
          </View>
          <Text style={s.headerSub}>Create a circle to split expenses with your people</Text>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <View style={[s.errorBox, { backgroundColor: `${colors.status.error}12` }]}>
            <Ionicons name="alert-circle" size={16} color={colors.status.error} />
            <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
          </View>
        ) : null}

        {/* Group Name */}
        <View style={s.fieldBlock}>
          <Text style={[s.label, { color: colors.text.secondary }]}>Group Name</Text>
          <TextInput
            style={[
              s.input,
              {
                backgroundColor: colors.bg.card,
                color: colors.text.primary,
                borderColor: colors.border.subtle,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Goa Trip, Roommates"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        {/* Description */}
        <View style={s.fieldBlock}>
          <Text style={[s.label, { color: colors.text.secondary }]}>Description (optional)</Text>
          <TextInput
            style={[
              s.input,
              {
                backgroundColor: colors.bg.card,
                color: colors.text.primary,
                borderColor: colors.border.subtle,
                minHeight: 60,
                textAlignVertical: 'top',
              },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="What's this group for?"
            placeholderTextColor={colors.text.tertiary}
            multiline
          />
        </View>

        {/* Icon Picker */}
        <View style={s.fieldBlock}>
          <Text style={[s.label, { color: colors.text.secondary }]}>Icon</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.iconRow}
          >
            {ICONS.map((ic) => {
              const active = icon === ic.key;
              return (
                <TouchableOpacity
                  key={ic.key}
                  style={[
                    s.iconBtn,
                    {
                      borderColor: active ? ic.color : colors.border.subtle,
                      backgroundColor: active ? `${ic.color}18` : colors.bg.card,
                    },
                  ]}
                  onPress={() => setIcon(ic.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={ic.key as any}
                    size={22}
                    color={active ? ic.color : colors.text.tertiary}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Members */}
        <View style={s.fieldBlock}>
          <Text style={[s.label, { color: colors.text.secondary }]}>
            Members{' '}
            <Text
              style={{
                fontWeight: '400',
                textTransform: 'none',
                color: colors.text.tertiary,
                fontSize: 10,
              }}
            >
              (max 2 on Free)
            </Text>
          </Text>
          {members.map((phone, index) => (
            <View key={index} style={{ marginBottom: 8 }}>
              <View
                style={[
                  s.memberRow,
                  { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
                ]}
              >
                <View style={[s.memberAvatar, { backgroundColor: `${PURPLE}15` }]}>
                  <Text style={{ color: PURPLE, fontSize: 12, fontWeight: '700' }}>
                    {(phone || '?')[0]}
                  </Text>
                </View>
                <Text style={[s.countryCode, { color: colors.text.tertiary }]}>{COUNTRY_CODE}</Text>
                <TextInput
                  ref={(ref) => {
                    inputsRef.current[index] = ref;
                  }}
                  style={[s.memberInput, { color: colors.text.primary }]}
                  value={phone}
                  onChangeText={(v) => updateMember(index, v)}
                  placeholder="9876543210"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="phone-pad"
                  maxLength={10}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    index === members.length - 1 ? addRow() : inputsRef.current[index + 1]?.focus();
                  }}
                />
                {phone.trim() ? (
                  <TouchableOpacity onPress={() => removeRow(index)} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                  </TouchableOpacity>
                ) : null}
              </View>
              {searchResults[index]?.length > 0 && (
                <View
                  style={[
                    s.suggestions,
                    { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
                  ]}
                >
                  {searchResults[index].map((user: any) => (
                    <TouchableOpacity
                      key={user.id}
                      style={[s.suggestionRow, { borderBottomColor: colors.border.subtle }]}
                      onPress={() => selectUser(index, user)}
                    >
                      <View style={[s.suggestionAvatar, { backgroundColor: `${PURPLE}15` }]}>
                        <Text style={{ color: PURPLE, fontSize: 12, fontWeight: '800' }}>
                          {user.firstName?.[0] || user.phone?.[0] || '?'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.suggestionName, { color: colors.text.primary }]}>
                          {user.firstName || ''} {user.lastName || ''}
                        </Text>
                        <Text style={[s.suggestionDetail, { color: colors.text.tertiary }]}>
                          {user.phone || ''}
                          {user.email ? ` · ${user.email}` : ''}
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={20} color={PURPLE} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
          <TouchableOpacity style={s.addMemberBtn} onPress={addRow} activeOpacity={0.7}>
            <Ionicons name="add-circle-outline" size={18} color={PURPLE} />
            <Text style={[s.addMemberText, { color: PURPLE }]}>Add another member</Text>
          </TouchableOpacity>
        </View>

        {/* Recurring Import */}
        <View
          style={[
            s.recurringCard,
            { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
          ]}
        >
          <View style={s.recurringHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[s.recurringTitle, { color: colors.text.primary }]}>
                Pull recurring from last month?
              </Text>
              <Text style={[s.recurringSub, { color: colors.text.tertiary }]}>
                Import last month's recurring expenses into this circle
              </Text>
            </View>
            <Switch
              value={pullRecurring}
              onValueChange={setPullRecurring}
              trackColor={{ false: colors.border.subtle, true: PURPLE }}
              thumbColor="#FFFFFF"
            />
          </View>
          {pullRecurring && (
            <View style={{ marginTop: 12, gap: 8 }}>
              {loadingRecurring ? (
                <Text
                  style={{
                    fontSize: 13,
                    textAlign: 'center',
                    paddingVertical: 12,
                    color: colors.text.tertiary,
                  }}
                >
                  Loading...
                </Text>
              ) : recurringTx.length === 0 ? (
                <Text
                  style={{
                    fontSize: 13,
                    textAlign: 'center',
                    paddingVertical: 12,
                    color: colors.text.tertiary,
                  }}
                >
                  No recurring transactions found
                </Text>
              ) : (
                recurringTx.map((tx) => (
                  <TouchableOpacity
                    key={tx.id}
                    style={s.recurringItem}
                    onPress={() => toggleRecurring(tx.id)}
                  >
                    <Ionicons
                      name={selectedRecurring.has(tx.id) ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={selectedRecurring.has(tx.id) ? PURPLE : colors.text.tertiary}
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[s.recurringItemText, { color: colors.text.primary }]}>
                        {tx.description || 'Transaction'}
                      </Text>
                      <Text style={[s.recurringItemSub, { color: colors.text.tertiary }]}>
                        ₹{Number(tx.amount).toLocaleString('en-IN')} ·{' '}
                        {tx.category?.name || tx.category || 'Other'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        {/* Plan Info */}
        <View
          style={[
            s.planInfo,
            { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
          ]}
        >
          <Ionicons name="shield-outline" size={14} color="#EF4444" />
          <Text style={[s.planInfoText, { color: colors.text.tertiary }]}>
            Free plan: 5 circles max · 2 members per circle
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings', { screen: 'Subscription' })}
          >
            <Text style={{ color: PURPLE, fontSize: 13, fontWeight: '800' }}>Upgrade</Text>
          </TouchableOpacity>
        </View>

        {/* Save */}
        <TouchableOpacity
          onPress={handleCreate}
          disabled={saving}
          activeOpacity={0.85}
          style={{ marginTop: 8, opacity: saving ? 0.6 : 1 }}
        >
          <LinearGradient
            colors={[PURPLE, PURPLE_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.saveGrad}
          >
            <Ionicons name={saving ? 'hourglass-outline' : 'add'} size={18} color="#FFF" />
            <Text style={s.saveText}>{saving ? 'Creating...' : 'Create Split Group'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
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
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 8,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, flex: 1 },

  fieldBlock: { marginBottom: 20 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '500',
  },

  iconRow: { gap: 8, paddingVertical: 4 },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingRight: 8,
    minHeight: 54,
    gap: 6,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  countryCode: { fontSize: 14, fontWeight: '700' },
  memberInput: { flex: 1, fontSize: 15, fontWeight: '600', paddingVertical: 13 },

  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  addMemberText: { fontSize: 14, fontWeight: '600' },

  suggestions: { marginTop: 4, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionName: { fontSize: 14, fontWeight: '700' },
  suggestionDetail: { fontSize: 11, marginTop: 1, fontWeight: '500' },

  recurringCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 16 },
  recurringHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recurringTitle: { fontSize: 14, fontWeight: '700' },
  recurringSub: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  recurringItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  recurringItemText: { fontSize: 14, fontWeight: '600' },
  recurringItemSub: { fontSize: 12, marginTop: 1, fontWeight: '500' },

  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  planInfoText: { flex: 1, fontSize: 11, fontWeight: '500' },

  saveGrad: {
    flexDirection: 'row',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
  },
  saveText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
