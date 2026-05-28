import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing } from '../../theme';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface GroupMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
}

interface GroupInfo {
  id: string;
  name: string;
  type: string;
  description?: string;
  currency: string;
  archived: boolean;
  inviteCode: string;
  members: GroupMember[];
}

const GROUP_TYPES = [
  { key: 'friends', icon: 'people' as const, label: 'Friends' },
  { key: 'trip', icon: 'airplane' as const, label: 'Trip' },
  { key: 'family', icon: 'home' as const, label: 'Family' },
  { key: 'couple', icon: 'heart' as const, label: 'Couple' },
  { key: 'roommates', icon: 'business' as const, label: 'Roommates' },
  { key: 'office', icon: 'briefcase' as const, label: 'Office' },
] as const;

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED'] as const;

export function GroupSettingsScreen() {
  const { colors, spacing, borderRadius: br, typography } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: { groupId: string } }, 'params'>>();
  const { groupId } = route.params;

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groupType, setGroupType] = useState('friends');
  const [currency, setCurrency] = useState('INR');
  const [hasChanges, setHasChanges] = useState(false);

  const fetchGroup = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<GroupInfo>(`/shared-finance/groups/${groupId}/settings`);
      setGroup(data);
      setName(data.name);
      setDescription(data.description || '');
      setGroupType(data.type);
      setCurrency(data.currency);
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      fetchGroup();
    }, [fetchGroup])
  );

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/shared-finance/groups/${groupId}`, {
        name: name.trim(),
        description: description.trim() || undefined,
        type: groupType,
        currency,
      });
      setHasChanges(false);
      Alert.alert('Saved', 'Group settings updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyInviteCode = () => {
    if (group?.inviteCode) {
      Alert.alert('Invite Code', `Share this code: ${group.inviteCode}`);
    }
  };

  const handlePromoteToAdmin = async (memberId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    try {
      await api.patch(`/shared-finance/groups/${groupId}/members/${memberId}`, { role: newRole });
      fetchGroup();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/shared-finance/groups/${groupId}/members/${memberId}`);
              fetchGroup();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const handleArchiveGroup = () => {
    Alert.alert(
      'Archive Group',
      'Archiving will hide this group from your main view. You can unarchive it later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.patch(`/shared-finance/groups/${groupId}`, { archived: true });
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to archive group');
            }
          },
        },
      ]
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group? You will need to be re-invited to join again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/shared-finance/groups/${groupId}/leave`);
              navigation.navigate('SharedFinanceHome');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to leave group');
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      'This will permanently delete the group and all associated expenses and settlements. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/shared-finance/groups/${groupId}`);
              navigation.navigate('SharedFinanceHome');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete group');
            }
          },
        },
      ]
    );
  };

  const onFieldChange = (field: string, value: any) => {
    switch (field) {
      case 'name':
        setName(value);
        break;
      case 'description':
        setDescription(value);
        break;
      case 'type':
        setGroupType(value);
        break;
      case 'currency':
        setCurrency(value);
        break;
    }
    setHasChanges(true);
  };

  if (loading && !group) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !group) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.status.error} />
          <Text style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.md }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent.primary }]}
            onPress={fetchGroup}
          >
            <Text style={[typography.buttonSmall, { color: '#FFFFFF' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg.primary }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: colors.text.primary }]}>Group Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        <Card variant="elevated" padding="lg" style={styles.sectionCard}>
          <Text style={[typography.h4, { color: colors.text.primary }]}>Group Info</Text>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Name</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}>
              <Ionicons name="people-outline" size={18} color={colors.text.tertiary} />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                value={name}
                onChangeText={(v) => onFieldChange('name', v)}
                placeholder="Group name"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Description</Text>
            <View style={[styles.textAreaContainer, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}>
              <TextInput
                style={[styles.textArea, { color: colors.text.primary }]}
                value={description}
                onChangeText={(v) => onFieldChange('description', v)}
                placeholder="Group description"
                placeholderTextColor={colors.text.tertiary}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {GROUP_TYPES.map((t) => {
                const selected = groupType === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.typeOption,
                      {
                        backgroundColor: selected ? colors.accent.primary + '20' : colors.bg.tertiary,
                        borderColor: selected ? colors.accent.primary + '40' : colors.border.subtle,
                      },
                    ]}
                    onPress={() => onFieldChange('type', t.key)}
                  >
                    <Ionicons name={t.icon} size={16} color={selected ? colors.accent.primary : colors.text.tertiary} />
                    <Text
                      style={[
                        typography.subhead,
                        { color: selected ? colors.accent.primary : colors.text.secondary, marginLeft: 6 },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>Currency</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.currencyRow}>
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
                    onPress={() => onFieldChange('currency', cur)}
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
        </Card>

        {group?.inviteCode && (
          <Card variant="elevated" padding="lg" style={styles.sectionCard}>
            <Text style={[typography.h4, { color: colors.text.primary }]}>Invite Code</Text>
            <Text style={[typography.callout, { color: colors.text.secondary, marginTop: spacing.sm }]}>
              Share this code with friends to join the group
            </Text>
            <TouchableOpacity
              style={[styles.inviteCodeRow, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}
              onPress={handleCopyInviteCode}
            >
              <Text style={[typography.monoBold, { color: colors.accent.primary, letterSpacing: 2 }]}>
                {group.inviteCode}
              </Text>
              <Ionicons name="copy-outline" size={20} color={colors.accent.primary} />
            </TouchableOpacity>
          </Card>
        )}

        <Card variant="elevated" padding="lg" style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[typography.h4, { color: colors.text.primary }]}>Members</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('InviteMembers', { groupId })}
            >
              <Ionicons name="person-add-outline" size={22} color={colors.accent.primary} />
            </TouchableOpacity>
          </View>
          {group?.members.map((member) => {
            const firstLetter = member.name.charAt(0).toUpperCase();
            const isOwner = member.role === 'owner';
            return (
              <View key={member.id} style={[styles.memberRow, { borderBottomColor: colors.border.subtle }]}>
                <View style={[styles.memberAvatar, { backgroundColor: colors.bg.tertiary }]}>
                  <Text style={[styles.avatarText, { color: colors.accent.primary }]}>{firstLetter}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={[typography.callout, { color: colors.text.primary }]}>{member.name}</Text>
                  <Text style={[typography.subhead, { color: colors.text.tertiary }]}>{member.email}</Text>
                </View>
                {isOwner ? (
                  <View style={[styles.roleBadge, { backgroundColor: colors.accent.primary + '20' }]}>
                    <Text style={[styles.roleText, { color: colors.accent.primary }]}>Owner</Text>
                  </View>
                ) : (
                  <View style={styles.memberActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.bg.glass }]}
                      onPress={() => handlePromoteToAdmin(member.id, member.role)}
                    >
                      <Ionicons
                        name={member.role === 'admin' ? 'shield-checkmark' : 'shield-outline'}
                        size={18}
                        color={member.role === 'admin' ? colors.status.info : colors.text.tertiary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.status.errorLight }]}
                      onPress={() => handleRemoveMember(member.id, member.name)}
                    >
                      <Ionicons name="person-remove-outline" size={18} color={colors.status.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </Card>

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
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          disabled={!hasChanges || saving}
          fullWidth
          size="lg"
          style={styles.saveButton}
        />

        <Card variant="elevated" padding="lg" style={[styles.sectionCard, { borderLeftWidth: 3, borderLeftColor: colors.status.warning }]}>
          <Text style={[typography.h4, { color: colors.status.warning }]}>Danger Zone</Text>

          <TouchableOpacity
            style={[styles.dangerOption, { borderTopColor: colors.border.subtle }]}
            onPress={handleArchiveGroup}
          >
            <View style={styles.dangerOptionLeft}>
              <Ionicons name="archive-outline" size={20} color={colors.text.secondary} />
              <Text style={[typography.callout, { color: colors.text.primary, marginLeft: spacing.md }]}>
                Archive Group
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dangerOption, { borderTopColor: colors.border.subtle }]}
            onPress={handleLeaveGroup}
          >
            <View style={styles.dangerOptionLeft}>
              <Ionicons name="exit-outline" size={20} color={colors.status.warning} />
              <Text style={[typography.callout, { color: colors.text.primary, marginLeft: spacing.md }]}>
                Leave Group
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dangerOption, { borderTopColor: colors.border.subtle }]}
            onPress={handleDeleteGroup}
          >
            <View style={styles.dangerOptionLeft}>
              <Ionicons name="trash-outline" size={20} color={colors.status.error} />
              <Text style={[typography.callout, { color: colors.text.primary, marginLeft: spacing.md }]}>
                Delete Group
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        </Card>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sectionCard: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  fieldGroup: {
    marginTop: 18,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    height: 50,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    height: 48,
  },
  textAreaContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  textArea: {
    fontSize: 15,
    fontWeight: '400',
    minHeight: 60,
    lineHeight: 22,
  },
  typeRow: {
    gap: 8,
    paddingRight: 4,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  currencyRow: {
    gap: 8,
    paddingRight: 4,
  },
  currencyOption: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  inviteCodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorCard: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
  },
  dangerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    marginTop: 8,
  },
  dangerOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
