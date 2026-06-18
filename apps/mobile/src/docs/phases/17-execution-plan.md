# Phase 17 — Final Execution Plan

## Sprint 1: Critical Fixes & Performance (2 weeks)

**Goal**: Zero compilation errors, fast cold start, no dead code.

| # | Task | Priority | Dependencies | Screens | Backend | Frontend | DB | Effort |
|:-|:-----|:--------:|:------------|:--------|:--------|:---------|:---|:------:|
| 1.1 | Delete 65 dead screens | P0 | None | All 65 dead files | None | Remove files, clean imports | None | 2d |
| 1.2 | Remove dead navigators (Accounts, Goals, Circles, SharedFinance, CoupleSpace, Family, Chat, ExpenseTab) | P0 | 1.1 | None | None | Delete 8 navigator files, re-route | None | 1d |
| 1.3 | Split SharedGroupDetailScreen (2011→3 files: DetailHeader, AnalyticsTab, MembersTab) | P0 | None | SharedGroupDetail | None | New 3 components | None | 2d |
| 1.4 | Run `npx expo export --dump-sourcemap` | P1 | None | None | None | Measure current bundle | None | 4h |
| 1.5 | Remove unused npm packages (audit package.json) | P1 | None | None | None | npm uninstall | None | 1d |
| 1.6 | Add `React.lazy` + `Suspense` for BillScanner, SharedExpenseForm | P1 | None | BillScanner, SharedExpenseForm | None | Lazy imports | None | 1d |
| 1.7 | Normalize API response shapes across all screens | P1 | None | Home, Goals, FinancialCenter, Couple | None | Add normalization helpers | None | 2d |
| 1.8 | TypeScript strict-mode fixes | P2 | None | All | None | Fix `any` types | None | 2d |

**Screens Impacted**: 65 deleted, 1 split, ~94 modified
**Backend Impact**: None
**Database Impact**: None
**Total Effort**: ~10 days

---

## Sprint 2: Navigation & IA Polish (1 week)

**Goal**: Clean navigation tree, every screen within 2 taps, no dead routes.

| # | Task | Priority | Dependencies | Screens | Backend | Frontend | DB | Effort |
|:-|:-----|:--------:|:------------|:--------|:--------|:---------|:---|:------:|
| 2.1 | Move BillScanner, BillsList, Subscriptions to WalletStack | P0 | 1.2 | BillScanner, BillsList, Subscription | None | Add to WalletNavigator, remove from old | None | 4h |
| 2.2 | Wire CoupleDashboardScreen into FamilyHub navigator | P1 | None | CoupleDashboard | None | Add route + navigate | None | 2h |
| 2.3 | Remove `{ params }` pattern from all API calls (use URL strings) | P1 | None | Transactions, Bills, SharedFinance | None | Search & replace | None | 1d |
| 2.4 | Add iosTransitionOptions to all Stack screens | P2 | None | All | None | Already done | None | 0h |
| 2.5 | Finalise FAB QuickActionSheet actions | P2 | None | Home, Wallet, Family | None | Add Financial Center, Net Worth | None | 2h |
| 2.6 | Remove old Circle/Space entry points (FAB, Profile) | P2 | 2.2 | FamilyHub | None | Route all → Family Hub | None | 2h |
| 2.7 | Consolidate Auth screens (keep Premium variants only) | P2 | 1.1 | Login, Signup, OtpVerification, PremiumAuth | None | Delete 4 files | None | 1d |

**Screens Impacted**: ~10 screens modified navigators
**Backend Impact**: None
**Database Impact**: None
**Total Effort**: ~4 days

---

## Sprint 3: Family Hub (1 week)

**Goal**: Unified Family Hub with 4 filters + seamless couple/family/friends/trip experience.

| # | Task | Priority | Dependencies | Screens | Backend | Frontend | DB | Effort |
|:-|:-----|:--------:|:------------|:--------|:--------|:---------|:---|:------:|
| 3.1 | FamilyHubScreen — connect filter chips to API | P0 | None | FamilyHub | None | Add type param to GET groups | None | 4h |
| 3.2 | FamilyHub empty states per filter | P1 | None | FamilyHub | None | Emoji + message per type | None | 4h |
| 3.3 | SharedExpenseFormScreen simplify (1149 lines→500) | P1 | 1.4 | SharedExpenseForm | None | Remove dead variants | None | 1d |
| 3.4 | Add `GET /family-hub/stats` backend endpoint | P1 | None | FamilyHub | New endpoint | Call on mount | None | 4h |
| 3.5 | CoupleDashboardScreen wire to FamilyHub | P1 | 2.2 | CoupleDashboard | None | Add to FamilyHubStack | None | 2h |
| 3.6 | Merge duplicate FamilyDashboardScreen and SettlementScreen exports | P2 | None | FamilyDashboard, Settlement | None | Rename exports | None | 4h |
| 3.7 | Family Hub notifications (push for settlements) | P2 | None | None | Notification service | None | None | 1d |

