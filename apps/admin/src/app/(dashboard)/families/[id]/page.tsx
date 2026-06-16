'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, Trash2, Users } from 'lucide-react';
import { getFamilyDetail, deleteFamily } from '@/lib/api';

export default function FamilyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [family, setFamily] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getFamilyDetail(params.id as string);
      setFamily(res.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [params.id]);

  async function handleDelete() {
    if (!family || !confirm(`Delete family "${family.name}"?`)) return;
    try {
      await deleteFamily(family.id);
      router.push('/families');
    } catch (e: any) { alert(e.message); }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>;
  if (error) return <div className="glass-panel p-5 text-sm text-red-400">{error}</div>;
  if (!family) return <div className="text-center py-16 text-white/40">Family not found</div>;

  const members = family.members || [];

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <button onClick={() => router.back()} className="btn-ghost-glass">
        <ChevronLeft size={16} /> Back to Families
      </button>

      <div className="glass-panel p-7 space-y-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.06] flex items-center justify-center ring-1 ring-white/[0.08]">
              <Users className="w-6 h-6 text-white/60" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{family.name}</h2>
              <p className="text-sm text-white/50">
                {members.length} member{members.length !== 1 ? 's' : ''} ·{' '}
                {family.code ? `Code: ${family.code}` : 'No code'}
              </p>
            </div>
          </div>
          <span className={`badge-glass ${family.isActive !== false ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {family.isActive !== false ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-5 text-sm border-t border-white/[0.06] pt-6">
          <InfoRow label="Family ID" value={family.id} mono />
          <InfoRow label="Max Members" value={String(family.maxMembers)} />
          <InfoRow label="Owner ID" value={family.ownerId} mono />
          <InfoRow label="Created" value={new Date(family.createdAt).toLocaleDateString()} />
        </div>

        <div className="border-t border-white/[0.06] pt-6">
          <h3 className="text-sm font-semibold text-white/70 mb-3">Members</h3>
          {members.length === 0 ? (
            <p className="text-sm text-white/40">No members</p>
          ) : (
            <div className="space-y-2">
              {members.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between bg-white/[0.03] rounded-2xl px-4 py-3 border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center">
                      <span className="text-xs font-bold text-white/60">{m.user?.firstName?.[0] || '?'}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{m.user?.firstName} {m.user?.lastName}</p>
                      <p className="text-xs text-white/40">{m.user?.email}</p>
                    </div>
                  </div>
                  <span className={`badge-glass ${m.role === 'owner' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20' : 'bg-white/[0.04] text-white/50 border border-white/[0.06]'}`}>
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-white/[0.06] pt-6">
          <button onClick={handleDelete} className="btn-glass bg-red-500/10 border-red-500/20 hover:bg-red-500/20">
            <Trash2 size={14} /> Delete Family
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-white/40">{label}:</span>{' '}
      <span className={`text-white ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
