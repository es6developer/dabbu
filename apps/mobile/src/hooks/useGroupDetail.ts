import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Alert, Share } from 'react-native';
import { createInviteLink } from '../services/external-sharing';
import { GroupDetail, Segments } from '../types/shared-finance';

const MOCK_GROUP: GroupDetail = {
  id: 'mock-1',
  name: 'Weekend Trip to Goa',
  type: 'trip',
  description: 'Fun trip with friends',
  memberCount: 4,
  totalSpent: 24500,
  balance: -3200,
  currency: 'INR',
  inviteCode: 'GOA2024',
  isPremium: false,
  planLimit: 10,
  members: [
    { id: 'u1', name: 'You', email: 'you@email.com', role: 'owner', balance: -3200 },
    { id: 'u2', name: 'Rahul', email: 'rahul@email.com', role: 'admin', balance: 1500 },
    { id: 'u3', name: 'Priya', email: 'priya@email.com', role: 'member', balance: 800 },
    { id: 'u4', name: 'Amit', email: 'amit@email.com', role: 'member', balance: 900 },
  ],
  expenses: [
    {
      id: 'e1',
      description: 'Hotel booking - 3 nights',
      amount: 12000,
      paidBy: { id: 'u2', name: 'Rahul' },
      date: '2026-05-20',
      splitType: 'equal',
      category: 'Accommodation',
    },
    {
      id: 'e2',
      description: "Dinner at Fisherman's Wharf",
      amount: 4200,
      paidBy: { id: 'u1', name: 'You' },
      date: '2026-05-20',
      splitType: 'equal',
      category: 'Food',
    },
    {
      id: 'e3',
      description: 'Car rental for 2 days',
      amount: 5000,
      paidBy: { id: 'u3', name: 'Priya' },
      date: '2026-05-21',
      splitType: 'equal',
      category: 'Transport',
    },
    {
      id: 'e4',
      description: 'Fuel',
      amount: 1800,
      paidBy: { id: 'u4', name: 'Amit' },
      date: '2026-05-21',
      splitType: 'equal',
      category: 'Transport',
    },
    {
      id: 'e5',
      description: 'Breakfast at beach cafe',
      amount: 1500,
      paidBy: { id: 'u1', name: 'You' },
      date: '2026-05-21',
      splitType: 'equal',
      category: 'Food',
    },
  ],
  settlements: [
    {
      id: 's1',
      from: { id: 'u1', name: 'You' },
      to: { id: 'u2', name: 'Rahul' },
      amount: 1200,
      status: 'pending',
      date: '2026-05-22',
    },
    {
      id: 's2',
      from: { id: 'u3', name: 'Priya' },
      to: { id: 'u1', name: 'You' },
      amount: 800,
      status: 'completed',
      date: '2026-05-22',
    },
  ],
};

export function useGroupDetail() {
  const navigation = useNavigation<any>();
  const route =
    useRoute<RouteProp<{ params: { groupId: string; inviteCode?: string } }, 'params'>>();
  const groupId = route.params?.groupId;
  const inviteCode = route.params?.inviteCode;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSegment, setActiveSegment] = useState<Segments>('expenses');
  const [invitingExternal, setInvitingExternal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => {
        setGroup({
          ...MOCK_GROUP,
          id: groupId || MOCK_GROUP.id,
          inviteCode: inviteCode || MOCK_GROUP.inviteCode,
        });
        setInitialLoading(false);
      }, 400);
      return () => clearTimeout(t);
    }, [groupId, inviteCode]),
  );

  const handleInviteExternal = useCallback(async () => {
    if (!groupId) {
      return;
    }
    setInvitingExternal(true);
    try {
      const response = await createInviteLink(groupId);
      const url = `https://external-web.vercel.app//invite/${response.token}`;
      await Share.share({
        message: `Join my group "${group?.name || 'my group'}" on Dabbu! ${url}`,
      });
    } catch (e: any) {
      Alert.alert('Unable to share invite', e?.message || 'Please try again.');
    } finally {
      setInvitingExternal(false);
    }
  }, [group, groupId]);

  const loadGroup = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setInitialLoading(true);
      }
      setError(null);
      const t = setTimeout(() => {
        setGroup({
          ...MOCK_GROUP,
          id: groupId || MOCK_GROUP.id,
          inviteCode: inviteCode || MOCK_GROUP.inviteCode,
        });
        setInitialLoading(false);
        setRefreshing(false);
      }, 300);
      return () => clearTimeout(t);
    },
    [groupId, inviteCode],
  );

  return {
    group,
    initialLoading,
    refreshing,
    error,
    activeSegment,
    setActiveSegment,
    showRevokedModal: false,
    setShowRevokedModal: () => {},
    showUpgradeModal: false,
    setShowUpgradeModal: () => {},
    invitingExternal,
    status: 'active' as const,
    isReadOnly: false,
    revocationReason: undefined,
    loadGroup,
    handleInviteExternal,
    navigation,
    groupId,
  };
}
