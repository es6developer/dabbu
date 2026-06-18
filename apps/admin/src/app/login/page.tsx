'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'password' | 'mfa'>('password');
  const [email, setEmail] = useState('admin@dabbu.app');
  const [password, setPassword] = useState('Admin@123');
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message?.[0] || err.message || 'Login failed');
      }
      const json = await res.json();
      if (json.data?.mfaRequired) {
        setMfaRequired(true);
        setStep('mfa');
        return;
      }
      localStorage.setItem('admin_user', JSON.stringify(json.data.admin));
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, totpCode }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message?.[0] || err.message || 'MFA verification failed');
      }
      const json = await res.json();
      localStorage.setItem('admin_user', JSON.stringify(json.data.admin));
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.1),transparent_60%)]" />
      <div className="relative w-full max-w-sm px-6">
        <div className="glass-panel p-10 space-y-8">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/20">
              <span className="text-white font-bold text-2xl">D</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Admin</h1>
              <p className="text-white/40 text-sm mt-1">
                {step === 'mfa' ? 'Enter your MFA code' : 'Sign in to manage Dabbu'}
              </p>
            </div>
          </div>

          {step === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              {error && (
                <div className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-white/60">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input w-full h-11 px-4"
                  placeholder="admin@dabbu.app"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-white/60">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full h-11 px-4"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-glass w-full h-11 text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfaLogin} className="space-y-4">
              {error && (
                <div className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm">
                <KeyRound className="w-4 h-4 flex-shrink-0" />
                This account requires a multi-factor authentication code.
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-white/60">
                  Authenticator Code
                </label>
                <input
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="glass-input w-full h-11 px-4 text-center text-lg tracking-[0.5em] font-mono"
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="btn-glass w-full h-11 text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('password'); setTotpCode(''); setError(''); }}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to password login
              </button>
            </form>
          )}

          <p className="text-center text-xs text-white/20">
            Default: admin@dabbu.app / Admin@123
          </p>
        </div>
      </div>
    </div>
  );
}
