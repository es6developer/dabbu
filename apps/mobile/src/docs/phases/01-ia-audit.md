# Phase 1 — Information Architecture Audit

## 1. Screen Inventory

| Directory | Total Screens | Live (in navigator) | Dead (unreachable) | Live % |
|-----------|:------------:|:-------------------:|:------------------:|:------:|
| accounts/ | 2 | 1 | 1 | 50% |
| admin/ | 2 | 0 | 2 | 0% |
| ai/ | 19 | 3 | 16 | 16% |
| analytics/ | 1 | 1 | 0 | 100% |
| auth/ | 15 | 7 | 6 | 47% |
| bills/ | 3 | 3 | 0 | 100% |
| budgets/ | 3 | 0 | 3 | 0% |
| challenges/ | 1 | 0 | 1 | 0% |
| chat/ | 3 | 3 | 0 | 100% |
| circles/ | 2 | 2 | 0 | 100% |
| couple/ | 23 | 6 | 17 | 26% |
| documents/ | 3 | 3 | 0 | 100% |
| expense/ | 3 | 2 | 1 | 67% |
| family/ | 7 | 5 | 2 | 71% |
| finance/ | 1 | 1 | 0 | 100% |
| goals/ | 2 | 2 | 0 | 100% |
| health/ | 1 | 1 | 0 | 100% |
| home/ | 7 | 6 | 1 | 86% |
| investments/ | 1 | 0 | 1 | 0% |
| onboarding/ | 1 | 1 | 0 | 100% |
| premium/ | 2 | 2 | 0 | 100% |
| referral/ | 1 | 1 | 0 | 100% |
| reminders/ | 4 | 0 | 4 | 0% |
| reports/ | 1 | 0 | 1 | 0% |
| savings/ | 1 | 1 | 0 | 100% |
| settings/ | 13 | 10 | 3 | 77% |
| shared-finance/ | 17 | 13 | 2 | 76% |
| sms/ | 2 | 0 | 2 | 0% |
| social/ | 1 | 1 | 0 | 100% |
| spaces/ | 1 | 1 | 0 | 100% |
| split/ | 3 | 3 | 0 | 100% |
| subscriptions/ | 1 | 1 | 0 | 100% |
| tasks/ | 2 | 2 | 0 | 100% |
| transactions/ | 8 | 5 | 3 | 63% |
| wallet/ | 1 | 1 | 0 | 100% |
| **Total** | **159** | **94** | **65** | **59%** |

---

## 2. Duplicate Screen Inventory

### High Priority — Same exported name, different paths (collision risk)

| Exported Name | File 1 | File 2 |
|:--------------|:-------|:-------|
| `FamilyDashboardScreen` | `family/FamilyDashboardScreen.tsx` (220 lines) | `shared-finance/FamilyDashboardScreen.tsx` (359 lines) |
| `SettlementScreen` | `shared-finance/SettlementScreen.tsx` (459 lines) | `split/SettlementScreen.tsx` (390 lines) |

### Medium Priority — Overlapping functionality

| Group | Files | Lines | Recommendation |
|:------|:------|:-----:|:---------------|
| **Reports** | `reports/ReportsScreen.tsx` | 831 | Merge into FinancialCenter |
|  | `analytics/AnalyticsScreen.tsx` | 823 | Merge into FinancialCenter |
|  | `couple/CoupleReportsScreen.tsx` | 557 | Merge into FinancialCenter |
|  | `ai/MonthlyAiReviewScreen.tsx` | 511 | Dead — remove |
| **Expense Forms** | `expense/AddExpenseScreen.tsx` | 697 | Keep (personal) |
|  | `shared-finance/SharedExpenseFormScreen.tsx` | 1149 | Keep (shared) |
|  | `shared-finance/PremiumExpenseFormScreen.tsx` | 604 | Dead — remove |
|  | `couple/CoupleTransactionFormScreen.tsx` | 522 | Merge into shared form |
| **Settlements** | `shared-finance/SettlementScreen.tsx` | 459 | Keep (groups) |
|  | `split/SettlementScreen.tsx` | 390 | Merge into shared |
| **AI Screens** | 19 files total | — | 16 are dead; only DabbuAIScreen (4 tabs) should survive |

---

## 3. Dead Feature Inventory (65 screens — 41% of all screens)

These screens are NOT registered in any navigator and are unreachable:

