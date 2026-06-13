import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../store/ToastContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W } = Dimensions.get('window');
const PURPLE = '#8B5CF6';
const PURPLE_DARK = '#6D28D9';

const ICON_SET: { name: string; icon: string; color: string }[] = [
  { name: 'Food & Dining', icon: 'fast-food-outline', color: '#FF6B6B' },
  { name: 'Groceries', icon: 'cart-outline', color: '#34C759' },
  { name: 'Shopping', icon: 'bag-outline', color: '#F472B6' },
  { name: 'Transport', icon: 'car-outline', color: '#38BDF8' },
  { name: 'Bills', icon: 'receipt-outline', color: '#F59E0B' },
  { name: 'Housing', icon: 'home-outline', color: '#FB923C' },
  { name: 'Entertainment', icon: 'film-outline', color: '#14B8A6' },
  { name: 'Healthcare', icon: 'medkit-outline', color: '#FF4D4F' },
  { name: 'Education', icon: 'school-outline', color: '#8B5CF6' },
  { name: 'Travel', icon: 'airplane-outline', color: '#60A5FA' },
  { name: 'Sports', icon: 'football-outline', color: '#22C55E' },
  { name: 'Subscription', icon: 'repeat-outline', color: '#8B5CF6' },
  { name: 'Utilities', icon: 'flash-outline', color: '#FBBF24' },
  { name: 'Salary', icon: 'cash-outline', color: '#00B894' },
  { name: 'Business', icon: 'storefront-outline', color: '#14B8A6' },
  { name: 'Rental', icon: 'key-outline', color: '#FB923C' },
  { name: 'Gift', icon: 'gift-outline', color: '#F472B6' },
  { name: 'Insurance', icon: 'shield-outline', color: '#00CEC9' },
  { name: 'Pets', icon: 'paw-outline', color: '#FDCB6E' },
  { name: 'Clothing', icon: 'shirt-outline', color: '#F472B6' },
  { name: 'Fitness', icon: 'fitness-outline', color: '#14B8A6' },
  { name: 'Coffee', icon: 'cafe-outline', color: '#D4A574' },
  { name: 'Phone', icon: 'call-outline', color: '#00B894' },
  { name: 'Investment', icon: 'trending-up-outline', color: '#14B8A6' },
];

export function CreateCategoryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();

  const transactionType: 'expense' | 'income' = route.params?.type || 'expense';
  const isExpense = transactionType === 'expense';

  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>(transactionType);
  const [selectedIcon, setSelectedIcon] = useState<(typeof ICON_SET)[0] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a category name');
      return;
    }
    if (!selectedIcon) {
      setError('Please select an icon');
      return;
    }
    setError('');
    setSaving(true);
    if (accessToken) {
      setAccessToken(accessToken);
    }
    try {
      await api.post('/categories', {
        name: trimmed,
        type,
        icon: selectedIcon.icon,
        color: selectedIcon.color,
      });
      navigation.goBack();
      showToast('Category created');
    } catch (e: any) {
      setError(e.message || 'Failed to create category');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      {/* Header */}
      <LinearGradient
        colors={[isExpense ? PURPLE : '#10B981', isExpense ? PURPLE_DARK : '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={{ paddingTop: insets.top + 12, paddingBottom: 28, paddingHorizontal: 20 }}>
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Ionicons name="close" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Create Category</Text>
            <View style={{ width: 34 }} />
          </View>
          <Text style={s.headerSub}>Customize your own spending category</Text>
        </View>
      </LinearGradient>

      {error ? (
        <View style={[s.errorBox, { backgroundColor: `${colors.status.error}12` }]}>
          <Ionicons name="alert-circle" size={16} color={colors.status.error} />
          <Text style={[s.errorText, { color: colors.status.error }]}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      >
        {/* Name */}
        <View style={s.fieldBlock}>
          <Text style={[s.label, { color: colors.text.secondary }]}>Category Name</Text>
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
            placeholder="e.g. Dining Out, Side Hustle"
            placeholderTextColor={colors.text.tertiary}
            autoFocus
          />
        </View>

        {/* Type Toggle */}
        <View style={s.fieldBlock}>
          <Text style={[s.label, { color: colors.text.secondary }]}>Type</Text>
          <View style={[s.toggleRow, { backgroundColor: colors.bg.tertiary }]}>
            {(['expense', 'income'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  s.toggle,
                  type === t && { backgroundColor: t === 'expense' ? PURPLE : '#10B981' },
                ]}
                onPress={() => setType(t)}
              >
                <Ionicons
                  name={t === 'expense' ? 'arrow-up-circle' : 'arrow-down-circle'}
                  size={16}
                  color={type === t ? '#FFF' : colors.text.tertiary}
                />
                <Text
                  style={[s.toggleText, { color: type === t ? '#FFF' : colors.text.secondary }]}
                >
                  {t === 'expense' ? 'Expense' : 'Income'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Icon Picker */}
        <View style={s.fieldBlock}>
          <View style={s.iconPreviewRow}>
            <Text style={[s.label, { color: colors.text.secondary }]}>Choose Icon</Text>
            {selectedIcon && (
              <View style={[s.previewBadge, { backgroundColor: `${selectedIcon.color}18` }]}>
                <Ionicons name={selectedIcon.icon as any} size={22} color={selectedIcon.color} />
                <Text style={[s.previewName, { color: selectedIcon.color }]}>
                  {selectedIcon.name}
                </Text>
              </View>
            )}
          </View>
          <View style={s.iconGrid}>
            {ICON_SET.map((item) => {
              const active = selectedIcon?.name === item.name;
              return (
                <TouchableOpacity
                  key={item.name}
                  style={[
                    s.iconItem,
                    {
                      borderColor: active ? item.color : colors.border.subtle,
                      backgroundColor: active ? `${item.color}18` : colors.bg.card,
                    },
                  ]}
                  onPress={() => setSelectedIcon(item)}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={active ? item.color : colors.text.tertiary}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Save */}
      <View style={[s.bottomBar, { backgroundColor: colors.bg.secondary }]}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !selectedIcon}
          activeOpacity={0.85}
          style={{ opacity: saving || !selectedIcon ? 0.5 : 1 }}
        >
          <LinearGradient
            colors={[
              type === 'expense' ? PURPLE : '#10B981',
              type === 'expense' ? PURPLE_DARK : '#059669',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.saveGrad}
          >
            <Ionicons
              name={saving ? 'hourglass-outline' : 'checkmark-circle'}
              size={18}
              color="#FFF"
            />
            <Text style={s.saveText}>
              {saving
                ? 'Saving...'
                : `Create ${type === 'expense' ? 'Expense' : 'Income'} Category`}
            </Text>
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
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
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

  toggleRow: { flexDirection: 'row', borderRadius: 14, padding: 3, gap: 3 },
  toggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  toggleText: { fontSize: 14, fontWeight: '700' },

  iconPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  previewName: { fontSize: 13, fontWeight: '700' },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconItem: {
    width: (SCREEN_W - 56) / 6,
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
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
