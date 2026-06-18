# Dabbu V2 Rebuild — 8-Sprint Execution Plan

> Detailed per-sprint breakdowns with priorities, dependencies, and effort estimates are in:
> - `docs/phases/01-ia-audit.md` — Complete screen inventory, duplicates, dead features
> - `docs/phases/02-navigation-redesign.md` — Navigation tree, screen mapping, migration plan
> - `docs/phases/03-home-redesign.md` — Wireframes, component hierarchy, UI specs
> - `docs/phases/04-family-hub-merge.md` — Spaces+Circles merge strategy
> - `docs/phases/05-ai-redesign.md` — API contracts, prompt architecture, UX
> - `docs/phases/15-design-system.md` — Design tokens, SF Pro, glassmorphism, component library
> - `docs/phases/16-performance-audit.md` — Performance data & improvement plan
> - `docs/phases/17-execution-plan.md` — FULL per-sprint breakdown with task/dependency/effort matrix

## Sprint 1: Critical Fixes & Performance (2 weeks)

**Priority**: P0 — Must-do before any feature work.
**Key tasks**: Delete 65 dead screens (40% of code), remove 8 dead navigators, split SharedGroupDetailScreen (2011 lines), run bundle analysis, lazy-load heavy screens, normalize API response shapes, fix TypeScript errors.
**Screens impacted**: 65 deleted, 1 split, ~94 modified.
**Backend impact**: None.
**DB impact**: None.
**Effort**: ~10 days.
**See**: `docs/phases/17-execution-plan.md` (table 1.1-1.8)

---

## Sprint 2: Navigation & IA Polish (1 week)

**Priority**: P0 — Must-do after dead code removal.
**Key tasks**: Move BillScanner/BillsList/Subscriptions to WalletStack, wire CoupleDashboardScreen into FamilyHub, remove `{ params }` API pattern, consolidate auth screens (keep Premium variants).
**Screens impacted**: ~10 screens modified.
**Backend impact**: None.
**DB impact**: None.
**Effort**: ~4 days.
**See**: `docs/phases/02-navigation-redesign.md`, `docs/phases/17-execution-plan.md` (table 2.1-2.7)

---

## Sprint 3: Family Hub (1 week)

**Priority**: P1 — Core product feature.
**Key tasks**: Connect filter chips to API, add empty states per type, simplify SharedExpenseFormScreen (1149→500 lines), create `GET /family-hub/stats` endpoint, merge duplicate FamilyDashboardScreen/SettlementScreen exports.
**Screens impacted**: FamilyHub, SharedExpenseForm, CoupleDashboard, FamilyDashboard, Settlement.
**Backend impact**: 1 new endpoint.
**Effort**: ~5 days.
**See**: `docs/phases/04-family-hub-merge.md`, `docs/phases/17-execution-plan.md` (table 3.1-3.7)

---

## Sprint 4: AI Center (1 week)

**Priority**: P1 — Core product feature.
**Key tasks**: Wire PremiumAiPaywall to premium check, handle empty AI predictions gracefully, add AI narrative endpoint, anomaly detection UI.
**Screens impacted**: DabbuAI, Home, GoalDetail.
**Backend impact**: 1 new endpoint (narrative).
**Effort**: ~4 days.
**See**: `docs/phases/05-ai-redesign.md`, `docs/phases/17-execution-plan.md` (table 4.1-4.7)

---

## Sprint 5: Net Worth (1 week)

**Priority**: P1 — Core product feature.
**Key tasks**: Add historical trend chart, add gold/property/crypto fields (already done), weekly auto-save snapshot, month-over-month change badge.
**Screens impacted**: NetWorth.
**Backend impact**: Snapshot cron job.
**Effort**: ~3 days.
**See**: `docs/phases/17-execution-plan.md` (table 5.1-5.5)

---

## Sprint 6: Health Score (1 week)

**Priority**: P1 — Core product feature.
**Key tasks**: Add health score to FamilyHubScreen and DabbuAI Insights tab, historical trend (30-day chart), improvement suggestions based on component scores.
**Screens impacted**: HealthScore, FamilyHub, DabbuAI.
**Backend impact**: None (AiScore model already exists).
**Effort**: ~3 days.
**See**: `docs/phases/17-execution-plan.md` (table 6.1-6.6)

---

## Sprint 7: Premium (1 week)

