'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeView,
  MobileContainer,
  Card,
  PrimaryButton,
  GhostButton,
  Row,
  Spacer,
  spacing,
  radii,
} from '@/rn';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { api, type Group } from '@/lib/api';

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
  const { mode, toggleTheme, palette } = useTheme();
  const [inviteCode, setInviteCode] = useState('');
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setLoadingGroups(true);
      api.groups
        .listMyGroups()
        .then((res) => {
          setMyGroups(res.data || []);
          setLoadingGroups(false);
        })
        .catch(() => setLoadingGroups(false));
    }
  }, [isAuthenticated]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.trim()) {
      router.push(`/invite/${inviteCode.trim()}`);
    }
  };

  const themeBtn = {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.surface2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: palette.border,
  };

  return (
    <SafeView>
      <View style={s.wrapper}>
        {/* Nav */}
        <View
          style={[s.nav, { backgroundColor: palette.navBg, borderBottomColor: palette.navBorder }]}
        >
          <MobileContainer>
            <View style={s.navRow}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={s.logo}>
                  <Text style={s.logoText}>D</Text>
                </View>
                <Text style={[s.brandText, { color: palette.text }]}>
                  Dabbu <Text style={{ color: palette.brand }}>Split</Text>
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={toggleTheme} style={themeBtn}>
                  <Text style={{ fontSize: 16 }}>{mode === 'dark' ? '☀️' : '🌙'}</Text>
                </TouchableOpacity>
                {isAuthenticated ? (
                  <>
                    <View
                      style={[
                        s.userBadge,
                        { backgroundColor: palette.brandLight, borderColor: palette.brandLine },
                      ]}
                    >
                      <View style={s.userAvatar}>
                        <Text style={s.userAvatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={[s.userName, { color: palette.text }]}>{user?.name}</Text>
                    </View>
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
              </View>
            </View>
          </MobileContainer>
        </View>

        {/* Hero / My Groups */}
        <View style={[s.hero, { paddingHorizontal: spacing.lg }]}>
          <View style={s.glowOrb} />
          <MobileContainer>
            {isAuthenticated ? (
              <View style={s.heroContent}>
                <View
                  style={[
                    s.badge,
                    { borderColor: palette.border, backgroundColor: palette.surface },
                  ]}
                >
                  <View style={[s.pulseDot, { backgroundColor: palette.success }]} />
                  <Text style={{ fontSize: 13, color: palette.textSecondary }}>
                    Signed in as {user?.name}
                  </Text>
                </View>
                <Spacer size="lg" />
                <Text style={[s.heroTitle, { color: palette.text }]}>
                  My <Text style={{ color: palette.brand }}>Groups</Text>
                </Text>
                <Spacer size="md" />
                {loadingGroups ? (
                  <View style={s.centerBox}>
                    <View
                      style={[
                        s.spinner,
                        { borderColor: palette.border, borderTopColor: palette.brand },
                      ]}
                    />
                    <Spacer size="sm" />
                    <Text style={{ fontSize: 13, color: palette.textMuted }}>
                      Loading your groups...
                    </Text>
                  </View>
                ) : myGroups.length === 0 ? (
                  <View style={s.centerBox}>
                    <Text
                      style={{ fontSize: 15, color: palette.textSecondary, textAlign: 'center' }}
                    >
                      You haven&apos;t joined any groups yet.
                    </Text>
                    <Spacer size="md" />
                    <Text style={{ fontSize: 13, color: palette.textMuted, textAlign: 'center' }}>
                      Join with an invite code below or create a new group.
                    </Text>
                  </View>
                ) : (
                  <View style={s.groupList}>
                    {myGroups.map((g) => (
                      <TouchableOpacity
                        key={g.id}
                        style={[
                          s.groupCard,
                          { backgroundColor: palette.surface, borderColor: palette.border },
                        ]}
                        onPress={() => router.push(`/groups/${g.id}`)}
                      >
                        <View style={s.groupIcon}>
                          <Text style={s.groupIconText}>{g.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.groupName, { color: palette.text }]}>{g.name}</Text>
                          <Text style={[s.groupMeta, { color: palette.textMuted }]}>
                            {g.memberCount} member{g.memberCount !== 1 ? 's' : ''} ·{' '}
                            {g.role === 'admin' ? 'Owner' : 'Member'}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: palette.textMuted }}>▸</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <Spacer size="lg" />
                <View
                  style={[
                    s.inviteSection,
                    { backgroundColor: palette.surface, borderColor: palette.border },
                  ]}
                >
                  <Text style={[s.inviteLabel, { color: palette.textSecondary }]}>
                    Have an invite code?
                  </Text>
                  <form onSubmit={handleJoin} style={s.joinForm}>
                    <View
                      style={[
                        s.inputWrapper,
                        { backgroundColor: palette.surface2, borderColor: palette.border },
                      ]}
                    >
                      <Text style={{ fontSize: 16 }}>🔑</Text>
                      <input
                        placeholder="Enter invite code"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        className="invite-input"
                        style={[s.input, { color: palette.text }] as any}
                      />
                    </View>
                    <PrimaryButton style={s.joinBtn}>Join Group</PrimaryButton>
                  </form>
                </View>
              </View>
            ) : (
              <View style={s.heroContent}>
                <View
                  style={[
                    s.badge,
                    { borderColor: palette.border, backgroundColor: palette.surface },
                  ]}
                >
                  <View style={s.pulseDot} />
                  <Text style={{ fontSize: 13, color: palette.textSecondary }}>
                    No account required to join
                  </Text>
                </View>
                <Spacer size="lg" />
                <Text style={[s.heroTitle, { color: palette.text }]}>
                  Collaborative Finance,{'\n'}
                  <Text style={{ color: palette.brand }}>Simplified</Text>
                </Text>
                <Spacer size="md" />
                <Text style={[s.heroSubtitle, { color: palette.textSecondary }]}>
                  Split expenses, manage group trips, and settle debts in real-time. Dabbu brings
                  everyone together whether you have an account or not.
                </Text>
                <Spacer size="xl" />
                <form onSubmit={handleJoin} style={s.joinForm}>
                  <View
                    style={[
                      s.inputWrapper,
                      { backgroundColor: palette.surface2, borderColor: palette.border },
                    ]}
                  >
                    <Text style={{ fontSize: 16 }}>🔑</Text>
                    <input
                      placeholder="Enter invite code"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="invite-input"
                      style={[s.input, { color: palette.text }] as any}
                    />
                  </View>
                  <PrimaryButton style={s.joinBtn}>Join Group</PrimaryButton>
                </form>
                <Spacer size="lg" />
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
                  <View style={{ flexDirection: 'row', marginRight: 8 }}>
                    {[1, 2, 3, 4].map((i) => (
                      <View
                        key={i}
                        style={[
                          s.miniAvatar,
                          { borderColor: palette.bg, backgroundColor: palette.surface2 },
                          i > 1 && { marginLeft: -8 },
                        ]}
                      >
                        <Text style={[s.miniAvatarText, { color: palette.textSecondary }]}>
                          {String.fromCharCode(64 + i)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text style={{ fontSize: 13, color: palette.textMuted }}>
                    <Text style={{ color: palette.textSecondary, fontWeight: '600' }}>2.4k+</Text>{' '}
                    active groups
                  </Text>
                </View>
              </View>
            )}
          </MobileContainer>
        </View>

        {/* Features (always show) */}
        <View style={[s.features, { paddingHorizontal: spacing.lg }]}>
          <MobileContainer>
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
              <Text style={[s.sectionTitle, { color: palette.text }]}>
                Everything you need to <Text style={{ color: palette.brand }}>split together</Text>
              </Text>
              <Spacer size="sm" />
              <Text style={[s.sectionSubtitle, { color: palette.textSecondary }]}>
                From weekend trips to shared households, Dabbu makes it effortless.
              </Text>
            </View>
            <View style={s.featureGrid}>
              {FEATURES.map((feature, i) => (
                <Card key={i} variant="elevated" style={s.featureCard}>
                  <Text style={{ fontSize: 28 }}>{feature.icon}</Text>
                  <Spacer size="md" />
                  <Text style={[s.featureTitle, { color: palette.text }]}>{feature.title}</Text>
                  <Spacer size="xs" />
                  <Text style={[s.featureDesc, { color: palette.textSecondary }]}>
                    {feature.description}
                  </Text>
                </Card>
              ))}
            </View>
          </MobileContainer>
        </View>

        {/* CTA */}
        <View style={[s.cta, { paddingHorizontal: spacing.lg }]}>
          <MobileContainer>
            <View
              style={[
                s.gradientCard,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <Text style={[s.ctaTitle, { color: palette.text }]}>
                Ready to simplify your <Text style={{ color: palette.brand }}>shared finances</Text>
                ?
              </Text>
              <Spacer size="md" />
              <Text style={[s.ctaSubtitle, { color: palette.textSecondary }]}>
                Invite friends, split expenses, and settle up. No sign-up required for guests.
              </Text>
              <Spacer size="xl" />
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
                <PrimaryButton style={{ minWidth: 200 }} onPress={() => router.push('/auth')}>
                  Create Your First Group
                </PrimaryButton>
              </View>
            </View>
          </MobileContainer>
        </View>

        {/* Footer */}
        <View style={[s.footer, { borderTopColor: palette.border }]}>
          <MobileContainer>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={[s.logo, { width: 24, height: 24 }]}>
                  <Text style={[s.logoText, { fontSize: 11 }]}>D</Text>
                </View>
                <Text style={{ fontSize: 13, color: palette.textMuted }}>
                  Dabbu Split &copy; {new Date().getFullYear()}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 20 }}>
                <Text style={{ fontSize: 13, color: palette.textMuted }}>Privacy</Text>
                <Text style={{ fontSize: 13, color: palette.textMuted }}>Terms</Text>
                <Text style={{ fontSize: 13, color: palette.textMuted }}>Support</Text>
              </View>
            </View>
          </MobileContainer>
        </View>
      </View>
    </SafeView>
  );
}

const s = StyleSheet.create({
  wrapper: { minHeight: '100%', flex: 1 },
  nav: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, borderBottomWidth: 1 },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  brandText: { fontSize: 16, fontWeight: '700' },
  userBadge: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  userName: { fontSize: 13, fontWeight: '600' },
  hero: { paddingTop: 120, paddingBottom: 80 },
  glowOrb: { position: 'absolute', left: 0, right: 0, top: 0, height: 600 },
  heroContent: { alignItems: 'center' },
  badge: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  heroTitle: {
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 48,
  },
  heroSubtitle: { fontSize: 17, textAlign: 'center', maxWidth: 520, lineHeight: 26 },
  joinForm: { flexDirection: 'row', gap: 12, maxWidth: 420, width: '100%' },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    gap: 8,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 3,
    backgroundColor: 'transparent',
  },
  joinBtn: { minWidth: 120 },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: { fontSize: 11, fontWeight: '600' },
  features: { paddingVertical: 80 },
  sectionTitle: { fontSize: 32, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 16, textAlign: 'center', maxWidth: 500 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  featureCard: { width: '100%', maxWidth: 280 },
  featureTitle: { fontSize: 18, fontWeight: '700' },
  featureDesc: { fontSize: 14, lineHeight: 21 },
  cta: { paddingVertical: 80 },
  gradientCard: {
    borderRadius: radii.xxl,
    borderWidth: 1,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  ctaTitle: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  ctaSubtitle: { fontSize: 16, textAlign: 'center', maxWidth: 480, lineHeight: 24 },
  footer: { paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, borderTopWidth: 1 },
  groupList: { width: '100%', maxWidth: 420, gap: 8 },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupIconText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  groupName: { fontSize: 15, fontWeight: '600' },
  groupMeta: { fontSize: 12, marginTop: 2 },
  spinner: { width: 32, height: 32, borderRadius: 16, borderWidth: 3 },
  centerBox: { alignItems: 'center', paddingVertical: 32 },
  inviteSection: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
  },
  inviteLabel: { fontSize: 13, fontWeight: '600', marginBottom: spacing.md },
});
