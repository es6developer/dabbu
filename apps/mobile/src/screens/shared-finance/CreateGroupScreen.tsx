import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface CreateGroupPayload {
  name: string;
  type: string;
  description?: string;
  currency: string;
  maxMembers: number;
}

interface CreateGroupResponse {
  id: string;
}

const GROUP_TYPES = [
  { key: 'friends', icon: 'people' as const, label: 'Friends', color: '#74B9FF' },
  { key: 'trip', icon: 'airplane' as const, label: 'Trip', color: '#00B894' },
  { key: 'family', icon: 'home' as const, label: 'Family', color: '#FDCB6E' },
  { key: 'couple', icon: 'heart' as const, label: 'Couple', color: '#FF6B6B' },
  { key: 'roommates', icon: 'business' as const, label: 'Roommates', color: '#A29BFE' },
  { key: 'office', icon: 'briefcase' as const, label: 'Office', color: '#f7892c' },
] as const;

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED'] as const;

export function CreateGroupScreen() {
  const { colors, spacing, borderRadius: br, typography } = useTheme();
  const navigation = useNavigation<any>();

  const [name, setName] = useState('');
  const [type, setType] = useState('friends');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<typeof CURRENCIES[number]>('INR');
  const [maxMembers, setMaxMembers] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a group name');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload: CreateGroupPayload = {
        name: name.trim(),
        type,
        currency,
        maxMembers,
      };
      if (description.trim()) payload.description = description.trim();

      const res = await api.post<CreateGroupResponse>('/shared-finance/groups', payload);
      navigation.replace('GroupDetail', { groupId: res.id });
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[typography.h2, { color: colors.text.primary }]}>Create Group</Text>
          <Text style={[typography.callout, { color: colors.text.tertiary, marginTop: spacing.xs }]}>
            Set up a shared finance group for any occasion
          </Text>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Group Name</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}>
              <Ionicons name="people-outline" size={18} color={colors.text.tertiary} />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                placeholder="e.g. Goa Trip 2026"
                placeholderTextColor={colors.text.tertiary}
                value={name}
                onChangeText={setName}
                maxLength={50}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Group Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.typeSelector}
            >
              {GROUP_TYPES.map((item) => {
                const selected = type === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.typeOption,
                      {
                        backgroundColor: selected ? item.color + '20' : colors.bg.tertiary,
                        borderColor: selected ? item.color + '40' : colors.border.subtle,
                      },
                    ]}
                    onPress={() => setType(item.key)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.typeIconContainer, { backgroundColor: selected ? item.color + '30' : colors.border.subtle }]}>
                      <Ionicons name={item.icon} size={22} color={selected ? item.color : colors.text.tertiary} />
                    </View>
                    <Text
                      style={[
                        typography.subheadBold,
                        { color: selected ? item.color : colors.text.secondary, marginTop: spacing.sm },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Description (optional)</Text>
            <View style={[styles.textAreaContainer, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}>
              <TextInput
                style={[styles.textArea, { color: colors.text.primary }]}
                placeholder="What's this group about?"
                placeholderTextColor={colors.text.tertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.halfSection, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Currency</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.currencySelector}
              >
                {CURRENCIES.map((cur) => {
                  const selected = currency === cur;
                  return (
                    <TouchableOpacity
                      key={cur}
                      style={[
                        styles.currencyOption,
                        {
                          backgroundColor: selected ? colors.accent.primary + '20' : colors.bg.tertiary,
                          borderColor: selected ? colors.accent.primary + '40' : colors.border.subtle,
                        },
                      ]}
                      onPress={() => setCurrency(cur)}
                    >
                      <Text
                        style={[
                          typography.subheadBold,
                          { color: selected ? colors.accent.primary : colors.text.secondary },
                        ]}
                      >
                        {cur}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>
              Max Members: {maxMembers}
            </Text>
            <View style={styles.memberPickerRow}>
              {[2, 5, 10, 20, 50, 100].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.memberOption,
                    {
                      backgroundColor: maxMembers === n ? colors.accent.primary + '20' : colors.bg.tertiary,
                      borderColor: maxMembers === n ? colors.accent.primary + '40' : colors.border.subtle,
                    },
                  ]}
                  onPress={() => setMaxMembers(n)}
                >
                  <Text
                    style={[
                      typography.subheadBold,
                      { color: maxMembers === n ? colors.accent.primary : colors.text.secondary },
                    ]}
                  >
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {error && (
            <Card variant="outlined" padding="md" style={[styles.errorCard, { borderColor: colors.status.error + '40' }]}>
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={18} color={colors.status.error} />
                <Text style={[typography.callout, { color: colors.status.error, marginLeft: spacing.sm }]}>
                  {error}
                </Text>
              </View>
            </Card>
          )}

          <Button
            title="Create Group"
            onPress={handleCreate}
            loading={loading}
            disabled={loading}
            fullWidth
            size="lg"
            style={styles.createButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  section: {
    marginTop: 24,
  },
  halfSection: {
    marginTop: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 2,
    borderRadius: 16,
    borderWidth: 1,
    height: 52,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    height: 48,
  },
  textAreaContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  textArea: {
    fontSize: 15,
    fontWeight: '400',
    minHeight: 80,
    lineHeight: 22,
  },
  typeSelector: {
    gap: 12,
    paddingRight: 4,
  },
  typeOption: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 88,
  },
  typeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  currencySelector: {
    gap: 8,
    paddingRight: 4,
  },
  currencyOption: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  memberPickerRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  memberOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 52,
    alignItems: 'center',
  },
  errorCard: {
    marginTop: 24,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButton: {
    marginTop: 32,
    borderRadius: 16,
  },
});
