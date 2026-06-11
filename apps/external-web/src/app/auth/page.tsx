'use client';

import { Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const redirect = searchParams.get('redirect') || '/';

  const onSuccess = useCallback(
    async (credentialResponse: CredentialResponse) => {
      if (!credentialResponse.credential) {
        toast.error('Google sign-in failed');
        return;
      }
      let groupId: string | undefined;
      const inviteMatch = redirect.match(/\/(?:i|invite)\/([a-f0-9]+)/);
      if (inviteMatch) {
        const inviteRes = await api.groups.getInvite(inviteMatch[1]);
        if (inviteRes.data?.group?.id) {
          groupId = inviteRes.data.group.id;
        }
      }
      const res = await api.auth.google(credentialResponse.credential, groupId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      const data = res.data as any;
      login(data.tokens?.accessToken || data.token, data.user);
      toast.success('Welcome to Dabbu!');
      router.push(redirect);
    },
    [router, redirect, login],
  );

  const onError = useCallback(() => {
    toast.error('Google sign-in failed. Please try again.');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-dabbu-bg via-[#0D0D14] to-[#0A0A0F] pointer-events-none" />

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-radial from-dabbu-accent/8 via-dabbu-accent/3 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-radial from-dabbu-accent/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-64 h-64 border border-dabbu-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 border border-dabbu-accent/5 rounded-full blur-3xl" />

      <div
        className="absolute top-20 left-10 w-1 h-1 bg-dabbu-accent/20 rounded-full animate-ping"
        style={{ animationDuration: '3s' }}
      />
      <div
        className="absolute bottom-32 right-16 w-1.5 h-1.5 bg-dabbu-accent/15 rounded-full animate-ping"
        style={{ animationDuration: '4s' }}
      />
      <div
        className="absolute top-1/3 right-1/4 w-1 h-1 bg-white/10 rounded-full animate-ping"
        style={{ animationDuration: '5s' }}
      />

      <div className="w-full max-w-sm relative z-10">
        <div className="relative">
          <div className="absolute -inset-[1px] bg-gradient-to-b from-dabbu-accent/20 via-transparent to-dabbu-accent/5 rounded-3xl blur-sm" />
          <div className="relative bg-gradient-to-b from-[#12121A] to-[#0D0D14] rounded-3xl border border-white/[0.06] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-dabbu-accent/30 to-transparent" />

            <div className="p-8 pt-10 text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute -inset-3 bg-dabbu-accent/20 rounded-full blur-xl" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-dabbu-accent to-dabbu-accent/80 flex items-center justify-center shadow-lg shadow-dabbu-accent/25">
                    <span className="text-white font-bold text-2xl tracking-tight">D</span>
                  </div>
                </div>
              </div>

              <h1 className="text-[28px] font-bold tracking-tight text-white">
                Sign in to <span className="text-dabbu-accent">Dabbu</span>
              </h1>
              <p className="text-white/40 text-sm mt-2 leading-relaxed max-w-[260px] mx-auto">
                Join shared expenses and split bills with your group
              </p>
            </div>

            <div className="px-8 pb-8">
              <div className="relative">
                <div className="absolute -inset-[1px] bg-gradient-to-b from-dabbu-accent/10 via-transparent to-dabbu-accent/5 rounded-2xl blur-[2px]" />
                <div className="relative bg-[#0A0A0F] rounded-2xl border border-white/[0.04] p-5">
                  <div className="flex items-center justify-center">
                    <GoogleLogin
                      theme="filled_black"
                      size="large"
                      shape="pill"
                      text="signin_with"
                      width={280}
                      onSuccess={onSuccess}
                      onError={onError}
                    />
                  </div>
                </div>
              </div>

              <p className="text-center text-white/20 text-xs mt-5 leading-relaxed">
                By continuing, you agree to Dabbu&apos;s{' '}
                <span className="text-white/30 underline underline-offset-2 decoration-dabbu-accent/30">
                  Terms
                </span>{' '}
                and{' '}
                <span className="text-white/30 underline underline-offset-2 decoration-dabbu-accent/30">
                  Privacy Policy
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <AuthPage />
    </Suspense>
  );
}
