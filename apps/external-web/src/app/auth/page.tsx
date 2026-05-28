"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"input" | "otp">("input");
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      if (authMethod === "email") {
        const res = await api.auth.sendOtp(email);
        if (res.error) {
          toast.error(res.error);
          return;
        }
      } else {
        const res = await api.auth.phoneSendOtp(phone);
        if (res.error) {
          toast.error(res.error);
          return;
        }
      }
      setStep("otp");
      toast.success("OTP sent successfully");
    } catch {
      toast.error("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) {
      toast.error("Please enter a valid OTP");
      return;
    }
    setLoading(true);
    try {
      let res;
      if (authMethod === "email") {
        res = await api.auth.verifyOtp(email, otp);
      } else {
        res = await api.auth.phoneVerifyOtp(phone, otp);
      }
      if (res.error) {
        toast.error(res.error);
        return;
      }
      api.setTempToken(res.data!.token);
      api.setTempSession(res.data!.user as Record<string, unknown>);
      toast.success("Welcome to Dabbu!");
      router.push(redirect);
    } catch {
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymous = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    setLoading(true);
    try {
      const res = await api.auth.anonymous(name);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      api.setTempToken(res.data!.token);
      api.setTempSession(res.data!.user as Record<string, unknown>);
      toast.success("Joined as guest!");
      router.push(redirect);
    } catch {
      toast.error("Failed to join");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-hero-gradient pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-dabbu-accent/10 via-transparent to-transparent pointer-events-none" />

      <Card className="w-full max-w-md relative z-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-dabbu-accent flex items-center justify-center">
              <span className="text-white font-bold text-lg">D</span>
            </div>
          </div>
          <CardTitle className="text-2xl">Join Dabbu Split</CardTitle>
          <p className="text-dabbu-text-secondary text-sm mt-1">
            Participate in shared expenses without a full account
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email" onValueChange={(v) => setStep("input")}>
            <TabsList className="w-full mb-6">
              <TabsTrigger value="email" className="flex-1">
                Email
              </TabsTrigger>
              <TabsTrigger value="phone" className="flex-1">
                Phone
              </TabsTrigger>
              <TabsTrigger value="anonymous" className="flex-1">
                Guest
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              {step === "input" ? (
                <div className="space-y-4">
                  <Input
                    label="Email address"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    }
                  />
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSendOtp}
                    loading={loading}
                  >
                    Send OTP
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 animate-in">
                  <p className="text-sm text-dabbu-text-secondary text-center">
                    Enter the code sent to{" "}
                    <span className="text-dabbu-text font-medium">{email}</span>
                  </p>
                  <Input
                    label="OTP Code"
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center text-2xl tracking-[0.5em]"
                  />
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setStep("input"); setOtp(""); }}
                    >
                      Back
                    </Button>
                    <Button
                      className="flex-1"
                      size="lg"
                      onClick={handleVerifyOtp}
                      loading={loading}
                    >
                      Verify
                    </Button>
                  </div>
                  <button
                    onClick={handleSendOtp}
                    className="w-full text-sm text-dabbu-accent hover:underline"
                  >
                    Resend OTP
                  </button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="phone">
              {step === "input" ? (
                <div className="space-y-4">
                  <Input
                    label="Phone number"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    icon={
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    }
                  />
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSendOtp}
                    loading={loading}
                  >
                    Send OTP
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 animate-in">
                  <p className="text-sm text-dabbu-text-secondary text-center">
                    Enter the code sent to{" "}
                    <span className="text-dabbu-text font-medium">{phone}</span>
                  </p>
                  <Input
                    label="OTP Code"
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center text-2xl tracking-[0.5em]"
                  />
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setStep("input"); setOtp(""); }}
                    >
                      Back
                    </Button>
                    <Button
                      className="flex-1"
                      size="lg"
                      onClick={handleVerifyOtp}
                      loading={loading}
                    >
                      Verify
                    </Button>
                  </div>
                  <button
                    onClick={handleSendOtp}
                    className="w-full text-sm text-dabbu-accent hover:underline"
                  >
                    Resend OTP
                  </button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="anonymous">
              <div className="space-y-4">
                <Input
                  label="Your display name"
                  placeholder="Enter a name for the group"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                />
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleAnonymous}
                  loading={loading}
                >
                  Continue as Guest
                </Button>
                <p className="text-xs text-dabbu-text-muted text-center">
                  You can always sign up properly later. Your data is temporary.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dabbu-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-dabbu-bg px-2 text-dabbu-text-muted">or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full h-12 gap-3"
            onClick={() => api.auth.google()}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
