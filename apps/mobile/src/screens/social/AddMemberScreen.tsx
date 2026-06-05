import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, RefreshControl, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { syncContacts, requestContactsPermission, getContactsPermissionStatus } from '../../services/contacts';

interface SearchUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  phone?: string;
}

interface ContactMatch {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isFriend: boolean;
}

export function AddMemberScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user: currentUser } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const groupId = route.params?.groupId;

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [contactMatches, setContactMatches] = useState<ContactMatch[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [contactsGranted, setContactsGranted] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [tab, setTab] = useState<'contacts' | 'search'>('contacts');

  useEffect(() => {
    getContactsPermissionStatus().then(setContactsGranted);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => searchUsers(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function searchUsers(q: string) {
    setSearching(true);
    try {
      const res = await api.get<any>(`/users/search?query=${encodeURIComponent(q)}`);
      const data = Array.isArray(res) ? res : res?.data || [];
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleSyncContacts() {
    const granted = await requestContactsPermission();
    setContactsGranted(granted);
    if (!granted) return;
    setSyncing(true);
    try {
      const result = await syncContacts();
      setContactMatches(result.matched || []);
      setHasSynced(true);
    } catch (e: any) {
      Alert.alert('Sync Failed', e.message || 'Could not sync contacts');
    } finally {
      setSyncing(false);
    }
  }

  async function handleAddFriend(friendId: string) {
    setAddingId(friendId);
    try {
      const res = await api.post<any>('/friends/add', { friendId });
      const status = res?.status || res?.data?.status;
      if (status === 'accepted') {
        setContactMatches((prev) =>
          prev.map((c) => (c.userId === friendId ? { ...c, isFriend: true } : c))
        );
        Alert.alert('Connected', 'You are now friends!');
      } else {
        Alert.alert('Request Sent', 'Friend request sent successfully');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add friend');
    } finally {
      setAddingId(null);
    }
  }

  async function handleAddToGroup(userId: string, userName: string) {
    if (!groupId) {
      Alert.alert('Error', 'No group selected');
      return;
    }
    setAddingId(userId);
    try {
      await api.post(`/shared-finance/groups/${groupId}/members`, { userId });
      Alert.alert('Added', `${userName} added to group`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add member');
    } finally {
      setAddingId(null);
    }
  }

  function handleInvite(user: { name: string; email?: string }) {
    const message = `Hey! Join me on Dabbu - the smart family finance app. Track shared expenses, split bills, and manage money together.\n\nDownload: https://dabbu.app/download`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    Alert.alert('Invite via', '', [
      { text: 'WhatsApp', onPress: () => Linking.openURL(whatsappUrl) },
      { text: 'Share Link', onPress: () => {
        try {
          Linking.openURL(`sms:&body=${encodeURIComponent(message)}`);
        } catch {}
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const renderContactItem = ({ item }: { item: ContactMatch }) => (
    <View style={[styles.userCard, { backgroundColor: colors.bg.secondary }]}>
      <View style={[styles.avatar, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]}>
        <Text style={styles.avatarText}>{item.name[0]?.toUpperCase() || '?'}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text.primary }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.userEmail, { color: colors.text.tertiary }]} numberOfLines={1}>{item.email}</Text>
      </View>
      {item.isFriend ? (
        <View style={[styles.friendBadge, { backgroundColor: `${colors.status.success}20` }]}>
          <Ionicons name="checkmark-circle" size={14} color={colors.status.success} />
          <Text style={[styles.friendBadgeText, { color: colors.status.success }]}>Friend</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.accent.primary }]}
          onPress={() => handleAddFriend(item.userId)}
          disabled={addingId === item.userId}
        >
          {addingId === item.userId ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.actionBtnText}>Add</Text>
          )}
        </TouchableOpacity>
      )}
      {groupId && (
        <TouchableOpacity
          style={[styles.addToGroupBtn, { borderColor: colors.border.subtle }]}
          onPress={() => handleAddToGroup(item.userId, item.name)}
        >
          <Ionicons name="person-add" size={16} color={colors.accent.primary} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSearchItem = ({ item }: { item: SearchUser }) => (
    <View style={[styles.userCard, { backgroundColor: colors.bg.secondary }]}>
      <View style={[styles.avatar, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]}>
        <Text style={styles.avatarText}>{item.firstName[0]?.toUpperCase() || '?'}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text.primary }]} numberOfLines={1}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={[styles.userEmail, { color: colors.text.tertiary }]} numberOfLines={1}>{item.email}</Text>
      </View>
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: colors.accent.primary }]}
        onPress={() => handleAddFriend(item.id)}
        disabled={addingId === item.id}
      >
        {addingId === item.id ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.actionBtnText}>Add</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.primary, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text.primary }]}>Add Member</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.tabRow, { borderBottomColor: colors.border.subtle }]}>
        <TouchableOpacity
          style={[styles.tab, tab === 'contacts' && { borderBottomColor: colors.accent.primary, borderBottomWidth: 2 }]}
          onPress={() => setTab('contacts')}
        >
          <Text style={[styles.tabText, { color: tab === 'contacts' ? colors.accent.primary : colors.text.tertiary }]}>
            Contacts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'search' && { borderBottomColor: colors.accent.primary, borderBottomWidth: 2 }]}
          onPress={() => setTab('search')}
        >
          <Text style={[styles.tabText, { color: tab === 'search' ? colors.accent.primary : colors.text.tertiary }]}>
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'contacts' ? (
        <View style={{ flex: 1 }}>
          {!contactsGranted && !hasSynced ? (
            <View style={styles.permPrompt}>
              <View style={[styles.permIcon, { backgroundColor: `${colors.accent.primary}20` }]}>
                <Ionicons name="people-outline" size={40} color={colors.accent.primary} />
              </View>
              <Text style={[styles.permTitle, { color: colors.text.primary }]}>Find Friends</Text>
              <Text style={[styles.permDesc, { color: colors.text.secondary }]}>
                Sync your contacts to find friends already on Dabbu. Your contacts are hashed and never stored in plain text.
              </Text>
              <TouchableOpacity
                style={[styles.permBtn, { backgroundColor: colors.accent.primary }]}
                onPress={handleSyncContacts}
              >
                <Ionicons name="people" size={18} color="#FFF" />
                <Text style={styles.permBtnText}>Find Friends</Text>
              </TouchableOpacity>
            </View>
          ) : syncing ? (
            <View style={styles.syncingContainer}>
              <ActivityIndicator size="large" color={colors.accent.primary} />
              <Text style={[styles.syncingText, { color: colors.text.secondary }]}>Syncing contacts...</Text>
            </View>
          ) : contactMatches.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={colors.text.tertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>No friends found</Text>
              <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
                Invite friends to join Dabbu and manage shared expenses together.
              </Text>
              <TouchableOpacity
                style={[styles.inviteBtn, { borderColor: colors.accent.primary }]}
                onPress={() => handleInvite({ name: '' })}
              >
                <Ionicons name="share-outline" size={16} color={colors.accent.primary} />
                <Text style={[styles.inviteBtnText, { color: colors.accent.primary }]}>Invite Friends</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={contactMatches}
              keyExtractor={(item) => item.userId}
              renderItem={renderContactItem}
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              refreshControl={
                <RefreshControl
                  refreshing={syncing}
                  onRefresh={handleSyncContacts}
                  tintColor={colors.accent.primary}
                />
              }
              ListHeaderComponent={
                <View style={styles.syncBanner}>
                  <Ionicons name="people" size={16} color={colors.status.success} />
                  <Text style={[styles.syncBannerText, { color: colors.text.secondary }]}>
                    {contactMatches.length} friend{contactMatches.length !== 1 ? 's' : ''} on Dabbu
                  </Text>
                  <TouchableOpacity onPress={handleSyncContacts}>
                    <Ionicons name="refresh" size={18} color={colors.accent.primary} />
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </View>
      ) : (
        <View style={{ flex: 1, padding: 16 }}>
          <View style={[styles.searchBar, { backgroundColor: colors.bg.tertiary, borderColor: colors.border.subtle }]}>
            <Ionicons name="search" size={18} color={colors.text.tertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text.primary }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name, email, or phone..."
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          {searching ? (
            <View style={styles.syncingContainer}>
              <ActivityIndicator size="large" color={colors.accent.primary} />
            </View>
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={renderSearchItem}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          ) : query.length >= 2 ? (
            <View style={styles.emptyState}>
              <Ionicons name="person-outline" size={48} color={colors.text.tertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>No users found</Text>
              <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
                Invite them to join Dabbu instead
              </Text>
              <TouchableOpacity
                style={[styles.inviteBtn, { borderColor: colors.accent.primary }]}
                onPress={() => handleInvite({ name: query })}
              >
                <Ionicons name="share-outline" size={16} color={colors.accent.primary} />
                <Text style={[styles.inviteBtnText, { color: colors.accent.primary }]}>Send Invite</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56 },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: '700' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 14, fontWeight: '600' },

  permPrompt: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  permIcon: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  permTitle: { fontSize: 20, fontWeight: '700' },
  permDesc: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  permBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14 },
  permBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  syncBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 4 },
  syncBannerText: { flex: 1, fontSize: 13, fontWeight: '600' },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 10 },

  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600' },
  userEmail: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, minWidth: 60, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  addToGroupBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  friendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  friendBadgeText: { fontSize: 12, fontWeight: '700' },

  syncingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  syncingText: { fontSize: 14, fontWeight: '600' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyDesc: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1 },
  inviteBtnText: { fontSize: 14, fontWeight: '700' },
});
