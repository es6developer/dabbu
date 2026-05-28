"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: "Smart Splits",
    description: "Split expenses equally, by percentage, or exact amounts. Real-time calculations for everyone.",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Trip Friendly",
    description: "Perfect for group trips. Track who paid for what and settle up effortlessly when you're back.",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Easy Settlements",
    description: "See exactly who owes what and settle up with a tap. Track paid and pending amounts.",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: "Real-time Chat",
    description: "Discuss expenses and plans with built-in group chat. Messages, payments, and updates in one place.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.trim()) {
      router.push(`/invite/${inviteCode.trim()}`);
    }
  };

  return (
    <div className="relative min-h-screen">
      <nav className="fixed top-0 left-0 right-0 z-50 glass-effect">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-dabbu-accent flex items-center justify-center">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <span className="text-lg font-semibold text-dabbu-text">
                Dabbu <span className="text-dabbu-accent">Split</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/auth")}
              >
                Sign In
              </Button>
              <Button size="sm" onClick={() => router.push("/auth")}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-24 px-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-dabbu-accent/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-dabbu-border bg-dabbu-surface mb-8">
            <span className="w-2 h-2 rounded-full bg-dabbu-green animate-pulse" />
            <span className="text-sm text-dabbu-text-secondary">
              No account required to join
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Collaborative Finance,
            <br />
            <span className="text-gradient">Simplified</span>
          </h1>
          <p className="text-xl text-dabbu-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Split expenses, manage group trips, and settle debts in real-time.
            Dabbu brings everyone together whether you have an account or not.
          </p>
          <form onSubmit={handleJoin} className="max-w-md mx-auto flex gap-3">
            <Input
              placeholder="Enter invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="text-center text-lg uppercase tracking-widest"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              }
            />
            <Button type="submit" size="lg" className="shrink-0">
              Join Group
            </Button>
          </form>
          <div className="flex items-center justify-center gap-4 mt-8">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-dabbu-bg bg-dabbu-surface2 flex items-center justify-center text-xs font-medium text-dabbu-text-secondary"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p className="text-sm text-dabbu-text-muted">
              <span className="text-dabbu-text-secondary font-medium">2.4k+</span> active groups
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to{" "}
              <span className="text-gradient">split together</span>
            </h2>
            <p className="text-dabbu-text-secondary text-lg max-w-2xl mx-auto">
              From weekend trips to shared households, Dabbu makes it effortless.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, i) => (
              <Card
                key={i}
                className="hover:border-dabbu-accent/30 transition-all duration-300 group"
              >
                <div className="w-14 h-14 rounded-xl bg-dabbu-accent-muted flex items-center justify-center text-dabbu-accent mb-5 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-dabbu-text">
                  {feature.title}
                </h3>
                <p className="text-sm text-dabbu-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-dabbu-accent/5 to-transparent" />
        <div className="max-w-4xl mx-auto text-center relative">
          <Card gradient className="p-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to simplify your{" "}
              <span className="text-gradient">shared finances</span>?
            </h2>
            <p className="text-dabbu-text-secondary text-lg mb-8 max-w-xl mx-auto">
              Invite friends, split expenses, and settle up. No sign-up required for guests.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="xl" onClick={() => router.push("/auth")}>
                Create Your First Group
              </Button>
              <Button
                variant="outline"
                size="xl"
                onClick={() => router.push("/auth")}
              >
                Learn More
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-dabbu-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-dabbu-accent flex items-center justify-center">
              <span className="text-white font-bold text-xs">D</span>
            </div>
            <span className="text-sm text-dabbu-text-muted">
              Dabbu Split &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-dabbu-text-muted">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
