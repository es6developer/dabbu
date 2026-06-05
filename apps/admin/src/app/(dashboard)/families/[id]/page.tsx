'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, RefreshCw, Trash2, Users, Calendar } from 'lucide-react';
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
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function handleDelete() {
    if (!family || !confirm(`Delete family "${family.name}"?`)) {
      return;
    }
    try {
      await deleteFamily(family.id);
      router.push('/families');
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
  if (!family) {
    return <div className="text-center py-16 text-gray-500">Family not found</div>;
  }

  const members = family.members || [];

  return (
    <div className="space-y-6 max-w-3xl">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        <ChevronLeft size={16} /> Back to Families
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6 dark:border dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{family.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {members.length} member{members.length !== 1 ? 's' : ''} ·{' '}
                {family.code ? `Code: ${family.code}` : 'No code'}
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${family.isActive !== false ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400' : 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400'}`}
          >
            {family.isActive !== false ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-200 dark:border-gray-700 pt-4">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Family ID:</span>{' '}
            <span className="text-gray-900 dark:text-white font-mono text-xs">{family.id}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Max Members:</span>{' '}
            <span className="text-gray-900 dark:text-white">{family.maxMembers}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Owner ID:</span>{' '}
            <span className="text-gray-900 dark:text-white font-mono text-xs">
              {family.ownerId}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Created:</span>{' '}
            <span className="text-gray-900 dark:text-white">
              {new Date(family.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Members</h3>
          {members.length === 0 ? (
            <p className="text-sm text-gray-500">No members</p>
          ) : (
            <div className="space-y-2">
              {members.map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {m.user?.firstName?.[0] || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {m.user?.firstName} {m.user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{m.user?.email}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.role === 'owner' ? 'text-purple-600 bg-purple-50 dark:bg-purple-500/10 dark:text-purple-400' : 'text-gray-600 bg-gray-100 dark:bg-gray-600 dark:text-gray-400'}`}
                  >
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20"
          >
            <Trash2 size={14} /> Delete Family
          </button>
        </div>
      </div>
    </div>
  );
}
