import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FavoriteContact {
  userId: string;
  name: string;
  phone?: string;
  addedAt: string;
}

interface FavoritesContextValue {
  favorites: FavoriteContact[];
  isFavorite: (userId: string) => boolean;
  addFavorite: (userId: string, name: string, phone?: string) => Promise<void>;
  removeFavorite: (userId: string) => Promise<void>;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue>({
  favorites: [],
  isFavorite: () => false,
  addFavorite: async () => {},
  removeFavorite: async () => {},
  loading: true,
});

const STORAGE_KEY = 'favorite_contacts';

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          setFavorites(JSON.parse(stored));
        } catch {}
      }
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (updated: FavoriteContact[]) => {
    setFavorites(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const isFavorite = useCallback(
    (userId: string) => favorites.some((f) => f.userId === userId),
    [favorites],
  );

  const addFavorite = useCallback(
    async (userId: string, name: string, phone?: string) => {
      const existing = favorites.find((f) => f.userId === userId);
      if (existing) return;
      const updated = [
        ...favorites,
        { userId, name, phone, addedAt: new Date().toISOString() },
      ];
      await persist(updated);
    },
    [favorites, persist],
  );

  const removeFavorite = useCallback(
    async (userId: string) => {
      const updated = favorites.filter((f) => f.userId !== userId);
      await persist(updated);
    },
    [favorites, persist],
  );

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, addFavorite, removeFavorite, loading }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
