import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as favoritesApi from '../services/favorites';

export interface FavoriteContact {
  userId: string;
  name: string;
  phone?: string;
  addedAt: string;
  email?: string;
  avatarUrl?: string;
}

interface FavoritesContextValue {
  favorites: FavoriteContact[];
  isFavorite: (userId: string) => boolean;
  addFavorite: (userId: string, name: string, phone?: string) => Promise<void>;
  removeFavorite: (userId: string) => Promise<void>;
  loading: boolean;
  refresh: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue>({
  favorites: [],
  isFavorite: () => false,
  addFavorite: async () => {},
  removeFavorite: async () => {},
  loading: true,
  refresh: async () => {},
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteContact[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await favoritesApi.fetchFavorites();
      setFavorites(
        data.map((f) => ({
          userId: f.userId,
          name: f.name,
          phone: f.phone,
          email: f.email,
          avatarUrl: f.avatarUrl,
          addedAt: f.createdAt,
        })),
      );
    } catch {
      // keep current state
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const isFavorite = useCallback(
    (userId: string) => favorites.some((f) => f.userId === userId),
    [favorites],
  );

  const addFavoriteFn = useCallback(
    async (userId: string, name: string, phone?: string) => {
      if (!userId) {
        return;
      }
      const existing = favorites.find((f) => f.userId === userId);
      if (existing) {
        return;
      }
      const fav = await favoritesApi.addFavorite(userId);
      if (fav) {
        setFavorites((prev) => [
          {
            userId: fav.userId,
            name: fav.name || name,
            phone: fav.phone || phone,
            email: fav.email,
            avatarUrl: fav.avatarUrl,
            addedAt: fav.createdAt,
          },
          ...prev,
        ]);
      } else {
        // API call failed — optimistically add with passed data so the UI reflects the action
        setFavorites((prev) => [
          {
            userId,
            name,
            phone,
            email: '',
            addedAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    },
    [favorites],
  );

  const removeFavoriteFn = useCallback(async (userId: string) => {
    const ok = await favoritesApi.removeFavorite(userId);
    if (ok) {
      setFavorites((prev) => prev.filter((f) => f.userId !== userId));
    }
  }, []);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        addFavorite: addFavoriteFn,
        removeFavorite: removeFavoriteFn,
        loading,
        refresh,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
