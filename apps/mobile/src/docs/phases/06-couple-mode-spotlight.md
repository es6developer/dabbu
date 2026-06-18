# Phase 6 — Couple Mode Spotlight

## 1. Product Strategy

### Current State
- Couple mode exists but is buried: accessible via Profile → Add Partner, then CoupleSpace (hidden in Settings)
- 23 couple screen files exist but only 6 are wired into navigators
- Couple dashboards, planners, gamification are all built but unreachable
- The rose-tinted couple theme is the most distinctive visual feature

### Target State
- Couple mode is the **hero feature** of the Family tab
- When a user has a partner, a dedicated "Couple Dashboard" appears as the primary view in Family Hub
- Couple-specific UX is elevated with its own navigation, empty states, and premium upsells

### Positioning
```
Without Couple Mode:  "Dabbu is a personal finance app"
With Couple Mode:     "Dabbu is how we manage our money together"
```

---

## 2. Couple Dashboard Design

```
┌──────────────────────────────────────────┐
│ ← Family           Couple Finance       │
├──────────────────────────────────────────┤
│                                          │
│ ┌── Partner Avatars ──────────────────┐  │
│ │  [👤 Karthik]  ❤️  [👩 Priya]      │  │
│ │    Combined Net Worth: ₹18,45,000   │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── Monthly Score ────────────────────┐  │
│ │  🔥 82    Great teamwork!          │  │
│ │    ↑5 pts from last month          │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── Combined Finances ────────────────┐  │
│ │  Income     ₹1,85,000  ↑8%         │  │
│ │  Expenses   ₹1,12,000  ↓3%         │  │
│ │  Savings    ₹73,000   ⚡39% rate   │  │
│ │  Shared     32% of expenses        │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── Shared Goals ─────────────────────┐  │
│ │  🏠 House     ₹4.5L/₹50L · 9%     │  │
│ │  ✈️ Vacation  ₹12K/₹1.5L · 8%    │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── Upcoming Shared Bills ────────────┐  │
│ │  📄 Rent         ₹18,000 · 3d     │  │
│ │  📄 Electricity  ₹2,400  · 7d     │  │
│ │  📄 WiFi         ₹1,199  · 12d    │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ 💡 Priya spends 32% more on groceries    │
│    but 15% less on dining out.           │
│                                          │
│ ┌── Quick Actions ───────────────────┐   │
│ │  [Split Expense] [Add Goal] [Settle Up]│
│ └──────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## 3. Component Hierarchy

```
CoupleDashboardScreen
├── SafeAreaView
│   ├── Header (back + title + settings gear)
│   │
│   ├── ScrollView (refreshable)
│   │   ├── PartnerCard
│   │   │   ├── AvatarRow (2 profile bubbles)
│   │   │   ├── CombinedNetWorth (amount + trend)
│   │   │   └── CoupleSince (badge)
│   │   │
│   │   ├── ScoreCard
│   │   │   ├── ScoreRing (SVG, 0-100)
│   │   │   ├── ScoreLabel ("Great teamwork!")
│   │   │   └── DeltaBadge (↑5 pts)
│   │   │
│   │   ├── CombinedFinancesCard
│   │   │   ├── IncomeRow (amount + badge)
│   │   │   ├── ExpenseRow (amount + badge)
│   │   │   ├── SavingsRow (amount + rate pill)
│   │   │   └── SharedPercentage
│   │   │
│   │   ├── SharedGoalsSection
│   │   │   ├── SectionHeader ("Shared Goals" → See All)
│   │   │   └── GoalRow[] (emoji, name, progress, amount)
│   │   │
│   │   ├── UpcomingBillsSection
│   │   │   ├── SectionHeader ("Shared Bills" → See All)
│   │   │   └── BillRow[] (icon, name, amount, days)
│   │   │
│   │   ├── AIInsightCard
│   │   │   └── Text ("💡 Partner insight message")
│   │   │
│   │   └── QuickActionsRow
│   │       ├── SplitExpenseBtn
│   │       ├── AddGoalBtn
│   │       └── SettleUpBtn
│   │
│   └── SettleUpModal (bottom sheet)
```

---

## 4. User Journey

### Flow: New Couple Setup
```
Profile → AddPartner → Send Invite (SMS/QR)
  → Partner accepts
    → Couple created
      → CoupleDashboard is now visible in Family tab
      → Push notification: "You're connected!"
```

### Flow: Daily Couple Engagement
```
Open App → Family Tab → Couple Dashboard (if coupled)
  Check combined net worth
  View monthly score
  See AI insight about partner spending
  Tap "Split Expense" → SharedExpenseForm (pre-filled with partner)
  See shared goals → GoalDetail (combined progress)
```

### Flow: Couple Breakup
```
Settings → Couple Settings → Disconnect
  → Confirmation dialog
    → Data preserved (each keeps own transactions)
    → Shared groups converted to individual
    → Couple theme disabled
