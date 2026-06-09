'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">{total} total users</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full h-9 pl-9 pr-4 rounded-lg border bg-background text-sm outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                      User
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                      Plan
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                      Joined
                    </th>
                    <th className="w-24 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: User) => (
                    <tr
                      key={user.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar size="sm">
                            {user.avatarUrl && (
                              <AvatarImage
                                src={user.avatarUrl}
                                alt={`${user.firstName} ${user.lastName}`}
                              />
                            )}
                            <AvatarFallback className="bg-dabbu-500/10 text-dabbu-500 text-xs">
                              {(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              <Link
                                href={`/users/${user.id}`}
                                className="hover:text-indigo-400 transition-colors"
                              >
                                {user.firstName} {user.lastName}
                              </Link>
                            </p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {user.subscription?.plan?.name || 'None'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            user.isActive
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-gray-500/10 text-gray-400',
                          )}
                        >
                          {user.isActive ? 'active' : 'inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => toggleUserStatus(user)}>
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages || 1}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
