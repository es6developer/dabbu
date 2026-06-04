import React, { useCallback, useRef, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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


export function CreateExpenseGroupScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('people');
  const [memberEmails, setMemberEmails] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputsRef = useRef<(TextInput | null)[]>([]);

  const updateEmail = useCallback((index: number, value: string) => {
    setMemberEmails((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const addRow = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMemberEmails((prev) => [...prev, '']);
    setTimeout(() => inputsRef.current[inputsRef.current.length - 1]?.focus(), 150);
  }, []);

  const removeRow = useCallback((index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMemberEmails((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function handleCreate() {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    const validEmails = memberEmails.map((e) => e.trim()).filter(Boolean);
    const invalid = validEmails.filter((e) => !isValidEmail(e));
    if (invalid.length > 0) {
      setError(`Invalid email${invalid.length > 1 ? 's' : ''}: ${invalid.join(', ')}`);
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
      if (validEmails.length > 0) {
        payload.memberEmails = validEmails;
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
        setError(msg || 'Failed to create group');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <PremiumFormScreen
      title="New circle"
      subtitle="Create a polished expense circle for roommates, trips, families, or friends."
      icon="people"
      accent={[colors.accent.primary, colors.status.info]}
    >
      <PremiumError message={error} />
      <PremiumInput
        label="Group name"
        icon="people-outline"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Roommates, Road Trip"
      />

      <PremiumInput
        label="Description"
        icon="document-text-outline"
        value={description}
        onChangeText={setDescription}
        placeholder="What's this group for?"
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
          Members <Text style={{ fontWeight: '400', textTransform: 'none' }}>(max 2 on Free)</Text>
        </Text>

            {memberEmails.map((email, index) => (
              <View key={index} style={styles.memberRow}>
                <View
                  style={[
                    styles.memberInputWrap,
                    {
                      backgroundColor: colors.bg.tertiary,
                      borderColor: colors.border.subtle,
                    },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={colors.text.tertiary}
                    style={styles.memberIcon}
                  />
                  <TextInput
                    ref={(ref) => {
                      inputsRef.current[index] = ref;
                    }}
                    style={[
                      styles.memberInput,
                      { color: colors.text.primary },
                      !email.trim() && index === memberEmails.length - 1 ? { minWidth: 120 } : null,
                    ]}
                    value={email}
                    onChangeText={(v) => updateEmail(index, v)}
                    placeholder={index === 0 ? 'john@email.com' : 'jane@email.com'}
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType={index === memberEmails.length - 1 ? 'done' : 'next'}
                    onSubmitEditing={() => {
                      if (index === memberEmails.length - 1) {
                        addRow();
                      } else {
                        inputsRef.current[index + 1]?.focus();
                      }
                    }}
                  />
                  {email.trim() && (
                    <TouchableOpacity
                      onPress={() => removeRow(index)}
                      style={styles.memberRemoveBtn}
                    >
                      <Ionicons name="close-circle" size={18} color={colors.status.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addMemberBtn} onPress={addRow} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={18} color={colors.accent.primary} />
              <Text style={[styles.addMemberText, { color: colors.accent.primary }]}>
                Add another member
              </Text>
            </TouchableOpacity>
      </View>

      <View style={[styles.planInfo, { backgroundColor: colors.bg.tertiary }]}>
        <Ionicons name="shield-outline" size={16} color="#FF6B6B" />
        <Text style={[styles.planInfoText, { color: colors.text.tertiary }]}>
          Free plan: 5 groups max · 2 members per group
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings', { screen: 'Subscription' })}>
          <Text style={[styles.planUpgrade, { color: colors.accent.primary }]}>Upgrade</Text>
        </TouchableOpacity>
      </View>

      <PremiumActionButton title="Create group" onPress={handleCreate} loading={saving} icon="add" />
    </PremiumFormScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 96 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 24,
    marginTop: 8,
    marginBottom: 16,
  },

  heroSection: { marginHorizontal: 24, borderRadius: 20, padding: 24, marginBottom: 24 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 24,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { fontSize: 13, flex: 1 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 24,
    paddingHorizontal: 16,
  },
  currencyPrefix: { fontSize: 18, fontWeight: '700', marginRight: 8 },
  inputFlex: { flex: 1, fontSize: 16, paddingVertical: 14 },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 24 },
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  currencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 24 },
  currencyChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  currencyText: { fontSize: 14, fontWeight: '600' },

  memberSection: {
    marginTop: 8,
  },
  memberRow: {
    marginBottom: 8,
  },
  memberInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingRight: 8,
  },
  memberIcon: {
    paddingLeft: 14,
  },
  memberInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  memberRemoveBtn: {
    padding: 4,
  },
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
  addMemberText: {
    fontSize: 14,
    fontWeight: '600',
  },
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

  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 24,
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
