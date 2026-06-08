'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dabbu-zmkh.onrender.com/api/v1';
const APP_STORE_URL = 'https://apps.apple.com/app/dabbu';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.dabbu.app';

export default function ReferralPage() {
  const params = useParams();
  const code = params.code as string;
  const [tracked, setTracked] = useState(false);
  const [rewardAmount] = useState(100);

  useEffect(() => {
    if (code && !tracked) {
      setTracked(true);
      fetch(`${API_BASE_URL}/referral/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          deviceId: typeof window !== 'undefined' ? localStorage.getItem('dabbu_device_id') : null,
          platform:
            typeof navigator !== 'undefined'
              ? /iPhone|iPad|iPod/.test(navigator.userAgent)
                ? 'ios'
                : 'android'
              : 'web',
        }),
      }).catch(() => {});
      if (typeof window !== 'undefined') {
        localStorage.setItem('dabbu_referral_code', code);
      }
    }
  }, [code, tracked]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-br from-purple-600 to-purple-400 opacity-10" />
      <Card className="max-w-md w-full p-8 text-center relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <span className="text-white text-3xl font-bold">D</span>
        </div>

        <h1 className="text-2xl font-bold mb-2">You&apos;ve been invited!</h1>
        <p className="text-muted-foreground mb-6">
          Join Dabbu and start managing expenses together with your family and friends.
        </p>

        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-4 mb-6">
          <div className="text-3xl font-bold text-purple-600 mb-1">₹{rewardAmount}</div>
          <p className="text-sm text-muted-foreground">Your referral bonus awaits</p>
        </div>

        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600"
            onClick={() => (window.location.href = APP_STORE_URL)}
          >
            Download for iOS
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={() => (window.location.href = PLAY_STORE_URL)}
          >
            Download for Android
          </Button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-xs text-muted-foreground">
            Referral code <span className="font-mono font-bold text-foreground">{code}</span> will
            be applied automatically
          </p>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Already have an account?{' '}
          <a
            href={`dabbu://referral/${code}`}
            className="text-purple-600 hover:underline font-medium"
          >
            Open app
          </a>
        </p>
      </Card>
    </div>
  );
}
