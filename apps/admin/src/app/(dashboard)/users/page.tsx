'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn, formatDate } from '@/lib/utils';
import { listUsers, updateUserStatus, deleteUser } from '@/lib/api';
import type { User } from '@/lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const perPage = 10;

  useEffect(() => {
    loadUsers();
  }, [page, search]);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await listUsers({ search: search || undefined, page, limit: perPage });
      setUsers(res.data);
      setTotal(res.meta.total);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleUserStatus(user: User) {
    try {
      await updateUserStatus(user.id, !user.isActive);
      await loadUsers();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Delete user ${user.email}? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteUser(user.id);
      await loadUsers();
    } catch (e: any) {
      alert(e.message);
    }
  }

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Users</h1>
          <p className="text-white/40 mt-1">{total} total users</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="glass-input w-full h-10 pl-10 pr-4"
        />
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-white/40" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-xs font-medium text-white/30 px-5 py-4">User</th>
                    <th className="text-left text-xs font-medium text-white/30 px-5 py-4">Plan</th>
                    <th className="text-left text-xs font-medium text-white/30 px-5 py-4">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-white/30 px-5 py-4">
                      Joined
                    </th>
                    <th className="w-32 px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: User) => (
                    <tr
                      key={user.id}
                      className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar size="sm" className="ring-1 ring-white/[0.08]">
                            {user.avatarUrl && (
                              <AvatarImage
                                src={user.avatarUrl}
                                alt={`${user.firstName} ${user.lastName}`}
                              />
                            )}
                            <AvatarFallback className="bg-white/[0.06] text-white/60 text-xs">
                              {(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-white">
                              <Link
                                href={`/users/${user.id}`}
                                className="hover:text-indigo-400 transition-colors"
                              >
                                {user.firstName} {user.lastName}
                              </Link>
                            </p>
                            <p className="text-xs text-white/40">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-white/50">
                        {user.subscription?.plan?.name || 'None'}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            'badge-glass',
                            user.isActive
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                              : 'bg-white/[0.04] text-white/40 border border-white/[0.06]',
                          )}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-white/50">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => toggleUserStatus(user)}
                            className="btn-ghost-glass text-xs"
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="btn-ghost-glass text-xs text-red-400/60 hover:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06]">
              <p className="text-sm text-white/40">
                Page {page} of {totalPages || 1}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="btn-ghost-glass"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="btn-ghost-glass"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
