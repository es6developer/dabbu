import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Linking,
  Animated,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { useFavorites } from '../../store/FavoritesContext';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import {
  requestRawPermission,
  getRawPermissionStatus,
  fetchDeviceContacts,
  syncContacts,
  DeviceContact,
  ContactMatch,
  PermissionStatusStr,
} from '../../services/contacts';

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
  const { user: currentUser } = useAuth();
  const { colors, isDark } = useTheme();
  const { favorites, isFavorite, addFavorite } = useFavorites();
  const insets = useSafeAreaInsets();
  const groupId = route.params?.groupId;

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [contactsGranted, setContactsGranted] = useState(false);
  const [permStatus, setPermStatus] = useState<PermissionStatusStr>('undetermined');
  const [syncing, setSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [matchedContacts, setMatchedContacts] = useState<ContactMatch[]>([]);
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [selectedFavId, setSelectedFavId] = useState<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    (async () => {
      const status = await getRawPermissionStatus();
      setPermStatus(status);
      setContactsGranted(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    setSearching(true);
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
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
      const res = await api.get<any>(`/users/search?query=${encodeURIComponent(q)}`, signal);
      const data = Array.isArray(res) ? res : res?.data || [];
      setSearchResults(data);
      setSearchError(null);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return;
      }
      setSearchResults([]);
      setSearchError('Search failed. Check your connection.');
    } finally {
      setSearching(false);
    }
  }

  async function handleSyncContacts() {
    const { granted, status } = await requestRawPermission();
    setPermStatus(status);
    setContactsGranted(granted);
    if (status === 'denied') {
      Alert.alert(
        'Contacts Access Required',
        'To find friends on Dabbu, enable contact access in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    if (!granted) {
      return;
    }
    setSyncError(null);
    setSyncing(true);
    try {
      const devContacts = await fetchDeviceContacts();
      setDeviceContacts(devContacts);
      const result = await syncContacts();
      setMatchedContacts(result.matched || []);
      setHasSynced(true);
    } catch {
      setSyncError('Could not sync contacts. Please try again.');
      setHasSynced(true);
    } finally {
      setSyncing(false);
    }
  }

  const allContacts: ContactEntry[] = React.useMemo(() => {
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
    if (!groupId) {
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

  function handleInvite(name: string) {
    const message = `Hey! Join me on Dabbu - the smart expense splitting app.\n\nDownload: https://dabbu.app/download`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    Alert.alert(`Invite ${name}`, '', [
      { text: 'WhatsApp', onPress: () => Linking.openURL(whatsappUrl) },
      {
        text: 'Share Link',
        onPress: () => Linking.openURL(`sms:&body=${encodeURIComponent(message)}`),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function handleFavoritePress(fav: (typeof favorites)[0]) {
    setSelectedFavId(fav.userId);
    if (groupId) {
      handleAddToGroup(fav.userId, fav.name);
    }
    setTimeout(() => setSelectedFavId(null), 300);
  }

  const AvatarCircle = ({ name, size = 44 }: { name: string; size?: number }) => (
    <View
      style={[
        avatarStyle.wrap,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: '#1C1C1E' },
      ]}
    >
      <Text style={[avatarStyle.text, { fontSize: size * 0.4 }]}>
        {name ? name[0].toUpperCase() : '?'}
      </Text>
    </View>
  );

  const headerHeight = 56 + insets.top + 8;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[s.screen, { backgroundColor: '#070708' }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        {/* Header */}
        <Animated.View style={[s.header, { paddingTop: insets.top + 8, opacity: headerOpacity }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Add Member</Text>
          <View style={{ width: 36 }} />
        </Animated.View>

        {/* Search Bar */}
        <View
          style={[
            s.searchBar,
            { backgroundColor: '#161616', borderColor: 'rgba(255,255,255,0.08)' },
          ]}
        >
          <Ionicons name="search" size={18} color="#8E8E93" />
          <TextInput
            style={[s.searchInput, { color: '#FFF' }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, phone, or favorites..."
            placeholderTextColor="#8E8E93"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>

        {/* Favorites Quick-Select Bar */}
        {favorites.length > 0 && !query.trim() && (
          <View style={s.favSection}>
            <Animated.ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
              scrollEventThrottle={16}
            >
              {favorites.map((fav) => {
                const selected = selectedFavId === fav.userId;
                return (
                  <TouchableOpacity
                    key={fav.userId}
                    style={s.favItem}
                    onPress={() => handleFavoritePress(fav)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.favAvatar, selected && s.favAvatarSelected]}>
                      <AvatarCircle name={fav.name} size={48} />
                    </View>
                    <Text style={s.favName} numberOfLines={1}>
                      {fav.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </Animated.ScrollView>
          </View>
        )}

        {/* Content */}
        {query.trim().length >= 2 ? (
          /* Search Results */
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View style={s.contactRow}>
                <AvatarCircle name={`${item.firstName} ${item.lastName}`} />
                <View style={s.contactInfo}>
                  <Text style={s.contactName} numberOfLines={1}>
                    {item.firstName} {item.lastName}
                  </Text>
                  <Text style={s.contactSub}>{item.email}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    s.actionBtn,
                    { backgroundColor: 'rgba(255,107,0,0.1)', borderColor: 'rgba(255,107,0,0.4)' },
                  ]}
                  onPress={() => {
                    if (groupId) {
                      handleAddToGroup(item.id, item.firstName);
                    } else {
                      addFavorite(item.id, `${item.firstName} ${item.lastName}`, item.phone);
                    }
                  }}
                  disabled={addingId === item.id}
                >
                  {addingId === item.id ? (
                    <ActivityIndicator size="small" color="#FF6B00" />
                  ) : (
                    <Text style={[s.actionBtnText, { color: '#FF6B00' }]}>+ Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 4 }}
            ListEmptyComponent={
              searching ? (
                <View style={s.centerState}>
                  <ActivityIndicator size="large" color="#FF6B00" />
                </View>
              ) : searchError ? (
                <View style={s.centerState}>
                  <Ionicons name="alert-circle-outline" size={48} color="#FF4545" />
                  <Text style={[s.emptyTitle, { color: '#FF4545' }]}>{searchError}</Text>
                  <TouchableOpacity
                    style={s.inviteBtn}
                    onPress={() => {
                      if (query.trim().length >= 2) {
                        searchUsers(query.trim());
                      }
                    }}
                  >
                    <Ionicons name="refresh-outline" size={16} color="#FF6B00" />
                    <Text style={s.inviteBtnText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={s.centerState}>
                  <Ionicons name="person-outline" size={48} color="rgba(255,255,255,0.15)" />
                  <Text style={[s.emptyTitle, { color: 'rgba(255,255,255,0.5)' }]}>
                    No users found
                  </Text>
                  <TouchableOpacity style={s.inviteBtn} onPress={() => handleInvite(query)}>
                    <Ionicons name="share-outline" size={16} color="#FF6B00" />
                    <Text style={s.inviteBtnText}>Send Invite</Text>
                  </TouchableOpacity>
                </View>
              )
            }
          />
        ) : !contactsGranted ? (
          /* Permission Banner */
          <View style={s.permWrap}>
            <View style={[s.permIconBox, { backgroundColor: 'rgba(255,107,0,0.12)' }]}>
              <Ionicons name="people-outline" size={44} color="#FF6B00" />
            </View>
            <Text style={s.permTitle}>Sync Contacts to Split Faster</Text>
            <Text style={s.permDesc}>
              Connect your contacts to instantly find friends on Dabbu and add them to groups.
            </Text>
            {permStatus === 'denied' ? (
              <TouchableOpacity
                style={s.permBtnOutline}
                onPress={() => Linking.openSettings()}
                activeOpacity={0.85}
              >
                <Ionicons name="settings-outline" size={18} color="#FF6B00" />
                <Text style={s.permBtnOutlineText}>Open Settings</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.permBtn} onPress={handleSyncContacts} activeOpacity={0.85}>
                <Ionicons name="people" size={18} color="#FFF" />
                <Text style={s.permBtnText}>Grant Contacts Permission</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : syncing ? (
          /* Syncing State */
          <View style={s.centerState}>
            <ActivityIndicator size="large" color="#FF6B00" />
            <Text style={{ color: '#8E8E93', fontSize: 14, fontWeight: '500', marginTop: 12 }}>
              Syncing contacts...
            </Text>
          </View>
        ) : syncError ? (
          /* Sync Error */
          <View style={s.centerState}>
            <Ionicons name="cloud-offline-outline" size={48} color="#FF4545" />
            <Text style={[s.emptyTitle, { color: '#FF4545', textAlign: 'center' }]}>
              {syncError}
            </Text>
            <TouchableOpacity style={s.inviteBtn} onPress={handleSyncContacts}>
              <Ionicons name="refresh-outline" size={16} color="#FF6B00" />
              <Text style={s.inviteBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : allContacts.length === 0 && !hasSynced ? (
          /* Initial state before sync */
          <View style={s.permWrap}>
            <View style={[s.permIconBox, { backgroundColor: 'rgba(255,107,0,0.12)' }]}>
              <Ionicons name="people-outline" size={44} color="#FF6B00" />
            </View>
            <Text style={s.permTitle}>Sync Contacts to Split Faster</Text>
            <Text style={s.permDesc}>
              Connect your contacts to instantly find friends on Dabbu and add them to groups.
            </Text>
            <TouchableOpacity style={s.permBtn} onPress={handleSyncContacts} activeOpacity={0.85}>
              <Ionicons name="people" size={18} color="#FFF" />
              <Text style={s.permBtnText}>Grant Contacts Permission</Text>
            </TouchableOpacity>
          </View>
        ) : allContacts.length === 0 ? (
          /* Empty after sync */
          <View style={s.centerState}>
            <Ionicons name="search-outline" size={48} color="rgba(255,255,255,0.15)" />
            <Text style={[s.emptyTitle, { color: 'rgba(255,255,255,0.5)' }]}>
              No contacts found
            </Text>
            <Text style={s.emptyDesc}>Invite friends to join Dabbu</Text>
            <TouchableOpacity style={s.inviteBtn} onPress={() => handleInvite('')}>
              <Ionicons name="share-outline" size={16} color="#FF6B00" />
              <Text style={s.inviteBtnText}>Send Invite</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Contact List */
          <FlatList
            data={allContacts}
            keyExtractor={(item, i) => String(i)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const name = item.type === 'match' ? item.name : (item as any as DeviceContact).name;
              const phone =
                item.type === 'match' ? item.phone : (item as any as DeviceContact).phone;
              const email =
                item.type === 'match' ? item.email : (item as any as DeviceContact).email;
              const isAppUser = item.type === 'match';
              const userId = item.type === 'match' ? item.userId : '';
              return (
                <View style={s.contactRow}>
                  <AvatarCircle name={name} />
                  <View style={s.contactInfo}>
                    <Text style={s.contactName} numberOfLines={1}>
                      {name}
                    </Text>
                    <View style={s.contactSubRow}>
                      {phone ? (
                        <Text style={s.contactSub}>{phone}</Text>
                      ) : email ? (
                        <Text style={s.contactSub}>{email}</Text>
                      ) : null}
                      {isAppUser && (
                        <View style={s.statusBadge}>
                          <Text style={s.statusText}>On Dabbu</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {isAppUser ? (
                    <TouchableOpacity
                      style={[
                        s.actionBtn,
                        {
                          backgroundColor: 'rgba(255,107,0,0.1)',
                          borderColor: 'rgba(255,107,0,0.4)',
                        },
                      ]}
                      onPress={() => {
                        if (groupId) {
                          handleAddToGroup(userId, name);
                        } else {
                          addFavorite(userId, name, phone);
                        }
                      }}
                      disabled={addingId === userId}
                    >
                      {addingId === userId ? (
                        <ActivityIndicator size="small" color="#FF6B00" />
                      ) : (
                        <Text style={[s.actionBtnText, { color: '#FF6B00' }]}>+ Add</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[s.inviteActionBtn, { borderColor: 'rgba(255,255,255,0.08)' }]}
                      onPress={() => handleInvite(name)}
                    >
                      <Text style={s.inviteActionText}>Invite</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 4 }}
            ListHeaderComponent={
              <View style={s.syncBannerRow}>
                <Ionicons name="people" size={14} color="#34C759" />
                <Text style={s.syncBannerText}>
                  {matchedContacts.length} friend{matchedContacts.length !== 1 ? 's' : ''} on Dabbu
                </Text>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 56,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },

  /* Search */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },

  /* Favorites Bar */
  favSection: { marginTop: 12, marginBottom: 8 },
  favItem: { alignItems: 'center', gap: 6, width: 64 },
  favAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favAvatarSelected: {
    borderWidth: 2,
    borderColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  favName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFF',
    textAlign: 'center',
    maxWidth: 64,
  },

  /* Contact Row */
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    gap: 12,
  },
  contactInfo: { flex: 1, justifyContent: 'center' },
  contactName: { fontSize: 15, fontWeight: '600', color: '#FFF', marginBottom: 2 },
  contactSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactSub: { fontSize: 12, fontWeight: '500', color: '#8E8E93' },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(52,199,89,0.12)',
  },
  statusText: { fontSize: 10, fontWeight: '600', color: '#34C759' },

  /* Action Buttons */
  actionBtn: {
    width: 72,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  inviteActionBtn: {
    width: 72,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteActionText: { fontSize: 12, fontWeight: '600', color: '#8E8E93' },

  /* Permission */
  permWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  permIconBox: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  permTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  permDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF6B00',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  permBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  permBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B00',
  },
  permBtnOutlineText: { color: '#FF6B00', fontSize: 15, fontWeight: '700' },

  /* States */
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyDesc: { fontSize: 13, fontWeight: '500', color: '#8E8E93' },

  /* Invite Button */
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
    marginTop: 4,
  },
  inviteBtnText: { fontSize: 14, fontWeight: '700', color: '#FF6B00' },

  /* Sync Banner */
  syncBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 4,
  },
  syncBannerText: { fontSize: 13, fontWeight: '600', color: '#8E8E93', flex: 1 },
});

const avatarStyle = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '700', color: '#FFF' },
});
