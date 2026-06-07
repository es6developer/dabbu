import React, { useCallback, useRef, useState, useEffect } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import {
  PremiumActionButton,
  PremiumError,
  PremiumFormScreen,
  PremiumInput,
  premiumFormStyles,
} from '../../components/ui';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ICONS = [
  'people',
  'home',
  'heart',
  'star',
  'briefcase',
  'cart',
  'airplane',
  'restaurant',
  'car',
  'fitness',
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
  const searchTimeoutRef = useRef<{[key: number]: NodeJS.Timeout}>({});
  const [searchResults, setSearchResults] = useState<{[key: number]: any[]}>({});

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
        const next = { ...prev };
        delete next[index];
        return next;
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

  const selectUser = useCallback((index: number, user: any) => {
    const phone = (user.phone || '').replace(COUNTRY_CODE, '').replace(/[^0-9]/g, '').slice(0, 10);
    setMembers((prev) => {
      const next = [...prev];
      next[index] = phone;
      return next;
    });
    setSearchResults((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    const nextIndex = index + 1;
    if (nextIndex >= members.length) {
      addRow();
    } else {
      setTimeout(() => inputsRef.current[nextIndex]?.focus(), 150);
    }
  }, [members.length]);

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
    } catch (e) {
      // silently fail
    } finally {
      setLoadingRecurring(false);
    }
  }

  function toggleRecurring(id: string) {
    setSelectedRecurring((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
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

  return (
    <PremiumFormScreen
      title="New Circle"
      subtitle="Create a polished expense circle for roommates, trips, families, or friends."
      icon="people"
      accent={[colors.accent.primary, colors.status.info]}
    >
      <PremiumError message={error} />
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
        <PremiumInput
          label="Circle name"
          icon="people-outline"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Roommates, Road Trip"
          required
        />

        <PremiumInput
          label="Description"
          icon="document-text-outline"
          value={description}
          onChangeText={setDescription}
          placeholder="What's this circle for?"
          multiline
          numberOfLines={3}
        />

        <Text style={[styles.label, { color: colors.text.tertiary }]}>Choose Icon</Text>
        <View style={premiumFormStyles.rowWrap}>
          {ICONS.map((ic) => (
            <TouchableOpacity
              key={ic}
              style={[
                styles.iconBtn,
                { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
                icon === ic && {
                  backgroundColor: `${colors.accent.primary}20`,
                  borderColor: colors.accent.primary,
                },
              ]}
              onPress={() => setIcon(ic)}
            >
              <Ionicons
                name={ic as any}
                size={22}
                color={icon === ic ? colors.accent.primary : colors.text.tertiary}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.memberSection}>
          <Text style={[styles.label, { color: colors.text.tertiary }]}>
            Members{' '}
            <Text style={{ fontWeight: '400', textTransform: 'none' }}>(max 2 on Free)</Text>
          </Text>

          {members.map((phone, index) => (
            <View key={index} style={styles.memberRow}>
              <View
                style={[
                  styles.memberInputWrap,
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
                {phone.trim() && (
                  <TouchableOpacity onPress={() => removeRow(index)} style={styles.memberRemoveBtn}>
                    <Ionicons name="close-circle" size={18} color={colors.status.error} />
                  </TouchableOpacity>
                )}
              </View>
              {searchResults[index]?.length > 0 && (
                <View style={[styles.suggestions, { backgroundColor: colors.bg.secondary, borderColor: colors.border.subtle }]}>
                  {searchResults[index].map((user: any) => (
                    <TouchableOpacity
                      key={user.id}
                      style={[styles.suggestionRow, { borderBottomColor: colors.border.subtle }]}
                      onPress={() => selectUser(index, user)}
                    >
                      <View style={[styles.suggestionAvatar, { backgroundColor: `${colors.accent.primary}20` }]}>
                        <Text style={{ color: colors.accent.primary, fontSize: 13, fontWeight: '700' }}>
                          {user.firstName?.[0] || user.phone?.[0] || '?'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.suggestionName, { color: colors.text.primary }]}>
                          {user.phone || ''} - {user.firstName || ''} {user.lastName || ''}
                        </Text>
                        {user.email && (
                          <Text style={[styles.suggestionEmail, { color: colors.text.tertiary }]}>
                            {user.email}
                          </Text>
                        )}
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
              trackColor={{ false: colors.border.subtle, true: colors.accent.primary }}
              thumbColor="#FFF"
            />
          </View>
          {pullRecurring && (
            <View style={styles.recurringList}>
              {loadingRecurring ? (
                <Text style={[styles.recurringLoading, { color: colors.text.tertiary }]}>
                  Loading recurring transactions...
                </Text>
              ) : recurringTx.length === 0 ? (
                <Text style={[styles.recurringEmpty, { color: colors.text.tertiary }]}>
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
      </ScrollView>

      <View style={[styles.planInfo, { backgroundColor: colors.bg.tertiary }]}>
        <Ionicons name="shield-outline" size={16} color="#FF6B6B" />
        <Text style={[styles.planInfoText, { color: colors.text.tertiary }]}>
          Free plan: 5 circles max · 2 members per circle
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings', { screen: 'Subscription' })}
        >
          <Text style={[styles.planUpgrade, { color: colors.accent.primary }]}>Upgrade</Text>
        </TouchableOpacity>
      </View>

      <PremiumActionButton
        title="Create circle"
        onPress={handleCreate}
        loading={saving}
        icon="add"
      />
    </PremiumFormScreen>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  memberSection: { marginTop: 8 },
  memberRow: { marginBottom: 8 },
  memberInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingRight: 8,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    paddingLeft: 14,
    paddingRight: 4,
  },
  memberInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 6,
    paddingVertical: 14,
  },
  memberRemoveBtn: { padding: 4 },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  addMemberText: { fontSize: 14, fontWeight: '600' },
  recurringCard: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  recurringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recurringTitle: { fontSize: 15, fontWeight: '600' },
  recurringSub: { fontSize: 12, marginTop: 2 },
  recurringList: { marginTop: 12, gap: 8 },
  recurringLoading: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  recurringEmpty: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  recurringItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  recurringItemText: { fontSize: 14, fontWeight: '500' },
  recurringItemSub: { fontSize: 12, marginTop: 1 },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
  },
  planInfoText: { flex: 1, fontSize: 12 },
  planUpgrade: { fontSize: 13, fontWeight: '700' },
  suggestions: {
    marginTop: 4,
    borderRadius: 12,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionName: { fontSize: 14, fontWeight: '600' },
  suggestionEmail: { fontSize: 11, marginTop: 1 },
});
