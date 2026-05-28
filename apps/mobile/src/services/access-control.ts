import { api } from './api';

export type GroupLifecycleStatus = 'active' | 'paused' | 'completed' | 'archived' | 'closed';

export type MemberRevocationReason = 'member_removed' | 'group_closed' | 'group_completed' | 'invite_expired' | 'session_expired';

export interface GroupAccessStatus {
  groupId: string;
  status: GroupLifecycleStatus;
  hasAccess: boolean;
  revocationReason?: MemberRevocationReason;
  restrictions?: GroupRestriction[];
}

export interface MemberAccessResponse {
  hasAccess: boolean;
  role?: string;
  reason?: string;
}

export interface GroupLifecycleEvent {
  id: string;
  groupId: string;
  eventType: 'created' | 'paused' | 'resumed' | 'completed' | 'archived' | 'closed' | 'member_added' | 'member_removed';
  triggeredBy: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface GroupRestriction {
  id: string;
  groupId: string;
  type: 'add_expense' | 'add_member' | 'settle_up' | 'edit_group' | 'delete_group';
  reason: string;
  createdAt: string;
}

export async function checkGroupAccessStatus(groupId: string): Promise<GroupAccessStatus> {
  return api.get(`/external-sharing/lifecycle/groups/${groupId}/status`);
}

export async function checkMemberAccess(groupId: string): Promise<MemberAccessResponse> {
  return api.get(`/external-sharing/lifecycle/groups/${groupId}/membership`);
}

export async function removeTempMember(groupId: string, tempId: string, reason: string): Promise<{ success: boolean }> {
  return api.delete(`/external-sharing/lifecycle/groups/${groupId}/members/${tempId}?reason=${encodeURIComponent(reason)}`);
}

export async function revokeInvite(token: string): Promise<{ success: boolean }> {
  return api.post(`/external-sharing/access/invites/${token}/revoke`);
}

export async function getGroupLifecycleEvents(groupId: string): Promise<GroupLifecycleEvent[]> {
  return api.get(`/external-sharing/lifecycle/groups/${groupId}/events`);
}

export async function updateGroupStatus(groupId: string, status: GroupLifecycleStatus): Promise<{ success: boolean }> {
  return api.patch(`/external-sharing/lifecycle/groups/${groupId}/status`, { status });
}

export async function getActiveRestrictions(groupId: string): Promise<GroupRestriction[]> {
  return api.get(`/external-sharing/lifecycle/groups/${groupId}/restrictions`);
}

export async function addRestriction(groupId: string, data: { type: GroupRestriction['type']; reason: string }): Promise<GroupRestriction> {
  return api.post(`/external-sharing/lifecycle/groups/${groupId}/restrictions`, data);
}

export async function removeRestriction(groupId: string, restrictionId: string): Promise<{ success: boolean }> {
  return api.delete(`/external-sharing/lifecycle/groups/${groupId}/restrictions/${restrictionId}`);
}
