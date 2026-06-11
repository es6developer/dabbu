'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  View,
  Text,
  StyleSheet,
  SafeView,
  MobileContainer,
  Card,
  PrimaryButton,
  GhostButton,
  Row,
  Spacer,
  palette,
  spacing,
  radii,
} from '@/rn';
import { useAuth } from '@/lib/auth-context';

const FEATURES = [
  {
    icon: '🪙',
    title: 'Smart Splits',
    description:
      'Split expenses equally, by percentage, or exact amounts. Real-time calculations for everyone.',
  },
  {
    icon: '✈️',
    title: 'Trip Friendly',
    description:
      "Perfect for group trips. Track who paid for what and settle up effortlessly when you're back.",
  },
  {
    icon: '✅',
    title: 'Easy Settlements',
    description:
      'See exactly who owes what and settle up with a tap. Track paid and pending amounts.',
  },
  {
    icon: '💬',
    title: 'Real-time Chat',
    description:
      'Discuss expenses and plans with built-in group chat. Messages, payments, and updates in one place.',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [inviteCode, setInviteCode] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.trim()) {
      router.push(`/invite/${inviteCode.trim()}`);
    }
  };

  return (
    <SafeView>
      <View style={s.wrapper as any}>
        {/* Nav */}
        <View style={s.nav as any}>
          <MobileContainer>
            <Row style={s.navRow}>
              <Row style={{ gap: 8 }}>
                <View style={s.logo}>
                  <Text style={s.logoText}>D</Text>
                </View>
                <Text style={s.brandText}>
                  Dabbu <Text style={{ color: palette.brand }}>Split</Text>
                </Text>
              </Row>
              <Row style={{ gap: 8 }}>
                {isAuthenticated ? (
                  <>
                    <Row style={s.userBadge as any}>
                      <View style={s.userAvatar}>
                        <Text style={s.userAvatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={s.userName}>{user?.name}</Text>
                    </Row>
                    <GhostButton
                      onPress={() => {
                        logout();
                        router.push('/');
                      }}
                    >
                      Sign Out
                    </GhostButton>
                  </>
                ) : (
                  <>
                    <GhostButton onPress={() => router.push('/auth')}>Sign In</GhostButton>
                    <PrimaryButton onPress={() => router.push('/auth')}>Get Started</PrimaryButton>
                  </>
                )}
              </Row>
            </Row>
          </MobileContainer>
        </View>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.glowOrb as any} />
          <MobileContainer>
            <View style={s.heroContent}>
              <Row style={s.badge as any}>
                <View style={s.pulseDot} />
                <Text style={{ fontSize: 13, color: palette.textSecondary }}>
                  No account required to join
                </Text>
              </Row>
              <Spacer size="lg" />
              <Text style={s.heroTitle}>
                Collaborative Finance,{'\n'}
                <Text style={s.gradientText as any}>Simplified</Text>
              </Text>
              <Spacer size="md" />
              <Text style={s.heroSubtitle}>
                Split expenses, manage group trips, and settle debts in real-time. Dabbu brings
                everyone together whether you have an account or not.
              </Text>
              <Spacer size="xl" />
              <form onSubmit={handleJoin} style={s.joinForm as any}>
                <View style={s.inputWrapper as any}>
                  <Text style={{ fontSize: 16 }}>🔑</Text>
                  <input
                    placeholder="Enter invite code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="invite-input"
                    style={s.input as any}
                  />
                </View>
                <PrimaryButton style={s.joinBtn}>Join Group</PrimaryButton>
              </form>
              <Spacer size="lg" />
              <Row style={{ justifyContent: 'center', gap: 16 }}>
                <Row style={{ marginRight: 8 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={[s.miniAvatar, { marginLeft: i > 1 ? -8 : 0 }]}>
                      <Text style={s.miniAvatarText}>{String.fromCharCode(64 + i)}</Text>
                    </View>
                  ))}
                </Row>
                <Text style={{ fontSize: 13, color: palette.textMuted }}>
                  <Text style={{ color: palette.textSecondary, fontWeight: '600' }}>2.4k+</Text>{' '}
                  active groups
                </Text>
              </Row>
            </View>
          </MobileContainer>
        </View>

        {/* Features */}
        <View style={s.features}>
          <MobileContainer>
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
              <Text style={s.sectionTitle}>
                Everything you need to <Text style={s.gradientText as any}>split together</Text>
              </Text>
              <Spacer size="sm" />
              <Text style={s.sectionSubtitle}>
                From weekend trips to shared households, Dabbu makes it effortless.
              </Text>
            </View>
            <View style={s.featureGrid as any}>
              {FEATURES.map((feature, i) => (
                <Card key={i} variant="elevated" style={s.featureCard}>
                  <Text style={{ fontSize: 28 }}>{feature.icon}</Text>
                  <Spacer size="md" />
                  <Text style={s.featureTitle}>{feature.title}</Text>
                  <Spacer size="xs" />
                  <Text style={s.featureDesc}>{feature.description}</Text>
                </Card>
              ))}
            </View>
          </MobileContainer>
        </View>

        {/* CTA */}
        <View style={s.cta}>
          <MobileContainer>
            <View style={s.gradientCard as any}>
              <Text style={s.ctaTitle}>
                Ready to simplify your <Text style={s.gradientText as any}>shared finances</Text>?
              </Text>
              <Spacer size="md" />
              <Text style={s.ctaSubtitle}>
                Invite friends, split expenses, and settle up. No sign-up required for guests.
              </Text>
              <Spacer size="xl" />
              <Row style={{ justifyContent: 'center', gap: 12 }}>
                <PrimaryButton style={{ minWidth: 200 }} onPress={() => router.push('/auth')}>
                  Create Your First Group
                </PrimaryButton>
              </Row>
            </View>
          </MobileContainer>
        </View>

        {/* Footer */}
        <View style={s.footer as any}>
          <MobileContainer>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Row style={{ gap: 8 }}>
                <View style={[s.logo, { width: 24, height: 24 }]}>
                  <Text style={[s.logoText, { fontSize: 11 }]}>D</Text>
                </View>
                <Text style={{ fontSize: 13, color: palette.textMuted }}>
                  Dabbu Split &copy; {new Date().getFullYear()}
                </Text>
              </Row>
              <Row style={{ gap: 20 }}>
                <Text style={{ fontSize: 13, color: palette.textMuted }}>Privacy</Text>
                <Text style={{ fontSize: 13, color: palette.textMuted }}>Terms</Text>
                <Text style={{ fontSize: 13, color: palette.textMuted }}>Support</Text>
              </Row>
            </Row>
          </MobileContainer>
        </View>
      </View>
    </SafeView>
  );
}

