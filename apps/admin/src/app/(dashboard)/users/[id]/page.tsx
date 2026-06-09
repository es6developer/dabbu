'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, RefreshCw, Ban, CheckCircle, Trash2 } from 'lucide-react';
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

  useEffect(() => {
    load();
  }, [params.id]);

  async function handleToggleStatus() {
    if (!user) {
      return;
    }
    try {
      await updateUserStatus(user.id, !user.isActive);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleDelete() {
    if (!user || !confirm(`Delete user ${user.email}? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteUser(user.id);
      router.push('/users');
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-500/10 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
        {error}
      </div>
    );
  }
  if (!user) {
    return <div className="text-center py-16 text-gray-500">User not found</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        <ChevronLeft size={16} /> Back to Users
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6 dark:border dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              {user.avatarUrl && (
                <AvatarImage src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} />
              )}
              <AvatarFallback className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xl font-bold">
                {user.firstName?.[0]}
                {user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${user.isActive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400' : 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400'}`}
          >
            {user.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-200 dark:border-gray-700 pt-4">
          <div>
            <span className="text-gray-500 dark:text-gray-400">User ID:</span>{' '}
            <span className="text-gray-900 dark:text-white font-mono text-xs">{user.id}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Role:</span>{' '}
            <span className="text-gray-900 dark:text-white">{user.role}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Email Verified:</span>{' '}
            <span className="text-gray-900 dark:text-white">
              {user.isEmailVerified ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Phone:</span>{' '}
            <span className="text-gray-900 dark:text-white">{user.phone || 'Not set'}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Currency:</span>{' '}
            <span className="text-gray-900 dark:text-white">{user.currency}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Timezone:</span>{' '}
            <span className="text-gray-900 dark:text-white">{user.timezone}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Last Login:</span>{' '}
            <span className="text-gray-900 dark:text-white">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Joined:</span>{' '}
            <span className="text-gray-900 dark:text-white">
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {user.subscription && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Subscription
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Plan:</span>{' '}
                <span className="text-gray-900 dark:text-white">
                  {user.subscription.plan?.name || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Status:</span>{' '}
                <span className="text-gray-900 dark:text-white">{user.subscription.status}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Period End:</span>{' '}
                <span className="text-gray-900 dark:text-white">
                  {user.subscription.currentPeriodEnd
                    ? new Date(user.subscription.currentPeriodEnd).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        {user._count && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Activity</h3>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Transactions:</span>{' '}
                <span className="text-gray-900 dark:text-white font-medium">
                  {user._count.transactions || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Reminders:</span>{' '}
                <span className="text-gray-900 dark:text-white font-medium">
                  {user._count.reminders || 0}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Family Memberships:</span>{' '}
                <span className="text-gray-900 dark:text-white font-medium">
                  {user._count.familyMemberships || 0}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
          <button
            onClick={handleToggleStatus}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${user.isActive ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/20' : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/20'}`}
          >
            {user.isActive ? <Ban size={14} /> : <CheckCircle size={14} />}{' '}
            {user.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20"
          >
            <Trash2 size={14} /> Delete User
          </button>
        </div>
      </div>
    </div>
  );
}
