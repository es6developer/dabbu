import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Alert, Share } from 'react-native';
import { api, setAccessToken } from '../services/api';
import { createInviteLink } from '../services/external-sharing';
import { useAuth } from '../store/AuthContext';
import { useGroupLifecycle } from './useGroupLifecycle';
import { GroupDetail, Segments } from '../types/shared-finance';

function toGroupDetail(
  raw: any,
  expenses: any[],
  settlements: any[],
  userId?: string,
  inviteCode?: string,
): GroupDetail {
  const members = Array.isArray(raw.members) ? raw.members.filter(Boolean) : [];
  const balances = Array.isArray(raw.balances) ? raw.balances : [];
  const uid = userId || raw.ownerId;
  const myBal = balances.find((b: any) => b?.userId === uid) ?? {};
  const totalSpent = balances.reduce((s: number, b: any) => s + Number(b?.totalPaid ?? 0), 0);

  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    description: raw.description,
    memberCount: raw._count?.members || members.length || 0,
    inviteCode: raw.inviteCode || inviteCode,
    totalSpent,
    balance: Number(myBal?.netBalance ?? 0),
    currency: raw.currency || 'INR',
    isPremium: raw.isPremium,
    planLimit: raw.planLimit,
    members: members.map((m: any) => ({
      id: m.id,
      name: m.user
        ? `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim()
        : m.name || 'Unknown',
      email: m.user?.email || '',
      role: m.role,
      balance: Number(balances.find((b: any) => b?.memberId === m.id)?.netBalance ?? 0),
    })),
    expenses: expenses.filter(Boolean).map((e: any) => ({
      id: e.id,
      description: e.description,
      amount: Number(e.amount ?? 0),
      paidBy: {
        id: e.paidBy?.id || e.paidByMemberId || '',
        name: e.paidBy?.user
          ? `${e.paidBy.user.firstName ?? ''} ${e.paidBy.user.lastName ?? ''}`.trim()
          : e.paidBy?.name || e.paidByName || 'Unknown',
      },
      date: e.date || e.createdAt,
      splitType: e.splitType || 'equal',
      category: e.category,
    })),
    settlements: settlements.filter(Boolean).map((s: any) => ({
      id: s.id,
      from: {
        id: s.from?.id || s.fromMember?.id || s.fromMemberId || '',
        name: s.from?.name || s.fromName || '',
      },
      to: {
        id: s.to?.id || s.toMember?.id || s.toMemberId || '',
        name: s.to?.name || s.toName || '',
      },
      amount: Number(s.amount ?? 0),
      status: s.status || 'pending',
      date: s.date || s.createdAt,
    })),
  };
}

export function useGroupDetail() {
  const { accessToken, user } = useAuth();
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
  const [showRevokedModal, setShowRevokedModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [invitingExternal, setInvitingExternal] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const reqRef = useRef(0);

  const { status, revocationReason, isReadOnly } = useGroupLifecycle({
    groupId: groupId || '',
    onAccessRevoked: () => setShowRevokedModal(true),
  });

  const loadGroup = useCallback(
    async (refresh = false) => {
      if (!groupId) {
        setError('Invalid group');
        setGroup(null);
        setInitialLoading(false);
        setRefreshing(false);
        return;
      }

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const signal = ctrl.signal;
      const reqId = ++reqRef.current;

      if (refresh) {
        setRefreshing(true);
      } else {
        setInitialLoading(true);
      }
      setError(null);

      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }

        const res = await api.get<any>(`/shared-finance/groups/${groupId}`, signal);
        if (signal.aborted || reqId !== reqRef.current) {
          return;
        }
        const raw = res.data ?? res;
        if (!raw) {
          setError('Group not found');
          setGroup(null);
          return;
        }

        const hasExpenses = Array.isArray(raw.expenses);
        const hasSettlements = Array.isArray(raw.settlements);

        let expenses: any[] = hasExpenses ? raw.expenses : [];
        let settlements: any[] = hasSettlements ? raw.settlements : [];

        if (!hasExpenses || !hasSettlements) {
          const [ee, ss] = await Promise.allSettled([
            !hasExpenses
              ? api.get<any[]>(`/shared-finance/groups/${groupId}/expenses?limit=50`, signal)
              : Promise.resolve([]),
            !hasSettlements
              ? api.get<any[]>(`/shared-finance/groups/${groupId}/settlements?limit=50`, signal)
              : Promise.resolve([]),
          ]);
          if (signal.aborted || reqId !== reqRef.current) {
            return;
          }
          if (ee.status === 'fulfilled') {
            const d = ee.value;
            expenses = Array.isArray(d)
              ? d
              : Array.isArray((d as any)?.data)
                ? (d as any).data
                : [];
          }
          if (ss.status === 'fulfilled') {
            const d = ss.value;
            settlements = Array.isArray(d)
              ? d
              : Array.isArray((d as any)?.data)
                ? (d as any).data
                : [];
          }
        }

        setGroup(toGroupDetail(raw, expenses, settlements, user?.id, inviteCode));
      } catch (err: any) {
        if (!signal.aborted && reqId === reqRef.current) {
          setError(err?.message || 'Unable to load group');
          setGroup(null);
        }
      } finally {
        if (reqId === reqRef.current) {
          setInitialLoading(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, groupId, inviteCode, user?.id],
  );

  useFocusEffect(
    useCallback(() => {
      loadGroup();
      return () => abortRef.current?.abort();
    }, [loadGroup]),
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

  return {
    group,
    initialLoading,
    refreshing,
    error,
    activeSegment,
    setActiveSegment,
    showRevokedModal,
    setShowRevokedModal,
    showUpgradeModal,
    setShowUpgradeModal,
    invitingExternal,
    status,
    isReadOnly,
    revocationReason,
    loadGroup,
    handleInviteExternal,
    navigation,
    groupId,
  };
}
