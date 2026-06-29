'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { View, Text, TouchableOpacity, Card, Row, StyleSheet, spacing, radii } from '@/rn';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
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
      <View style={s.centered}>
        <View style={s.loader}>
          <Text style={s.loaderText}>D</Text>
        </View>
        <View
          style={{
            width: 192,
            height: 12,
            borderRadius: radii.sm,
            backgroundColor: 'var(--dabbu-surface2)',
          }}
        />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={s.centered}>
        <Card style={{ width: '100%', maxWidth: 400, alignItems: 'center', padding: spacing.xxl }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: 'var(--dabbu-errorBg)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: '700', color: 'var(--dabbu-red)' }}>!</Text>
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: 'var(--dabbu-text)',
              textAlign: 'center',
              marginVertical: spacing.lg,
            }}
          >
            Payment Link Expired
          </Text>
          <Text style={{ fontSize: 14, color: 'var(--dabbu-text-secondary)', textAlign: 'center' }}>
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
      await api.settlements.guestPayNow(token);
      toast.success('Payment recorded successfully!');
      setPaid(true);
    } catch {
      toast.error('Failed to record payment. Please try again.');
    }
    setPaying(false);
  };

  return (
    <View style={s.centered}>
      <View style={{ width: '100%', maxWidth: 400 }}>
        <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radii.xl,
              backgroundColor: 'var(--dabbu-accent)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#FFF' }}>D</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: 'var(--dabbu-text)' }}>
            {data.groupName}
          </Text>
          <Text style={{ fontSize: 14, color: 'var(--dabbu-text-muted)', marginTop: spacing.xs }}>
            Payment Request
          </Text>
        </View>

        <Card
          style={{ alignItems: 'center', paddingVertical: spacing.xxl, marginBottom: spacing.lg }}
        >
          <Text
            style={{ fontSize: 14, color: 'var(--dabbu-text-secondary)', marginBottom: spacing.sm }}
          >
            You owe
          </Text>
          <Text
            style={{
              fontSize: 40,
              fontWeight: '700',
              color: 'var(--dabbu-red)',
              letterSpacing: -1,
            }}
          >
            {formatCurrency(data.amount)}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: 'var(--dabbu-text-secondary)',
              marginTop: spacing.xs,
              marginBottom: spacing.lg,
            }}
          >
            to {data.to}
          </Text>
          <Row
            style={{
              gap: spacing.sm,
              paddingTop: spacing.lg,
              borderTopWidth: 1,
              borderTopColor: 'var(--dabbu-border)',
            }}
          >
            <Text style={{ fontSize: 12, color: 'var(--dabbu-text-muted)' }}>
              From: {data.from}
            </Text>
            <Text style={{ fontSize: 12, color: 'var(--dabbu-text-muted)' }}>·</Text>
            <Text style={{ fontSize: 12, color: 'var(--dabbu-text-muted)' }}>
              Group: {data.groupName}
            </Text>
          </Row>
        </Card>

        {!paid ? (
          <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
            <TouchableOpacity style={s.payBtn} onPress={handlePay} disabled={paying}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFF' }}>
                {paying ? 'Opening UPI...' : 'Pay Now via UPI'}
              </Text>
            </TouchableOpacity>
            <Row style={{ gap: spacing.md }}>
              <TouchableOpacity
                style={s.secBtn}
                onPress={async () => {
                  await navigator.clipboard.writeText(data.upiLink);
                  toast.success('UPI link copied!');
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '500', color: 'var(--dabbu-text)' }}>
                  Copy UPI Link
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.secBtn}
                onPress={async () => {
                  try {
                    await api.settlements.guestPayNow(token);
                    toast.success('Payment recorded successfully!');
                    setPaid(true);
                  } catch {
                    toast.error('Failed to record payment.');
                  }
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '500', color: 'var(--dabbu-text)' }}>
                  Mark as Paid
                </Text>
              </TouchableOpacity>
            </Row>
          </View>
        ) : (
          <Card style={{ alignItems: 'center', padding: spacing.xxl, marginBottom: spacing.lg }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'var(--dabbu-successBg)',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: spacing.md,
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: '700', color: 'var(--dabbu-green)' }}>
                ✓
              </Text>
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: 'var(--dabbu-text)',
                marginBottom: spacing.sm,
              }}
            >
              Payment Recorded
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: 'var(--dabbu-text-secondary)',
                textAlign: 'center',
                marginBottom: spacing.lg,
              }}
            >
              Your payment of {formatCurrency(data.amount)} has been recorded. The receiver will
              confirm shortly.
            </Text>
            <TouchableOpacity onPress={() => setPaid(false)}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: 'var(--dabbu-accent)' }}>
                Made a mistake? Undo
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        <Text style={{ fontSize: 12, color: 'var(--dabbu-text-muted)', textAlign: 'center' }}>
          This link will expire on {new Date(data.expiresAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'var(--dabbu-bg)',
  },
  loader: {
    width: 48,
    height: 48,
    borderRadius: radii.xl,
    backgroundColor: 'var(--dabbu-accent)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  loaderText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  payBtn: {
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: 'var(--dabbu-accent)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secBtn: {
    flex: 1,
    height: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'var(--dabbu-border)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
