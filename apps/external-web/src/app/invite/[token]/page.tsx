'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { View, StyleSheet, spacing, radii } from '@/rn';

export default function InviteRedirect() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  useEffect(() => {
    router.replace(`/i/${token}`);
  }, [token, router]);

  return <View style={s.root}><View style={s.loader} /></View>;
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, backgroundColor: 'var(--dabbu-bg)' },
  loader: { width: 32, height: 32, borderRadius: radii.xl, backgroundColor: 'var(--dabbu-accent)' },
});
