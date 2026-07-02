import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
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
import { Avatar } from '../../components/ui/Avatar';

import { alertService } from '../../components/ui';
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
  const spaceId = route.params?.spaceId;
  const groupType: 'shared-finance' | 'expense-group' | 'space' =
    route.params?.type || 'shared-finance';
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
      alertService.alert(
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

  async function handleAddToGroup(userId: string, userName: string) {
    const targetId = groupId || spaceId;
    if (!targetId) {
      return;
    }
    setAddingId(userId);
    try {
      if (groupType === 'space') {
        await api.post(`/spaces/${targetId}/members`, { userId }, undefined, 30000);
        navigation.goBack();
      } else if (groupType === 'expense-group') {
        await api.post(`/expense-groups/${targetId}/members/add-by-user-id`, { userId }, undefined, 30000);
        alertService.alert('Added', `${userName} added to group`);
      } else {
        await api.post(`/shared-finance/groups/${targetId}/members`, { userId }, undefined, 30000);
        alertService.alert('Added', `${userName} added to group`);
      }
    } catch (e: any) {
      const isAbort =
        e?.name === 'AbortError' || (e?.message || '').toLowerCase().includes('abort');
      alertService.alert(
        'Error',
        isAbort
          ? 'Request timed out. Please check your connection and try again.'
          : e?.message || 'Failed to add member',
      );
    } finally {
      setAddingId(null);
    }
  }

  function handleInvite(name: string) {
    const msg =
      'Hey! Join me on Dabbu - the smart expense splitting app.\n\nDownload: https://dabbu.app/download';
    alertService.alert(`Invite ${name}`, '', [
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
    if (groupId || spaceId) {
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: colors.bg.card }]}
        >
          <AntDesign name="arrowleft" size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Add Member</Text>
        <View style={{ width: 36 }} />
      </View>
    </LinearGradient>
  );

  const renderSearchBar = () => (
    <View style={styles.searchOuter}>
      <View
        style={[
          styles.searchWrap,
          { backgroundColor: colors.bg.card, borderColor: colors.border.default },
        ]}
      >
        <AntDesign name="search1" size={18} color={colors.text.tertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text.primary }]}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, phone or email"
          placeholderTextColor={colors.text.tertiary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color={colors.accent.primary} />}
        {query.length > 0 && !searching && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AntDesign name="closecircleo" size={18} color={colors.text.tertiary} />
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
        <Text style={[styles.favSectionLabel, { color: colors.text.tertiary }]}>FAVORITES</Text>
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
                <Avatar uri={fav.avatarUrl} name={fav.name} size={50} />
                <Text style={[styles.favName, { color: colors.text.primary }]} numberOfLines={1}>
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
              <Avatar
                uri={item.avatarUrl}
                name={`${item.firstName || ''} ${item.lastName || ''}`.trim()}
                size={44}
              />
              <View style={styles.contactInfo}>
                <Text
                  style={[styles.contactName, { color: colors.text.primary }]}
                  numberOfLines={1}
                >
                  {name}
                </Text>
                <Text
                  style={[styles.contactSub, { color: colors.text.tertiary }]}
                  numberOfLines={1}
                >
                  {item.phone || item.email || ''}
                </Text>
              </View>
              {isFavorite(item.id) ? (
                <View style={[styles.actionBtn, { backgroundColor: 'rgba(20,184,166,0.12)' }]}>
                  <AntDesign name="staro" size={14} color={colors.accent.primary} />
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
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.bg.card }]}>
                <AntDesign name="search1" size={28} color={colors.text.tertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>
                No users found
              </Text>
              <TouchableOpacity
                style={[styles.inviteBtn, { borderColor: `${colors.accent.primary}40` }]}
                onPress={() => handleInvite(query)}
              >
                <AntDesign name="sharealt" size={16} color={colors.accent.primary} />
                <Text style={[styles.inviteBtnText, { color: colors.accent.primary }]}>
                  Send Invite
                </Text>
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
          <Text style={[styles.syncingText, { color: colors.text.tertiary }]}>
            Syncing contacts...
          </Text>
        </View>
      );
    }

    if (syncError) {
      return (
        <View style={styles.centerState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.bg.card }]}>
            <AntDesign name="cloudo" size={28} color="#FF4545" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.status.error }]}>{syncError}</Text>
          <TouchableOpacity
            style={[styles.inviteBtn, { borderColor: `${colors.accent.primary}40` }]}
            onPress={handleSyncContacts}
          >
            <AntDesign name="reload1" size={16} color={colors.accent.primary} />
            <Text style={[styles.inviteBtnText, { color: colors.accent.primary }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!hasSynced && permStatus !== 'granted') {
      return (
        <View style={styles.centerState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.bg.card }]}>
            <AntDesign name="team" size={28} color={colors.text.tertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>
            Find friends on Dabbu
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
            Sync your contacts to see who's already here
          </Text>
          <TouchableOpacity
            style={[styles.inviteBtn, { borderColor: `${colors.accent.primary}40` }]}
            onPress={handleSyncContacts}
          >
            <AntDesign name="team" size={16} color={colors.accent.primary} />
            <Text style={[styles.inviteBtnText, { color: colors.accent.primary }]}>
              Sync Contacts
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!hasSynced || allContacts.length === 0) {
      return (
        <View style={styles.centerState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.bg.card }]}>
            <AntDesign name="user" size={28} color={colors.text.tertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text.secondary }]}>
            No contacts found
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
            Search for members by name, phone, or email
          </Text>
          <TouchableOpacity
            style={[styles.inviteBtn, { borderColor: `${colors.accent.primary}40` }]}
            onPress={() => handleInvite('')}
          >
            <AntDesign name="sharealt" size={16} color={colors.accent.primary} />
            <Text style={[styles.inviteBtnText, { color: colors.accent.primary }]}>
              Send Invite
            </Text>
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
            <AntDesign name="team" size={16} color="#34C759" />
            <Text style={[styles.syncBannerText, { color: colors.text.secondary }]}>
              {matchedContacts.length} friend{matchedContacts.length !== 1 ? 's' : ''} on Dabbu
            </Text>
            <TouchableOpacity
              onPress={handleSyncContacts}
              style={[styles.resyncBtn, { backgroundColor: colors.bg.card }]}
            >
              <AntDesign name="reload1" size={16} color={colors.text.tertiary} />
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
              {isAppUser ? (
                <Avatar name={name} size={44} />
              ) : (
                <View
                  style={[
                    styles.contactAvatarPlaceholder,
                    { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
                  ]}
                >
                  <Text style={[styles.contactAvatarInitial, { color: colors.text.tertiary }]}>
                    {name[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              <View style={styles.contactInfo}>
                <Text
                  style={[styles.contactName, { color: colors.text.primary }]}
                  numberOfLines={1}
                >
                  {name}
                </Text>
                <View style={styles.contactSubRow}>
                  <Text
                    style={[styles.contactSub, { color: colors.text.tertiary }]}
                    numberOfLines={1}
                  >
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
                    <AntDesign name="checkcircleo" size={16} color="#34C759" />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: `${colors.accent.primary}18` }]}
                    onPress={() =>
                      groupId || spaceId
                        ? handleAddToGroup(userId, name)
                        : addFavorite(userId, name, phone)
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
                  style={[
                    styles.actionBtn,
                    styles.inviteActionBtn,
                    { borderColor: colors.border.default },
                  ]}
                  onPress={() => handleInvite(name)}
                >
                  <Text style={[styles.inviteActionText, { color: colors.text.tertiary }]}>
                    Invite
                  </Text>
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
    paddingHorizontal: 24,
    height: 52,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 19, fontWeight: '700' },

  searchOuter: { paddingHorizontal: 24, marginTop: 8, marginBottom: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 28,
    paddingHorizontal: 24,
    height: 52,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },

  favSection: { marginTop: 4, marginBottom: 4 },
  favSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginLeft: 28,
    marginBottom: 8,
  },
  favList: { paddingHorizontal: 24, gap: 20 },
  favItem: { alignItems: 'center', gap: 6, width: 60 },
  favAvatar: {
    width: 50,
    height: 54,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favAvatarSelected: { borderWidth: 2, borderColor: '#14B8A6' },
  favAvatarText: { fontSize: 19, fontWeight: '700', color: '#FFF' },
  favName: { fontSize: 12, fontWeight: '500', textAlign: 'center' },

  listContainer: { paddingTop: 4, paddingBottom: 44 },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    gap: 14,
  },
  avatar: {
    width: 44,
    height: 52,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  contactAvatarPlaceholder: {
    width: 44,
    height: 52,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarInitial: { fontSize: 16, fontWeight: '700' },
  contactInfo: { flex: 1, justifyContent: 'center' },
  contactName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  contactSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactSub: { fontSize: 12, fontWeight: '500' },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(52,199,89,0.12)',
  },
  statusText: { fontSize: 10, fontWeight: '600', color: '#34C759' },

  actionBtn: {
    minWidth: 64,
    height: 32,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  actionBtnText: { fontSize: 16, fontWeight: '700' },
  inviteActionBtn: {
    borderWidth: 1.5,
  },
  inviteActionText: { fontSize: 12, fontWeight: '600' },

  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 36,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  syncingText: { fontSize: 16, fontWeight: '500', marginTop: 4 },

  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1.5,
    marginTop: 8,
  },
  inviteBtnText: { fontSize: 16, fontWeight: '700' },

  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  syncBannerText: { fontSize: 16, fontWeight: '600', flex: 1 },
  resyncBtn: {
    width: 32,
    height: 32,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
