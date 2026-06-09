'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Trash2, Loader2, Search } from 'lucide-react';
import { listFamilies, deleteFamily } from '@/lib/api';
import type { Family } from '@/lib/api';

export default function FamiliesPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadData();
  }, [page]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await listFamilies(page, 20);
      setFamilies(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this family?')) {
      return;
    }
    try {
      await deleteFamily(id);
      await loadData();
    } catch (e: any) {
      alert(e.message);
    }
  }

  const filtered = families.filter(
    (f) =>
      !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.members.some((m) => m.user.email.toLowerCase().includes(search.toLowerCase())),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Families</h1>
          <p className="text-muted-foreground">Manage shared family groups</p>
        </div>
        <div className="text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg">
          {families.length} families
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search families or member emails..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No families found
          </div>
        ) : (
          filtered.map((family) => (
            <Link key={family.id} href={`/families/${family.id}`} className="block">
              <div className="bg-card rounded-lg border border-border p-5 hover:border-indigo-500/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{family.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {family.type || 'shared'} group
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="w-3 h-3" />
                    {family._count?.members || family.members?.length || 0}
                  </span>
                </div>
                <div className="space-y-1">
                  {(family.members || []).slice(0, 5).map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span className="text-foreground">
                        {m.user.firstName} {m.user.lastName}
                      </span>
                      <span className="text-muted-foreground text-xs">{m.user.email}</span>
                      <span className="text-muted-foreground text-xs ml-auto capitalize">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(family.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(family.id);
                    }}
                    className="ml-auto p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
