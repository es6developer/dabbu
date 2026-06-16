'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, Ban, CheckCircle, Trash2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getUserDetail, updateUserStatus, deleteUser } from '@/lib/api';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getUserDetail(params.id as string);
      setUser(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [params.id]);

  async function handleToggleStatus() {
    if (!user) return;
    try {
      await updateUserStatus(user.id, !user.isActive);
      load();
    } catch (e: any) { alert(e.message); }
  }

  async function handleDelete() {
    if (!user || !confirm(`Delete user ${user.email}? This action cannot be undone.`)) return;
    try {
      await deleteUser(user.id);
      router.push('/users');
    } catch (e: any) { alert(e.message); }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>;
  }
  if (error) {
    return <div className="glass-panel p-5 text-sm text-red-400">{error}</div>;
  }
  if (!user) {
    return <div className="text-center py-16 text-white/40">User not found</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <button onClick={() => router.back()} className="btn-ghost-glass">
        <ChevronLeft size={16} /> Back to Users
      </button>

      <div className="glass-panel p-7 space-y-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="ring-2 ring-white/[0.08]">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} />}
              <AvatarFallback className="bg-gradient-to-br from-indigo-400/20 to-purple-500/20 text-indigo-400 text-xl font-bold">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-white">{user.firstName} {user.lastName}</h2>
              <p className="text-sm text-white/50">{user.email}</p>
            </div>
          </div>
          <span className={cn('badge-glass', user.isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20')}>
            {user.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-5 text-sm border-t border-white/[0.06] pt-6">
          <InfoRow label="User ID" value={user.id} mono />
          <InfoRow label="Role" value={user.role} />
          <InfoRow label="Email Verified" value={user.isEmailVerified ? 'Yes' : 'No'} />
          <InfoRow label="Phone" value={user.phone || 'Not set'} />
          <InfoRow label="Currency" value={user.currency} />
          <InfoRow label="Timezone" value={user.timezone} />
          <InfoRow label="Last Login" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'} />
          <InfoRow label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
        </div>

        {user.subscription && (
          <div className="border-t border-white/[0.06] pt-6">
            <h3 className="text-sm font-semibold text-white/70 mb-3">Subscription</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoRow label="Plan" value={user.subscription.plan?.name || 'N/A'} />
              <InfoRow label="Status" value={user.subscription.status} />
              <InfoRow label="Period End" value={user.subscription.currentPeriodEnd ? new Date(user.subscription.currentPeriodEnd).toLocaleDateString() : 'N/A'} />
            </div>
          </div>
        )}

        {user._count && (
          <div className="border-t border-white/[0.06] pt-6">
            <h3 className="text-sm font-semibold text-white/70 mb-3">Activity</h3>
            <div className="flex gap-6 text-sm">
              <ActivityBadge label="Transactions" count={user._count.transactions || 0} />
              <ActivityBadge label="Reminders" count={user._count.reminders || 0} />
              <ActivityBadge label="Family Memberships" count={user._count.familyMemberships || 0} />
            </div>
          </div>
        )}

        <div className="flex gap-3 border-t border-white/[0.06] pt-6">
          <button onClick={handleToggleStatus} className="btn-glass">
            {user.isActive ? <Ban size={14} /> : <CheckCircle size={14} />}
            {user.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={handleDelete} className="btn-glass bg-red-500/10 border-red-500/20 hover:bg-red-500/20">
            <Trash2 size={14} /> Delete User
          </button>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) { return classes.filter(Boolean).join(' '); }

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-white/40">{label}:</span>{' '}
      <span className={`text-white ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}

function ActivityBadge({ label, count }: { label: string; count: number }) {
  return (
    <div className="px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
      <p className="text-xs text-white/40">{label}</p>
      <p className="text-lg font-bold text-white mt-0.5">{count}</p>
    </div>
  );
}