**Priority**: P2 — Monetization.
**Key tasks**: Feature comparison table (Free vs Premium), yearly savings badge, UpgradeBanner on FinancialCenter/GoalsList/NetWorth, 7-day free trial, Family Plan tier (₹299/mo), conversion analytics.
**Screens impacted**: Premium, FinancialCenter, GoalsList, NetWorth, DabbuAI, Auth.
**Backend impact**: Trial logic, Family Plan.
**DB impact**: New premium_entitlements rows.
**Effort**: ~5 days.
**See**: `docs/phases/17-execution-plan.md` (table 7.1-7.7)

---

## Sprint 7: Design System & Consistency (blocked on Sprint 8 budget)

> **Note**: Design system work is deprioritised behind feature value. If time permits in Sprint 8, tackle in this order:
1. Create unified `tokens.ts` — single source of truth
2. Replace raw borderRadius (1,355 literals) with design tokens
3. Replace raw shadows (381 literals) with `shadows.sm/md/lg`
4. Merge FinButton.tsx + Button.tsx → AppButton
5. Add SF Pro font (iOS system font, no download needed)
**Effort**: ~10 days total.
**See**: `docs/phases/15-design-system.md`

---

## Sprint 8: Polish & Launch (1 week)

**Priority**: P0 — Release blocking.
**Key tasks**: Dark mode audit (94 screens), couple mode audit, ErrorBoundary wrappers, empty states, accessibility labels, animation consistency, performance benchmark, full QA regression, App Store screenshots.
**Screens impacted**: All 94 live screens.
**Backend impact**: None.
**Effort**: ~10 days.
**See**: `docs/phases/16-performance-audit.md`, `docs/phases/17-execution-plan.md` (table 8.1-8.9)

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| API response shape change breaks old screens | Medium | High | Wrapped/unwrapped pattern already used |
| Couple mode color scheme overrides break new screens | Low | Medium | Test all screens in couple-mode during Sprint 8 |
| Razorpay integration issues with new Family Plan | Low | High | Build toggle for fallback mode |
| User migration from old Spaces → Family Hub | Medium | Medium | Backfill migration script, grace period |
| `react-native-chart-kit` rendering perf with large data | Low | Medium | Set max data points, paginate if needed |

---

## Summary of Phases Completed This Session

| Phase | What Changed | Files Modified |
|-------|-------------|----------------|
| **1** | IA Audit: Screen inventory, duplicates, dead features, navigation report | `docs/phases/01-ia-audit.md` |
| **2** | Navigation redesign (4 tabs + FAB) + Navigation tree doc | `MainTabNavigator.tsx`, `FamilyHubNavigator.tsx`, `SettingsNavigator.tsx`, `docs/phases/02-navigation-redesign.md` |
| **3** | HomeScreen rewrite (1762→350 lines) + dashboard endpoint + wireframe doc | `HomeScreen.tsx`, `dashboard.module`, `docs/phases/03-home-redesign.md` |
| **4** | FamilyHub + shared-finance type filter + merge strategy doc | `FamilyHubScreen.tsx`, `shared-finance controller/service`, `docs/phases/04-family-hub-merge.md` |
| **5** | DabbuAI consolidation (16→1 screen) + API contracts + prompts doc | `DabbuAIScreen.tsx`, `docs/phases/05-ai-redesign.md` |
| **6** | CoupleDashboardScreen | `CoupleDashboardScreen.tsx` |
| **7** | HealthScoreScreen | `HealthScoreScreen.tsx` |
| **8** | NetWorth enhanced with stocks/mutualFunds/crypto | schema.prisma, net-worth.service.ts, dto, NetWorthScreen.tsx |
| **9** | EmergencyFundScreen + personal emergency fund module | `EmergencyFundScreen.tsx`, `emergency-fund.module/controller/service.ts` |
| **10** | Bill prediction consumed in DabbuAI Savings tab | — |
| **11** | Goals rebuilt with Ionicons (no emoji) + contribution flow | `GoalsListScreen.tsx`, `GoalDetailScreen.tsx` |
| **12** | FinancialCenter merging Reports+Analytics+AI | `FinancialCenterScreen.tsx`, `MainTabNavigator.tsx` |
| **13** | Onboarding with user-type branching + userType on User model | `OnboardingScreen.tsx`, schema.prisma, users.dto/service.ts |
| **14** | Premium strategy (already existed) | PremiumScreen, PremiumGuard, UpgradeBanner, etc. |
| **15** | Design system audit + fixes + GlassCard component + tokens doc | `tailwind.config.js`, `design.ts`, `docs/phases/15-design-system.md`, `GlassCard.tsx` |
| **16** | Performance audit + improvement plan | `docs/phases/16-performance-audit.md` |
| **17** | Detailed execution plan (8 sprints, full breakdown) | `docs/phases/17-execution-plan.md` |
