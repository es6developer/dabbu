'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function InviteRedirect() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  useEffect(() => {
    router.replace(`/i/${token}`);
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-dabbu-accent flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-white font-bold text-lg">D</span>
        </div>
      </div>
    </div>
  );
}
