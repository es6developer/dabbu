import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFavorites } from '../../store/FavoritesContext';
import * as favoritesApi from '../../services/favorites';
import * as contactsService from '../../services/contacts';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '../../components/ui/Avatar';
import { useTheme } from '../../theme';
import { spacing } from '../../theme/design';

export function FavoriteContactsScreen() {
  const navigation = useNavigation<any>();
  const { favorites, loading, refresh, addFavorite, removeFavorite } = useFavorites();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef<TextInput>(null);

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

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
      if (text.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      searchTimerRef.current = setTimeout(async () => {
        const results = await favoritesApi.searchUsers(text);
        setSearchResults(results.filter((r) => !favorites.some((f) => f.userId === r.id)));
        setSearching(false);
      }, 300);
    },
    [favorites],
  );

  const handleAddFavorite = useCallback(
    async (userId: string, userName?: string, userPhone?: string) => {
      if (!userId) {
        return;
      }
      setAddingId(userId);
      await addFavorite(userId, userName || '', userPhone);
      await refresh();
      setAddingId(null);
      setSearchQuery('');
      setSearchResults([]);
      loadDeviceContacts();
    },
    [addFavorite, refresh],
  );

  const handleRemoveFavorite = useCallback(
    async (userId: string) => {
      if (!userId) {
        return;
      }
      await removeFavorite(userId);
      await refresh();
      loadDeviceContacts();
    },
    [removeFavorite, refresh],
  );

  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.userId)), [favorites]);

  const gradientColors = useMemo(() => [colors.accent.primary, colors.accent.primary], [colors]);

  const renderHeader = () => (
    <Animated.View style={[styles.header, { paddingTop: insets.top + 8, opacity: headerOpacity }]}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.backBtn, { backgroundColor: colors.bg.glass }]}
      >
        <AntDesign name="arrowleft" size={20} color={colors.text.primary} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Favorite Contacts</Text>
      <View style={{ width: 36 }} />
    </Animated.View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchWrap}>
      <View style={[styles.searchInner, { backgroundColor: colors.bg.glass }]}>
        <AntDesign
          name="search1"
          size={16}
          color={colors.text.tertiary}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: colors.text.primary }]}
          placeholder="Search by name or phone..."
          placeholderTextColor={colors.text.tertiary}
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
          keyboardType="default"
        />
        {searching && <ActivityIndicator size="small" color={colors.accent.primary} />}
        {searchQuery.length > 0 && !searching && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
            }}
          >
            <AntDesign name="closecircleo" size={16} color={colors.text.tertiary} />
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
                {favoriteIds.has(user.id) ? (
                  <TouchableOpacity
                    style={styles.row}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate('WalletTab', {
                        screen: 'AddExpense',
                        params: {
                          contact: {
                            name: user.firstName || user.email,
                            userId: user.id,
                            phone: user.phone,
                          },
                        },
                      })
                    }
                  >
                    <Avatar
                      uri={user.avatarUrl}
                      name={`${user.firstName || ''} ${user.lastName || ''}`.trim()}
                      size={44}
                    />
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
                    <View style={[styles.actionBtn, { backgroundColor: colors.brand.light }]}>
                      <AntDesign name="staro" size={16} color={colors.accent.primary} />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.row}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate('WalletTab', {
                        screen: 'AddExpense',
                        params: {
                          contact: {
                            name: user.firstName || user.email,
                            userId: user.id,
                            phone: user.phone,
                          },
                        },
                      })
                    }
                  >
                    <Avatar
                      uri={user.avatarUrl}
                      name={`${user.firstName || ''} ${user.lastName || ''}`.trim()}
                      size={44}
                    />
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
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.brand.light }]}
                      onPress={() => {
                        const name =
                          [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
                        handleAddFavorite(user.id, name, user.phone);
                      }}
                      disabled={addingId === user.id}
                    >
                      {addingId === user.id ? (
                        <ActivityIndicator size="small" color={colors.accent.primary} />
                      ) : (
                        <AntDesign name="staro" size={16} color={colors.accent.primary} />
                      )}
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
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
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('WalletTab', {
                    screen: 'AddExpense',
                    params: {
                      contact: {
                        name: user.firstName || user.email,
                        userId: user.id,
                        phone: user.phone,
                      },
                    },
                  })
                }
              >
                <Avatar uri={user.avatarUrl} name={user.firstName || user.email} size={44} />
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
                  onPress={() =>
                    handleAddFavorite(user.id, user.firstName || user.email, user.phone)
                  }
                  disabled={addingId === user.id}
                >
                  {addingId === user.id ? (
                    <ActivityIndicator size="small" color={colors.accent.primary} />
                  ) : (
                    <AntDesign name="staro" size={16} color={colors.accent.primary} />
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
              {i < Math.min(deviceContacts.length, 5) - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
              )}
            </React.Fragment>
          ))}
          {deviceContacts.length > 5 && (
            <TouchableOpacity style={styles.moreBtn}>
              <Text style={[styles.moreBtnText, { color: colors.accent.primary }]}>
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
            <AntDesign name="staro" size={40} color={colors.accent.primary} />
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
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('WalletTab', {
                    screen: 'AddExpense',
                    params: { contact: { name: fav.name, userId: fav.userId, phone: fav.phone } },
                  })
                }
              >
                <Avatar uri={fav.avatarUrl} name={fav.name} size={44} />
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
                  <AntDesign name="delete" size={16} color={colors.status.error} />
                </TouchableOpacity>
              </TouchableOpacity>
              {i < favorites.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
        {renderHeader()}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg.primary }]}>
      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 44 }}
      >
        {renderHeader()}
        {renderSearchBar()}
        {renderSearchResults()}
        {renderDeviceContacts()}
        {renderFavorites()}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    height: 56,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 19, fontWeight: '700' },

  searchWrap: { paddingHorizontal: 24, marginTop: 14, marginBottom: 8 },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 24,
    height: 52,
    gap: 8,
  },
  searchIcon: { marginRight: 2 },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0,
  },

  section: { marginTop: 28, paddingHorizontal: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.lg,
    marginLeft: 4,
  },
  listCard: {
    borderRadius: 28,
    borderWidth: 1.5,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  avatarGradient: {
    width: 44,
    height: 52,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 19, fontWeight: '700' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '600', marginBottom: 1 },
  rowPhone: { fontSize: 12, fontWeight: '500' },

  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {},
  removeBtn: {},

  divider: { height: 1, marginHorizontal: 16 },
  moreBtn: { alignItems: 'center', paddingVertical: 18 },
  moreBtnText: { fontSize: 16, fontWeight: '600' },

  emptyWrap: { alignItems: 'center', paddingHorizontal: 36, paddingTop: 60 },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  emptyDesc: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
  },
});
