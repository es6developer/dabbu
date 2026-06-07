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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { KeyboardAvoidingContainer } from '../../components/ui/KeyboardAvoidingContainer';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ICONS = [
  { key: 'people', label: 'People', color: '#6C3EF4' },
  { key: 'home', label: 'Home', color: '#34C759' },
  { key: 'heart', label: 'Heart', color: '#FF6B9D' },
  { key: 'star', label: 'Star', color: '#F3D28F' },
  { key: 'briefcase', label: 'Work', color: '#4F6EF7' },
  { key: 'cart', label: 'Cart', color: '#FF6B6B' },
  { key: 'airplane', label: 'Travel', color: '#60A5FA' },
  { key: 'restaurant', label: 'Food', color: '#F59E0B' },
  { key: 'car', label: 'Car', color: '#6366F1' },
  { key: 'fitness', label: 'Fitness', color: '#34C759' },
];

const COUNTRY_CODE = '+91';

export function CreateExpenseGroupScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

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
    if (searchTimeoutRef.current[index]) clearTimeout(searchTimeoutRef.current[index]);
    if (digits.length >= 3) {
      searchTimeoutRef.current[index] = setTimeout(async () => {
        try {
          const res = await api.get<any>(`/users/search?query=${COUNTRY_CODE}${digits}`);
          const users = Array.isArray(res) ? res : res?.data || [];
          setSearchResults((prev) => ({ ...prev, [index]: users }));
        } catch { setSearchResults((prev) => ({ ...prev, [index]: [] })); }
      }, 400);
    } else {
      setSearchResults((prev) => { const n = { ...prev }; delete n[index]; return n; });
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
    setMembers((prev) => { const n = [...prev]; n[index] = phone; return n; });
    setSearchResults((prev) => { const n = { ...prev }; delete n[index]; return n; });
    const nextIndex = index + 1;
    if (nextIndex >= members.length) addRow();
    else setTimeout(() => inputsRef.current[nextIndex]?.focus(), 150);
  }, [members.length]);

  const isValidPhone = (phone: string) => phone.length === 10;

  useEffect(() => {
    if (pullRecurring && recurringTx.length === 0 && !loadingRecurring) loadRecurringTransactions();
  }, [pullRecurring]);

  async function loadRecurringTransactions() {
    setLoadingRecurring(true);
    try {
      if (accessToken) setAccessToken(accessToken);
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const res = await api.get<any>(`/transactions?startDate=${lastMonth.toISOString()}&endDate=${lastMonthEnd.toISOString()}&recurring=true`);
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setRecurringTx(list);
      setSelectedRecurring(new Set(list.map((t: any) => t.id)));
    } catch { /* silent */ }
    finally { setLoadingRecurring(false); }
  }

  function toggleRecurring(id: string) {
    setSelectedRecurring((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Circle name is required'); return; }
    const validPhones = members.map((m) => m.trim()).filter(Boolean);
    const invalid = validPhones.filter((p) => !isValidPhone(p));
    if (invalid.length > 0) { setError(`Invalid phone number${invalid.length > 1 ? 's' : ''}: ${invalid.join(', ')}`); return; }
    setError(''); setSaving(true);
    if (accessToken) setAccessToken(accessToken);
    try {
      const payload: any = { name: name.trim(), icon, currency: 'INR' };
      if (description.trim()) payload.description = description.trim();
      if (validPhones.length > 0) payload.memberPhones = validPhones.map((p) => `${COUNTRY_CODE}${p}`);
      if (pullRecurring && selectedRecurring.size > 0) payload.importRecurringIds = Array.from(selectedRecurring);
      await api.post('/expense-groups', payload);
      navigation.navigate('ExpenseHome', { screen: 'SharedCircles' });
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('limit')) {
        Alert.alert('Plan Limit', msg, [
          { text: 'Upgrade', onPress: () => navigation.navigate('Settings', { screen: 'Subscription' }) },
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else setError(msg || 'Failed to create circle');
    } finally { setSaving(false); }
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
              <Text style={styles.headerTitle}>New Split Group</Text>
              <View style={{ width: 32 }} />
            </View>
            <Text style={styles.headerSub}>Create a circle to split expenses with your people</Text>
          </LinearGradient>

          <View style={{ padding: 20, gap: 16 }}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: '#FF4D4F12' }]}>
                <Ionicons name="alert-circle" size={16} color="#FF4D4F" />
                <Text style={[styles.errorText, { color: '#FF4D4F' }]}>{error}</Text>
              </View>
            ) : null}

            <View>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Group Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
                value={name} onChangeText={setName}
                placeholder="e.g. Goa Trip, Roommates"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.bg.card, color: colors.text.primary, borderColor: colors.border.subtle }]}
                value={description} onChangeText={setDescription}
                placeholder="What's this group for?"
                placeholderTextColor={colors.text.tertiary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Choose Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
                {ICONS.map((ic) => {
                  const active = icon === ic.key;
                  return (
                    <TouchableOpacity
                      key={ic.key}
                      style={[styles.iconBtn, { borderColor: active ? ic.color : colors.border.subtle, backgroundColor: active ? `${ic.color}20` : colors.bg.card }]}
                      onPress={() => setIcon(ic.key)}
                    >
                      <Ionicons name={ic.key as any} size={22} color={active ? ic.color : colors.text.tertiary} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View>
              <Text style={[styles.label, { color: colors.text.secondary }]}>
                Members <Text style={{ fontWeight: '400', textTransform: 'none', color: colors.text.tertiary }}>(max 2 on Free)</Text>
              </Text>
              {members.map((phone, index) => (
                <Animated.View key={index} style={{ marginBottom: 8 }}>
                  <View style={[styles.memberRow, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
                    <Text style={[styles.countryCode, { color: colors.text.tertiary }]}>{COUNTRY_CODE}</Text>
                    <TextInput
                      ref={(ref) => { inputsRef.current[index] = ref; }}
                      style={[styles.memberInput, { color: colors.text.primary }]}
                      value={phone} onChangeText={(v) => updateMember(index, v)}
                      placeholder="9876543210" placeholderTextColor={colors.text.tertiary}
                      keyboardType="phone-pad" maxLength={10} returnKeyType="done"
                      onSubmitEditing={() => { if (index === members.length - 1) addRow(); else inputsRef.current[index + 1]?.focus(); }}
                    />
                    {phone.trim() && (
                      <TouchableOpacity onPress={() => removeRow(index)}>
                        <Ionicons name="close-circle" size={18} color="#FF4D4F" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {searchResults[index]?.length > 0 && (
                    <View style={[styles.suggestions, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
                      {searchResults[index].map((user: any) => (
                        <TouchableOpacity
                          key={user.id}
                          style={[styles.suggestionRow, { borderBottomColor: colors.border.subtle }]}
                          onPress={() => selectUser(index, user)}
                        >
                          <View style={[styles.suggestionAvatar, { backgroundColor: '#6C3EF415' }]}>
                            <Text style={{ color: '#6C3EF4', fontSize: 13, fontWeight: '800' }}>{user.firstName?.[0] || user.phone?.[0] || '?'}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.suggestionName, { color: colors.text.primary }]}>{user.phone || ''} - {user.firstName || ''} {user.lastName || ''}</Text>
                            {user.email && <Text style={[styles.suggestionEmail, { color: colors.text.tertiary }]}>{user.email}</Text>}
                          </View>
                          <Ionicons name="add-circle" size={20} color="#6C3EF4" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </Animated.View>
              ))}
              <TouchableOpacity style={styles.addMemberBtn} onPress={addRow} activeOpacity={0.7}>
                <Ionicons name="add-circle-outline" size={18} color="#6C3EF4" />
                <Text style={[styles.addMemberText, { color: '#6C3EF4' }]}>Add another member</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.recurringCard, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <View style={styles.recurringHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recurringTitle, { color: colors.text.primary }]}>Pull recurring from last month?</Text>
                  <Text style={[styles.recurringSub, { color: colors.text.tertiary }]}>Import last month's recurring expenses into this circle</Text>
                </View>
                <Switch value={pullRecurring} onValueChange={setPullRecurring} trackColor={{ false: colors.border.subtle, true: '#6C3EF4' }} thumbColor="#FFF" />
              </View>
              {pullRecurring && (
                <View style={{ marginTop: 12, gap: 8 }}>
                  {loadingRecurring ? (
                    <Text style={[styles.recurringLoading, { color: colors.text.tertiary }]}>Loading recurring transactions...</Text>
                  ) : recurringTx.length === 0 ? (
                    <Text style={[styles.recurringEmpty, { color: colors.text.tertiary }]}>No recurring transactions found from last month</Text>
                  ) : (
                    recurringTx.map((tx) => (
                      <TouchableOpacity key={tx.id} style={styles.recurringItem} onPress={() => toggleRecurring(tx.id)}>
                        <Ionicons name={selectedRecurring.has(tx.id) ? 'checkbox' : 'square-outline'} size={20} color={selectedRecurring.has(tx.id) ? '#6C3EF4' : colors.text.tertiary} />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={[styles.recurringItemText, { color: colors.text.primary }]}>{tx.description || 'Transaction'}</Text>
                          <Text style={[styles.recurringItemSub, { color: colors.text.tertiary }]}>₹{Number(tx.amount).toLocaleString('en-IN')} · {tx.category?.name || tx.category || 'Other'}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>

            <View style={[styles.planInfo, { backgroundColor: colors.bg.card, borderColor: colors.border.subtle }]}>
              <Ionicons name="shield-outline" size={16} color="#FF6B6B" />
              <Text style={[styles.planInfoText, { color: colors.text.tertiary }]}>Free plan: 5 circles max · 2 members per circle</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Settings', { screen: 'Subscription' })}>
                <Text style={{ color: '#6C3EF4', fontSize: 13, fontWeight: '800' }}>Upgrade</Text>
              </TouchableOpacity>
            </View>

            <LinearGradient colors={['#6C3EF4', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.createBtn, saving && { opacity: 0.6 }]}>
              <TouchableOpacity onPress={handleCreate} disabled={saving} activeOpacity={0.85} style={styles.createBtnInner}>
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.createBtnText}>Create Split Group</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </ScrollView>
      </KeyboardAvoidingContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
  errorBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, gap: 8 },
  errorText: { fontSize: 13, flex: 1 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { fontSize: 15, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  iconRow: { gap: 8, paddingVertical: 4 },
  iconBtn: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  memberRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingRight: 8 },
  countryCode: { fontSize: 15, fontWeight: '700', paddingLeft: 14, paddingRight: 4 },
  memberInput: { flex: 1, fontSize: 15, paddingHorizontal: 6, fontWeight: '600', paddingVertical: 14 },
  addMemberBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, paddingVertical: 10, paddingHorizontal: 14 },
  addMemberText: { fontSize: 14, fontWeight: '600' },
  recurringCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  recurringHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recurringTitle: { fontSize: 15, fontWeight: '700' },
  recurringSub: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  recurringLoading: { fontSize: 13, textAlign: 'center', paddingVertical: 12, fontWeight: '500' },
  recurringEmpty: { fontSize: 13, textAlign: 'center', paddingVertical: 12, fontWeight: '500' },
  recurringItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  recurringItemText: { fontSize: 14, fontWeight: '600' },
  recurringItemSub: { fontSize: 12, marginTop: 1, fontWeight: '500' },
  planInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 16, borderWidth: 1 },
  planInfoText: { flex: 1, fontSize: 12, fontWeight: '500' },
  createBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  createBtnInner: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  suggestions: { marginTop: 4, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  suggestionAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  suggestionName: { fontSize: 14, fontWeight: '700' },
  suggestionEmail: { fontSize: 11, marginTop: 1, fontWeight: '500' },
});
