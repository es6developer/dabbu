'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw, XCircle } from 'lucide-react';
import { listAdmins, createAdmin, deleteAdmin, type AdminUser } from '@/lib/api';

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try { const res = await listAdmins(); setAdmins(res.data); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!email.trim() || !name.trim() || !password.trim()) return alert('All fields required');
    setCreating(true);
    try {
      await createAdmin({ email, name, password, role });
      setShowCreate(false); setEmail(''); setName(''); setPassword(''); setRole('admin'); load();
    } catch (e: any) { alert(e.message); }
    finally { setCreating(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Deactivate admin "${name}"?`)) return;
    try { await deleteAdmin(id); load(); }
    catch (e: any) { alert(e.message); }
  }

  const roleBadge: Record<string, string> = {
    super_admin: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
    admin: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20',
    support: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
    analyst: 'bg-white/[0.04] text-white/40 border border-white/[0.06]',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Users</h1>
          <p className="text-white/40">Manage administrators and their roles</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost-glass">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-glass">
            <Plus size={14} /> Add Admin
          </button>
        </div>
      </div>

      {error && <div className="glass-panel p-4 text-sm text-red-400">{error}</div>}

      {showCreate && (
        <div className="glass-panel p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Create New Admin</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Name', value: name, setter: setName, placeholder: 'John Admin', type: 'text' },
              { label: 'Email', value: email, setter: setEmail, placeholder: 'admin@dabbu.app', type: 'email' },
              { label: 'Password', value: password, setter: setPassword, placeholder: 'Min 8 characters', type: 'password' },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-sm font-medium text-white/60 mb-1">{f.label}</label>
                <input type={f.type} value={f.value} onChange={(e) => f.setter(e.target.value)} placeholder={f.placeholder} className="glass-input w-full px-3 py-2.5" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="glass-input w-full px-3 py-2.5 appearance-none">
                <option value="admin" className="bg-gray-900">Admin</option>
                <option value="super_admin" className="bg-gray-900">Super Admin</option>
                <option value="support" className="bg-gray-900">Support</option>
                <option value="analyst" className="bg-gray-900">Analyst</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating} className="btn-glass">
              {creating ? 'Creating...' : 'Create Admin'}
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-ghost-glass">Cancel</button>
          </div>
        </div>
      )}

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><RefreshCw className="w-6 h-6 animate-spin text-white/40" /></div>
        ) : admins.length === 0 ? (
          <div className="text-center py-16 text-white/40">No admin users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-5 py-4 font-medium text-white/30">Name</th>
                  <th className="text-left px-5 py-4 font-medium text-white/30">Email</th>
                  <th className="text-left px-5 py-4 font-medium text-white/30">Role</th>
                  <th className="text-left px-5 py-4 font-medium text-white/30">Status</th>
                  <th className="text-left px-5 py-4 font-medium text-white/30">Last Login</th>
                  <th className="text-left px-5 py-4 font-medium text-white/30">Created</th>
                  <th className="text-left px-5 py-4 font-medium text-white/30">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 text-white font-medium">{a.name}</td>
                    <td className="px-5 py-4 text-white/50">{a.email}</td>
                    <td className="px-5 py-4"><span className={`badge-glass ${roleBadge[a.role] || roleBadge.admin}`}>{a.role.replace('_', ' ')}</span></td>
                    <td className="px-5 py-4">
                      <span className={`badge-glass ${a.isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {a.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white/40 text-xs">{a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : 'Never'}</td>
                    <td className="px-5 py-4 text-white/40 text-xs">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      {a.role !== 'super_admin' && (
                        <button onClick={() => handleDelete(a.id, a.name)} className="text-red-400/60 hover:text-red-400 transition-colors">
                          <XCircle size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