```

---

## 5. Empty States

### No Partner Yet
```
┌─────────────────────────────────┐
│  💑                             │
│                                 │
│  Manage money together          │
│                                 │
│  Track shared expenses, save    │
│  for goals, and build wealth    │
│  as a couple.                   │
│                                 │
│  [Add Partner] → Send invite    │
│                                 │
│  🔒 Premium feature            │
└─────────────────────────────────┘
```

### Partner Hasn't Joined Yet
```
┌─────────────────────────────────┐
│  ⏳                             │
│                                 │
│  Waiting for Priya...           │
│                                 │
│  Invite sent via WhatsApp       │
│                                 │
│  [Resend Invite] [Cancel]       │
│                                 │
│  Did you know? You can still    │
│  track personal finances while  │
│  you wait.                      │
└─────────────────────────────────┘
```

### No Shared Data Yet
```
┌─────────────────────────────────┐
│  🏁                             │
│                                 │
│  Start tracking together        │
│                                 │
│  Add your first shared expense  │
│  or create a goal as a couple.  │
│                                 │
│  [Split Expense] [Create Goal]  │
└─────────────────────────────────┘
```

---

## 6. Premium Opportunities

| Feature | Free | Premium |
|:--------|:----:|:-------:|
| Basic couple dashboard | ✅ | ✅ |
| Combined net worth | ✅ | ✅ |
| Split expenses | ✅ | ✅ |
| Shared goals | ✅ | ✅ |
| **Couple Financial Score** | ❌ | ✅ |
| **AI partner insights** | ❌ | ✅ |
| **Unlimited couple goals** | 3 | Unlimited |
| **Export couple reports** | ❌ | ✅ |
| **Couple planner (Baby/House/Car)** | ❌ | ✅ |
| **Priority support** | ❌ | ✅ |

### Upsell Locations
- Add Partner screen ("Upgrade to Premium to unlock AI insights")
- Couple Dashboard score card (blurred for free users)
- Couple planner section

---

## 7. API Contracts

### `GET /couple/dashboard`

```
Response:
{
  data: {
    partner: {
      id: string,
      name: string,
      avatar: string | null,
    },
    combinedStats: {
      netWorth: number,
      netWorthChange: number,       // month-over-month
      totalIncome: number,
      totalExpenses: number,
      totalSavings: number,
      savingsRate: number,          // 0-100
      sharedExpenseRatio: number,   // % of expenses shared
    },
    score: {
      current: number,              // 0-100
      change: number,               // monthly delta
      components: {
        communication: number,      // settlement frequency
        savings: number,
        goalAlignment: number,
        expenseBalance: number,
      },
      level: 'critical' | 'building' | 'stable' | 'thriving' | 'exceptional',
    },
    goals: [{
      id: string,
      emoji: string,
      name: string,
      savedAmount: number,
      targetAmount: number,
      progress: number,
    }],
    upcomingBills: [{
      id: string,
      name: string,
      amount: number,
      dueDays: number,
    }],
    aiInsight: {
      message: string,
      type: 'spending' | 'savings' | 'goal' | 'comparison',
    } | null,
    isPremium: boolean,
  }
}
```

### `POST /couple/invite`

```
Body:
{
  phone: string,
  message?: string,
}

Response:
{
  data: {
    inviteId: string,
    expiresAt: string,           // ISO date (48h from now)
  }
}
```

### `POST /couple/accept`

```
Body:
{
  inviteCode: string,
}

Response:
{
  data: {
    coupleId: string,
    partner: { id, name, avatar },
  }
}
```

---

## 8. Database Models (Already Exist)

The `Couple` model and related models already exist in `schema.prisma`:
- `Couple` — relationship record
- `CoupleRequest` — invites
- `CoupleFinanceProfile` — combined finance data
- `CoupleFinanceIncome` — income tracking
- `CoupleFinanceSaving` — savings tracking
- `CoupleBudgetCategory` — category budgets
- `CouplePlanner` — life planners (Baby/House/Car/Retirement)
- `CoupleTimelineEvent` — Instagram-like timeline
- `CoupleLevel` — gamification (XP/Levels)
- `CoupleIntelligence` — AI insights
- `CoupleInviteCode` — QR/invite codes

---

## 9. Implementation Checklist

- [ ] Wire CoupleDashboardScreen into FamilyHubStack navigator
- [ ] Add `GET /couple/dashboard` endpoint to couple module
- [ ] Ensure CoupleDashboardScreen uses Couple theme colors
- [ ] Add empty states (no partner, waiting, no data)
- [ ] Wire invite flow (AddPartnerScreen → SMS → Accept)
- [ ] Add Premium gating for AI insights + score
- [ ] Add push notification on partner accept
- [ ] Add couple score to DabbuAI Insights tab (when coupled)
- [ ] Add couple health score to FamilyHub filter when type=couple
- [ ] Test all screens in couple mode during Sprint 8 audit
