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

  useEffect(() => { loadData(); }, [page]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await listFamilies(page, 20);
      setFamilies(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this family?')) return;
    try {
      await deleteFamily(id);
      await loadData();
    } catch (e: any) { alert(e.message); }
  }

  const filtered = families.filter(
    (f) => !search || f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.members.some((m) => m.user.email.toLowerCase().includes(search.toLowerCase())),
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>;
  }
  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-400"><p>{error}</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Families</h1>
          <p className="text-white/40">Manage shared family groups</p>
        </div>
        <div className="text-sm text-white/40 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/[0.06]">
          {families.length} families
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          placeholder="Search families or member emails..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="glass-input w-full pl-10 pr-4 py-2.5"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-white/40">No families found</div>
        ) : (
          filtered.map((family) => (
            <Link key={family.id} href={`/families/${family.id}`} className="block group">
              <div className="glass-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white">{family.name}</h3>
                    <p className="text-xs text-white/40 mt-0.5 capitalize">{family.type || 'shared'} group</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-sm text-white/50">
                    <Users className="w-3.5 h-3.5" />
                    {family._count?.members || family.members?.length || 0}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {(family.members || []).slice(0, 5).map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60" />
                      <span className="text-white/80">{m.user.firstName} {m.user.lastName}</span>
                      <span className="text-white/30 text-xs">{m.user.email}</span>
                      <span className="text-white/30 text-xs ml-auto capitalize">{m.role}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.06]">
                  <span className="text-xs text-white/40">Created {new Date(family.createdAt).toLocaleDateString()}</span>
                  <button
                    onClick={(e) => { e.preventDefault(); handleDelete(family.id); }}
                    className="ml-auto p-1.5 text-red-400/60 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all"
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
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost-glass">Previous</button>
          <span className="px-3 py-1.5 text-sm text-white/40">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-ghost-glass">Next</button>
        </div>
      )}
    </div>
  );
}
