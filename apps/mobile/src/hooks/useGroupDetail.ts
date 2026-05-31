import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Alert, Share } from 'react-native';
import { api, setAccessToken } from '../services/api';
import { createInviteLink } from '../services/external-sharing';
import { useAuth } from '../store/AuthContext';
import { useGroupLifecycle } from './useGroupLifecycle';
import { formatMemberName, normalizeResponseList } from '../utils/shared-finance';
import { GroupDetail, Segments, GroupMember, Expense, Settlement } from '../types/shared-finance';

export function useGroupDetail() {
  const { accessToken, user } = useAuth();
  const navigation = useNavigation<any>();
  const route =
    useRoute<RouteProp<{ params: { groupId: string; inviteCode?: string } }, 'params'>>();
  const groupId = route.params?.groupId;
  const inviteCode = route.params?.inviteCode;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSegment, setActiveSegment] = useState<Segments>('expenses');
  const [showRevokedModal, setShowRevokedModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [invitingExternal, setInvitingExternal] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const latestRequestRef = useRef(0);

  const { status, accessRevoked, revocationReason, isReadOnly } = useGroupLifecycle({
    groupId: groupId || '',
    onAccessRevoked: () => setShowRevokedModal(true),
  });

  const fetchGroup = useCallback(
    async (refresh = false) => {
      if (!groupId) {
        setError('Invalid group identifier');
        setGroup(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const signal = controller.signal;
      const requestId = ++latestRequestRef.current;

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        if (accessToken) {
          setAccessToken(accessToken);
        }

        const groupResponse = await api.get<any>(`/shared-finance/groups/${groupId}`, signal);
        if (signal.aborted || requestId !== latestRequestRef.current) {
          return;
        }

        const groupData = groupResponse.data ?? groupResponse;
        if (!groupData) {
          setError('Group not found');
          setGroup(null);
          return;
        }

        const [expensesResult, settlementsResult] =
          Array.isArray(groupData.expenses) || Array.isArray(groupData.settlements)
            ? ([
                { status: 'fulfilled', value: groupData.expenses || [] },
                { status: 'fulfilled', value: groupData.settlements || [] },
              ] as PromiseSettledResult<any>[])
            : await Promise.allSettled([
                api.get<any[]>(`/shared-finance/groups/${groupId}/expenses?limit=50`, signal),
                api.get<any[]>(`/shared-finance/groups/${groupId}/settlements?limit=50`, signal),
              ]);

        if (signal.aborted || requestId !== latestRequestRef.current) {
          return;
        }

        const rawMembers = Array.isArray(groupData.members)
          ? groupData.members.filter(Boolean)
          : [];
        const rawBalances = Array.isArray(groupData.balances) ? groupData.balances : [];
        const currentUserId = user?.id || groupData.ownerId;
        const myBalance =
          rawBalances.find((balance: any) => balance?.userId === currentUserId) ?? {};
        const totalSpent = rawBalances.reduce(
          (sum: number, item: any) => sum + Number(item?.totalPaid ?? 0),
          0,
        );

        const transformedGroup: GroupDetail = {
          id: groupData.id,
          name: groupData.name,
          type: groupData.type,
          description: groupData.description,
          memberCount: groupData._count?.members || rawMembers.length || 0,
          inviteCode: groupData.inviteCode || inviteCode,
          totalSpent,
          balance: Number(myBalance?.netBalance ?? 0),
          currency: groupData.currency || 'INR',
          isPremium: groupData.isPremium,
          planLimit: groupData.planLimit,
          members: rawMembers.map((member: any) => ({
            id: member.id,
            name: member.user
              ? `${member.user.firstName ?? ''} ${member.user.lastName ?? ''}`.trim()
              : member.name || 'Unknown',
            email: member.user?.email || '',
            role: member.role,
            balance: Number(
              rawBalances.find((balance: any) => balance?.memberId === member.id)?.netBalance ?? 0,
            ),
          })),
          expenses: normalizeResponseList(expensesResult)
            .filter(Boolean)
            .map((expense: any) => ({
              id: expense.id,
              description: expense.description,
              amount: Number(expense.amount ?? 0),
              paidBy: {
                id: expense.paidBy?.id || expense.paidByMemberId || '',
                name: expense.paidBy?.user
                  ? `${expense.paidBy.user.firstName ?? ''} ${expense.paidBy.user.lastName ?? ''}`.trim()
                  : expense.paidBy?.name || expense.paidByName || 'Unknown',
              },
              date: expense.date || expense.createdAt,
              splitType: expense.splitType || 'equal',
              category: expense.category,
            })),
          settlements: normalizeResponseList(settlementsResult)
            .filter(Boolean)
            .map((settlement: any) => ({
              id: settlement.id,
              from: {
                id:
                  settlement.from?.id || settlement.fromMember?.id || settlement.fromMemberId || '',
                name:
                  settlement.from?.name ||
                  settlement.fromName ||
                  formatMemberName(settlement.fromMember) ||
                  'Unknown',
              },
              to: {
                id: settlement.to?.id || settlement.toMember?.id || settlement.toMemberId || '',
                name:
                  settlement.to?.name ||
                  settlement.toName ||
                  formatMemberName(settlement.toMember) ||
                  'Unknown',
              },
              amount: Number(settlement.amount ?? 0),
              status: settlement.status || 'pending',
              date: settlement.date || settlement.createdAt,
            })),
        };

        setGroup(transformedGroup);
      } catch (fetchError: any) {
        if (!signal.aborted) {
          setError(fetchError?.message || 'Unable to load group.');
          setGroup(null);
        }
      } finally {
        if (latestRequestRef.current === requestId) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, groupId, inviteCode, user?.id],
  );

  useFocusEffect(
    useCallback(() => {
      fetchGroup();
      return () => abortControllerRef.current?.abort();
    }, [fetchGroup]),
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
    } catch (inviteError: any) {
      Alert.alert('Unable to share invite', inviteError?.message || 'Please try again.');
    } finally {
      setInvitingExternal(false);
    }
  }, [group, groupId]);

  return {
    group,
    loading,
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
    fetchGroup,
    handleInviteExternal,
    navigation,
    groupId,
  };
}
