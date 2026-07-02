import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing as sp, borderRadius as br, shadows as sh } from '../../theme/design';

const DAYS_IN_MONTH = 30;

function Label({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: colors.text.tertiary,
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  );
}

export function CreateExpenseGroupScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { showToast } = useToast();
  const { colors, isDark } = useTheme();

  const ICONS = [
    { key: 'team', label: 'Friends', color: colors.accent.secondary },
    { key: 'home', label: 'House', color: '#34C759' },
    { key: 'car', label: 'Travel', color: '#38BDF8' },
    { key: 'earth', label: 'Trip', color: '#60A5FA' },
    { key: 'gift', label: 'Gift', color: '#F472B6' },
    { key: 'shoppingcart', label: 'Shopping', color: '#F59E0B' },
    { key: 'rest', label: 'Dining', color: '#FF6B6B' },
    { key: 'hearto', label: 'Couple', color: '#FF4D6A' },
    { key: 'book', label: 'Study', color: colors.accent.primary },
    { key: 'bank', label: 'Office', color: '#14B8A6' },
  ];
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('team');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [members, setMembers] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState<{ [key: number]: any[] }>({});

  const inputsRef = useRef<(TextInput | null)[]>([]);

  const budgetNum = parseFloat(monthlyBudget) || 0;
  const budgetBreakdown = useMemo(() => {
    if (budgetNum <= 0) {
      return null;
    }
    const perDay = budgetNum / DAYS_IN_MONTH;
    const perWeek = perDay * 7;
    return { perDay, perWeek };
  }, [budgetNum]);

  const updateMember = useCallback((index: number, value: string) => {
    const digits = value.replace(/[^0-9]/g, '').slice(0, 10);
    setMembers((prev) => {
      const n = [...prev];
      n[index] = digits;
      return n;
    });
    if (digits.length >= 3) {
      setTimeout(async () => {
        try {
          const res = await api.get<any>(`/users/search?query=${digits}`);
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
    setMembers((prev) => [...prev, '']);
    setTimeout(() => inputsRef.current[inputsRef.current.length - 1]?.focus(), 150);
  }, []);

  const removeRow = useCallback((index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const selectUser = useCallback(
    (index: number, user: any) => {
      const phone = (user.phone || '').replace(/[^0-9]/g, '').slice(0, 10);
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
      if (index + 1 >= members.length) {
        addRow();
      } else {
        setTimeout(() => inputsRef.current[index + 1]?.focus(), 150);
      }
    },
    [members.length],
  );

  async function handleCreate() {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    const validPhones = members.map((m) => m.trim()).filter(Boolean);
    const invalid = validPhones.filter((p) => p.length !== 10);
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
      if (budgetNum > 0) {
        payload.monthlyBudget = budgetNum;
      }
      if (validPhones.length > 0) {
        payload.memberPhones = validPhones;
      }
      await api.post('/expense-groups', payload);
      showToast('Group created successfully');
      navigation.goBack();
    } catch (e: any) {
      if (e?.name === 'AbortError' || e?.message?.includes('aborted')) {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        setError(e.message || 'Failed to create group');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <LinearGradient
        colors={isDark ? ['#1A0A2E', colors.bg.primary] : [colors.bg.secondary, colors.bg.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.3 }}
        locations={[0, 1]}
        style={{ flex: 1 }}
      >
        <View
          style={{
            paddingHorizontal: 28,
            paddingTop: insets.top + 12,
            paddingBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 28,
              backgroundColor: colors.bg.card,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AntDesign name="close" size={18} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 19, fontWeight: '700', color: colors.text.primary }}>
            Create Circle
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 28, paddingTop: 24, paddingBottom: 44 }}
              keyboardShouldPersistTaps="handled"
            >
              {error ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 18,
                    borderRadius: 28,
                    backgroundColor: colors.status.error + '12',
                    gap: 8,
                    marginBottom: 24,
                  }}
                >
                  <AntDesign name="exclamationcircle" size={16} color={colors.status.error} />
                  <Text
                    style={{ fontSize: 16, fontWeight: '600', color: colors.status.error, flex: 1 }}
                  >
                    {error}
                  </Text>
                  <TouchableOpacity onPress={() => setError('')}>
                    <AntDesign name="close" size={14} color={colors.status.error} />
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={{ marginBottom: 28 }}>
                <Label>Group Icon</Label>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {ICONS.map((ic) => {
                      const active = icon === ic.key;
                      return (
                        <TouchableOpacity
                          key={ic.key}
                          activeOpacity={0.7}
                          onPress={() => setIcon(ic.key)}
                          style={{ alignItems: 'center', gap: 6 }}
                        >
                          <View
                            style={{
                              width: 52,
                              height: 52,
                              borderRadius: 26,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: 2,
                              backgroundColor: active
                                ? ic.color + '18'
                                : isDark
                                  ? 'rgba(255,255,255,0.06)'
                                  : 'rgba(0,0,0,0.04)',
                              borderColor: active ? ic.color : 'transparent',
                            }}
                          >
                            <AntDesign
                              name={ic.key as any}
                              size={22}
                              color={active ? ic.color : colors.text.tertiary}
                            />
                          </View>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: active ? '700' : '500',
                              color: active ? ic.color : colors.text.tertiary,
                            }}
                          >
                            {ic.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              <View style={{ marginBottom: 24 }}>
                <Label>
                  Group Name <Text style={{ color: colors.status.error }}>*</Text>
                </Label>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderRadius: 30,
                    borderWidth: 1.5,
                    borderColor: colors.border.default,
                    paddingHorizontal: 24,
                    paddingVertical: 18,
                    backgroundColor: colors.bg.card,
                  }}
                >
                  <AntDesign
                    name="team"
                    size={18}
                    color={colors.text.tertiary}
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 16,
                      fontWeight: '500',
                      color: colors.text.primary,
                      padding: 0,
                    }}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Goa Trip, Roommates"
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>
              </View>

              <View style={{ marginBottom: 24 }}>
                <Label>Description</Label>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    borderRadius: 30,
                    borderWidth: 1.5,
                    borderColor: colors.border.default,
                    paddingHorizontal: 24,
                    paddingVertical: 18,
                    backgroundColor: colors.bg.card,
                    minHeight: 60,
                  }}
                >
                  <AntDesign
                    name="edit"
                    size={18}
                    color={colors.text.tertiary}
                    style={{ marginRight: 12, marginTop: 2 }}
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 16,
                      fontWeight: '500',
                      color: colors.text.primary,
                      minHeight: 24,
                      padding: 0,
                    }}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="What's this group for?"
                    placeholderTextColor={colors.text.tertiary}
                    multiline
                  />
                </View>
              </View>

              <View style={{ marginBottom: 24 }}>
                <Label>Monthly Budget</Label>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderRadius: 30,
                    borderWidth: 1.5,
                    borderColor: colors.border.default,
                    paddingHorizontal: 24,
                    paddingVertical: 18,
                    backgroundColor: colors.bg.card,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 26,
                      fontWeight: '700',
                      color: colors.text.primary,
                      marginRight: 8,
                    }}
                  >
                    ₹
                  </Text>
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 16,
                      fontWeight: '500',
                      color: colors.text.primary,
                      padding: 0,
                    }}
                    value={monthlyBudget}
                    onChangeText={(t) => setMonthlyBudget(t.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="numeric"
                  />
                </View>
                {budgetBreakdown && (
                  <View
                    style={{
                      marginTop: 14,
                      borderRadius: 28,
                      borderWidth: 1.5,
                      borderColor: colors.border.subtle,
                      padding: 22,
                      backgroundColor: colors.bg.secondary,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-around',
                      }}
                    >
                      {[
                        { value: `₹${budgetBreakdown.perDay.toFixed(0)}`, label: '/ day' },
                        { value: `₹${budgetBreakdown.perWeek.toFixed(0)}`, label: '/ week' },
                        { value: `₹${budgetNum.toLocaleString()}`, label: '/ month' },
                      ].map((item, i) => (
                        <React.Fragment key={item.label}>
                          {i > 0 && (
                            <View
                              style={{
                                width: 1,
                                height: 28,
                                backgroundColor: colors.border.subtle,
                              }}
                            />
                          )}
                          <View style={{ alignItems: 'center', gap: 2 }}>
                            <Text
                              style={{
                                fontSize: 16,
                                fontWeight: '800',
                                color: colors.text.primary,
                              }}
                            >
                              {item.value}
                            </Text>
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                color: colors.text.tertiary,
                              }}
                            >
                              {item.label}
                            </Text>
                          </View>
                        </React.Fragment>
                      ))}
                    </View>
                    <View
                      style={{
                        height: 4,
                        borderRadius: 4,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                        marginTop: 16,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.min(100, budgetNum > 0 ? 30 : 0)}%`,
                          height: '100%',
                          borderRadius: 4,
                          backgroundColor: colors.brand.primary,
                        }}
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '500',
                        color: colors.text.tertiary,
                        marginTop: 8,
                        textAlign: 'center',
                      }}
                    >
                      Track expenses against this budget after creating the group
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ marginBottom: 24 }}>
                <Label>Members</Label>
                {members.map((phone, index) => (
                  <View key={index} style={{ marginBottom: 12 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderRadius: 30,
                        borderWidth: 1.5,
                        borderColor: colors.border.default,
                        backgroundColor: colors.bg.card,
                        paddingRight: 8,
                        minHeight: 56,
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 28,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: 16,
                          backgroundColor: colors.brand.primary + '15',
                        }}
                      >
                        <Text
                          style={{ color: colors.brand.primary, fontSize: 16, fontWeight: '700' }}
                        >
                          {(phone || '?')[0]}
                        </Text>
                      </View>
                      <TextInput
                        ref={(ref) => {
                          inputsRef.current[index] = ref;
                        }}
                        style={{
                          flex: 1,
                          fontSize: 16,
                          fontWeight: '500',
                          color: colors.text.primary,
                          paddingVertical: 18,
                        }}
                        value={phone}
                        onChangeText={(v) => updateMember(index, v)}
                        placeholder="Enter phone number"
                        placeholderTextColor={colors.text.tertiary}
                        keyboardType="phone-pad"
                        maxLength={10}
                        returnKeyType="done"
                        onSubmitEditing={() => {
                          index === members.length - 1
                            ? addRow()
                            : inputsRef.current[index + 1]?.focus();
                        }}
                      />
                      {phone.trim() ? (
                        <TouchableOpacity onPress={() => removeRow(index)} style={{ padding: 8 }}>
                          <AntDesign name="closecircle" size={18} color={colors.status.error} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    {searchResults[index]?.length > 0 && (
                      <View
                        style={{
                          marginTop: 4,
                          borderRadius: 28,
                          borderWidth: 1.5,
                          borderColor: colors.border.subtle,
                          overflow: 'hidden',
                          backgroundColor: colors.bg.elevated,
                        }}
                      >
                        {searchResults[index].map((user: any) => (
                          <TouchableOpacity
                            key={user.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 10,
                              paddingVertical: 10,
                              paddingHorizontal: 18,
                              borderBottomWidth: 0.5,
                              borderBottomColor: colors.border.subtle,
                            }}
                            onPress={() => selectUser(index, user)}
                          >
                            <View
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 26,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: colors.brand.primary + '15',
                              }}
                            >
                              <Text
                                style={{
                                  color: colors.brand.primary,
                                  fontSize: 16,
                                  fontWeight: '800',
                                }}
                              >
                                {user.firstName?.[0] || user.phone?.[0] || '?'}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  fontSize: 16,
                                  fontWeight: '700',
                                  color: colors.text.primary,
                                }}
                              >
                                {user.firstName || ''} {user.lastName || ''}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: '500',
                                  color: colors.text.tertiary,
                                  marginTop: 1,
                                }}
                              >
                                {user.phone || ''}
                                {user.email ? ` · ${user.email}` : ''}
                              </Text>
                            </View>
                            <AntDesign name="pluscircleo" size={20} color={colors.brand.primary} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
                <TouchableOpacity
                  onPress={addRow}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 4,
                    paddingVertical: 10,
                    paddingHorizontal: 4,
                  }}
                >
                  <AntDesign name="pluscircleo" size={16} color={colors.brand.primary} />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.brand.primary }}>
                    Add Member
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 18,
                  paddingHorizontal: 24,
                  borderRadius: 30,
                  borderWidth: 1.5,
                  borderColor: colors.border.subtle,
                  backgroundColor: colors.bg.tertiary,
                  marginBottom: 20,
                }}
              >
                <AntDesign name="Safety" size={14} color={colors.status.error} />
                <Text
                  style={{ fontSize: 12, fontWeight: '500', color: colors.text.tertiary, flex: 1 }}
                >
                  Free plan: 5 circles max · 2 members per circle
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('ProfileTab', { screen: 'SubscriptionCenter' })
                  }
                >
                  <LinearGradient
                    colors={['#FF6B6B', '#EF4444']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ paddingHorizontal: 24, paddingVertical: 6, borderRadius: 28 }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>Upgrade</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleCreate}
                disabled={saving}
                activeOpacity={0.85}
                style={{
                  borderRadius: 30,
                  overflow: 'hidden',
                  marginTop: 12,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                <LinearGradient
                  colors={[colors.brand.primary, colors.brand.primary + 'dd']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <AntDesign name="addusergroup" size={18} color="#FFF" />
                      <Text style={{ color: '#FFF', fontSize: 19, fontWeight: '700' }}>
                        Create Circle
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}
