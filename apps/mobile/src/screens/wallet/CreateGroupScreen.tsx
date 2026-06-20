import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { spacing, borderRadius } from '../../theme/design';
import { api } from '../../services/api';
import { useToast } from '../../store/ToastContext';

const GROUP_ICONS: { icon: string; label: string; color: string }[] = [
  { icon: 'users', label: 'General', color: '#6366F1' },
  { icon: 'home', label: 'Household', color: '#22C55E' },
  { icon: 'heart', label: 'Couple', color: '#EC4899' },
  { icon: 'team', label: 'Friends', color: '#3B82F6' },
  { icon: 'bank', label: 'Business', color: '#8B5CF6' },
  { icon: 'earth', label: 'Travel', color: '#06B6D4' },
  { icon: 'book', label: 'Education', color: '#3B82F6' },
  { icon: 'shoppingcart', label: 'Shopping', color: '#F97316' },
];

export function CreateGroupScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('users');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        icon: selectedIcon,
      };
      if (description.trim()) {
        payload.description = description.trim();
      }
      if (monthlyBudget.trim()) {
        payload.monthlyBudget = parseFloat(monthlyBudget);
      }

      await api.post('/expense-groups', payload);
      showToast('Group created successfully');
      navigation.goBack();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create group';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <LinearGradient
        colors={isDark ? ['#1A0A2E', colors.bg.primary] : ['#F0E6FF', colors.bg.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.2]}
        style={{ flex: 1 }}
      >
        <View style={[s.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <AntDesign name="arrowleft" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text.primary }]}>Create Group</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: spacing['2xl'],
            paddingTop: spacing.md,
            paddingBottom: 60,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View style={[s.errorBox, { backgroundColor: colors.status.error + '10' }]}>
              <AntDesign name="exclamationcircle" size={14} color={colors.status.error} />
              <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
            </View>
          ) : null}

          <Text style={[s.fieldLabel, { color: colors.text.tertiary }]}>Group Name</Text>
          <TextInput
            style={[
              s.input,
              {
                backgroundColor: colors.bg.tertiary,
                borderColor: colors.border.default,
                color: colors.text.primary,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. House Expenses"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={[s.fieldLabel, { color: colors.text.tertiary, marginTop: 16 }]}>
            Description (optional)
          </Text>
          <TextInput
            style={[
              s.input,
              {
                backgroundColor: colors.bg.tertiary,
                borderColor: colors.border.default,
                color: colors.text.primary,
              },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="What's this group for?"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={[s.fieldLabel, { color: colors.text.tertiary, marginTop: 16 }]}>
            Monthly Budget (optional)
          </Text>
          <TextInput
            style={[
              s.input,
              {
                backgroundColor: colors.bg.tertiary,
                borderColor: colors.border.default,
                color: colors.text.primary,
              },
            ]}
            value={monthlyBudget}
            onChangeText={(t) => setMonthlyBudget(t.replace(/[^0-9]/g, ''))}
            placeholder="e.g. 50000"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="numeric"
          />

          <Text style={[s.fieldLabel, { color: colors.text.tertiary, marginTop: 16 }]}>Icon</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {GROUP_ICONS.map((item) => {
              const active = selectedIcon === item.icon;
              return (
                <TouchableOpacity
                  key={item.icon}
                  onPress={() => setSelectedIcon(item.icon)}
                  style={[
                    s.iconChip,
                    {
                      backgroundColor: active ? item.color + '15' : colors.bg.tertiary,
                      borderColor: active ? item.color : colors.border.subtle,
                    },
                  ]}
                >
                  <AntDesign
                    name={item.icon as any}
                    size={18}
                    color={active ? item.color : colors.text.tertiary}
                  />
                  <Text
                    style={[s.iconLabel, { color: active ? item.color : colors.text.secondary }]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              s.saveBtn,
              { backgroundColor: colors.accent.primary, opacity: saving ? 0.6 : 1 },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <AntDesign name="checkcircleo" size={18} color="#FFF" />
                <Text style={s.saveText}>Create Group</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    fontSize: 15,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  iconChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconLabel: { fontSize: 13, fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: spacing['2xl'],
  },
  saveText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
