'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { View, Text, StyleSheet, spacing, radii } from '@/rn';

export default function InviteRedirect() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  useEffect(() => {
    router.replace(`/i/${token}`);
  }, [token, router]);

  return (
    <View style={styles.root}>
      <View style={styles.loader}>
        <Text style={styles.loaderText}>D</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'var(--dabbu-bg, #000000)',
  },
  loader: {
    width: 48,
    height: 48,
    borderRadius: radii.xl,
    backgroundColor: 'var(--dabbu-accent, #8B5CF6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
