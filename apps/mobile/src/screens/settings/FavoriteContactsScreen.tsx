import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFavorites } from '../../store/FavoritesContext';
import * as favoritesApi from '../../services/favorites';
import * as contactsService from '../../services/contacts';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  bg: '#070708',
  cardBg: '#131315',
  border: 'rgba(255,255,255,0.06)',
  textPrimary: '#FFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  textTertiary: 'rgba(255,255,255,0.35)',
  accent: '#F3D28F',
  accentGradient: ['#F3D28F', '#D4A853'] as const,
  red: '#FF4D4F',
  green: '#34C759',
  surface: 'rgba(255,255,255,0.06)',
};

export function FavoriteContactsScreen() {
  const navigation = useNavigation<any>();
  const { favorites, loading, refresh } = useFavorites();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<favoritesApi.SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState<favoritesApi.SearchUser[]>([]);
  const [loadingDevice, setLoadingDevice] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0.92],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    loadDeviceContacts();
  }, []);

  const loadDeviceContacts = async () => {
    setLoadingDevice(true);
    try {
      const { matched } = await contactsService.syncContacts();
      setDeviceContacts(
        matched
          .filter((m) => !favorites.some((f) => f.userId === m.userId))
          .map((m) => ({
            id: m.userId,
            email: m.email,
            firstName: m.name,
            lastName: '',
            avatarUrl: m.avatarUrl,
            phone: m.phone,
          })),
      );
    } catch {
      // ignore
    }
    setLoadingDevice(false);
  };

  const handleSearch = useCallback(
    async (text: string) => {
      setSearchQuery(text);
      if (text.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      const results = await favoritesApi.searchUsers(text);
      setSearchResults(results.filter((r) => !favorites.some((f) => f.userId === r.id)));
      setSearching(false);
    },
    [favorites],
  );

  const handleAddFavorite = useCallback(
    async (userId: string) => {
      setAddingId(userId);
      await favoritesApi.addFavorite(userId);
      await refresh();
      setAddingId(null);
      setSearchQuery('');
      setSearchResults([]);
      loadDeviceContacts();
    },
    [refresh],
  );

  const handleRemoveFavorite = useCallback(
    async (userId: string) => {
      await favoritesApi.removeFavorite(userId);
      await refresh();
      loadDeviceContacts();
    },
    [refresh],
  );

  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.userId)), [favorites]);

  const gradientColors = useMemo(() => [...COLORS.accentGradient], []);

  const renderHeader = () => (
    <Animated.View style={[styles.header, { paddingTop: insets.top + 8, opacity: headerOpacity }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={20} color="#FFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Favorite Contacts</Text>
      <View style={{ width: 36 }} />
    </Animated.View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchWrap}>
      <View style={styles.searchInner}>
        <Ionicons name="search" size={16} color="rgba(255,255,255,0.4)" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
          keyboardType="default"
        />
        {searching && <ActivityIndicator size="small" color={COLORS.accent} />}
        {searchQuery.length > 0 && !searching && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
            }}
          >
            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderSearchResults = () => {
    if (searchQuery.length < 2) {
      return null;
    }
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {searchResults.length > 0 ? 'Search Results' : 'No users found'}
        </Text>
        {searchResults.length > 0 && (
          <View style={styles.listCard}>
            {searchResults.map((user, i) => (
              <React.Fragment key={user.id}>
                <View style={styles.row}>
                  <LinearGradient colors={[COLORS.accent, '#D4A853']} style={styles.avatarGradient}>
                    <Text style={styles.avatarText}>
                      {(user.firstName?.[0] || user.email?.[0] || '?').toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}
                    </Text>
                    {user.phone && <Text style={styles.rowPhone}>{user.phone}</Text>}
                  </View>
                  {favoriteIds.has(user.id) ? (
                    <View style={[styles.actionBtn, styles.favBtnActive]}>
                      <Ionicons name="star" size={16} color={COLORS.accent} />
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.addBtn]}
                      onPress={() => handleAddFavorite(user.id)}
                      disabled={addingId === user.id}
                    >
                      {addingId === user.id ? (
                        <ActivityIndicator size="small" color={COLORS.accent} />
                      ) : (
                        <Ionicons name="star-outline" size={16} color={COLORS.accent} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
                {i < searchResults.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderDeviceContacts = () => {
    if (deviceContacts.length === 0 || searchQuery.length > 0) {
      return null;
    }
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>From Your Contacts</Text>
        <View style={styles.listCard}>
          {deviceContacts.slice(0, 5).map((user, i) => (
            <React.Fragment key={user.id}>
              <View style={styles.row}>
                <LinearGradient colors={gradientColors} style={styles.avatarGradient}>
                  <Text style={styles.avatarText}>
                    {(user.firstName?.[0] || '?').toUpperCase()}
                  </Text>
                </LinearGradient>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {user.firstName || user.email}
                  </Text>
                  {user.phone && <Text style={styles.rowPhone}>{user.phone}</Text>}
                </View>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.addBtn]}
                  onPress={() => handleAddFavorite(user.id)}
                  disabled={addingId === user.id}
                >
                  {addingId === user.id ? (
                    <ActivityIndicator size="small" color={COLORS.accent} />
                  ) : (
                    <Ionicons name="star-outline" size={16} color={COLORS.accent} />
                  )}
                </TouchableOpacity>
              </View>
              {i < Math.min(deviceContacts.length, 5) - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
          {deviceContacts.length > 5 && (
            <TouchableOpacity style={styles.moreBtn}>
              <Text style={styles.moreBtnText}>+{deviceContacts.length - 5} more</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderFavorites = () => {
    if (favorites.length === 0 && searchQuery.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <LinearGradient
            colors={['rgba(255,107,0,0.15)', 'rgba(255,107,0,0.05)']}
            style={styles.emptyIconBox}
          >
            <Ionicons name="star-outline" size={40} color={COLORS.accent} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyDesc}>
            Search by name or phone above, or sync your contacts to find friends on Dabbu.
          </Text>
        </View>
      );
    }
    if (searchQuery.length > 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Favorites ({favorites.length})</Text>
        <View style={styles.listCard}>
          {favorites.map((fav, i) => (
            <React.Fragment key={fav.userId}>
              <View style={styles.row}>
                <LinearGradient colors={gradientColors} style={styles.avatarGradient}>
                  <Text style={styles.avatarText}>{fav.name[0]?.toUpperCase() || '?'}</Text>
                </LinearGradient>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {fav.name}
                  </Text>
                  {fav.phone && <Text style={styles.rowPhone}>{fav.phone}</Text>}
                </View>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.removeBtn]}
                  onPress={() => handleRemoveFavorite(fav.userId)}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.red} />
                </TouchableOpacity>
              </View>
              {i < favorites.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <>
      {renderHeader()}
      {renderSearchBar()}
      {renderSearchResults()}
      {renderDeviceContacts()}
      {renderFavorites()}
    </>
  );

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: COLORS.bg }]}>
        {renderHeader()}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: COLORS.bg }]}>
      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={() => <View style={{ height: 40 }} />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
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

  searchWrap: { paddingHorizontal: 20, marginTop: 12, marginBottom: 8 },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
  },
  searchIcon: { marginRight: 2 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#FFF',
    paddingVertical: 0,
  },

  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 10,
    marginLeft: 4,
  },
  listCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#131315',
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  avatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#FFF', marginBottom: 1 },
  rowPhone: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.45)' },

  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: { backgroundColor: 'rgba(255,107,0,0.1)' },
  favBtnActive: { backgroundColor: 'rgba(255,107,0,0.15)' },
  removeBtn: { backgroundColor: 'rgba(255,77,79,0.1)' },

  divider: { height: 1, marginHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.04)' },
  moreBtn: { alignItems: 'center', paddingVertical: 12 },
  moreBtnText: { fontSize: 13, fontWeight: '600', color: '#F3D28F' },

  emptyWrap: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 60 },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  emptyDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});