### ai/ (16 dead — 84% of AI directory)
| File | Lines | Safe to remove? |
|:-----|:-----:|:---------------|
| `AIDashboard.tsx` | 365 | ✅ — Replaced by DabbuAIScreen |
| `AiHomeDashboardScreen.tsx` | 429 | ✅ — Replaced by HomeScreen |
| `AiInsightsScreen.tsx` | 349 | ✅ — Replaced by DabbuAI Insights tab |
| `AiSavingsScreen.tsx` | 258 | ✅ — Replaced by DabbuAI Savings tab |
| `AnomalyDetectionScreen.tsx` | 263 | ✅ — Never used |
| `CoupleAiScreen.tsx` | 237 | ✅ — Replaced by DabbuAI |
| `FamilyAiScreen.tsx` | 238 | ✅ — Replaced by DabbuAI |
| `FinancialCopilotScreen.tsx` | 356 | ✅ — Never used |
| `FinancialDnaScreen.tsx` | 347 | ✅ — Never used |
| `GroupSpaceAiScreen.tsx` | 236 | ✅ — Never used |
| `MonthlyAiReviewScreen.tsx` | 511 | ✅ — Never used |
| `PremiumAiPaywallScreen.tsx` | 391 | ⚠️ — Keep as component, import from DabbuAI |
| `SmartGoalCoachScreen.tsx` | 344 | ✅ — Replaced by GoalDetail |
| `SmartNotificationScreen.tsx` | 268 | ✅ — Never used |
| `TodayFeedScreen.tsx` | 398 | ✅ — Never used |

### couple/ (17 dead — 74% of couple directory)
| File | Lines | Safe to remove? |
|:-----|:-----:|:---------------|
| `CoupleBudgetAdjustScreen.tsx` | 47 | ✅ |
| `CoupleBudgetsScreen.tsx` | 434 | ✅ — No budgets navigator |
| `CoupleCoachScreen.tsx` | 280 | ⚠️ — AI coach, could be linked from DabbuAI |
| `CoupleDashboardScreen.tsx` | 252 | ⚠️ — Should be linked from Home/Family Hub (created but not wired) |
| `CoupleExpensesScreen.tsx` | 411 | ✅ |
| `CoupleFinance.tsx` | 238 | ✅ — Component, not screen |
| `CoupleGamificationScreen.tsx` | 220 | ✅ |
| `CoupleHomeScreen.tsx` | 486 | ✅ — Replaced by CoupleFinanceScreen |
| `CouplePlannerScreen.tsx` | 444 | ✅ |
| `CouplePlannerDetailScreen.tsx` | 215 | ✅ |
| `CouplePlannerFormScreen.tsx` | 49 | ✅ |
| `CouplePlannerHubScreen.tsx` | 182 | ✅ |
| `CoupleSavingsScreen.tsx` | 606 | ✅ |
| `CoupleSettlementsScreen.tsx` | 532 | ✅ |

### Others
| File | Lines | Safe to remove? |
|:-----|:-----:|:---------------|
| `accounts/AccountsListScreen.tsx` | 192 | ⚠️ — Could link from Wallet |
| `admin/AdminDashboardScreen.tsx` | 159 | ✅ — Admin only |
| `admin/AdminLoginScreen.tsx` | 65 | ✅ — Admin only |
| `auth/LoginScreen.tsx` | 290 | ✅ — Replaced by PremiumLoginScreen |
| `auth/OtpVerificationScreen.tsx` | 123 | ✅ — Replaced by PremiumOtpScreen |
| `auth/PremiumAuthScreen.tsx` | 918 | ✅ — Never used (PremiumLogin + PremiumSignup used separately) |
| `auth/SignupScreen.tsx` | 148 | ✅ — Replaced by PremiumSignupScreen |
| `budgets/BudgetDetailScreen.tsx` | 574 | ✅ — Budgets feature removed |
| `budgets/BudgetsListScreen.tsx` | 367 | ✅ |
| `budgets/CreateBudgetScreen.tsx` | 149 | ✅ |
| `challenges/ChallengesScreen.tsx` | 107 | ⚠️ — Gamification, keep for future |
| `home/DashboardHub.tsx` | 242 | ✅ — Replaced by HomeScreen |
| `home/GlobalSearchScreen.tsx` | 465 | ⚠️ — Could be useful |
| `home/LoanTrackerScreen.tsx` | 640 | ⚠️ — Feature not fully launched |
| `investments/InvestmentsListScreen.tsx` | 117 | ✅ |
| `reminders/4 files` | ~1K | ✅ — Reminders feature removed |
| `reports/ReportsScreen.tsx` | 831 | ✅ — Replaced by FinancialCenter |
| `shared-finance/PremiumExpenseFormScreen.tsx` | 604 | ✅ — Never used |
| `shared-finance/SharedFinanceHomeScreen.tsx` | 946 | ✅ — Replaced by FamilyHubScreen |
| `sms/2 files` | ~1.2K | ✅ — SMS autofill feature deprecated |
| `transactions/TransactionsListScreen.tsx` | 599 | ✅ — Replaced by MyWalletScreen |
| `transactions/TransactionsScreen.tsx` | 371 | ✅ — Replaced by MyWalletScreen |

