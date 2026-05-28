'use client';

import React, { useState, useEffect } from 'react';
import {
  Search, MoreHorizontal, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatDate, timeAgo } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function getAuthHeaders() {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
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
      const params = new URLSearchParams({ page: String(page), limit: String(perPage) });
      if (search) params.set('search', search);
      const res = await fetch(`${API_URL}/admin/users?${params}`, { headers: getAuthHeaders() });
      const json = await res.json();
      setUsers(json.data?.data ?? []);
      setTotal(json.data?.meta?.total ?? 0);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
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
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">User</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Joined</th>
                    <th className="w-10 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: any) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-dabbu-500/10 flex items-center justify-center text-xs font-medium text-dabbu-500">
                            {(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          user.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-400',
                        )}>
                          {user.isActive ? 'active' : 'inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon"><MoreHorizontal size={14} /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages || 1}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft size={14} />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
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