**Screens Impacted**: FamilyHub, SharedExpenseForm, CoupleDashboard, FamilyDashboard, Settlement
**Backend Impact**: 1 new endpoint
**Database Impact**: None
**Total Effort**: ~5 days

---

## Sprint 4: AI Center (1 week)

**Goal**: DabbuAI is the single AI destination; AI appears contextually throughout the app.

| # | Task | Priority | Dependencies | Screens | Backend | Frontend | DB | Effort |
|:-|:-----|:--------:|:------------|:--------|:--------|:---------|:---|:------:|
| 4.1 | DabbuAIScreen — finalise 4 tabs | P0 | None | DabbuAI | None | Already done | None | 0h |
| 4.2 | PremiumAiPaywallScreen — wire to premium check | P1 | None | DabbuAI | None | Gate premium INSIGHTS tab | None | 4h |
| 4.3 | HomeScreen AI insight — contextual message | P1 | None | Home | None | Already wired via `/dashboard` | None | 0h |
| 4.4 | GoalDetailScreen AI forecast — handle empty prediction | P2 | None | GoalDetail | Fix 404 | Graceful fallback | None | 2h |
| 4.5 | AI prompt architecture doc (for future LLM) | P2 | None | None | None | Doc written | None | 1d |
| 4.6 | AI narrative endpoint `GET /ai/narrative` | P2 | None | Home, DabbuAI | Add endpoint | Consume | None | 1d |
| 4.7 | Anomaly detection UI in Insights tab | P3 | None | DabbuAI | Already exists | Consume anomalies | None | 1d |

**Screens Impacted**: DabbuAI, Home, GoalDetail
**Backend Impact**: 1 new endpoint (narrative)
**Database Impact**: None
**Total Effort**: ~4 days

---

## Sprint 5: Net Worth (1 week)

**Goal**: Complete net worth with all assets/liabilities, historical trend, and incremental tracking.

| # | Task | Priority | Dependencies | Screens | Backend | Frontend | DB | Effort |
|:-|:-----|:--------:|:------------|:--------|:--------|:---------|:---|:------:|
| 5.1 | NetWorthScreen — verify all 8 asset + 4 liability fields | P0 | None | NetWorth | Schema already extended | Already done | ✅ Done | 0h |
| 5.2 | Net worth historical trend chart | P1 | None | NetWorth | NetWorthSnapshot model exists | Add LineChart | None | 1d |
| 5.3 | Add gold, property, crypto to net worth form | P1 | None | NetWorth | DTO/schema done | Already done | ✅ Done | 0h |
| 5.4 | Net worth snapshot — weekly auto-save | P2 | None | None | Cron job | None | None | 1d |
| 5.5 | Net worth insights — month-over-month change | P2 | None | NetWorth | Add percent change calc | Show trend badge | None | 4h |

**Screens Impacted**: NetWorth
**Backend Impact**: Snapshot cron job
**Database Impact**: NetWorthSnapshot model exists
**Total Effort**: ~3 days

---

## Sprint 6: Health Score (1 week)

**Goal**: Health score as a trusted, actionable metric visible across the app.

| # | Task | Priority | Dependencies | Screens | Backend | Frontend | DB | Effort |
|:-|:-----|:--------:|:------------|:--------|:--------|:---------|:---|:------:|
| 6.1 | HealthScoreScreen — finalise 6-component breakdown | P0 | None | HealthScore | Already exists | Already done | ✅ Done | 0h |
| 6.2 | Add health score to FamilyHubScreen | P1 | None | FamilyHub | None | Show score ring | None | 4h |
| 6.3 | Add health score to DabbuAI Insights tab | P1 | None | DabbuAI | None | Score badge | None | 4h |
| 6.4 | Health score historical trend (30-day chart) | P2 | None | HealthScore | AiScore model has createdAt | Add LineChart | None | 1d |
| 6.5 | Health score improvement suggestions | P2 | None | HealthScore | AiScore has components | Show per-component tips | None | 1d |
| 6.6 | Monthly change indicator (↑2 pts) | P2 | None | HealthScore | Already in response | Show Δ badge | ✅ Done | 0h |

