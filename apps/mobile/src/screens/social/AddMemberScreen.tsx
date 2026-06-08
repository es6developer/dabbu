import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFavorites } from '../../store/FavoritesContext';
import * as favoritesApi from '../../services/favorites';
import {
  requestRawPermission,
  getRawPermissionStatus,
  fetchDeviceContacts,
  syncContacts,
  DeviceContact,
  ContactMatch,
  PermissionStatusStr,
} from '../../services/contacts';
import { useTheme } from '../../theme';
import { api } from '../../services/api';

interface SearchUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  phone?: string;
}

type ContactEntry = ({ type: 'match' } & ContactMatch) | ({ type: 'device' } & DeviceContact);

export function AddMemberScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { favorites, isFavorite, addFavorite, refresh } = useFavorites();
  const insets = useSafeAreaInsets();
  const groupId = route.params?.groupId;
  const groupType: 'shared-finance' | 'expense-group' = route.params?.type || 'shared-finance';
  const existingMemberIds: string[] = route.params?.existingMemberIds || [];

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [permStatus, setPermStatus] = useState<PermissionStatusStr>('undetermined');
  const [contactsGranted, setContactsGranted] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [matchedContacts, setMatchedContacts] = useState<ContactMatch[]>([]);
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [selectedFavId, setSelectedFavId] = useState<string | null>(null);

  const searchAbortRef = useRef<AbortController | null>(null);

  const didAutoSync = useRef(false);

  useEffect(() => {
    getRawPermissionStatus().then((s) => {
      setPermStatus(s);
      setContactsGranted(s === 'granted');
    });
  }, []);

  useEffect(() => {
    if (permStatus === 'granted' && !hasSynced && !syncing && !syncError && !didAutoSync.current) {
      didAutoSync.current = true;
      handleSyncContacts();
    }
  }, [permStatus]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const timer = setTimeout(() => searchUsers(query.trim(), controller.signal), 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function searchUsers(q: string, signal?: AbortSignal) {
    try {
      const res = await favoritesApi.searchUsers(q);
      setSearchResults(res.filter((r) => r.id));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleSyncContacts() {
    if (permStatus === 'denied') {
      Alert.alert(
        'Contacts Access Required',
        'Enable contact access in Settings to find friends on Dabbu.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    if (permStatus === 'undetermined') {
      const { granted, status } = await requestRawPermission();
      setPermStatus(status);
      setContactsGranted(granted);
      if (!granted) {
        return;
      }
    }
    setSyncError(null);
    setSyncing(true);
    try {
      const dev = await fetchDeviceContacts();
      setDeviceContacts(dev);
      const result = await syncContacts();
      setMatchedContacts(result.matched || []);
      setHasSynced(true);
    } catch {
      setSyncError('Could not sync contacts.');
      setHasSynced(true);
    } finally {
      setSyncing(false);
    }
  }

  const allContacts: ContactEntry[] = useMemo(() => {
    const entries: ContactEntry[] = [];
    for (const m of matchedContacts) {
      entries.push({ type: 'match', ...m });
    }
    for (const d of deviceContacts) {
      if (!matchedContacts.some((m) => m.phone === d.phone)) {
        entries.push({ type: 'device', ...d });
      }
    }
    return entries;
  }, [matchedContacts, deviceContacts]);

  const gradColors = useMemo(() => [colors.accent.primary, colors.accent.secondary], [colors]);

  async function handleAddToGroup(userId: string, userName: string) {
    if (!groupId) {
      return;
    }
    setAddingId(userId);
    try {
      if (groupType === 'expense-group') {
        await api.post(`/expense-groups/${groupId}/members/add-by-user-id`, { userId });
      } else {
        await api.post(`/shared-finance/groups/${groupId}/members`, { userId });
      }
      Alert.alert('Added', `${userName} added to group`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add member');
    } finally {
      setAddingId(null);
    }
  }

  function handleInvite(name: string) {
    const msg =
      'Hey! Join me on Dabbu - the smart expense splitting app.\n\nDownload: https://dabbu.app/download';
    Alert.alert(`Invite ${name}`, '', [
      {
        text: 'WhatsApp',
        onPress: () => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`),
      },
      {
        text: 'Share Link',
        onPress: () => Linking.openURL(`sms:&body=${encodeURIComponent(msg)}`),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function handleFavPress(fav: (typeof favorites)[0]) {
    setSelectedFavId(fav.userId);
    if (groupId) {
      handleAddToGroup(fav.userId, fav.name);
    }
    setTimeout(() => setSelectedFavId(null), 300);
  }

  const renderHeader = () => (
    <LinearGradient
      colors={[colors.bg.secondary, colors.bg.primary]}
      style={[styles.headerWrap, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Member</Text>
        <View style={{ width: 36 }} />
      </View>
    </LinearGradient>
  );

  const renderSearchBar = () => (
    <View style={styles.searchOuter}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="rgba(255,255,255,0.35)" />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, phone or email"
          placeholderTextColor="rgba(255,255,255,0.3)"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color={colors.accent.primary} />}
        {query.length > 0 && !searching && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderFavoritesBar = () => {
    if (favorites.length === 0 || query.trim()) {
      return null;
    }
    return (
      <View style={styles.favSection}>
        <Text style={styles.favSectionLabel}>FAVORITES</Text>
        <FlatList
          horizontal
          data={favorites}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.favList}
          renderItem={({ item: fav }) => {
            const selected = selectedFavId === fav.userId;
            return (
              <TouchableOpacity
                style={styles.favItem}
                onPress={() => handleFavPress(fav)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={selected ? [colors.accent.primary, colors.accent.secondary] : gradColors}
                  style={[styles.favAvatar, selected && styles.favAvatarSelected]}
                >
                  <Text style={styles.favAvatarText}>{fav.name[0]?.toUpperCase() || '?'}</Text>
                </LinearGradient>
                <Text style={styles.favName} numberOfLines={1}>
                  {fav.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  const renderSearchResults = () => {
    if (query.trim().length < 2) {
      return null;
    }
    return (
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const name = [item.firstName, item.lastName].filter(Boolean).join(' ') || item.email;
          return (
            <View style={styles.contactRow}>
              <LinearGradient colors={gradColors} style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.firstName?.[0] || item.email?.[0] || '?').toUpperCase()}
                </Text>
              </LinearGradient>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.contactSub} numberOfLines={1}>
                  {item.phone || item.email || ''}
                </Text>
              </View>
              {isFavorite(item.id) ? (
                <View style={[styles.actionBtn, { backgroundColor: 'rgba(255,107,0,0.12)' }]}>
                  <Ionicons name="star" size={14} color={colors.accent.primary} />
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: `${colors.accent.primary}18` }]}
                  onPress={async () => {
                    await addFavorite(item.id, name, item.phone);
                    await refresh();
                  }}
                  disabled={addingId === item.id}
                >
                  {addingId === item.id ? (
                    <ActivityIndicator size="small" color={colors.accent.primary} />
                  ) : (
                    <Text style={[styles.actionBtnText, { color: colors.accent.primary }]}>
                      + Add
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          searching ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={colors.accent.primary} />
            </View>
          ) : (
            <View style={styles.centerState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="search-outline" size={28} color="rgba(255,255,255,0.2)" />
              </View>
              <Text style={styles.emptyTitle}>No users found</Text>
              <TouchableOpacity style={styles.inviteBtn} onPress={() => handleInvite(query)}>
                <Ionicons name="share-outline" size={16} color={colors.accent.primary} />
                <Text style={styles.inviteBtnText}>Send Invite</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    );
  };

  const renderContactsList = () => {
    if (syncing) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.syncingText}>Syncing contacts...</Text>
        </View>
      );
    }

    if (syncError) {
      return (
        <View style={styles.centerState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cloud-offline-outline" size={28} color="#FF4545" />
          </View>
          <Text style={[styles.emptyTitle, { color: '#FF4545' }]}>{syncError}</Text>
          <TouchableOpacity style={styles.inviteBtn} onPress={handleSyncContacts}>
            <Ionicons name="refresh-outline" size={16} color={colors.accent.primary} />
            <Text style={styles.inviteBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!hasSynced && permStatus !== 'granted') {
      return (
        <View style={styles.centerState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="people-outline" size={28} color="rgba(255,255,255,0.2)" />
          </View>
          <Text style={styles.emptyTitle}>Find friends on Dabbu</Text>
          <Text style={styles.emptyDesc}>Sync your contacts to see who's already here</Text>
          <TouchableOpacity style={styles.inviteBtn} onPress={handleSyncContacts}>
            <Ionicons name="people-outline" size={16} color={colors.accent.primary} />
            <Text style={styles.inviteBtnText}>Sync Contacts</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!hasSynced || allContacts.length === 0) {
      return (
        <View style={styles.centerState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="person-outline" size={28} color="rgba(255,255,255,0.2)" />
          </View>
          <Text style={styles.emptyTitle}>No contacts found</Text>
          <Text style={styles.emptyDesc}>Search for members by name, phone, or email</Text>
          <TouchableOpacity style={styles.inviteBtn} onPress={() => handleInvite('')}>
            <Ionicons name="share-outline" size={16} color={colors.accent.primary} />
            <Text style={styles.inviteBtnText}>Send Invite</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={allContacts}
        keyExtractor={(_, i) => String(i)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <View style={styles.syncBanner}>
            <Ionicons name="people" size={16} color="#34C759" />
            <Text style={styles.syncBannerText}>
              {matchedContacts.length} friend{matchedContacts.length !== 1 ? 's' : ''} on Dabbu
            </Text>
            <TouchableOpacity onPress={handleSyncContacts} style={styles.resyncBtn}>
              <Ionicons name="refresh" size={16} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const name = item.type === 'match' ? item.name : (item as DeviceContact).name;
          const phone = item.type === 'match' ? item.phone : (item as DeviceContact).phone;
          const email = item.type === 'match' ? item.email : (item as DeviceContact).email;
          const isAppUser = item.type === 'match';
          const userId = item.type === 'match' ? item.userId : '';
          return (
            <View style={styles.contactRow}>
              <LinearGradient
                colors={
                  isAppUser ? gradColors : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']
                }
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{name[0]?.toUpperCase() || '?'}</Text>
              </LinearGradient>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName} numberOfLines={1}>
                  {name}
                </Text>
                <View style={styles.contactSubRow}>
                  <Text style={styles.contactSub} numberOfLines={1}>
                    {phone || email || 'No contact info'}
                  </Text>
                  {isAppUser && (
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>On Dabbu</Text>
                    </View>
                  )}
                </View>
              </View>
              {isAppUser ? (
                existingMemberIds.includes(userId) ? (
                  <View style={[styles.actionBtn, { backgroundColor: 'rgba(52,199,89,0.12)' }]}>
                    <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: `${colors.accent.primary}18` }]}
                    onPress={() =>
                      groupId ? handleAddToGroup(userId, name) : addFavorite(userId, name, phone)
                    }
                    disabled={addingId === userId}
                  >
                    {addingId === userId ? (
                      <ActivityIndicator size="small" color={colors.accent.primary} />
                    ) : (
                      <Text style={[styles.actionBtnText, { color: colors.accent.primary }]}>
                        + Add
                      </Text>
                    )}
                  </TouchableOpacity>
                )
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.inviteActionBtn]}
                  onPress={() => handleInvite(name)}
                >
                  <Text style={styles.inviteActionText}>Invite</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
      {renderHeader()}
      {renderSearchBar()}
      {renderFavoritesBar()}
      {query.trim().length >= 2 ? renderSearchResults() : renderContactsList()}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  headerWrap: { paddingBottom: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 52,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },

  searchOuter: { paddingHorizontal: 20, marginTop: 8, marginBottom: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#FFF', paddingVertical: 0 },

  favSection: { marginTop: 4, marginBottom: 4 },
  favSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.3)',
    marginLeft: 24,
    marginBottom: 8,
  },
  favList: { paddingHorizontal: 20, gap: 16 },
  favItem: { alignItems: 'center', gap: 6, width: 60 },
  favAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favAvatarSelected: { borderWidth: 2, borderColor: '#F3D28F' },
  favAvatarText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  favName: { fontSize: 11, fontWeight: '500', color: '#FFF', textAlign: 'center' },

  listContainer: { paddingTop: 4, paddingBottom: 40 },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  contactInfo: { flex: 1, justifyContent: 'center' },
  contactName: { fontSize: 15, fontWeight: '600', color: '#FFF', marginBottom: 2 },
  contactSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactSub: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(52,199,89,0.12)',
  },
  statusText: { fontSize: 10, fontWeight: '600', color: '#34C759' },

  actionBtn: {
    minWidth: 64,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  inviteActionBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inviteActionText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },

  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    lineHeight: 18,
  },
  syncingText: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: '500', marginTop: 4 },

  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
    marginTop: 8,
  },
  inviteBtnText: { fontSize: 14, fontWeight: '700', color: '#F3D28F' },

  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  syncBannerText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.45)', flex: 1 },
  resyncBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
