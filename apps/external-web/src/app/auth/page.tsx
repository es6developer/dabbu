"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { toast } from "sonner";

function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const onSuccess = useCallback(
    async (credentialResponse: CredentialResponse) => {
      if (!credentialResponse.credential) {
        toast.error("Google sign-in failed");
        return;
      }
      const res = await api.auth.google(credentialResponse.credential);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      api.setTempToken(res.data!.token);
      api.setTempSession(res.data!.user as Record<string, unknown>);
      toast.success("Welcome to Dabbu!");
      router.push(redirect);
    },
    [router, redirect],
  );

  const onError = useCallback(() => {
    toast.error("Google sign-in failed. Please try again.");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-hero-gradient pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-dabbu-accent/10 via-transparent to-transparent pointer-events-none" />

      <Card className="w-full max-w-sm relative z-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-dabbu-accent flex items-center justify-center shadow-lg shadow-dabbu-accent/30">
              <span className="text-white font-bold text-xl">D</span>
            </div>
          </div>
          <CardTitle className="text-2xl">Sign in to Dabbu</CardTitle>
          <p className="text-dabbu-text-secondary text-sm mt-1">
            Join shared expenses and split bills with your group
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <GoogleLogin
              theme="filled_black"
              size="large"
              shape="pill"
              text="signin_with"
              width="100%"
              onSuccess={onSuccess}
              onError={onError}
            />
          </div>
        </CardContent>
      </Card>
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
