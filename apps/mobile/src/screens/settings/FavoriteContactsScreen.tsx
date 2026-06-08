import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFavorites } from '../../store/FavoritesContext';
import { fetchRecentContacts, ContactUser } from '../../services/contacts';

export function FavoriteContactsScreen() {
  const navigation = useNavigation<any>();
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const insets = useSafeAreaInsets();
  const [suggestions, setSuggestions] = useState<ContactUser[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  useEffect(() => {
    fetchRecentContacts().then((contacts) => {
      const filtered = contacts.filter((c) => !favorites.some((f) => f.userId === c.id));
      setSuggestions(filtered);
      setLoadingSuggestions(false);
    });
  }, [favorites]);

  const handleRemove = useCallback(async (userId: string) => {
    await removeFavorite(userId);
  }, [removeFavorite]);

  const handleAdd = useCallback(async (userId: string, name: string, phone?: string) => {
    await addFavorite(userId, name, phone);
  }, [addFavorite]);

  const FavoriteRow = ({ item, onRemove }: { item: typeof favorites[0]; onRemove: () => void }) => {
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    const handleRemoveAnim = () => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start(() => onRemove());
    };

    const scaleAnim = useRef(new Animated.Value(1)).current;

    return (
      <Animated.View
        style={[
          s.row,
          { opacity: fadeAnim, transform: [{ translateX: slideAnim }, { scale: scaleAnim }] },
        ]}
      >
        <View style={s.avatar}>
          <Text style={s.avatarText}>{item.name[0]?.toUpperCase() || '?'}</Text>
        </View>
        <View style={s.rowInfo}>
          <Text style={s.rowName} numberOfLines={1}>{item.name}</Text>
          {item.phone && <Text style={s.rowPhone}>{item.phone}</Text>}
        </View>
        <TouchableOpacity
          style={s.removeBtn}
          onPress={handleRemoveAnim}
          activeOpacity={0.6}
        >
          <Ionicons name="trash-outline" size={18} color="#FF4D4F" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const SuggestionRow = ({ item, onAdd }: { item: ContactUser; onAdd: () => void }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const name = [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Unknown';

    return (
      <View style={s.row}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{name[0]?.toUpperCase() || '?'}</Text>
        </View>
        <View style={s.rowInfo}>
          <Text style={s.rowName} numberOfLines={1}>{name}</Text>
          {item.email && <Text style={s.rowPhone}>{item.email}</Text>}
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => {
            Animated.sequence([
              Animated.timing(scaleAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
              Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
            ]).start();
            onAdd();
          }}
          activeOpacity={0.6}
        >
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Ionicons name="star-outline" size={20} color="#FF6B00" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[s.screen, { backgroundColor: '#070708' }]}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Manage Favorites</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={['favorites_section', 'suggestions_section']}
        keyExtractor={(item) => item}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          if (item === 'favorites_section') {
            if (favorites.length === 0 && suggestions.length === 0) {
              return (
                <View style={s.emptyWrap}>
                  <View style={s.emptyIconBox}>
                    <Ionicons name="star-outline" size={48} color="rgba(255,255,255,0.2)" />
                  </View>
                  <Text style={s.emptyTitle}>No favorites yet</Text>
                  <Text style={s.emptyDesc}>
                    Add frequent friends to quickly pull them into new split circles.
                  </Text>
                </View>
              );
            }
            return (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Active Favorites</Text>
                <View style={[s.listCard, { backgroundColor: '#131315', borderColor: 'rgba(255,255,255,0.06)' }]}>
                  {favorites.length === 0 ? (
                    <Text style={[s.emptyHint, { color: 'rgba(255,255,255,0.3)' }]}>
                      No favorites added yet
                    </Text>
                  ) : (
                    favorites.map((fav, i) => (
                      <React.Fragment key={fav.userId}>
                        <FavoriteRow item={fav} onRemove={() => handleRemove(fav.userId)} />
                        {i < favorites.length - 1 && (
                          <View style={[s.divider, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />
                        )}
                      </React.Fragment>
                    ))
                  )}
                </View>
              </View>
            );
          }

          if (item === 'suggestions_section') {
            if (loadingSuggestions) return null;
            if (suggestions.length === 0) return null;
            return (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Suggested Friends</Text>
                <View style={[s.listCard, { backgroundColor: '#131315', borderColor: 'rgba(255,255,255,0.06)' }]}>
                  {suggestions.slice(0, 10).map((sug, i) => {
                    const name = [sug.firstName, sug.lastName].filter(Boolean).join(' ') || 'Unknown';
                    return (
                      <React.Fragment key={sug.id || String(i)}>
                        <SuggestionRow
                          item={sug}
                          onAdd={() => handleAdd(sug.id, name, sug.phone)}
                        />
                        {i < Math.min(suggestions.length, 10) - 1 && (
                          <View style={[s.divider, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </View>
              </View>
            );
          }
          return null;
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, height: 56,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },

  /* Empty State */
  emptyWrap: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 80 },
  emptyIconBox: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  emptyDesc: {
    fontSize: 14, fontWeight: '500', color: '#8E8E93',
    textAlign: 'center', lineHeight: 20,
  },

  /* Sections */
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)', marginBottom: 10, marginLeft: 4,
  },
  listCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  emptyHint: { fontSize: 13, fontWeight: '500', textAlign: 'center', paddingVertical: 24 },

  /* Row */
  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#FFF', marginBottom: 1 },
  rowPhone: { fontSize: 12, fontWeight: '500', color: '#8E8E93' },

  removeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,77,79,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,107,0,0.1)', alignItems: 'center', justifyContent: 'center',
  },

  divider: { height: 1, marginHorizontal: 14 },
});
