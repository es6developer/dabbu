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
import { useTheme } from '../../theme';

export function FavoriteContactsScreen() {
  const navigation = useNavigation<any>();
  const { favorites, loading, refresh } = useFavorites();
  const { colors, isDark } = useTheme();
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

  const gradientColors = useMemo(() => [colors.brand.primary, colors.brand.hover], [colors]);

  const renderHeader = () => (
    <Animated.View style={[styles.header, { paddingTop: insets.top + 8, opacity: headerOpacity }]}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.backBtn, { backgroundColor: colors.bg.glass }]}
      >
        <Ionicons name="arrow-back" size={20} color={colors.text.primary} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Favorite Contacts</Text>
      <View style={{ width: 36 }} />
    </Animated.View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchWrap}>
      <View style={[styles.searchInner, { backgroundColor: colors.bg.glass }]}>
        <Ionicons name="search" size={16} color={colors.text.tertiary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text.primary }]}
          placeholder="Search by name or phone..."
          placeholderTextColor={colors.text.tertiary}
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
          keyboardType="default"
        />
        {searching && <ActivityIndicator size="small" color={colors.brand.primary} />}
        {searchQuery.length > 0 && !searching && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
            }}
          >
            <Ionicons name="close-circle" size={16} color={colors.text.tertiary} />
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
        <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>
          {searchResults.length > 0 ? 'Search Results' : 'No users found'}
        </Text>
        {searchResults.length > 0 && (
          <View
            style={[
              styles.listCard,
              { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
            ]}
          >
            {searchResults.map((user, i) => (
              <React.Fragment key={user.id}>
                <View style={styles.row}>
                  <LinearGradient
                    colors={[colors.brand.primary, colors.brand.hover]}
                    style={styles.avatarGradient}
                  >
                    <Text style={[styles.avatarText, { color: colors.text.primary }]}>
                      {(user.firstName?.[0] || user.email?.[0] || '?').toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <View style={styles.rowInfo}>
                    <Text
                      style={[styles.rowName, { color: colors.text.primary }]}
                      numberOfLines={1}
                    >
                      {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}
                    </Text>
                    {user.phone && (
                      <Text style={[styles.rowPhone, { color: colors.text.secondary }]}>
                        {user.phone}
                      </Text>
                    )}
                  </View>
                  {favoriteIds.has(user.id) ? (
                    <View
                      style={[styles.actionBtn, { backgroundColor: colors.accent.primary + '25' }]}
                    >
                      <Ionicons name="star" size={16} color={colors.brand.primary} />
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.brand.light }]}
                      onPress={() => handleAddFavorite(user.id)}
                      disabled={addingId === user.id}
                    >
                      {addingId === user.id ? (
                        <ActivityIndicator size="small" color={colors.brand.primary} />
                      ) : (
                        <Ionicons name="star-outline" size={16} color={colors.brand.primary} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
                {i < searchResults.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
                )}
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
        <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>
          From Your Contacts
        </Text>
        <View
          style={[
            styles.listCard,
            { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
          ]}
        >
          {deviceContacts.slice(0, 5).map((user, i) => (
            <React.Fragment key={user.id}>
              <View style={styles.row}>
                <LinearGradient colors={gradientColors} style={styles.avatarGradient}>
                  <Text style={[styles.avatarText, { color: colors.text.primary }]}>
                    {(user.firstName?.[0] || '?').toUpperCase()}
                  </Text>
                </LinearGradient>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowName, { color: colors.text.primary }]} numberOfLines={1}>
                    {user.firstName || user.email}
                  </Text>
                  {user.phone && (
                    <Text style={[styles.rowPhone, { color: colors.text.secondary }]}>
                      {user.phone}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.brand.light }]}
                  onPress={() => handleAddFavorite(user.id)}
                  disabled={addingId === user.id}
                >
                  {addingId === user.id ? (
                    <ActivityIndicator size="small" color={colors.brand.primary} />
                  ) : (
                    <Ionicons name="star-outline" size={16} color={colors.brand.primary} />
                  )}
                </TouchableOpacity>
              </View>
              {i < Math.min(deviceContacts.length, 5) - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
              )}
            </React.Fragment>
          ))}
          {deviceContacts.length > 5 && (
            <TouchableOpacity style={styles.moreBtn}>
              <Text style={[styles.moreBtnText, { color: colors.brand.primary }]}>
                +{deviceContacts.length - 5} more
              </Text>
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
            colors={[colors.bg.glassLight, colors.bg.glass]}
            style={styles.emptyIconBox}
          >
            <Ionicons name="star-outline" size={40} color={colors.brand.primary} />
          </LinearGradient>
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No favorites yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.text.secondary }]}>
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
        <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>
          Favorites ({favorites.length})
        </Text>
        <View
          style={[
            styles.listCard,
            { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
          ]}
        >
          {favorites.map((fav, i) => (
            <React.Fragment key={fav.userId}>
              <View style={styles.row}>
                <LinearGradient colors={gradientColors} style={styles.avatarGradient}>
                  <Text style={[styles.avatarText, { color: colors.text.primary }]}>
                    {fav.name[0]?.toUpperCase() || '?'}
                  </Text>
                </LinearGradient>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowName, { color: colors.text.primary }]} numberOfLines={1}>
                    {fav.name}
                  </Text>
                  {fav.phone && (
                    <Text style={[styles.rowPhone, { color: colors.text.secondary }]}>
                      {fav.phone}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.status.errorLight }]}
                  onPress={() => handleRemoveFavorite(fav.userId)}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.status.error} />
                </TouchableOpacity>
              </View>
              {i < favorites.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
              )}
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
      <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
        {renderHeader()}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
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
  headerTitle: { fontSize: 17, fontWeight: '700' },

  searchWrap: { paddingHorizontal: 20, marginTop: 12, marginBottom: 8 },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingVertical: 0,
  },

  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  listCard: {
    borderRadius: 20,
    borderWidth: 1,
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
  avatarText: { fontSize: 17, fontWeight: '700' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', marginBottom: 1 },
  rowPhone: { fontSize: 12, fontWeight: '500' },

  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {},
  removeBtn: {},

  divider: { height: 1, marginHorizontal: 14 },
  moreBtn: { alignItems: 'center', paddingVertical: 12 },
  moreBtnText: { fontSize: 13, fontWeight: '600' },

  emptyWrap: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 60 },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyDesc: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
});
