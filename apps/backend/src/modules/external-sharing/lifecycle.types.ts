export type GroupStatus = 'active' | 'paused' | 'completed' | 'archived' | 'closed';
export type LifecycleEventType = 'created' | 'member_added' | 'member_removed' | 'paused' | 'resumed' | 'completed' | 'archived' | 'closed' | 'invite_revoked' | 'trip_ended';
export type RestrictionType = 'no_new_expenses' | 'no_edits' | 'no_settlements' | 'read_only' | 'no_chat' | 'no_invites' | 'all_blocked';
export type RemovalType = 'admin_removed' | 'self_leave' | 'group_closed' | 'invite_expired' | 'system';
export type RevocationType = 'member_removed' | 'group_closed' | 'invite_revoked' | 'session_expired' | 'admin_action' | 'group_completed';
export type NotificationType = 'member_removed' | 'group_completed' | 'group_archived' | 'group_closed' | 'access_expired' | 'invite_revoked' | 'trip_ended';

export const VALID_TRANSITIONS: Record<GroupStatus, GroupStatus[]> = {
  active: ['paused', 'completed'],
  paused: ['active', 'completed'],
  completed: ['archived'],
  archived: ['closed'],
  closed: [],
};

export function isValidTransition(from: GroupStatus, to: GroupStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
