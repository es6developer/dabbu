import { create } from 'zustand';
import { api } from '../services/api';

interface FamilyMember {
  id: string;
  name: string;
  phone?: string;
  relationship?: string;
  role: string;
  avatar?: string;
  status: string;
  joinedAt: string;
}

interface FamilyState {
  familyId: string | null;
  members: FamilyMember[];
  loading: boolean;
  error: string | null;

  setFamilyId: (id: string | null) => void;
  fetchMembers: (familyId: string) => Promise<void>;
  addMember: (familyId: string, name: string, phone: string, relationship?: string) => Promise<void>;
  removeMember: (familyId: string, memberId: string) => Promise<void>;
  updateMemberRole: (familyId: string, memberId: string, role: string) => Promise<void>;
  clear: () => void;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  familyId: null,
  members: [],
  loading: false,
  error: null,

  setFamilyId: (id) => set({ familyId: id }),

  fetchMembers: async (familyId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<any>(`/family/${familyId}`);
      const data = res?.data || res;
      const members = data?.members || data || [];
      set({ members, loading: false, familyId });
    } catch {
      set({ error: 'Failed to load family members', loading: false });
    }
  },

  addMember: async (familyId, name, phone, relationship) => {
    try {
      await api.post('/family/members/contact', { familyId, name, phone, relationship });
      await get().fetchMembers(familyId);
    } catch {
      set({ error: 'Failed to add member' });
    }
  },

  removeMember: async (familyId, memberId) => {
    try {
      await api.delete(`/family/${familyId}/members/${memberId}`);
      set({ members: get().members.filter((m) => m.id !== memberId) });
    } catch {
      set({ error: 'Failed to remove member' });
    }
  },

  updateMemberRole: async (familyId, memberId, role) => {
    try {
      await api.patch(`/family/${familyId}/members/role`, { memberId, role });
      await get().fetchMembers(familyId);
    } catch {
      set({ error: 'Failed to update role' });
    }
  },

  clear: () => set({ familyId: null, members: [], error: null }),
}));