**Screens Impacted**: HealthScore, FamilyHub, DabbuAI
**Backend Impact**: None (AiScore model already has data)
**Database Impact**: None
**Total Effort**: ~3 days

---

## Sprint 7: Premium (1 week)

**Goal**: Clear premium value prop, strategic upsells, conversion flow.

| # | Task | Priority | Dependencies | Screens | Backend | Frontend | DB | Effort |
|:-|:-----|:--------:|:------------|:--------|:--------|:---------|:---|:------:|
| 7.1 | PremiumScreen — feature comparison table (Free vs Premium) | P0 | None | Premium | Plans exist | Add comparison grid | None | 1d |
| 7.2 | PremiumScreen — yearly vs monthly savings badge | P1 | None | Premium | Plans exist | Calculate savings | None | 4h |
| 7.3 | UpgradeBanner — add to FinancialCenter, GoalsList, NetWorth | P1 | None | FinancialCenter, GoalsList, NetWorth | None | Add UpgradeBanner | None | 1d |
| 7.4 | PremiumAiPaywall — connect to DabbuAI premium tabs | P1 | None | DabbuAI | None | Gate with isPremium | None | 4h |
| 7.5 | Start 7-day free trial on signup | P2 | None | Auth | PremiumService.startTrial() | None | None | 2d |
| 7.6 | Premium analytics — track conversion funnel | P2 | None | None | Analytics tracking | Event emit | None | 1d |
| 7.7 | Family Plan tier (₹299/mo, 5 accounts) | P3 | None | Premium | New Razorpay plan + entitlement | Show in plan list | New DB rows | 2d |

**Screens Impacted**: Premium, FinancialCenter, GoalsList, NetWorth, DabbuAI, Auth
**Backend Impact**: Trial logic, Family Plan
**Database Impact**: premium_entitlements table exists
**Total Effort**: ~5 days

---

## Sprint 8: Polish & Launch (1 week)

**Goal**: Production-ready v2.0.0 release candidate.

| # | Task | Priority | Dependencies | Screens | Backend | Frontend | DB | Effort |
|:-|:-----|:--------:|:------------|:--------|:--------|:---------|:---|:------:|
| 8.1 | Dark mode audit — test all 94 live screens | P0 | None | All | None | Fix contrast issues | None | 2d |
| 8.2 | Couple mode audit — test with isCouple=true | P0 | None | All | None | Fix palette issues | None | 1d |
| 8.3 | Error handling — ErrorBoundary on all screens | P1 | None | All | None | Add wrappers | None | 1d |
| 8.4 | Empty states — every list screen has emoji + CTA | P1 | None | Goals, FamilyHub, Bills, etc. | None | Add EmptyState | None | 1d |
| 8.5 | Accessibility — accessibilityLabel on all buttons | P2 | None | All | None | Add labels | None | 2d |
| 8.6 | Animation consistency — all use design system tokens | P2 | None | All | None | Audit & fix | None | 1d |
| 8.7 | Performance benchmark — cold start < 2s | P2 | 1.4 | None | None | Measure & report | None | 1d |
| 8.8 | Final QA — regression test all 17 phases | P3 | All above | All | All | All | All | 3d |
| 8.9 | App Store prep — screenshots (iPhone 16 Pro Max, Pixel 9 Pro) | P3 | All above | Key screens | None | Capture assets | None | 2d |

**Screens Impacted**: All 94 live screens
**Backend Impact**: None
**Database Impact**: None
**Total Effort**: ~10 days

---

## Summary

| Sprint | Theme | Days | Dependencies | Backend | Frontend | DB |
|:------|:------|:----:|:------------|:-------|:---------|:---|
| 1 | Critical Fixes | 10 | None | Minor | Heavy | None |
| 2 | Navigation Polish | 4 | Sprint 1 | None | Heavy | None |
| 3 | Family Hub | 5 | Sprint 2 | 1 endpoint | Heavy | None |
| 4 | AI Center | 4 | None | 1 endpoint | Medium | None |
| 5 | Net Worth | 3 | None | Cron job | Medium | None |
| 6 | Health Score | 3 | None | None | Medium | None |
| 7 | Premium | 5 | None | Trial + plans | Medium | New rows |
| 8 | Polish & Launch | 10 | All above | None | Heavy | None |
| | **Total** | **44** | | **3-4 endpoints** | **~70 files** | **Minimal** |