const s = StyleSheet.create({
  wrapper: {
    minHeight: '100%',
    flex: 1,
  },
  nav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(18, 18, 20, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  navRow: {
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: palette.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  brandText: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
  },
  userBadge: {
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: palette.brandLight,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.text,
  },
  hero: {
    paddingTop: 120,
    paddingBottom: 80,
    paddingHorizontal: spacing.lg,
  },
  glowOrb: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 600,
  },
  heroContent: {
    alignItems: 'center',
  },
  badge: {
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.success,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: palette.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 48,
  },
  gradientText: {
    fontWeight: '800',
  },
  heroSubtitle: {
    fontSize: 17,
    color: palette.textSecondary,
    textAlign: 'center',
    maxWidth: 520,
    lineHeight: 26,
  },
  joinForm: {
    flexDirection: 'row',
    gap: 12,
    maxWidth: 420,
    width: '100%',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    textAlign: 'center',
    letterSpacing: 3,
  },
  joinBtn: {
    minWidth: 120,
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: palette.bg,
    backgroundColor: palette.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    fontSize: 11,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  features: {
    paddingVertical: 80,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: palette.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: palette.textSecondary,
    textAlign: 'center',
    maxWidth: 500,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  featureCard: {
    width: '100%',
    maxWidth: 280,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  featureDesc: {
    fontSize: 14,
    color: palette.textSecondary,
    lineHeight: 21,
  },
  cta: {
    paddingVertical: 80,
    paddingHorizontal: spacing.lg,
  },
  gradientCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: palette.text,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 16,
    color: palette.textSecondary,
    textAlign: 'center',
    maxWidth: 480,
    lineHeight: 24,
  },
  footer: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
});
