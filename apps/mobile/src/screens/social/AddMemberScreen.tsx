import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
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

  const scrollY = useRef(new Animated.Value(0)).current;
  const searchAbortRef = useRef<AbortController | null>(null);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.85],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    getRawPermissionStatus().then((s) => {
      setPermStatus(s);
      setContactsGranted(s === 'granted');
    });
  }, []);

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
    const { granted, status } = await requestRawPermission();
    setPermStatus(status);
    setContactsGranted(granted);
    if (status === 'denied') {
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
    if (!granted) {
      return;
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
    if (!groupId) {
      return;
    }
    setAddingId(userId);
    try {
      const { api } = await import('../../services/api');
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

  const gradColors = useMemo(() => [colors.accent.primary, colors.accent.secondary], [colors]);

  const renderHeader = () => (
    <Animated.View style={[styles.header, { paddingTop: insets.top + 8, opacity: headerOpacity }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="close" size={20} color="#FFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Add Member</Text>
      <View style={{ width: 36 }} />
    </Animated.View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchWrap}>
      <View style={[styles.searchInner, { backgroundColor: 'rgba(255,255,255,0.07)' }]}>
        <Ionicons name="search" size={16} color="rgba(255,255,255,0.4)" />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, phone, or email..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color={colors.accent.primary} />}
        {query.length > 0 && !searching && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
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
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
        >
          {favorites.map((fav) => {
            const selected = selectedFavId === fav.userId;
            return (
              <TouchableOpacity
                key={fav.userId}
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
          })}
        </Animated.ScrollView>
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
        renderItem={({ item, index }) => {
          const name = [item.firstName, item.lastName].filter(Boolean).join(' ') || item.email;
          const isFav = isFavorite(item.id);
          return (
            <Animated.View style={[styles.contactRow, { opacity: 1 }]}>
              <LinearGradient colors={gradColors} style={styles.avatarGradient}>
                <Text style={styles.avatarText}>
                  {(item.firstName?.[0] || item.email?.[0] || '?').toUpperCase()}
                </Text>
              </LinearGradient>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName} numberOfLines={1}>
                  {name}
                </Text>
                <View style={styles.contactSubRow}>
                  {item.phone ? <Text style={styles.contactSub}>{item.phone}</Text> : null}
                  {item.email ? <Text style={styles.contactSub}>{item.email}</Text> : null}
                </View>
              </View>
              {isFav ? (
                <View style={[styles.actionBtn, styles.favActiveBtn]}>
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
            </Animated.View>
          );
        }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 2 }}
        ListEmptyComponent={
          searching ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={colors.accent.primary} />
            </View>
          ) : (
            <View style={styles.centerState}>
              <Ionicons name="person-outline" size={40} color="rgba(255,255,255,0.15)" />
              <Text style={styles.emptyTitle}>No users found</Text>
              <TouchableOpacity style={styles.inviteBtn} onPress={() => handleInvite(query)}>
                <Ionicons name="share-outline" size={14} color={colors.accent.primary} />
                <Text style={styles.inviteBtnText}>Send Invite</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    );
  };

  const renderMainContent = () => {
    if (!contactsGranted) {
      return (
        <View style={styles.permWrap}>
          <LinearGradient
            colors={[`${colors.accent.primary}20`, `${colors.accent.primary}08`]}
            style={styles.permIconBox}
          >
            <Ionicons name="people-outline" size={40} color={colors.accent.primary} />
          </LinearGradient>
          <Text style={styles.permTitle}>Sync Contacts to Split Faster</Text>
          <Text style={styles.permDesc}>
            Find friends on Dabbu and add them to groups instantly.
          </Text>
          {permStatus === 'denied' ? (
            <TouchableOpacity style={styles.permBtnOutline} onPress={() => Linking.openSettings()}>
              <Ionicons name="settings-outline" size={16} color={colors.accent.primary} />
              <Text style={[styles.permBtnOutlineText, { color: colors.accent.primary }]}>
                Open Settings
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.permBtn, { backgroundColor: colors.accent.primary }]}
              onPress={handleSyncContacts}
            >
              <Ionicons name="people" size={16} color="#FFF" />
              <Text style={styles.permBtnText}>Grant Contacts Permission</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

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
          <Ionicons name="cloud-offline-outline" size={40} color="#FF4545" />
          <Text style={[styles.emptyTitle, { color: '#FF4545', textAlign: 'center' }]}>
            {syncError}
          </Text>
          <TouchableOpacity style={styles.inviteBtn} onPress={handleSyncContacts}>
            <Ionicons name="refresh-outline" size={14} color={colors.accent.primary} />
            <Text style={styles.inviteBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (allContacts.length === 0) {
      return (
        <View style={styles.centerState}>
          <Ionicons name="search-outline" size={40} color="rgba(255,255,255,0.15)" />
          <Text style={[styles.emptyTitle, { color: 'rgba(255,255,255,0.5)' }]}>
            No contacts found
          </Text>
          <Text style={styles.emptyDesc}>Invite friends to join Dabbu</Text>
          <TouchableOpacity style={styles.inviteBtn} onPress={() => handleInvite('')}>
            <Ionicons name="share-outline" size={14} color={colors.accent.primary} />
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
                  isAppUser ? gradColors : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
                }
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarText}>{name[0]?.toUpperCase() || '?'}</Text>
              </LinearGradient>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName} numberOfLines={1}>
                  {name}
                </Text>
                <View style={styles.contactSubRow}>
                  {phone ? (
                    <Text style={styles.contactSub}>{phone}</Text>
                  ) : email ? (
                    <Text style={styles.contactSub}>{email}</Text>
                  ) : null}
                  {isAppUser && (
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>On Dabbu</Text>
                    </View>
                  )}
                </View>
              </View>
              {isAppUser ? (
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
              ) : (
                <TouchableOpacity style={styles.inviteActionBtn} onPress={() => handleInvite(name)}>
                  <Text style={styles.inviteActionText}>Invite</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 2 }}
        ListHeaderComponent={
          <View style={styles.syncBannerRow}>
            <Ionicons name="people" size={14} color="#34C759" />
            <Text style={styles.syncBannerText}>
              {matchedContacts.length} friend{matchedContacts.length !== 1 ? 's' : ''} on Dabbu
            </Text>
            <TouchableOpacity onPress={handleSyncContacts} style={styles.resyncBtn}>
              <Ionicons name="refresh" size={14} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>
        }
      />
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
      {renderHeader()}
      {renderSearchBar()}
      {renderFavoritesBar()}
      {query.trim().length >= 2 ? renderSearchResults() : renderMainContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

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

  searchWrap: { paddingHorizontal: 20, marginVertical: 12 },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500', color: '#FFF', paddingVertical: 0 },

  favSection: { marginBottom: 8 },
  favSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.35)',
    marginLeft: 24,
    marginBottom: 10,
  },
  favItem: { alignItems: 'center', gap: 6, width: 64 },
  favAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favAvatarSelected: { borderWidth: 2, borderColor: '#FF6B00' },
  favAvatarText: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  favName: { fontSize: 12, fontWeight: '500', color: '#FFF', textAlign: 'center', maxWidth: 64 },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    gap: 12,
    paddingHorizontal: 20,
  },
  avatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  contactInfo: { flex: 1, justifyContent: 'center' },
  contactName: { fontSize: 15, fontWeight: '600', color: '#FFF', marginBottom: 2 },
  contactSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactSub: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.45)' },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(52,199,89,0.12)',
  },
  statusText: { fontSize: 10, fontWeight: '600', color: '#34C759' },

  actionBtn: {
    width: 68,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  favActiveBtn: {
    width: 68,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,107,0,0.1)',
  },
  inviteActionBtn: {
    width: 68,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteActionText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },

  permWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  permIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
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
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  permBtnOutlineText: { fontSize: 15, fontWeight: '700' },

  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  emptyDesc: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.3)' },
  syncingText: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: '500', marginTop: 8 },

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

  syncBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    marginHorizontal: 20,
  },
  syncBannerText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.45)', flex: 1 },
  resyncBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
