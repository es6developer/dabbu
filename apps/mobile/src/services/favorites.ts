import { api } from './api';

export interface FavoriteUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface SearchUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  phone?: string;
}

export async function fetchFavorites(): Promise<FavoriteUser[]> {
  try {
    const res = await api.get<FavoriteUser[]>('/favorites');
    return res || [];
  } catch {
    return [];
  }
}

export async function addFavorite(contactUserId: string): Promise<FavoriteUser | null> {
  try {
    const res = await api.post<FavoriteUser>('/favorites/add', { contactUserId });
    return res || null;
  } catch {
    return null;
  }
}

export async function removeFavorite(contactUserId: string): Promise<boolean> {
  try {
    await api.delete(`/favorites/${contactUserId}`);
    return true;
  } catch {
    return false;
  }
}

export async function searchUsers(query: string): Promise<SearchUser[]> {
  try {
    const res = await api.get<SearchUser[]>(`/users/search?query=${encodeURIComponent(query)}`);
    return res || [];
  } catch {
    return [];
  }
}