---

## 4. Merge Candidates

| Merge Group | Screens | Target |
|:------------|:--------|:-------|
| **Reports + Analytics + AI Review** | `AnalyticsScreen`, `ReportsScreen`, `CoupleReportsScreen`, `MonthlyAiReviewScreen` | `FinancialCenterScreen` ✅ DONE |
| **All AI screens (16)** | All ai/ screens except DabbuAIScreen | `DabbuAIScreen` (4 tabs) ✅ DONE |
| **Spaces + Circles** | `SpacesDashboardScreen`, `CirclesListScreen`, `SharedScreen` | `FamilyHubScreen` ✅ DONE |
| **Expense Forms** | Both SettlementScreens, CoupleTransactionForm, PremiumExpenseForm | Keep personal + shared forms only |
| **Auth screens** | Login vs PremiumLogin, Signup vs PremiumSignup, Otp vs PremiumOtp | Keep premium variants only |
| **Transactions lists** | TransactionsScreen, TransactionsListScreen, MyWalletScreen | Keep MyWalletScreen only |

---

## 5. Navigation Complexity Report

### Current state
- **14 navigator files**: 3 Stack, 1 BottomTab, 10 Stack sub-navigators
- **159 screen files**, 94 reachable, 65 dead
- **Maximum depth**: 4 levels (Tab → Stack → Sub-Stack → Screen)
- **Dead code**: 41% of all screens are unreachable

### After V2 cleanup
- **6 navigator files**: Root → (Auth | MainTab → Home/Wallet/Family/Profile)
- **~80 screen files**, 0 dead, all reachable within 2 taps
- **Maximum depth**: 2 levels (Tab → Screen)

### Navigation tree (desired state)

```
RootNavigator
├── (auth) AuthNavigator
│   ├── Onboarding → OnboardingScreen
│   ├── Login → PremiumLoginScreen
│   ├── Signup → PremiumSignupScreen
│   ├── ForgotPassword → ForgotPasswordScreen
│   └── OtpVerification → PremiumOtpScreen
│
└── (app) MainTabNavigator
    ├── Home (Stack)
    │   ├── HomeMain → HomeScreen
    │   ├── GoalsList → GoalsListScreen
    │   ├── GoalDetail → GoalDetailScreen
    │   ├── NetWorth → NetWorthScreen
    │   ├── HealthScore → HealthScoreScreen
    │   ├── EmergencyFund → EmergencyFundScreen
    │   ├── DabbuAI → DabbuAIScreen
    │   └── Notifications → NotificationsScreen
    │
    ├── Wallet (Stack)
    │   ├── WalletHome → WalletHomeScreen
    │   ├── AccountDetail → AccountDetailScreen
    │   ├── FinancialCenter → FinancialCenterScreen
    │   └── BillScanner → BillScannerScreen
    │
    ├── Add (FAB) → QuickActionSheet
    │
    ├── Family (Stack)
    │   ├── FamilyHubHome → FamilyHubScreen
    │   ├── SharedGroupDetail → SharedGroupDetailScreen
    │   ├── CreateSharedGroup → CreateSharedGroupScreen
    │   ├── CoupleFinance → CoupleFinanceScreen
    │   ├── Settlement → SettlementScreen
    │   └── TripDashboard → TripDashboardScreen
    │
    └── Profile (Stack)
        ├── SettingsMain → SettingsScreen
        ├── Profile → ProfileScreen
        ├── Security → SecurityScreen
        ├── Premium → PremiumScreen
        ├── Help → HelpCenterScreen
        └── Referral → ReferralScreen
```

---

## 6. Recommendations

1. **Delete 65 dead screens** — recover ~20K lines of dead code
2. **Migrate AccountsNavigator routes** into Wallet stack (BillScanner, BillsList, Subscriptions)
3. **Wire CoupleDashboardScreen** into FamilyHub navigator
4. **Consolidate auth to premium variants only** — lose LoginScreen, SignupScreen, OtpVerificationScreen, PremiumAuthScreen
5. **Split SharedGroupDetailScreen** (2011 lines) — biggest performance bottleneck
6. **Merge duplicate export names** — FamilyDashboardScreen, SettlementScreen
7. **Remove budgets feature** — all 3 screens are dead, no navigator references
