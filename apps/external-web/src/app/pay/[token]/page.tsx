'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { View, Text, TouchableOpacity, Card, StyleSheet, spacing, radii } from '@/rn';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Row } from '@/rn';
import { toast } from 'sonner';

interface PayLinkData {
  groupName: string;
  amount: number;
  from: string;
  to: string;
  upiLink: string;
  status: string;
  expiresAt: string;
}

export default function PayLinkPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<PayLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    api.settlements.getPayLink(token).then((res) => {
      if (res.data) {
        setData(res.data as PayLinkData);
      } else {
        toast.error(res.error || 'Payment link not found');
      }
      setLoading(false);
    });
  }, [token]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <View style={styles.loader}>
          <Text style={styles.loaderText}>D</Text>
        </View>
        <View style={styles.loaderBar} />
        <View style={[styles.loaderBar, { width: 128 }]} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centeredPad}>
        <Card style={styles.errorCard}>
          <View style={styles.errorIconWrap}>
            <Text style={styles.errorIcon}>!</Text>
          </View>
          <Text style={styles.errorTitle}>Payment Link Expired</Text>
          <Text style={styles.errorText}>
            This payment link is no longer valid. Please contact the group admin for a new link.
          </Text>
        </Card>
      </View>
    );
  }

  const handlePay = async () => {
    setPaying(true);
    try {
      if (data.upiLink) {
        window.open(data.upiLink, '_blank');
      }
      toast.success('Payment initiated! Did it go through?');
      setPaying(false);
      setPaid(true);
    } catch {
      setPaying(false);
    }
  };

  return (
    <View style={styles.centeredPad}>
      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>D</Text>
          </View>
          <Text style={styles.groupName}>{data.groupName}</Text>
          <Text style={styles.paySubtitle}>Payment Request</Text>
        </View>

        <Card style={styles.amountCard}>
          <Text style={styles.youOweLabel}>You owe</Text>
          <Text style={styles.amountValue}>{formatCurrency(data.amount)}</Text>
          <Text style={styles.toLabel}>to {data.to}</Text>
          <View style={styles.payMeta}>
            <Text style={styles.metaText}>From: {data.from}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>Group: {data.groupName}</Text>
          </View>
        </Card>

        {!paid ? (
          <View style={styles.payActions}>
            <TouchableOpacity style={styles.payBtn} onPress={handlePay} disabled={paying}>
              <Text style={styles.payBtnText}>{paying ? 'Opening UPI...' : 'Pay Now via UPI'}</Text>
            </TouchableOpacity>
            <Row style={{ gap: spacing.md }}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={async () => {
                  await navigator.clipboard.writeText(data.upiLink);
                  toast.success('UPI link copied!');
                }}
              >
                <Text style={styles.secondaryBtnText}>Copy UPI Link</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPaid(true)}>
                <Text style={styles.secondaryBtnText}>Mark as Paid</Text>
              </TouchableOpacity>
            </Row>
          </View>
        ) : (
          <Card style={styles.paidCard}>
            <View style={styles.paidIconWrap}>
              <Text style={styles.paidIcon}>✓</Text>
            </View>
            <Text style={styles.paidTitle}>Payment Recorded</Text>
            <Text style={styles.paidText}>
              Your payment of {formatCurrency(data.amount)} has been recorded. The receiver will
              confirm shortly.
            </Text>
            <TouchableOpacity style={styles.undoBtn} onPress={() => setPaid(false)}>
              <Text style={styles.undoBtnText}>Made a mistake? Undo</Text>
            </TouchableOpacity>
          </Card>
        )}

        <Text style={styles.expiryText}>
          This link will expire on {new Date(data.expiresAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'var(--dabbu-bg, #000000)',
  },
  centeredPad: {
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
    marginBottom: spacing.lg,
  },
  loaderText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  loaderBar: {
    width: 192,
    height: 16,
    borderRadius: radii.sm,
    backgroundColor: 'var(--dabbu-surface2, #1A1A1E)',
    marginBottom: spacing.md,
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    padding: spacing.xxl,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  errorIcon: {
    fontSize: 28,
    color: 'var(--dabbu-red, #EF4444)',
    fontWeight: '800',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'var(--dabbu-text, #FFFFFF)',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: 14,
    color: 'var(--dabbu-text-secondary, #94A3B8)',
    textAlign: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radii.xl,
    backgroundColor: 'var(--dabbu-accent, #8B5CF6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  groupName: {
    fontSize: 20,
    fontWeight: '700',
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  paySubtitle: {
    fontSize: 14,
    color: 'var(--dabbu-text-muted, #64748B)',
    marginTop: spacing.xs,
  },
  amountCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  youOweLabel: {
    fontSize: 14,
    color: 'var(--dabbu-text-secondary, #94A3B8)',
    marginBottom: spacing.sm,
  },
  amountValue: {
    fontSize: 40,
    fontWeight: '800',
    color: 'var(--dabbu-red, #EF4444)',
    letterSpacing: -1,
  },
  toLabel: {
    fontSize: 14,
    color: 'var(--dabbu-text-secondary, #94A3B8)',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  payMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'var(--dabbu-border, #2A2A2E)',
  },
  metaText: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  metaDot: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
  },
  payActions: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  payBtn: {
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: 'var(--dabbu-accent, #8B5CF6)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  payBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'var(--dabbu-border, #2A2A2E)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'var(--dabbu-text, #FFFFFF)',
  },
  paidCard: {
    alignItems: 'center',
    padding: spacing.xxl,
    marginBottom: spacing.lg,
  },
  paidIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  paidIcon: {
    fontSize: 24,
    color: 'var(--dabbu-green, #10B981)',
    fontWeight: '800',
  },
  paidTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'var(--dabbu-text, #FFFFFF)',
    marginBottom: spacing.sm,
  },
  paidText: {
    fontSize: 14,
    color: 'var(--dabbu-text-secondary, #94A3B8)',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  undoBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  undoBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'var(--dabbu-accent, #8B5CF6)',
  },
  expiryText: {
    fontSize: 12,
    color: 'var(--dabbu-text-muted, #64748B)',
    textAlign: 'center',
  },
});
