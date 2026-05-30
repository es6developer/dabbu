import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';

const ICONS = [
  'users',
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
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

export function CreateExpenseGroupScreen() {
  const navigation = useNavigation<any>();
  const { accessToken } = useAuth();
  const { colors, isDark } = useTheme();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('users');
  const [currency, setCurrency] = useState('INR');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [memberEmails, setMemberEmails] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    setError('');
    setSaving(true);
    if (accessToken) {
      setAccessToken(accessToken);
    }
    try {
      const emails = memberEmails
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
      const payload: any = { name: name.trim(), icon, currency };
      if (description.trim()) {
        payload.description = description.trim();
      }
      if (monthlyBudget.trim()) {
        payload.monthlyBudget = Number(monthlyBudget);
      }
      if (emails.length > 0) {
        payload.memberEmails = emails;
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg.primary }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[
          styles.backBtn,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
        ]}
      >
        <Ionicons name="close" size={22} color={colors.text.primary} />
      </TouchableOpacity>

      <LinearGradient
        colors={['#6C5CE7', '#A29BFE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroSection}
      >
        <Text style={styles.heroTitle}>New Circle</Text>
        <Text style={styles.heroSub}>Create a group to track expenses together</Text>
      </LinearGradient>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.status.errorLight }]}>
          <Ionicons name="alert-circle" size={16} color={colors.status.error} />
          <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
        </View>
      ) : null}

      <Text style={[styles.label, { color: colors.text.tertiary }]}>Group Name</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.bg.tertiary,
            color: colors.text.primary,
            borderColor: colors.border.subtle,
          },
        ]}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Roommates, Road Trip"
        placeholderTextColor={colors.text.tertiary}
      />

      <Text style={[styles.label, { color: colors.text.tertiary }]}>Description (optional)</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.bg.tertiary,
            color: colors.text.primary,
            borderColor: colors.border.subtle,
          },
        ]}
        value={description}
        onChangeText={setDescription}
        placeholder="What's this group for?"
        placeholderTextColor={colors.text.tertiary}
      />

      <Text style={[styles.label, { color: colors.text.tertiary }]}>Choose Icon</Text>
      <View style={styles.iconRow}>
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

      <Text style={[styles.label, { color: colors.text.tertiary }]}>Currency</Text>
      <View style={styles.currencyRow}>
        {CURRENCIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              styles.currencyChip,
              { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
              currency === c && {
                backgroundColor: `${colors.accent.primary}20`,
                borderColor: colors.accent.primary,
              },
            ]}
            onPress={() => setCurrency(c)}
          >
            <Text
              style={[
                styles.currencyText,
                { color: currency === c ? colors.accent.primary : colors.text.secondary },
              ]}
            >
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text.tertiary }]}>Monthly Budget (optional)</Text>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle },
        ]}
      >
        <Text style={[styles.currencyPrefix, { color: colors.text.tertiary }]}>
          {currency === 'INR'
            ? '₹'
            : currency === 'USD'
              ? '$'
              : currency === 'EUR'
                ? '€'
                : currency === 'GBP'
                  ? '£'
                  : currency === 'AED'
                    ? 'د.إ'
                    : '$'}
        </Text>
        <TextInput
          style={[styles.inputFlex, { color: colors.text.primary }]}
          value={monthlyBudget}
          onChangeText={setMonthlyBudget}
          placeholder="0"
          placeholderTextColor={colors.text.tertiary}
          keyboardType="decimal-pad"
        />
      </View>

      <Text style={[styles.label, { color: colors.text.tertiary }]}>
        Member Emails{' '}
        <Text style={{ fontWeight: '400', textTransform: 'none' }}>
          (comma separated, max 2 on Free)
        </Text>
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.bg.tertiary,
            color: colors.text.primary,
            borderColor: colors.border.subtle,
          },
        ]}
        value={memberEmails}
        onChangeText={setMemberEmails}
        placeholder="e.g. john@email.com, jane@email.com"
        placeholderTextColor={colors.text.tertiary}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <View style={[styles.planInfo, { backgroundColor: colors.bg.tertiary }]}>
        <Ionicons name="shield-outline" size={16} color="#FF6B6B" />
        <Text style={[styles.planInfoText, { color: colors.text.tertiary }]}>
          Free plan: 5 groups max · 2 members per group
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings', { screen: 'Subscription' })}
        >
          <Text style={[styles.planUpgrade, { color: colors.accent.primary }]}>Upgrade</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.saveBtn,
          { backgroundColor: colors.accent.primary },
          saving && { opacity: 0.6 },
        ]}
        onPress={handleCreate}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Create Group</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 60 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 24,
    marginTop: 16,
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
    paddingHorizontal: 24,
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

  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 24,
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
