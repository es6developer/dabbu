# Phase 2 — Navigation Redesign

## 1. New Navigation Tree

```
RootNavigator
│
├── AuthNavigator (Stack, headerless)
│   ├── Onboarding        → OnboardingScreen
│   ├── Login             → PremiumLoginScreen
│   ├── Signup            → PremiumSignupScreen
│   ├── OtpVerification   → PremiumOtpScreen
│   ├── ForgotPassword    → ForgotPasswordScreen
│   ├── ResetPassword     → ResetPasswordScreen
│   └── BiometricSetup    → BiometricSetupScreen
│
├── AppLockScreen (modal, overrides all)
│
└── MainTabNavigator (Bottom Tabs + Center FAB)
    │
    ├── [Tab 1] Home (HomeStack)
    │   ├── HomeMain         → HomeScreen           (dashboard)
    │   ├── Notifications    → NotificationsScreen
    │   ├── GoalsList        → GoalsListScreen       (emotional templates)
    │   ├── GoalDetail       → GoalDetailScreen      (detail + contribute)
    │   ├── NetWorth         → NetWorthScreen        (8 assets + 4 liabilities)
    │   ├── HealthScore      → HealthScoreScreen     (0-100 score)
    │   ├── EmergencyFund    → EmergencyFundScreen   (coverage calculator)
    │   └── DabbuAI          → DabbuAIScreen         (4 tabs: Insights/Savings/Goals/Ask)
    │
    ├── [Tab 2] Wallet (WalletStack)
    │   ├── WalletHome       → WalletHomeScreen      (accounts + recent)
    │   ├── AccountDetail    → AccountDetailScreen
    │   ├── FinancialCenter  → FinancialCenterScreen (3 tabs: Overview/Reports/AI)
    │   ├── BillScanner      → BillScannerScreen
    │   ├── BillsList        → BillsListScreen
    │   └── Subscriptions    → SubscriptionScreen
    │
    ├── [FAB] Add (QuickActionSheet)
    │   ├── Add Expense      → WalletHome (action: addExpense)
    │   ├── Add Income       → WalletHome (action: addIncome)
    │   ├── Create Group     → FamilyHub (CreateSharedGroup)
    │   ├── Create Goal      → GoalsList
    │   ├── Financial Center → FinancialCenter
    │   ├── Scan Bill        → BillScanner
    │   └── Net Worth        → NetWorth
    │
    ├── [Tab 3] Family (FamilyHubStack)
    │   ├── FamilyHubHome    → FamilyHubScreen      (filter: All/Couple/Family/Friends/Trip)
    │   ├── SharedGroupDetail→ SharedGroupDetailScreen
    │   ├── CreateSharedGroup→ CreateSharedGroupScreen
    │   ├── CoupleFinance    → CoupleFinanceScreen
    │   ├── FamilyDashboard  → FamilyDashboardScreen
    │   ├── TripDashboard    → TripDashboardScreen
    │   ├── Settlement       → SettlementScreen
    │   └── InviteMember     → InviteMemberScreen
    │
    └── [Tab 4] Profile (SettingsStack)
        ├── SettingsMain     → SettingsScreen       (menu hub)
        ├── Profile          → ProfileScreen
        ├── Security         → SecurityScreen
        ├── Premium          → PremiumScreen
        ├── Help             → HelpCenterScreen
        ├── Referral         → ReferralScreen
        ├── Theme            → ThemeScreen
        ├── Privacy          → PrivacyPolicyScreen
        └── AddPartner       → AddPartnerScreen
```

## 2. Screen Mapping (Old → New)

### Removed Tabs

| Old Tab | Old Content | New Home |
|:--------|:------------|:---------|
| **Goals Tab** | GoalsList, GoalDetail | → Home stack (GoalsList, GoalDetail) |
| **Spaces Tab** | SpacesDashboard, CirclesList, SharedGroupDetail | → Family Hub |
| **Hidden secondary tabs** | Analytics, budgets, reminders | → Financial Center or removed |

### Route Migration

