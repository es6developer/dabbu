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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import {
  PremiumFormScreen,
  PremiumInput,
  PremiumActionButton,
  PremiumError,
  premiumFormStyles,
} from '../../components/ui/PremiumForm';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ICONS = [
  { key: 'people', label: 'People', color: '#14B8A6' },
  { key: 'home', label: 'Home', color: '#34C759' },
  { key: 'heart', label: 'Heart', color: '#FF6B9D' },
  { key: 'star', label: 'Star', color: '#14B8A6' },
  { key: 'briefcase', label: 'Work', color: '#4F6EF7' },
  { key: 'cart', label: 'Cart', color: '#FF6B6B' },
  { key: 'airplane', label: 'Travel', color: '#60A5FA' },
  { key: 'restaurant', label: 'Food', color: '#F59E0B' },
  { key: 'car', label: 'Car', color: '#14B8A6' },
  { key: 'fitness', label: 'Fitness', color: '#34C759' },
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
  const searchTimeoutRef = useRef<{ [key: number]: NodeJS.Timeout }>({});
  const [searchResults, setSearchResults] = useState<{ [key: number]: any[] }>({});

  const updateMember = useCallback((index: number, value: string) => {
    const digits = value.replace(/[^0-9]/g, '');
    setMembers((prev) => {
      const next = [...prev];
      next[index] = digits;
      return next;
    });
    if (searchTimeoutRef.current[index]) {
      clearTimeout(searchTimeoutRef.current[index]);
    }
    if (digits.length >= 3) {
      searchTimeoutRef.current[index] = setTimeout(async () => {
        try {
          const res = await api.get<any>(`/users/search?query=${COUNTRY_CODE}${digits}`);
          const users = Array.isArray(res) ? res : res?.data || [];
          setSearchResults((prev) => ({ ...prev, [index]: users }));
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
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError('Circle name is required');
      return;
    }
    const validPhones = members.map((m) => m.trim()).filter(Boolean);
    const invalid = validPhones.filter((p) => !isValidPhone(p));
    if (invalid.length > 0) {
      setError(`Invalid phone number${invalid.length > 1 ? 's' : ''}: ${invalid.join(', ')}`);
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
      navigation.navigate('ExpenseHome', { screen: 'SharedCircles' });
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
        setError(msg || 'Failed to create circle');
      }
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <View style={styles.footer}>
      <PremiumActionButton
        title="Create Split Group"
        icon="add"
        onPress={handleCreate}
        loading={saving}
      />
    </View>
  );

  return (
    <PremiumFormScreen
      title="New Split Group"
      subtitle="Create a circle to split expenses with your people"
      icon="git-network"
      footer={footer}
    >
      <PremiumError message={error} />

      <PremiumInput
        label="Group Name"
        icon="text"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Goa Trip, Roommates"
        required
      />

      <PremiumInput
        label="Description"
        icon="document-text"
        value={description}
        onChangeText={setDescription}
        placeholder="What's this group for?"
        multiline
      />

      <View style={styles.fieldBlock}>
        <Text style={[styles.label, { color: colors.text.tertiary }]}>Choose Icon</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.iconRow}
        >
          {ICONS.map((ic) => {
            const active = icon === ic.key;
            return (
              <TouchableOpacity
                key={ic.key}
                style={[
                  styles.iconBtn,
                  {
                    borderColor: active ? ic.color : colors.border.subtle,
                    backgroundColor: active ? `${ic.color}1A` : colors.bg.tertiary,
                  },
                ]}
                onPress={() => setIcon(ic.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={ic.key as any}
                  size={20}
                  color={active ? ic.color : colors.text.tertiary}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.fieldBlock}>
        <Text style={[styles.label, { color: colors.text.tertiary }]}>
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
                styles.memberRow,
                { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
              ]}
            >
              <Text style={[styles.countryCode, { color: colors.text.tertiary }]}>
                {COUNTRY_CODE}
              </Text>
              <TextInput
                ref={(ref) => {
                  inputsRef.current[index] = ref;
                }}
                style={[styles.memberInput, { color: colors.text.primary }]}
                value={phone}
                onChangeText={(v) => updateMember(index, v)}
                placeholder="9876543210"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="phone-pad"
                maxLength={10}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (index === members.length - 1) {
                    addRow();
                  } else {
                    inputsRef.current[index + 1]?.focus();
                  }
                }}
              />
              {phone.trim() ? (
                <TouchableOpacity onPress={() => removeRow(index)} style={styles.removeBtn}>
                  <Ionicons name="close-circle" size={18} color="#FF4D4F" />
                </TouchableOpacity>
              ) : null}
            </View>
            {searchResults[index]?.length > 0 && (
              <View
                style={[
                  styles.suggestions,
                  { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                ]}
              >
                {searchResults[index].map((user: any) => (
                  <TouchableOpacity
                    key={user.id}
                    style={[styles.suggestionRow, { borderBottomColor: colors.border.subtle }]}
                    onPress={() => selectUser(index, user)}
                  >
                    <View
                      style={[
                        styles.suggestionAvatar,
                        { backgroundColor: `${colors.accent.primary}15` },
                      ]}
                    >
                      <Text
                        style={{ color: colors.accent.primary, fontSize: 12, fontWeight: '800' }}
                      >
                        {user.firstName?.[0] || user.phone?.[0] || '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.suggestionName, { color: colors.text.primary }]}>
                        {user.firstName || ''} {user.lastName || ''}
                      </Text>
                      <Text style={[styles.suggestionDetail, { color: colors.text.tertiary }]}>
                        {user.phone || ''}
                        {user.email ? ` · ${user.email}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="add-circle" size={20} color={colors.accent.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.addMemberBtn} onPress={addRow} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={18} color={colors.accent.primary} />
          <Text style={[styles.addMemberText, { color: colors.accent.primary }]}>
            Add another member
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.recurringCard,
          { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
        ]}
      >
        <View style={styles.recurringHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.recurringTitle, { color: colors.text.primary }]}>
              Pull recurring from last month?
            </Text>
            <Text style={[styles.recurringSub, { color: colors.text.tertiary }]}>
              Import last month's recurring expenses into this circle
            </Text>
          </View>
          <Switch
            value={pullRecurring}
            onValueChange={setPullRecurring}
            trackColor={{ false: 'rgba(255,255,255,0.12)', true: '#8B5CF6' }}
            thumbColor="#FFFFFF"
          />
        </View>
        {pullRecurring && (
          <View style={{ marginTop: 12, gap: 8 }}>
            {loadingRecurring ? (
              <Text style={[styles.recurringStatus, { color: colors.text.tertiary }]}>
                Loading recurring transactions...
              </Text>
            ) : recurringTx.length === 0 ? (
              <Text style={[styles.recurringStatus, { color: colors.text.tertiary }]}>
                No recurring transactions found from last month
              </Text>
            ) : (
              recurringTx.map((tx) => (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.recurringItem}
                  onPress={() => toggleRecurring(tx.id)}
                >
                  <Ionicons
                    name={selectedRecurring.has(tx.id) ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={
                      selectedRecurring.has(tx.id) ? colors.accent.primary : colors.text.tertiary
                    }
                  />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.recurringItemText, { color: colors.text.primary }]}>
                      {tx.description || 'Transaction'}
                    </Text>
                    <Text style={[styles.recurringItemSub, { color: colors.text.tertiary }]}>
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

      <View
        style={[
          styles.planInfo,
          { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
        ]}
      >
        <Ionicons name="shield-outline" size={14} color="#FF6B6B" />
        <Text style={[styles.planInfoText, { color: colors.text.tertiary }]}>
          Free plan: 5 circles max · 2 members per circle
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings', { screen: 'Subscription' })}
        >
          <Text style={{ color: colors.accent.primary, fontSize: 13, fontWeight: '800' }}>
            Upgrade
          </Text>
        </TouchableOpacity>
      </View>
    </PremiumFormScreen>
  );
}

const styles = StyleSheet.create({
  fieldBlock: {
    marginBottom: 15,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  iconRow: {
    gap: 8,
    paddingVertical: 4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    paddingRight: 8,
    minHeight: 54,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: '700',
    paddingLeft: 14,
    paddingRight: 4,
  },
  memberInput: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 6,
    fontWeight: '600',
    paddingVertical: 13,
  },
  removeBtn: {
    padding: 4,
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  addMemberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  suggestions: {
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
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
  suggestionName: {
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionDetail: {
    fontSize: 11,
    marginTop: 1,
    fontWeight: '500',
  },
  recurringCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  recurringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recurringTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  recurringSub: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  recurringStatus: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
    fontWeight: '500',
  },
  recurringItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  recurringItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  recurringItemSub: {
    fontSize: 12,
    marginTop: 1,
    fontWeight: '500',
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  planInfoText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    marginTop: 8,
  },
});
