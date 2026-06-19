# DABBU V3 — FINANCIAL LIFE OPERATING SYSTEM
## Complete Transformation Execution Plan

> **Author:** Principal Product Architect / Principal React Native Architect / Principal NestJS Architect
> **Status:** Execution Ready
> **Phases:** 10

---

## TABLE OF CONTENTS

1. [Architecture Overview](#1-architecture-overview)
2. [Folder Structure Refactor](#2-folder-structure-refactor)
3. [Prisma Schema Updates](#3-prisma-schema-updates)
4. [NestJS Backend Changes](#4-nestjs-backend-changes)
5. [React Native Implementation](#5-react-native-implementation)
6. [Zustand Stores & React Query](#6-zustand-stores--react-query)
7. [Navigation Redesign](#7-navigation-redesign)
8. [UI Redesign Plan](#8-ui-redesign-plan)
9. [RevenueCat Integration](#9-revenuecat-integration)
10. [Analytics Events](#10-analytics-events)
11. [Migration Scripts](#11-migration-scripts)
12. [QA Checklist](#12-qa-checklist)
13. [End-to-End TODO List](#13-end-to-end-todo-list)
14. [Phase Execution Order](#14-phase-execution-order)

---

## 1. ARCHITECTURE OVERVIEW

### 1.1 Four Pillars

```
┌─────────────────────────────────────────────────────────┐
│                   DABBU FINANCIAL OS                     │
├────────────┬──────────────┬─────────────┬───────────────┤
│  SPACES    │  LIFE EVENTS │ DABBU SCORE │   AI LAYER    │
│  Foundation│  Navigation  │  Gamification│  Everywhere   │
└────────────┴──────────────┴─────────────┴───────────────┘
```

### 1.2 Data Flow

```
User → Onboarding (financeMode + lifeGoals)
     ↓
Spaces (auto-created based on selections)
     ↓
Every Transaction → spaceId
Every Goal → spaceId
Every Budget → spaceId
     ↓
Life Events detected by AI + user-created
     ↓
Dabbu Score computed across all spaces
     ↓
AI Layer enriches every screen
```

### 1.3 Navigation Architecture (Target)

```
RootNavigator
├── SplashScreen
├── OnboardingNavigator (NEW - redesigned)
│   ├── WelcomeScreen
│   ├── FinanceModeScreen (Personal/Couple/Family/All)
│   ├── LifeGoalsScreen (House/Baby/Wedding/Car/...)
│   ├── CreateSpacesScreen (auto-created, preview)
│   ├── InvitePartnerScreen
│   └── ConnectBankScreen
├── AuthNavigator (existing)
├── LockScreen (existing)
└── MainTabNavigator (REDESIGNED)
    ├── HomeTab → LifeDashboardScreen (NEW)
    ├── SpacesTab → SpacesNavigator (UPGRADED)
    ├── LifeHubTab → LifeHubNavigator (EXPANDED)
    ├── AITab → AINavigator (EMBEDDED - not just chat)
    └── ProfileTab → SettingsNavigator (existing)
```

---

## 2. FOLDER STRUCTURE REFACTOR

### 2.1 Mobile (`apps/mobile/src/`)

```
src/
├── App.tsx
├── global.css
│
├── navigation/
│   ├── RootNavigator.tsx
│   ├── OnboardingNavigator.tsx            ★ NEW
│   ├── MainTabNavigator.tsx               ★ REDESIGN
│   ├── LifeDashboardNavigator.tsx         ★ NEW
│   ├── SpacesNavigator.tsx                 ★ FROM spaces/ + couple/ + family/
│   ├── LifeHubNavigator.tsx                ★ EXPANDED
│   ├── AINavigator.tsx                     ★ REDESIGN (not just chat)
│   ├── ProfileNavigator.tsx
│   ├── AuthNavigator.tsx
│   ├── CoupleSpaceNavigator.tsx            ★ DEPRECATE - merge into SpacesNavigator
│   ├── FamilySpaceNavigator.tsx            ★ DEPRECATE - merge into SpacesNavigator
│   ├── FamilyHubNavigator.tsx              ★ DEPRECATE - merge into LifeHubNavigator
│   └── animations.ts
│
├── screens/
│   ├── onboarding/                         ★ REDESIGNED
│   │   ├── WelcomeScreen.tsx
│   │   ├── FinanceModeScreen.tsx
│   │   ├── LifeGoalsScreen.tsx
│   │   ├── CreateSpacesScreen.tsx
│   │   ├── InvitePartnerScreen.tsx
│   │   └── ConnectBankScreen.tsx
│   │
│   ├── home/                              ★ REDESIGNED → LifeDashboardScreen
│   │   ├── LifeDashboardScreen.tsx         ★ REPLACES HomeScreen
│   │   ├── GlobalSearchScreen.tsx
│   │   ├── NotificationCenterScreen.tsx
│   │   ├── NotificationsScreen.tsx
│   │   ├── NetWorthScreen.tsx
│   │   ├── StreaksScreen.tsx
│   │   ├── YearlySummaryScreen.tsx
│   │   └── components/
│   │       ├── HeroSection.tsx             ★ NEW (greeting + net worth + score)
│   │       ├── SnapshotRow.tsx             ★ NEW (emergency fund, goals, events, bills)
│   │       ├── AIInsightCard.tsx           ★ UPGRADED (persistent, not carousel)
│   │       ├── LifeEventsSection.tsx       ★ NEW
│   │       ├── ActiveSpacesRow.tsx         ★ NEW
│   │       └── QuickActionsBar.tsx
│   │
│   ├── spaces/                            ★ UPGRADED (core foundation)
│   │   ├── SpacesDashboardScreen.tsx       ★ REDESIGN (active space switcher)
│   │   ├── SpaceDetailScreen.tsx           ★ REDESIGN (add transactions to space)
│   │   ├── CreateSpaceScreen.tsx           ★ FIX (API integration)
│   │   ├── CreateSpaceTypeScreen.tsx       ★ NEW (type selection wizard)
│   │   ├── SpaceTransactionsScreen.tsx     ★ NEW
│   │   ├── SpaceGoalsScreen.tsx            ★ NEW
│   │   ├── SpaceBudgetsScreen.tsx          ★ NEW
│   │   ├── SpaceSettingsScreen.tsx         ★ NEW
│   │   └── components/
│   │       ├── SpaceCard.tsx
│   │       ├── SpaceSwitcher.tsx            ★ NEW (header dropdown)
│   │       ├── SpaceSelector.tsx            ★ NEW (for transaction forms)
│   │       └── SpaceAvatar.tsx
│   │
│   ├── lifehub/                           ★ EXPANDED
│   │   ├── LifeHubScreen.tsx               ★ NEW (hub landing page)
│   │   ├── HousePlannerScreen.tsx          ★ WIRE TO API
│   │   ├── BabyPlannerScreen.tsx           ★ WIRE TO API
│   │   ├── RetirementPlannerScreen.tsx     ★ WIRE TO API
│   │   ├── InvestmentPlannerScreen.tsx     ★ WIRE TO API
│   │   ├── CarPlannerScreen.tsx            ★ NEW
│   │   ├── EducationPlannerScreen.tsx      ★ NEW
│   │   ├── VacationPlannerScreen.tsx       ★ NEW
│   │   ├── WeddingPlannerScreen.tsx        ★ NEW (replace stub)
│   │   └── components/
│   │       ├── PlannerCard.tsx
│   │       ├── PlannerProgress.tsx
│   │       ├── AIAffordabilityCard.tsx     ★ NEW
│   │       └── LifeEventTimeline.tsx       ★ NEW
│   │
│   ├── life-events/                       ★ NEW MODULE
│   │   ├── LifeEventsListScreen.tsx
│   │   ├── LifeEventDetailScreen.tsx
│   │   ├── CreateLifeEventScreen.tsx
│   │   ├── LifeTimelineScreen.tsx
│   │   └── components/
│   │       ├── LifeEventCard.tsx
│   │       ├── LifeEventBadge.tsx
│   │       ├── EventTimelineItem.tsx
│   │       └── EventConfirmationSheet.tsx
│   │
│   ├── health/                            ★ UPGRADED → Dabbu Score
│   │   ├── DabbuScoreScreen.tsx           ★ RENAME from HealthScoreScreen
│   │   ├── ScoreBreakdownScreen.tsx       ★ NEW
│   │   ├── ScoreImprovementScreen.tsx     ★ NEW
│   │   └── components/
│   │       ├── ScoreRing.tsx
│   │       ├── ScoreMini.tsx              ★ NEW (reusable badge)
│   │       ├── ComponentBar.tsx
│   │       └── ImprovementTip.tsx         ★ NEW
│   │
│   ├── ai/                                ★ REDESIGN (AI as layer, not screen)
│   │   ├── AIChatScreen.tsx               ★ Keep but demote
│   │   ├── AIInsightsFeedScreen.tsx       ★ NEW
│   │   ├── PremiumAiPaywallScreen.tsx
│   │   └── components/
│   │       ├── AiShared.tsx
│   │       ├── useAiApi.ts
│   │       ├── AIInsightCard.tsx           ★ GLOBAL COMPONENT
│   │       ├── AICategorizationBadge.tsx   ★ NEW
│   │       ├── AIForecastCard.tsx          ★ NEW
│   │       └── AIRebalancingBanner.tsx     ★ NEW
│   │
│   ├── transactions/                      ★ UPGRADED (space-aware)
│   │   ├── AddExpenseScreen.tsx            ★ ADD spaceId selector
│   │   ├── BillScannerScreen.tsx
│   │   ├── CreateExpenseGroupScreen.tsx
│   │   ├── GroupExpensesScreen.tsx
│   │   ├── MyWalletScreen.tsx              ★ FIX (remove push notif bug)
│   │   ├── TransactionsList.tsx            ★ FIX (replace mock data)
│   │   ├── SharedCirclesScreen.tsx
│   │   ├── TransactionDetailScreen.tsx
│   │   └── components/
│   │       ├── SpaceTag.tsx                ★ NEW (shows which space)
│   │       └── AICategorySuggestion.tsx    ★ NEW
│   │
│   ├── goals/                             ★ UPGRADED (space-aware + AI)
│   │   ├── GoalsListScreen.tsx             ★ ADD spaceId filter
│   │   ├── GoalDetailScreen.tsx            ★ ADD AI forecast
│   │   ├── CreateGoalModal.tsx             ★ ADD spaceId selector
│   │   └── components/
│   │       ├── AIGoalForecastCard.tsx       ★ NEW
│   │       └── GoalProgressWithAI.tsx      ★ NEW
│   │
│   ├── budgets/                           ★ UPGRADED (space-aware + AI)
│   │   ├── BudgetsListScreen.tsx           ★ ADD spaceId filter
│   │   ├── BudgetDetailScreen.tsx          ★ ADD AI rebalancing
│   │   └── components/
│   │       └── AIRebalanceBanner.tsx       ★ NEW
│   │
│   ├── couple/                            ★ MERGE into spaces/
│   │   ├── CoupleOverviewScreen.tsx        ★ REFACTOR as SpaceDetail (type=COUPLE)
│   │   ├── CoupleCoachScreen.tsx           ★ MOVE to ai/
│   │   ├── CouplePlannerHubScreen.tsx      ★ MOVE to lifehub/
│   │   └── ...                             ★ MERGE remaining into spaces/
│   │
│   ├── family/                            ★ MERGE into spaces/
│   │   ├── FamilyDashboardScreen.tsx       ★ FIX stub, refactor as SpaceDetail (type=FAMILY)
│   │   ├── FamilyMembersScreen.tsx         ★ MOVE to spaces/space-members/
│   │   ├── FamilyBillsScreen.tsx           ★ WIRE to API
│   │   ├── FamilyBudgetScreen.tsx          ★ WIRE to API
│   │   └── ...                             ★ WIRE all to API, merge into spaces/
│   │
│   ├── dashboard/                         ★ DEPRECATE (folded into home/)
│   │   └── DashboardRouterScreen.tsx       ★ DELETE
│   │
│   ├── settings/                          ★ KEEP (add premium hooks)
│   │   ├── SettingsScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── PremiumScreen.tsx              ★ UPGRADE (wire RevenueCat)
│   │   ├── SubscriptionCenterScreen.tsx   ★ NEW
│   │   ├── BillingHistoryScreen.tsx
│   │   ├── CancellationScreen.tsx
│   │   ├── ThemeScreen.tsx
│   │   └── ... (keep existing)
│   │
│   ├── premium/                           ★ KEEP + WIRE
│   │   ├── PremiumScreen.tsx
│   │   └── ...
│   │
│   ├── health/                            ★ RENAME to dabbu-score/
│   │   └── ... (moved above)
│   │
│   ├── shared-finance/                    ★ MERGE into spaces/
│   │   └── ... (fold into SpacesNavigator)
│   │
│   └── legacy/                            ★ STALE SCREENS TO REMOVE
│       ├── PersonalDashboardScreen.tsx     ★ REPLACED by LifeDashboardScreen
│       ├── CoupleDashboardScreen.tsx       ★ TODO stub → DELETE
│       ├── SharedFinanceDashboardScreen.tsx★ TODO stub → DELETE
│       ├── SharedFinanceReportsScreen.tsx  ★ TODO stub → DELETE
│       ├── SharedFinanceGoalsScreen.tsx    ★ TODO stub → DELETE
│       └── FamilyMemberDetailScreen.tsx    ★ TODO stub → DELETE
│
├── stores/
│   ├── spaceStore.ts                      ★ UPGRADE (activeSpace, spaceTransactions, etc.)
│   ├── lifeEventStore.ts                  ★ NEW
│   ├── dabbuScoreStore.ts                 ★ RENAME from healthStore
│   ├── aiStore.ts                         ★ KEEP + EXPAND
│   ├── analyticsStore.ts
│   ├── featureFlags.ts
│   ├── userStore.ts
│   └── lensStore.ts
│
├── hooks/
│   ├── useActiveSpace.ts                  ★ NEW
│   ├── useLifeEvents.ts                    ★ NEW
│   ├── useDabbuScore.ts                    ★ RENAME from useHealthScore
│   ├── useAIContextual.ts                 ★ NEW (AI for any screen)
│   ├── useSpaceTransactions.ts            ★ NEW
│   ├── useOnboarding.ts                   ★ NEW
│   ├── useRevenueCat.ts                   ★ NEW
│   ├── useAI.ts
│   ├── useApi.ts
│   ├── useCachedQuery.ts
│   ├── useCoupleMode.ts
│   ├── useDeepLinks.ts
│   ├── useFeature.ts
│   └── ...
│
├── services/
│   ├── api.ts                             ★ UPGRADE (spaceId in headers)
│   ├── revenuecat.ts                      ★ NEW
│   ├── lifeEvents.ts                      ★ NEW
│   ├── dabbuScore.ts                      ★ NEW
│   ├── spaces.ts                          ★ NEW
│   ├── aiEngine.ts
│   ├── aiFeedGenerator.ts
│   ├── chat.ts
│   ├── contacts.ts
│   ├── database.ts
│   ├── notifications.ts
│   ├── offline/
│   └── sms/
│
├── components/
│   ├── global/
│   │   ├── AIInsightCard.tsx               ★ GLOBAL (reused everywhere)
│   │   ├── DabbuScoreMini.tsx             ★ NEW (reusable score badge)
│   │   ├── SpaceSwitcher.tsx              ★ NEW (header dropdown)
│   │   ├── SpaceSelector.tsx              ★ NEW (form picker)
│   │   ├── LifeEventBadge.tsx             ★ NEW
│   │   └── LoadingOverlay.tsx
│   │
│   ├── dashboard/                         ★ REFACTOR (widgets for life dashboard)
│   │   ├── WidgetRegistry.tsx
│   │   ├── WidgetBase.tsx
│   │   ├── WidgetWrapper.tsx
│   │   └── widgets/
│   │       ├── GreetingWidget.tsx
│   │       ├── NetWorthWidget.tsx
│   │       ├── DabbuScoreWidget.tsx       ★ NEW
│   │       ├── LifeEventsWidget.tsx       ★ NEW
│   │       ├── ActiveSpacesWidget.tsx     ★ NEW
│   │       ├── AIInsightWidget.tsx
│   │       └── ...
│   │
│   ├── ui/
│   ├── forms/
│   └── nds/
│
├── config/
│   ├── api.ts                             ★ UPGRADE (space endpoints)
│   ├── entitlements.ts
│   ├── features.ts
│   ├── sentry.ts
│   ├── revenuecat.ts                      ★ NEW
│   └── lifeEvents.ts                      ★ NEW
│
├── constants/
│   ├── smartEntryKeywords.ts
│   ├── spaceDefaults.ts                    ★ NEW
│   ├── lifeEventDefaults.ts               ★ NEW
│   └── scoreThresholds.ts                 ★ NEW
│
├── types/
│   ├── index.ts                           ★ EXPAND (space, lifeEvent, score types)
│   ├── ai.ts
│   ├── onboarding.ts                      ★ NEW
│   ├── revenuecat.ts                      ★ NEW
│   └── navigation.ts                      ★ REDESIGN
│
├── theme/
│   ├── colors.ts
│   ├── design.ts
│   ├── spacing.ts
│   ├── typography.ts
│   ├── ThemeProvider.tsx
│   └── index.ts
│
├── utils/
│   ├── dashboardMapper.ts
│   ├── exportFile.ts
│   └── scoreCalculator.ts                 ★ NEW
│
└── providers/                              ★ NEW for context separation
    ├── ActiveSpaceProvider.tsx             ★ NEW
    ├── LifeEventProvider.tsx               ★ NEW
    └── DabbuScoreProvider.tsx             ★ NEW
```

---

## 3. PRISMA SCHEMA UPDATES

### 3.1 New Models

```prisma
// ─── LifeEvent ───────────────────────────────────────────
model LifeEvent {
  id          String   @id @default(cuid()) @db.VarChar(36)
  userId      String   @db.VarChar(36)
  eventType   LifeEventType
  title       String
  description String?
  confidence  Float    @default(0)
  detectedAt  DateTime @default(now())
  eventDate   DateTime?
  isConfirmed Boolean  @default(false)
  isDismissed Boolean  @default(false)
  source      String?  // 'ai_detected' | 'user_created' | 'planner_created'
  spaceId     String?  @db.VarChar(36)
  goalId      String?  @db.VarChar(36)
  metadata    Json?

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  space Space? @relation(fields: [spaceId], references: [id], onDelete: SetNull)
  goal  Goal?  @relation(fields: [goalId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([userId, isDismissed])
  @@index([spaceId])
  @@map("life_events")
}

// ─── Space (existing — add fields) ──────────────────────
model Space {
  id          String          @id @default(cuid()) @db.VarChar(36)
  name        String
  type        SpaceType
  emoji       String?         // 🏠 ❤️ 👶 🚗
  color       String?         // hex color
  description String?
  createdBy   String          @db.VarChar(36)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  isDefault   Boolean         @default(false)
  metadata    Json?           // goals, target amount, etc.

  creator     User             @relation("SpaceCreator", fields: [createdBy], references: [id])
  members     SpaceMember[]
  transactions Transaction[]
  budgets     Budget[]
  goals       Goal[]
  lifeEvents  LifeEvent[]
  plans       LifePlan[]

  @@index([createdBy])
  @@map("spaces")
}

// ─── LifePlan (planner data) ────────────────────────────
model LifePlan {
  id        String        @id @default(cuid()) @db.VarChar(36)
  userId    String        @db.VarChar(36)
  spaceId   String?       @db.VarChar(36)
  planType  LifePlanType
  title     String
  status    PlanStatus    @default(ACTIVE)
  targetDate DateTime?
  targetAmount Float?
  currentAmount Float?   @default(0)
  monthlyContribution Float?
  aiForecast Json?       // AI-generated projections
  metadata  Json?
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  space Space? @relation(fields: [spaceId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([spaceId])
  @@map("life_plans")
}

// ─── DabbuScore (historical tracking) ──────────────────
model DabbuScore {
  id           String   @id @default(cuid()) @db.VarChar(36)
  userId       String   @db.VarChar(36)
  overallScore Int
  components   Json     // { savingsRate: 70, debtRatio: 80, ... }
  level        String   // critical | building | stable | thriving | exceptional
  monthlyChange Int?    @default(0)
  calculatedAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, calculatedAt])
  @@map("dabbu_scores")
}

// ─── Enums ──────────────────────────────────────────────
enum SpaceType {
  PERSONAL
  COUPLE
  FAMILY
  TRIP
  HOME
  BABY
  WEDDING
  CAR
  EDUCATION
  VACATION
  RETIREMENT
  BUSINESS
  CUSTOM
}

enum LifeEventType {
  HOUSE
  BABY
  WEDDING
  CAR
  VACATION
  EDUCATION
  RETIREMENT
  BUSINESS
  MOVING
  JOB_CHANGE
  SALARY_INCREASE
  SCHOOL_FEES
  CUSTOM
}

enum LifePlanType {
  HOUSE
  BABY
  RETIREMENT
  INVESTMENT
  CAR
  EDUCATION
  VACATION
  WEDDING
  EMERGENCY_FUND
  CUSTOM
}

enum PlanStatus {
  ACTIVE
  COMPLETED
  PAUSED
  CANCELLED
}
```

### 3.2 Existing Model Updates

```prisma
// Transaction — ADD fields
model Transaction {
  // ... existing fields ...
  spaceId String? @db.VarChar(36)   // ← EXISTS, ensure NOT NULL after migration
  space   Space?  @relation(fields: [spaceId], references: [id], onDelete: SetNull)

  // NEW fields
  lifeEventId String?    @db.VarChar(36)
  lifeEvent   LifeEvent? @relation(fields: [lifeEventId], references: [id], onDelete: SetNull)
  aiCategory  String?    // AI-suggested category
  aiForecast  Json?      // AI enrichment data
}

// Budget — ADD fields
model Budget {
  // ... existing fields ...
  spaceId String? @db.VarChar(36)   // ← EXISTS
  space   Space?  @relation(fields: [spaceId], references: [id], onDelete: SetNull)

  // NEW
  aiRebalancedAt DateTime?
  aiSuggestions  Json?
}

// Goal — ADD fields
model Goal {
  // ... existing fields ...
  spaceId String? @db.VarChar(36)   // ← EXISTS
  space   Space?  @relation(fields: [spaceId], references: [id], onDelete: SetNull)

  // NEW
  lifeEventId  String?    @db.VarChar(36)
  lifeEvent    LifeEvent? @relation(fields: [lifeEventId], references: [id], onDelete: SetNull)
  aiForecast   Json?
  aiPace       String?    // 'on_track' | 'behind' | 'ahead'
}

// User — ADD fields
model User {
  // ... existing fields ...
  financeMode    String?   // 'personal' | 'couple' | 'family' | 'all'
  onboardingStep String?   // tracking onboarding progress
  dabbuScore     Int?      @default(0)
  scoreLevel     String?   @default('critical')
}
```

---

## 4. NESTJS BACKEND CHANGES

### 4.1 New Modules

```
src/modules/
├── spaces/                    ★ UPGRADE
│   ├── spaces.controller.ts   ★ ADD: create default on signup, switch active
│   ├── spaces.service.ts      ★ ADD: auto-create from onboarding
│   └── spaces.module.ts
│
├── life-events/               ★ NEW MODULE
│   ├── life-events.controller.ts
│   ├── life-events.service.ts
│   ├── life-events.module.ts
│   ├── dto/
│   │   ├── create-life-event.dto.ts
│   │   ├── update-life-event.dto.ts
│   │   └── confirm-life-event.dto.ts
│   └── strategies/             ★ AI detection strategies
│       ├── house-detection.strategy.ts
│       ├── baby-detection.strategy.ts
│       ├── wedding-detection.strategy.ts
│       ├── car-detection.strategy.ts
│       └── vacation-detection.strategy.ts
│
├── dabbu-score/               ★ NEW MODULE (replaces health-score)
│   ├── dabbu-score.controller.ts
│   ├── dabbu-score.service.ts
│   ├── dabbu-score.module.ts
│   └── strategies/
│       ├── savings-rate.strategy.ts
│       ├── debt-ratio.strategy.ts
│       ├── emergency-fund.strategy.ts
│       ├── goal-progress.strategy.ts
│       ├── bill-discipline.strategy.ts
│       ├── investment-score.strategy.ts      ★ NEW
│       └── insurance-score.strategy.ts       ★ NEW
│
├── life-plans/                ★ NEW MODULE
│   ├── life-plans.controller.ts
│   ├── life-plans.service.ts
│   ├── life-plans.module.ts
│   ├── dto/
│   └── planners/               ★ Each planner as a strategy
│       ├── house-planner.strategy.ts
│       ├── baby-planner.strategy.ts
│       ├── car-planner.strategy.ts
│       ├── education-planner.strategy.ts
│       ├── vacation-planner.strategy.ts
│       ├── wedding-planner.strategy.ts
│       ├── retirement-planner.strategy.ts
│       └── investment-planner.strategy.ts
│
└── ai/                        ★ EXPAND (AI layer endpoints)
    └── ai.controller.ts        ★ ADD: contextual AI for any screen
        ├── POST /ai/contextual/insight    → AI for specific screen + entity
        ├── POST /ai/contextual/forecast   → AI forecast for goal/plan
        └── POST /ai/contextual/rebalance  → AI budget rebalancing
```

### 4.2 New API Endpoints

```
# ─── Spaces ───
GET    /spaces                          # List user's spaces
POST   /spaces                          # Create space (with type)
GET    /spaces/:id                      # Space detail
PATCH  /spaces/:id                      # Update space
DELETE /spaces/:id                      # Delete space
POST   /spaces/default                  # Create default personal space
PATCH  /spaces/:id/activate             # Set active space
GET    /spaces/:id/transactions         # Transactions for a space
GET    /spaces/:id/goals               # Goals for a space
GET    /spaces/:id/budgets             # Budgets for a space

# ─── Life Events ───
GET    /life-events                     # List user's life events
POST   /life-events                     # Create life event manually
GET    /life-events/:id                 # Life event detail
PATCH  /life-events/:id                 # Update (confirm/dismiss)
DELETE /life-events/:id                 # Delete life event
GET    /life-events/timeline            # Life event timeline
POST   /life-events/:id/create-plan     # Create life plan from event
POST   /life-events/detect              # Trigger AI detection

# ─── Life Plans ───
GET    /life-plans                      # List life plans
POST   /life-plans                      # Create life plan
GET    /life-plans/:id                  # Plan detail
PATCH  /life-plans/:id                  # Update plan
DELETE /life-plans/:id                  # Delete plan
POST   /life-plans/:id/forecast         # Get AI forecast for plan
POST   /life-plans/:id/contribute       # Contribute to plan

# ─── Dabbu Score ───
GET    /dabbu-score                     # Current score
GET    /dabbu-score/history             # Score history (for charts)
GET    /dabbu-score/components          # Component breakdown
GET    /dabbu-score/improvements        # Improvement suggestions
POST   /dabbu-score/recalculate         # Force recalculate

# ─── AI Contextual ───
POST   /ai/contextual/insight           # { screen, entityId, entityType } → insight
POST   /ai/contextual/forecast          # { goalId | planId } → forecast
POST   /ai/contextual/rebalance         # { budgetId } → suggestions
POST   /ai/contextual/categorize        # { description, amount } → AI category

# ─── Onboarding ───
POST   /onboarding/start                # Initialize onboarding
POST   /onboarding/mode                 # Set finance mode
POST   /onboarding/goals                # Set life goals
POST   /onboarding/complete             # Finalize (create spaces)
GET    /onboarding/status               # Get onboarding progress
```

### 4.3 AI Service Expansion

```typescript
// ai.service.ts — ADD methods

async getContextualInsight(params: {
  screen: string;        // 'goal' | 'budget' | 'transaction' | 'planner' | 'home'
  entityType: string;    // 'goal' | 'budget' | 'plan' | 'space'
  entityId: string;
  userId: string;
}): Promise<AIInsight | null>

async getForecast(params: {
  entityType: 'goal' | 'plan';
  entityId: string;
  userId: string;
}): Promise<AIForecast>

async getRebalancingSuggestions(budgetId: string, userId: string): Promise<AIRebalanceSuggestion[]>

async categorizeTransaction(description: string, amount: number, userId: string): Promise<AICategoryResult>
```

---

## 5. REACT NATIVE IMPLEMENTATION

### 5.1 New Providers (Context)

```typescript
// providers/ActiveSpaceProvider.tsx
// Provides activeSpace context — used by EVERY screen
// Wraps NavigationContainer

interface ActiveSpaceContextType {
  activeSpace: Space | null;
  spaces: Space[];
  setActiveSpace: (spaceId: string) => Promise<void>;
  switchSpace: (spaceId: string) => void;
  loading: boolean;
}

// providers/LifeEventProvider.tsx
// Manages life events lifecycle
interface LifeEventContextType {
  events: LifeEvent[];
  unconfirmedCount: number;
  fetchEvents: () => Promise<void>;
  confirmEvent: (id: string) => Promise<void>;
  dismissEvent: (id: string) => Promise<void>;
  createEvent: (data: CreateLifeEventDto) => Promise<void>;
}

// providers/DabbuScoreProvider.tsx
interface DabbuScoreContextType {
  score: DabbuScore | null;
  history: DabbuScoreHistory[];
  refreshScore: () => Promise<void>;
  improvements: ScoreImprovement[];
}
```

### 5.2 New Zustand Stores

```typescript
// stores/lifeEventStore.ts
interface LifeEventStore {
  events: LifeEvent[];
  timeline: LifeTimelineEvent[];
  loading: boolean;
  error: string | null;

  fetchEvents: () => Promise<void>;
  fetchTimeline: () => Promise<void>;
  createEvent: (data: CreateLifeEventDto) => Promise<void>;
  confirmEvent: (id: string) => Promise<void>;
  dismissEvent: (id: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  detectEvents: () => Promise<void>;
}

// stores/spaceStore.ts — UPGRADE
interface SpaceStore {
  spaces: Space[];
  activeSpace: Space | null;
  loading: boolean;
  error: string | null;

  fetchSpaces: () => Promise<void>;
  createSpace: (data: CreateSpaceDto) => Promise<void>;
  setActiveSpace: (spaceId: string) => void;
  getTransactionsBySpace: (spaceId: string) => Promise<Transaction[]>;
  getGoalsBySpace: (spaceId: string) => Promise<Goal[]>;
  getBudgetsBySpace: (spaceId: string) => Promise<Budget[]>;
}
```

### 5.3 New Custom Hooks

```typescript
// hooks/useActiveSpace.ts
function useActiveSpace() {
  // Returns active space context
  // Used by: LifeDashboard, AddExpense, Goals, Budgets, Transactions
  return useContext(ActiveSpaceContext);
}

// hooks/useLifeEvents.ts
function useLifeEvents() {
  // Returns life events with count, unconfirmed count
  // Used by: Home, LifeEventsScreen, SpaceDetail
  return useContext(LifeEventContext);
}

// hooks/useDabbuScore.ts
function useDabbuScore() {
  // Returns score with mini badge data
  // Used by: EVERY SCREEN (via ScoreMini)
  return useContext(DabbuScoreContext);
}

// hooks/useAIContextual.ts
function useAIContextual(screen: string, entityId?: string, entityType?: string) {
  // Fetches AI insight for current context
  // Returns: { insight, loading, error, refresh }
}

// hooks/useRevenueCat.ts
function useRevenueCat() {
  // RevenueCat wrapper
  // Returns: { isPremium, products, purchase, restore, loading }
}

// hooks/useOnboarding.ts
function useOnboarding() {
  // Onboarding state machine
  // Returns: { step, financeMode, lifeGoals, goNext, goBack, complete }
}
```

### 5.4 API Service Updates

```typescript
// services/api.ts — UPGRADE

// ADD: space-aware headers
function getHeaders() {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  const activeSpaceId = getActiveSpaceId(); // from store
  if (activeSpaceId) {
    headers['X-Active-Space'] = activeSpaceId;
  }
  return headers;
}

// ADD: space-specific methods
const spaceApi = {
  getTransactions: (spaceId: string, params?: any) =>
    api.get(`/spaces/${spaceId}/transactions`, params),
  getGoals: (spaceId: string) =>
    api.get(`/spaces/${spaceId}/goals`),
  getBudgets: (spaceId: string) =>
    api.get(`/spaces/${spaceId}/budgets`),
};
```

### 5.5 RevenueCat Service

```typescript
// services/revenuecat.ts — NEW
import Purchases from 'react-native-purchases';

const REVENUECAT_API_KEY = 'your_api_key_here';
const ENTITLEMENT_ID = 'premium';

export const revenueCat = {
  configure: () => {
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });
  },

  getProducts: async (): Promise<RCProduct[]> => {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  },

  purchase: async (package: RCPackage): Promise<boolean> => {
    const { customerInfo } = await Purchases.purchasePackage(package);
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  },

  restore: async (): Promise<boolean> => {
    const { customerInfo } = await Purchases.restorePurchases();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  },

  checkEntitlement: async (): Promise<boolean> => {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  },
};
```

---

## 6. NAVIGATION REDESIGN

### 6.1 Navigation Types

```typescript
// types/navigation.ts — REDESIGNED

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Lock: undefined;
  Main: undefined;
};

export type OnboardingStackParamList = {
  Welcome: undefined;
  FinanceMode: undefined;
  LifeGoals: { financeMode: FinanceMode };
  CreateSpaces: { selectedGoals: LifeGoal[] };
  InvitePartner: undefined;
  ConnectBank: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Spaces: undefined;
  LifeHub: undefined;
  AI: undefined;
  Profile: undefined;
};

export type LifeDashboardParamList = {
  LifeDashboard: undefined;
  NetWorth: undefined;
  NotificationCenter: undefined;
  Notifications: undefined;
  Streaks: undefined;
  YearlySummary: undefined;
  GlobalSearch: undefined;
};

export type SpacesStackParamList = {
  SpacesDashboard: undefined;
  SpaceDetail: { spaceId: string };
  SpaceTransactions: { spaceId: string };
  SpaceGoals: { spaceId: string };
  SpaceBudgets: { spaceId: string };
  SpaceSettings: { spaceId: string };
  CreateSpace: { type?: SpaceType };
  CreateSpaceType: undefined;
  InviteMember: { spaceId: string };
};

export type LifeHubStackParamList = {
  LifeHub: undefined;
  HousePlanner: undefined;
  BabyPlanner: undefined;
  CarPlanner: undefined;
  EducationPlanner: undefined;
  VacationPlanner: undefined;
  WeddingPlanner: undefined;
  RetirementPlanner: undefined;
  InvestmentPlanner: undefined;
  LifeEvents: undefined;
  LifeEventDetail: { eventId: string };
  CreateLifeEvent: undefined;
  LifeTimeline: undefined;
};

export type AIStackParamList = {
  AIInsightsFeed: undefined;
  AIChat: undefined;
  PremiumAiPaywall: undefined;
};
```

### 6.2 Tab Bar Configuration

```typescript
// navigation/MainTabNavigator.tsx — REDESIGNED

const TABS = [
  { name: 'Home',     icon: 'home',       label: 'Home',     component: LifeDashboardNavigator },
  { name: 'Spaces',   icon: 'appstore1',  label: 'Spaces',   component: SpacesNavigator },
  { name: 'LifeHub',  icon: 'hearto',     label: 'Life Hub', component: LifeHubNavigator },
  { name: 'AI',       icon: 'bulb1',      label: 'AI',       component: AINavigator },
  { name: 'Profile',  icon: 'user',       label: 'Profile',  component: ProfileNavigator },
];
```

---

## 7. UI REDESIGN PLAN

### 7.1 LifeDashboardScreen (Replaces HomeScreen)

```typescript
// screens/home/LifeDashboardScreen.tsx

// Layout:
//
// ┌──────────────────────────────────┐
// │  Good Evening Karthik      🔔 👤 │  → Greeting + notifications + avatar
// ├──────────────────────────────────┤
// │  Net Worth              ▶       │
// │  ₹12.4L                        │  → Hero net worth card
// ├──────────────────────────────────┤
// │  82      ⚡ Excellent           │  → Dabbu Score mini + level
// │  ──────────────────────────     │
// │  ↑2 pts from last month         │  → Score change indicator
// ├──────────────────────────────────┤
// │ 🏦 4.2mo │ 🎯 7 Goals │ 📋 3    │  → Snapshot row
// ├──────────────────────────────────┤
// │ 💡 AI Insight                   │  → Persistent AI insight card
// │ You can buy your house...       │
// │ 11 months earlier by saving     │
// │ ₹4,000 more monthly.            │
// ├──────────────────────────────────┤
// │ Life Events                    │
// │ ┌──────────────────────────┐   │
// │ │ 🏠 House Purchase       │   │  → Life event cards
// │ │ 45% to goal · ₹45L      │   │
// │ └──────────────────────────┘   │
// │ ┌──────────────────────────┐   │
// │ │ 👶 Baby Fund             │   │
// │ │ ₹2L of ₹10L · 20%       │   │
// │ └──────────────────────────┘   │
// ├──────────────────────────────────┤
// │ Active Spaces                   │
// │ [Personal] [Couple] [Home] ...  │  → Horizontal scrollable chips
// ├──────────────────────────────────┤
// │ Quick Actions                   │
// │ [Add Expense] [Transfer] ...    │
// └──────────────────────────────────┘
```

### 7.2 SpaceSwitcher Component (Global Header)

```typescript
// components/global/SpaceSwitcher.tsx
// Dropdown in header — visible on every screen
// Shows: active space name + emoji + ▼
// On tap: bottom sheet with all spaces
// Each item: emoji + name + type badge + checkmark if active
```

### 7.3 AddExpense with Space Selector

```typescript
// screens/transactions/AddExpenseScreen.tsx — CHANGES

// ADD before amount input:
<SpaceSelector
  selectedSpaceId={spaceId}
  onSelect={setSpaceId}
/>

// The SpaceSelector opens a bottom sheet showing user's spaces
// Each item: {emoji} {name}
// Default: active space from ActiveSpaceContext
```

### 7.4 ScoreMini Component

```typescript
// components/global/DabbuScoreMini.tsx

// Usage: <DabbuScoreMini score={82} size="sm" />
// Shows: circular ring with score number
// Color: green (80+), yellow (50-79), red (<50)
// Place on: every major screen header, transaction detail, goal card
```

### 7.5 AIInsightCard (Global)

```typescript
// components/global/AIInsightCard.tsx

interface AIInsightCardProps {
  insight: string;
  type: 'tip' | 'warning' | 'forecast' | 'milestone';
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  source: string; // screen identifier for contextual placement
}

// Usage across ALL screens:
// - Goal screen: "Increase SIP by ₹1500 to reach goal 7 months earlier"
// - Budget screen: "You spent 18% more on food this month"
// - House Planner: "Current affordability: ₹55L home"
// - Transaction: "This looks like a duplicate of yesterday's expense"
```

---

## 8. ONBOARDING REDESIGN

### 8.1 Flow

```
Screen 1: Welcome
  ┌────────────────────────┐
  │    [Logo: Dabbu]       │
  │                        │
  │ Your Financial         │
  │ Life Operating System  │
  │                        │
  │ [Get Started]          │
  └────────────────────────┘

Screen 2: Finance Mode
  ┌────────────────────────┐
  │ How do you manage     │
  │ money?                 │
  │                        │
  │ ┌──────────────────┐  │
  │ │ 💼 Personal      │  │
  │ └──────────────────┘  │
  │ ┌──────────────────┐  │
  │ │ ❤️ Couple        │  │
  │ └──────────────────┘  │
  │ ┌──────────────────┐  │
  │ │ 👨‍👩‍👧‍👦 Family      │  │
  │ └──────────────────┘  │
  │ ┌──────────────────┐  │
  │ │ 🔄 All           │  │
  │ └──────────────────┘  │
  └────────────────────────┘

Screen 3: Life Goals (multi-select)
  ┌────────────────────────┐
  │ What are you           │
  │ planning?              │
  │                        │
  │ [🏠 House]  [👶 Baby] │
  │ [💍 Wedding] [🚗 Car] │
  │ [🎓 Education]         │
  │ [🌍 Vacation]          │
  │ [📈 Retirement]        │
  │ [💼 Business]          │
  │                        │
  │ [Continue]             │
  └────────────────────────┘

Screen 4: Spaces Preview
  ┌────────────────────────┐
  │ We've created spaces   │
  │ for you                │
  │                        │
  │ 📁 Personal Space     │
  │ 📁 Couple Space       │
  │ 🏠 Home Fund          │
  │ 👶 Baby Fund          │
  │                        │
  │ [Looks Good →]         │
  └────────────────────────┘

Screen 5: Invite Partner
  ┌────────────────────────┐
  │ Invite your partner    │
  │                        │
  │ [Phone Number]         │
  │ [Send Invite]          │
  │                        │
  │ ─── or ───             │
  │                        │
  │ [Skip for now]         │
  └────────────────────────┘

Screen 6: Connect
  ┌────────────────────────┐
  │ Connect your bank      │
  │ or sync SMS            │
  │                        │
  │ [Connect Bank]         │
  │ [Sync SMS]             │
  │                        │
  │ [I'll do this later]   │
  └────────────────────────┘
```

### 8.2 Onboarding Store

```typescript
// stores/onboardingStore.ts — NEW

interface OnboardingStore {
  step: number;
  financeMode: FinanceMode | null;
  lifeGoals: LifeGoal[];
  spacesPreview: Space[];
  completed: boolean;

  setFinanceMode: (mode: FinanceMode) => Promise<void>;
  setLifeGoals: (goals: LifeGoal[]) => Promise<void>;
  createSpaces: () => Promise<void>;
  complete: () => Promise<void>;
  skip: () => Promise<void>;
}
```

---

## 9. PREMIUM SYSTEM (RevenueCat)

### 9.1 Entitlements Configuration

```typescript
// config/revenuecat.ts — NEW

export const REVENUECAT_CONFIG = {
  apiKeys: {
    ios: 'appl_...',
    android: 'goog_...',
  },
  entitlements: {
    premium: 'premium',
    family: 'family',
  },
  products: {
    monthly: {
      identifier: 'dabbu_premium_monthly',
      price: 99, // INR
    },
    yearly: {
      identifier: 'dabbu_premium_yearly',
      price: 999, // INR
    },
    family_monthly: {
      identifier: 'dabbu_family_monthly',
      price: 199, // INR
    },
    family_yearly: {
      identifier: 'dabbu_family_yearly',
      price: 1999, // INR
    },
  },
};
```

### 9.2 Feature Gating Update

```typescript
// config/entitlements.ts — UPDATED

export const FEATURE_ENTITLEMENTS: Record<FeatureKey, PlanTier> = {
  AI_COACH:              PlanTier.PREMIUM,
  WEALTH_FORECAST:       PlanTier.PREMIUM,
  HOUSE_PLANNER:         PlanTier.PREMIUM,
  RETIREMENT_PLANNER:    PlanTier.PREMIUM,
  TAX_FORECAST:          PlanTier.PREMIUM,
  FAMILY_FORECAST:       PlanTier.FAMILY,
  OCR_SCANNING:          PlanTier.PREMIUM,
  EXPORT_REPORTS:        PlanTier.PREMIUM,
  DABBU_SCORE_FULL:      PlanTier.PREMIUM,   // detailed breakdown
  CAR_PLANNER:           PlanTier.PREMIUM,
  EDUCATION_PLANNER:     PlanTier.PREMIUM,
  VACATION_PLANNER:      PlanTier.PREMIUM,
  WEDDING_PLANNER:       PlanTier.PREMIUM,
  // ... existing features
};
```

### 9.3 Subscription Center Screen

```typescript
// screens/premium/SubscriptionCenterScreen.tsx — NEW
// Shows:
// 1. Current plan + status
// 2. Available plans (Monthly / Yearly / Family)
// 3. Feature comparison table
// 4. "Upgrade" / "Downgrade" / "Cancel" buttons
// 5. Billing history link
// 6. Restore purchases button
```

---

## 10. ANALYTICS EVENTS

```typescript
// New analytics events for V3

export const V3_EVENTS = {
  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_MODE_SELECTED: 'onboarding_mode_selected',     // { mode: 'personal' | 'couple' | 'family' | 'all' }
  ONBOARDING_GOALS_SELECTED: 'onboarding_goals_selected',   // { goals: ['house', 'baby', ...] }
  ONBOARDING_SPACES_CREATED: 'onboarding_spaces_created',   // { count: 3, types: [...] }
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',

  // Spaces
  SPACE_CREATED: 'space_created',               // { type: 'HOME', source: 'onboarding' | 'manual' }
  SPACE_ACTIVATED: 'space_activated',            // { spaceId, type }
  SPACE_DELETED: 'space_deleted',
  TRANSACTION_ADDED_TO_SPACE: 'transaction_added_to_space', // { spaceId, spaceType }
  GOAL_CREATED_IN_SPACE: 'goal_created_in_space',
  BUDGET_CREATED_IN_SPACE: 'budget_created_in_space',

  // Life Events
  LIFE_EVENT_DETECTED: 'life_event_detected',    // { eventType, source: 'ai' }
  LIFE_EVENT_CONFIRMED: 'life_event_confirmed',   // { eventType }
  LIFE_EVENT_DISMISSED: 'life_event_dismissed',
  LIFE_EVENT_MANUALLY_CREATED: 'life_event_manually_created',
  LIFE_EVENT_PLAN_CREATED: 'life_event_plan_created',

  // Dabbu Score
  DABBU_SCORE_VIEWED: 'dabbu_score_viewed',
  DABBU_SCORE_COMPONENT_TAPPED: 'dabbu_score_component_tapped', // { component: 'savingsRate' }
  DABBU_SCORE_IMPROVEMENT_VIEWED: 'dabbu_score_improvement_viewed',

  // AI Contextual
  AI_INSIGHT_VIEWED: 'ai_insight_viewed',        // { screen: 'goal', entityType: 'goal' }
  AI_INSIGHT_ACTIONED: 'ai_insight_actioned',    // { actionType: 'increase_sip' | 'reduce_spending' }
  AI_CATEGORY_ACCEPTED: 'ai_category_accepted',
  AI_CATEGORY_REJECTED: 'ai_category_rejected',

  // Premium
  PREMIUM_PURCHASE_STARTED: 'premium_purchase_started',
  PREMIUM_PURCHASE_COMPLETED: 'premium_purchase_completed',
  PREMIUM_PURCHASE_FAILED: 'premium_purchase_failed',
  PREMIUM_RESTORED: 'premium_restored',
  PREMIUM_CANCELLED: 'premium_cancelled',
};
```

---

## 11. MIGRATION SCRIPTS

### 11.1 Data Migration

```sql
-- 1. Create default Personal Space for all existing users
INSERT INTO spaces (id, name, type, emoji, color, created_by, is_default, created_at)
SELECT
  gen_random_uuid()::text,
  'Personal',
  'PERSONAL',
  '💼',
  '#7C3AED',
  u.id,
  true,
  NOW()
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM spaces s WHERE s.created_by = u.id AND s.type = 'PERSONAL'
);

-- 2. Migrate existing couple/family groups to spaces
INSERT INTO spaces (id, name, type, emoji, color, created_by, is_default, created_at)
SELECT
  sg.id,
  sg.name,
  CASE sg.type WHEN 'COUPLE' THEN 'COUPLE' WHEN 'FAMILY' THEN 'FAMILY' ELSE 'CUSTOM' END,
  CASE sg.type WHEN 'COUPLE' THEN '❤️' WHEN 'FAMILY' THEN '👨‍👩‍👧‍👦' ELSE '📁' END,
  CASE sg.type WHEN 'COUPLE' THEN '#FF6B9D' WHEN 'FAMILY' THEN '#22C55E' ELSE '#7C3AED' END,
  sg.created_by,
  false,
  sg.created_at
FROM shared_groups sg
WHERE sg.type IN ('COUPLE', 'FAMILY')
AND NOT EXISTS (SELECT 1 FROM spaces s WHERE s.id = sg.id);

-- 3. Link existing transactions to their space via shared group membership
UPDATE transactions t
SET space_id = sg.id
FROM shared_group_members sgm
JOIN shared_groups sg ON sg.id = sgm.group_id
WHERE t.paid_by = sgm.user_id
AND t.space_id IS NULL
AND sg.type IN ('COUPLE', 'FAMILY');

-- 4. Link existing goals to spaces
UPDATE goals g
SET space_id = sg.id
FROM shared_group_members sgm
JOIN shared_groups sg ON sg.id = sgm.group_id
WHERE g.user_id = sgm.user_id
AND g.space_id IS NULL
AND sg.type IN ('COUPLE', 'FAMILY');

-- 5. Set default space for personal transactions
UPDATE transactions t
SET space_id = s.id
FROM spaces s
WHERE s.created_by = t.user_id
AND s.type = 'PERSONAL'
AND s.is_default = true
AND t.space_id IS NULL;
```

### 11.2 Prisma Migration Steps

```bash
# Step 1: Generate migration
npx prisma migrate dev --name add_life_events_and_plans

# Step 2: Run data migration
npx ts-node scripts/migrate-existing-data.ts

# Step 3: Verify
npx prisma studio
```

---

## 12. QA CHECKLIST

### 12.1 Spaces

```
[ ] Personal Space auto-created on signup
[ ] Can create all space types (PERSONAL through CUSTOM)
[ ] Active space switcher works from every screen
[ ] Add Expense shows space selector
[ ] Transactions filterable by space
[ ] Goals filterable by space
[ ] Budgets filterable by space
[ ] Space detail shows accurate dashboard
[ ] Can invite members to space
[ ] Can delete space with confirmation
[ ] Space emoji + color customization works
```

### 12.2 Life Events

```
[ ] AI detects life events from transaction patterns
[ ] Detected events appear on Home Screen
[ ] User can confirm/dismiss detected events
[ ] User can manually create life events
[ ] Creating life event creates corresponding space
[ ] Creating life event creates corresponding goal
[ ] Life Timeline shows accurate event history
[ ] Events link to plans/goals/spaces properly
[ ] Event deletion cascades correctly
```

### 12.3 Dabbu Score

```
[ ] Score displays correctly on LifeDashboard
[ ] ScoreMini badge visible on all major screens
[ ] All 7 components shown with values
[ ] Score history chart renders correctly
[ ] Improvement suggestions are accurate
[ ] Score recalculates after new transactions
[ ] Monthly change indicator works
[ ] Score level colors correct (green/yellow/red)
```

### 12.4 AI Contextual

```
[ ] AI insight shown on Home Screen (persistent card)
[ ] AI forecast shown on Goal Detail
[ ] AI rebalancing shown on Budget screen
[ ] AI affordability shown on House Planner
[ ] AI categorization works on Add Expense
[ ] AI insight cards are dismissible
[ ] AI insights respect premium gating
[ ] AI doesn't fire on every render (rate limited)
```

### 12.5 Onboarding

```
[ ] Welcome screen renders
[ ] Finance mode selection works
[ ] Life goals multi-select works
[ ] Spaces preview shows correct spaces
[ ] Invite partner (optional) works
[ ] Connect bank/SMS (optional) works
[ ] Skip works at every step
[ ] Returning users see correct screen
[ ] Edit onboarding from settings works
```

### 12.6 Premium

```
[ ] RevenueCat configured for iOS + Android
[ ] Products load correctly
[ ] Purchase flow completes
[ ] Restore purchases works
[ ] Premium features gated correctly
[ ] Subscription center shows correct status
[ ] Cancellation flow works
[ ] Billing history loads
[ ] Premium badge shown on locked features
```

### 12.7 Regression

```
[ ] Existing auth flow unchanged
[ ] Existing expense tracking works
[ ] Existing couple features work (merged into spaces)
[ ] Existing family features work (merged into spaces)
[ ] Existing notifications work
[ ] Existing settings screens work
[ ] Offline mode works
[ ] Push notifications work
[ ] SMS sync works
[ ] All old navigation paths redirect correctly
```

---

## 13. END-TO-END TODO LIST

### PHASE 0: PREPARATION (Week 1)

- [ ] Review and merge all existing PRs
- [ ] Create `feature/v3` branch from `main`
- [ ] Run full audit of existing screens vs V3 targets
- [ ] Delete confirmed stub/TODO files (see legacy/ folder plan)
- [ ] Generate Prisma migration for new models
- [ ] Run data migration script for existing users
- [ ] Set up RevenueCat project + API keys
- [ ] Create Firebase Remote Config flags for V3 rollout

### PHASE 1: SPACES FOUNDATION (Week 2-3)

**Backend:**
- [ ] Add SpaceType enum to Prisma schema
- [ ] Add fields to Space model (emoji, color, isDefault, metadata)
- [ ] Create spaces controller endpoints (CRUD + transactions/goals/budgets)
- [ ] Auto-create Personal Space on user signup
- [ ] Add `X-Active-Space` header support to API gateway
- [ ] Data migration: migrate existing shared groups to spaces

**Mobile:**
- [ ] Create `SpaceSwitcher` component (header dropdown)
- [ ] Create `SpaceSelector` component (for forms)
- [ ] Create `hooks/useActiveSpace.ts`
- [ ] Create `providers/ActiveSpaceProvider.tsx`
- [ ] Upgrade `stores/spaceStore.ts` with active space logic
- [ ] Add space selector to `AddExpenseScreen.tsx`
- [ ] Add space filter to `TransactionsList.tsx`
- [ ] Add space filter to `GoalsListScreen.tsx`
- [ ] Add space filter to `BudgetsListScreen.tsx`
- [ ] Create `SpaceTransactionsScreen.tsx`
- [ ] Create `SpaceGoalsScreen.tsx`
- [ ] Create `SpaceBudgetsScreen.tsx`
- [ ] Create `SpaceSettingsScreen.tsx`
- [ ] Redesign `SpacesDashboardScreen.tsx` with active space
- [ ] Redesign `SpaceDetailScreen.tsx` with full tabs
- [ ] Fix `CreateSpaceScreen.tsx` (wire to API)

### PHASE 2: LIFE EVENTS SYSTEM (Week 3-4)

**Backend:**
- [ ] Create LifeEvent Prisma model
- [ ] Create LifePlan Prisma model
- [ ] Build life-events module (controller + service)
- [ ] Build life-plans module (controller + service)
- [ ] Implement AI detection strategies (house, baby, wedding, car, vacation)
- [ ] Create detection pipeline that runs weekly
- [ ] Build life event → plan → goal → space creation chain

**Mobile:**
- [ ] Create `stores/lifeEventStore.ts`
- [ ] Create `hooks/useLifeEvents.ts`
- [ ] Create `screens/life-events/LifeEventsListScreen.tsx`
- [ ] Create `screens/life-events/LifeEventDetailScreen.tsx`
- [ ] Create `screens/life-events/CreateLifeEventScreen.tsx`
- [ ] Create `screens/life-events/LifeTimelineScreen.tsx`
- [ ] Add Life Events section to LifeDashboard
- [ ] Create `components/global/LifeEventBadge.tsx`

### PHASE 3: ONBOARDING REDESIGN (Week 4-5)

- [ ] Create `stores/onboardingStore.ts`
- [ ] Create `navigation/OnboardingNavigator.tsx`
- [ ] Build `WelcomeScreen.tsx`
- [ ] Build `FinanceModeScreen.tsx`
- [ ] Build `LifeGoalsScreen.tsx`
- [ ] Build `CreateSpacesScreen.tsx`
- [ ] Build `InvitePartnerScreen.tsx`
- [ ] Build `ConnectBankScreen.tsx`
- [ ] Create backend onboarding endpoints
- [ ] Implement auto-space-creation logic
- [ ] Add skip functionality at every step

### PHASE 4: HOME SCREEN REDESIGN (Week 5-6)

**Backend:**
- [ ] Create /dabbu-score endpoints (current, history, components, improvements)
- [ ] Create /life-plans endpoints
- [ ] Create /spaces/default endpoint

**Mobile:**
- [ ] Build `screens/home/LifeDashboardScreen.tsx` (replace HomeScreen)
- [ ] Build `HeroSection.tsx` (greeting + net worth + score)
- [ ] Build `SnapshotRow.tsx` (emergency fund, goals, events, bills)
- [ ] Build `AIInsightCard.tsx` (persistent, not carousel)
- [ ] Build `LifeEventsSection.tsx`
- [ ] Build `ActiveSpacesRow.tsx`
- [ ] Create `providers/DabbuScoreProvider.tsx`
- [ ] Create `components/global/DabbuScoreMini.tsx`
- [ ] Create `stores/dabbuScoreStore.ts` (rename from healthStore)

### PHASE 5: DABBU SCORE GAMIFICATION (Week 6)

- [ ] Rename HealthScore → DabbuScore everywhere
- [ ] Add Investments + Insurance score components
- [ ] Build `screens/health/DabbuScoreScreen.tsx`
- [ ] Build `screens/health/ScoreBreakdownScreen.tsx`
- [ ] Build `screens/health/ScoreImprovementScreen.tsx`
- [ ] Build "How to improve" actionable tips for each component
- [ ] Add DabbuScoreMini to all major screen headers
- [ ] Add score history chart (last 6 months)
- [ ] Add score change indicator (↑2 pts from last month)

### PHASE 6: AI EVERYWHERE (Week 6-7)

**Backend:**
- [ ] Build POST /ai/contextual/insight endpoint
- [ ] Build POST /ai/contextual/forecast endpoint
- [ ] Build POST /ai/contextual/rebalance endpoint
- [ ] Build POST /ai/contextual/categorize endpoint
- [ ] Add rate limiting for AI endpoints

**Mobile:**
- [ ] Create `hooks/useAIContextual.ts`
- [ ] Create `components/global/AIInsightCard.tsx`
- [ ] Integrate AIInsightCard into GoalDetailScreen
- [ ] Integrate AIInsightCard into BudgetDetailScreen
- [ ] Integrate AIInsightCard into HousePlannerScreen
- [ ] Integrate AIInsightCard into LifeDashboardScreen
- [ ] Add AI categorization to AddExpenseScreen
- [ ] Add AI duplicate detection to transactions
- [ ] Deprecate AIChatScreen as primary — make it secondary

### PHASE 7: COMPLETE LIFE HUB (Week 7-8)

- [ ] Wire HousePlannerScreen to backend API
- [ ] Wire BabyPlannerScreen to backend API
- [ ] Wire RetirementPlannerScreen to backend API
- [ ] Wire InvestmentPlannerScreen to backend API
- [ ] Build CarPlannerScreen.tsx
- [ ] Build EducationPlannerScreen.tsx
- [ ] Build VacationPlannerScreen.tsx
- [ ] Build WeddingPlannerScreen.tsx (replace stub)
- [ ] Create backend planner strategies for all 8 types
- [ ] Create LifePlan → Space → Goal auto-creation
- [ ] Each planner shows AI affordability/forecast

### PHASE 8: PREMIUM + REVENUECAT (Week 8)

- [ ] Install `react-native-purchases`
- [ ] Create `services/revenuecat.ts`
- [ ] Create `hooks/useRevenueCat.ts`
- [ ] Configure RevenueCat iOS + Android
- [ ] Wire purchase flow in PremiumScreen
- [ ] Wire restore purchases in Settings
- [ ] Build SubscriptionCenterScreen
- [ ] Add upgrade prompts at feature-gate points
- [ ] Test purchase flow end-to-end

### PHASE 9: APPLE QUALITY POLISH (Week 8-9)

- [ ] Verify SF Pro font usage (or Inter as fallback)
- [ ] Add skeleton loading to all screens
- [ ] Verify haptic feedback on all interactions
- [ ] Verify gesture-driven navigation
- [ ] Verify pull-to-refresh on all scrollable screens
- [ ] Check error states on all API-calling screens
- [ ] Check empty states on all list screens
- [ ] Verify offline mode covers all screens
- [ ] Test all navigation transitions
- [ ] Performance profiling: frame drops, memory, startup time

### PHASE 10: LEGACY CLEANUP (Week 9)

- [ ] Delete `PersonalDashboardScreen.tsx`
- [ ] Delete `CoupleDashboardScreen.tsx` (stub)
- [ ] Delete `SharedFinanceDashboardScreen.tsx` (stub)
- [ ] Delete `SharedFinanceReportsScreen.tsx` (stub)
- [ ] Delete `SharedFinanceGoalsScreen.tsx` (stub)
- [ ] Delete `FamilyMemberDetailScreen.tsx` (stub)
- [ ] Delete `HomeScreen.tsx` (replaced by LifeDashboardScreen)
- [ ] Delete `DashboardRouterScreen.tsx`
- [ ] Deprecate `CoupleSpaceRouter.tsx` (merge into SpacesNavigator)
- [ ] Deprecate `FamilySpaceNavigator.tsx` (merge into SpacesNavigator)
- [ ] Deprecate `FamilyHubNavigator.tsx` (merge into LifeHubNavigator)
- [ ] Remove all unused `api` imports from settings screens
- [ ] Fix all "imported but never used" warnings

---

## 14. PHASE EXECUTION ORDER

```
Week 1:  ┌──────────┐
         │ PHASE 0  │ Preparation & migration
         └──────────┘
              │
Week 2-3: ┌──────────┐
          │ PHASE 1  │ Spaces Foundation (core pillar)
          └──────────┘
              │
Week 3-4: ┌──────────┐
          │ PHASE 2  │ Life Events System (core pillar)
          └──────────┘
              │
Week 4-5: ┌──────────┐
          │ PHASE 3  │ Onboarding Redesign
          └──────────┘
              │
Week 5-6: ┌──────────┐
          │ PHASE 4  │ Home Screen Redesign
          └──────────┘
              │
Week 6:   ┌──────────┐
          │ PHASE 5  │ Dabbu Score Gamification
          └──────────┘
              │
Week 6-7: ┌──────────┐
          │ PHASE 6  │ AI Everywhere (core pillar)
          └──────────┘
              │
Week 7-8: ┌──────────┐
          │ PHASE 7  │ Complete Life Hub
          └──────────┘
              │
Week 8:   ┌──────────┐
          │ PHASE 8  │ Premium + RevenueCat
          └──────────┘
              │
Week 8-9: ┌──────────┐
          │ PHASE 9  │ Apple Quality Polish
          └──────────┘
              │
Week 9:   ┌──────────┐
          │ PHASE 10 │ Legacy Cleanup
          └──────────┘
              │
          ✅ DABBU V3 SHIP READY
```

**Total estimated effort: 9 weeks with 2-3 engineers.**

---

## APPENDIX: KEY METRICS TO TRACK POST-V3

```
Metric                        Target
─────────────────────────────────────────────
Onboarding completion rate    > 70%
Active space creation rate    > 2 spaces/user
Life event confirmation rate  > 40%
Dabbu Score weekly viewers    > 60% of MAU
AI insight engagement rate    > 25%
Premium conversion rate       > 5% of MAU
Spaces as % of transactions   > 80% tagged to a space
NPS (Net Promoter Score)      > 40
App Store rating              > 4.5
DAU/MAU ratio                 > 40%
```

---

**END OF DABBU V3 TRANSFORMATION PLAN**