| Old Route | Old Navigator | New Route | New Navigator |
|:----------|:--------------|:-----------|:--------------|
| `Analytics` | AccountsNavigator | `FinancialCenter` | WalletStack |
| `ExpenseHome` | AccountsNavigator | `WalletHome` | WalletStack |
| `AddExpense` | AccountsNavigator | `WalletHome` (with action param) | WalletStack |
| `BillScanner` | AccountsNavigator | `BillScanner` | WalletStack |
| `BillsList` | AccountsNavigator | `BillsList` | WalletStack |
| `Subscriptions` | AccountsNavigator | `Subscriptions` | WalletStack |
| `SharedCircles` | AccountsNavigator | → removed (→ Family Hub) | — |
| `CreateExpenseGroup` | AccountsNavigator | → removed | — |
| `GroupExpenses` | AccountsNavigator | → removed | — |
| `MonthlyComparison` | AccountsNavigator | → removed | — |
| `TransactionDetail` | AccountsNavigator | → kept in WalletStack if needed | — |
| `SpacesDashboardHome` | SharedFinanceNavigator | → removed | — |
| `SharedFinanceHome` | SharedFinanceNavigator | → removed | — |
| `CoupleIncome` | SharedFinanceNavigator | → removed | — |
| `CoupleReports` | SharedFinanceNavigator | → FinancialCenter | WalletStack |
| `CirclesList` | CirclesNavigator | → removed | — |
| `CreateCircle` | CirclesNavigator | → removed | — |
| `SplitExpense` | CirclesNavigator | → removed | — |
| `ExternalSplitLink` | CirclesNavigator | → removed | — |
| `GoalsList` | GoalsNavigator | `GoalsList` | HomeStack |
| `GoalDetail` | GoalsNavigator | `GoalDetail` | HomeStack |
| `FamilyDashboard` | FamilyNavigator | `FamilyDashboard` | FamilyHubStack |
| `FamilyChat` | FamilyNavigator | → removed | — |
| `CreateFamily` | FamilyNavigator | → removed | — |
| `TasksList` | FamilyNavigator | → removed | — |
| `CoupleSpaceHome` | CoupleSpaceNavigator | → removed (→ FamilyHub) | — |
| `CoupleTransactionForm` | CoupleSpaceNavigator | → removed | — |
| `CoupleBudgetAdjust` | CoupleSpaceNavigator | → removed | — |
| `CoupleGoals` | CoupleSpaceNavigator | → removed (→ GoalsList) | — |
| `CoupleBills` | CoupleSpaceNavigator | → removed | — |
| `CoupleSettings` | CoupleSpaceNavigator | → removed | — |

### Screens That Stay in Place

| Screen | Navigator |
|:-------|:----------|
| HomeMain → HomeScreen | HomeStack |
| WalletHome → WalletHomeScreen | WalletStack |
| FamilyHubHome → FamilyHubScreen | FamilyHubStack |
| SettingsMain → SettingsScreen | SettingsStack |
| PremiumScreen | SettingsStack |
| ProfileScreen | SettingsStack |
| SecurityScreen | SettingsStack |

## 3. Migration Plan

### Step 1: Remove navigator files (Sprint 1–2)
- Delete `AccountsNavigator.tsx` — migrate its unique routes to WalletStack
- Delete `GoalsNavigator.tsx` — routes already in HomeStack
- Delete `CirclesNavigator.tsx` — not needed, FamilyHub handles groups
- Delete `SharedFinanceNavigator.tsx` — replaced by FamilyHubNavigator
- Delete `CoupleSpaceNavigator.tsx` — replaced by FamilyHubNavigator
- Delete `FamilyNavigator.tsx` — replaced by FamilyHubNavigator
- Delete `ChatNavigator.tsx` — chat can be a modal from FamilyHub
- Delete `ExpenseTabNavigator.tsx` — merged into Wallet

### Step 2: Add routes to WalletStack (Sprint 2)
- Add `BillScanner`, `BillsList`, `Subscription`, `BillDetail`, `TransactionDetail` to WalletStack

### Step 3: Register FamilyHubStack (Sprint 2)
- Ensure all shared group routes are under FamilyHubStack
- Add CoupleSpaceScreen as a sub-route of FamilyHub

### Step 4: Remove dead Route references (Sprint 2–3)
- Remove all `navigation.navigate()` calls targeting old navigators
- Replace with new routes

### Step 5: Clean up dead screens (Sprint 3)
- Delete all 65 dead screen files
- Remove unused imports

### Rollback Strategy
- Keep one sprint overlap: old navigators exist but are deprecated
- Log a warning when old navigators are accessed
- Remove after Sprint 3
