'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeView, MobileContainer,
  Card, PrimaryButton, GhostButton, Row, Spacer, spacing, radii,
} from '@/rn';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { api, type Group } from '@/lib/api';

const FEATURES = [
  { icon: '🪙', title: 'Smart Splits', desc: 'Split expenses equally, by percentage, or exact amounts. Real-time calculations for everyone.' },
  { icon: '✈️', title: 'Trip Friendly', desc: "Perfect for group trips. Track who paid for what and settle up effortlessly when you're back." },
  { icon: '✅', title: 'Easy Settlements', desc: 'See exactly who owes what and settle up with a tap. Track paid and pending amounts.' },
  { icon: '💬', title: 'Group Chat', desc: 'Discuss expenses and plans with built-in group chat. Messages, payments, and updates in one place.' },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setLoadingGroups(true);
      api.groups.listMyGroups()
        .then((res) => { setMyGroups(res.data || []); setLoadingGroups(false); })
        .catch(() => setLoadingGroups(false));
    }
  }, [isAuthenticated]);

  return (
    <SafeView>
      <View style={s.root}>
        <View style={[s.nav, { borderBottomColor: 'var(--dabbu-border)' }]}>
          <MobileContainer>
            <View style={s.navRow}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <View style={s.logo}><Text style={s.logoText}>D</Text></View>
                <Text style={[s.brandText, { color: 'var(--dabbu-text)' }]}>Dabbu <Text style={{ color: 'var(--dabbu-accent)' }}>Split</Text></Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TouchableOpacity onPress={toggleTheme} style={[s.themeBtn, { borderColor: 'var(--dabbu-border)' }]}>
                  <Text style={{ fontSize: 16 }}>{mode === 'dark' ? '☀️' : '🌙'}</Text>
                </TouchableOpacity>
                {isAuthenticated ? (
                  <>
                    <View style={[s.userBadge, { backgroundColor: 'var(--dabbu-surface2)', borderColor: 'var(--dabbu-border)' }]}>
                      <View style={s.userAvatar}><Text style={s.userAvatarText}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text></View>
                      <Text style={[s.userName, { color: 'var(--dabbu-text)' }]}>{user?.name}</Text>
                    </View>
                    <GhostButton onPress={() => { logout(); router.push('/'); }}>Sign Out</GhostButton>
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

        <View style={s.hero}>
          <MobileContainer>
            {isAuthenticated ? (
              <View style={s.heroContent}>
                <View style={[s.badge, { backgroundColor: 'var(--dabbu-surface2)', borderColor: 'var(--dabbu-border)' }]}>
                  <View style={[s.pulseDot, { backgroundColor: 'var(--dabbu-green)' }]} />
                  <Text style={{ fontSize: 13, color: 'var(--dabbu-text-secondary)' }}>Signed in as {user?.name}</Text>
                </View>
                <Spacer size="lg" />
                <Text style={[s.heroTitle, { color: 'var(--dabbu-text)' }]}>My <Text style={{ color: 'var(--dabbu-accent)' }}>Groups</Text></Text>
                <Spacer size="md" />
                {loadingGroups ? (
                  <View style={s.centerBox}>
                    <View style={[s.spinner, { borderColor: 'var(--dabbu-border)', borderTopColor: 'var(--dabbu-accent)' }]} />
                    <Spacer size="sm" />
                    <Text style={{ fontSize: 13, color: 'var(--dabbu-text-muted)' }}>Loading your groups...</Text>
                  </View>
                ) : myGroups.length === 0 ? (
                  <View style={s.centerBox}>
                    <Text style={[s.emptyTitle, { color: 'var(--dabbu-text-secondary)' }]}>No groups yet</Text>
                    <Spacer size="sm" />
                    <Text style={[s.emptyDesc, { color: 'var(--dabbu-text-muted)' }]}>Join with an invite code or create a new group.</Text>
                  </View>
                ) : (
                  <View style={s.groupList}>
                    {myGroups.map((g) => (
                      <TouchableOpacity key={g.id} style={[s.groupCard, { backgroundColor: 'var(--dabbu-surface)', borderColor: 'var(--dabbu-border)' }]} onPress={() => router.push(`/groups/${g.id}`)}>
                        <View style={s.groupIcon}><Text style={s.groupIconText}>{(g.name || 'G').charAt(0).toUpperCase()}</Text></View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.groupName, { color: 'var(--dabbu-text)' }]}>{g.name || 'Unnamed Group'}</Text>
                          <Text style={{ fontSize: 13, color: 'var(--dabbu-text-muted)' }}>{g.memberCount || 0} member{(g.memberCount || 0) !== 1 ? 's' : ''}</Text>
                        </View>
                        <Text style={{ fontSize: 14, color: 'var(--dabbu-text-muted)' }}>→</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={s.heroContent}>
                <View style={[s.badge, { backgroundColor: 'var(--dabbu-surface2)', borderColor: 'var(--dabbu-border)' }]}>
                  <View style={[s.pulseDot, { backgroundColor: 'var(--dabbu-green)' }]} />
                  <Text style={{ fontSize: 13, color: 'var(--dabbu-text-secondary)' }}>No account required to join</Text>
                </View>
                <Spacer size="lg" />
                <Text style={[s.heroTitle, { color: 'var(--dabbu-text)' }]}>
                  Collaborative Finance,{'\n'}
                  <Text style={{ color: 'var(--dabbu-accent)' }}>Simplified</Text>
                </Text>
                <Spacer size="md" />
                <Text style={[s.heroSub, { color: 'var(--dabbu-text-secondary)' }]}>
                  Split expenses, manage group trips, and settle debts in real-time. Dabbu brings everyone together whether you have an account or not.
                </Text>
                <Spacer size="lg" />
                <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
                  <PrimaryButton onPress={() => router.push('/auth')}>Create Your First Group</PrimaryButton>
                  <GhostButton onPress={() => router.push('/auth')}>Join Existing</GhostButton>
                </View>
                <Spacer size="lg" />
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                  <View style={{ flexDirection: 'row' }}>
                    {[1, 2, 3, 4].map((i) => (
                      <View key={i} style={[s.miniAvatar, { borderColor: 'var(--dabbu-bg)', backgroundColor: 'var(--dabbu-surface2)' }, i > 1 && { marginLeft: -8 }]}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: 'var(--dabbu-text-muted)' }}>{String.fromCharCode(64 + i)}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={{ fontSize: 13, color: 'var(--dabbu-text-muted)' }}><Text style={{ color: 'var(--dabbu-text-secondary)', fontWeight: '600' }}>2.4k+</Text> active groups</Text>
                </View>
              </View>
            )}
          </MobileContainer>
        </View>

        <View style={s.features}>
          <MobileContainer>
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
              <Text style={[s.sectionTitle, { color: 'var(--dabbu-text)' }]}>Everything you need to <Text style={{ color: 'var(--dabbu-accent)' }}>split together</Text></Text>
              <Spacer size="sm" />
              <Text style={[s.sectionSub, { color: 'var(--dabbu-text-secondary)' }]}>From weekend trips to shared households, Dabbu makes it effortless.</Text>
            </View>
            <View style={s.featureGrid}>
              {FEATURES.map((feature, i) => (
                <Card key={i} style={s.featureCard}>
                  <Text style={{ fontSize: 28 }}>{feature.icon}</Text>
                  <Spacer size="md" />
                  <Text style={[s.featureTitle, { color: 'var(--dabbu-text)' }]}>{feature.title}</Text>
                  <Spacer size="xs" />
                  <Text style={[s.featureDesc, { color: 'var(--dabbu-text-secondary)' }]}>{feature.desc}</Text>
                </Card>
              ))}
            </View>
          </MobileContainer>
        </View>

        <View style={s.cta}>
          <MobileContainer>
            <View style={[s.ctaCard, { backgroundColor: 'var(--dabbu-surface)', borderColor: 'var(--dabbu-border)' }]}>
              <Text style={[s.ctaTitle, { color: 'var(--dabbu-text)' }]}>Ready to simplify your <Text style={{ color: 'var(--dabbu-accent)' }}>shared finances</Text>?</Text>
              <Spacer size="md" />
              <Text style={[s.ctaSub, { color: 'var(--dabbu-text-secondary)' }]}>Invite friends, split expenses, and settle up. No sign-up required for guests.</Text>
              <Spacer size="xl" />
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
                <PrimaryButton onPress={() => router.push('/auth')}>Create Your First Group</PrimaryButton>
              </View>
            </View>
          </MobileContainer>
        </View>

        <View style={[s.footer, { borderTopColor: 'var(--dabbu-border)' }]}>
          <MobileContainer>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <View style={[s.logo, { width: 24, height: 24 }]}><Text style={[s.logoText, { fontSize: 11 }]}>D</Text></View>
                <Text style={{ fontSize: 13, color: 'var(--dabbu-text-muted)' }}>Dabbu Split &copy; {new Date().getFullYear()}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 20 }}>
                <Text style={{ fontSize: 13, color: 'var(--dabbu-text-muted)' }}>Privacy</Text>
                <Text style={{ fontSize: 13, color: 'var(--dabbu-text-muted)' }}>Terms</Text>
                <Text style={{ fontSize: 13, color: 'var(--dabbu-text-muted)' }}>Support</Text>
              </View>
            </View>
          </MobileContainer>
        </View>
      </View>
    </SafeView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'var(--dabbu-bg)' },
  nav: { borderBottomWidth: 1, backgroundColor: 'var(--dabbu-nav-bg)', backdropFilter: 'saturate(180%) blur(20px)' } as any,
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 56, paddingHorizontal: spacing.lg },
  logo: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'var(--dabbu-accent)', justifyContent: 'center', alignItems: 'center' },
  logoText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  brandText: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  themeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: 'var(--dabbu-surface2)' },
  userBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4, paddingRight: 12, borderRadius: 20, borderWidth: 1 },
  userAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'var(--dabbu-accent)', justifyContent: 'center', alignItems: 'center' },
  userAvatarText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  userName: { fontSize: 13, fontWeight: '600' },
  hero: { paddingVertical: 60, paddingHorizontal: spacing.lg },
  heroContent: { maxWidth: 600, margin: '0 auto' as any },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, alignSelf: 'center' },
  pulseDot: { width: 8, height: 8, borderRadius: 4 },
  heroTitle: { fontSize: 36, fontWeight: '700', letterSpacing: -0.5, lineHeight: 42, textAlign: 'center' },
  heroSub: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  centerBox: { alignItems: 'center', paddingVertical: 40 },
  spinner: { width: 24, height: 24, borderRadius: 12, borderWidth: 3 },
  emptyTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  emptyDesc: { fontSize: 14, textAlign: 'center' },
  groupList: { gap: 8 },
  groupCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  groupIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'var(--dabbu-accent)', justifyContent: 'center', alignItems: 'center' },
  groupIconText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  groupName: { fontSize: 16, fontWeight: '600' },
  miniAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  features: { paddingVertical: 60, paddingHorizontal: spacing.lg },
  sectionTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },
  sectionSub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureCard: { width: 'calc(50% - 6px)' as any, padding: 20, marginBottom: 0 },
  featureTitle: { fontSize: 17, fontWeight: '600' },
  featureDesc: { fontSize: 13, lineHeight: 20 },
  cta: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  ctaCard: { padding: 36, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  ctaTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },
  ctaSub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  footer: { padding: spacing.lg, paddingBottom: spacing.xxxl, borderTopWidth: 1 },
});
