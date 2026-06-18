# Phase 9 — Emergency Fund Tracker

## 1. Product Overview

### What
A dedicated module that tracks progress toward a 6-month emergency fund. Shows current coverage in months, progress toward target, and provides AI-powered suggestions to accelerate savings.

### Why
- 6-month emergency fund is the #1 financial goal for Indian households
- Provides clear, actionable metric ("You're 3.4 months covered")
- AI can suggest realistic timelines and contribution amounts
- Builds trust ("Dabbu cares about my financial safety net")

---

## 2. UI Design — EmergencyFundScreen

```
┌──────────────────────────────────────────┐
│ ←                 Emergency Fund         │
├──────────────────────────────────────────┤
│                                          │
│ ┌── Coverage Card ────────────────────┐  │
│ │                                      │  │
│ │         ╭─────────────────╮          │  │
│ │         │                 │          │  │
│ │         │    3.4 / 6     │ months    │  │
│ │         │    ██████░░░░  │ 57%      │  │
│ │         ╰─────────────────╯          │  │
│ │   You have ₹1,02,000 saved           │  │
│ │   Target: ₹1,80,000 (based on        │  │
│ │   ₹30,000/mo expenses)               │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── Quick Stats ──────────────────────┐  │
│ │  Monthly Expenses: ₹30,000          │  │
│ │  Emergency Savings: ₹1,02,000       │  │
│ │  Still Needed:      ₹78,000         │  │
│ │  Monthly Expense × 6: ₹1,80,000    │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── AI Suggestion ────────────────────┐  │
│ │  💡 Add ₹6,500/month to reach 6     │  │
│ │     months in 12 months              │  │
│ │                                      │  │
│ │  [Set Monthly Target]               │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── Progress Timeline ────────────────┐  │
│ │  🎯 6mo  ████████████████░░░░  57% │  │
│ │  🗓️ Jul  ██████████░░░░░░░░  34% │  │
│ │  📅 Jan  ██████░░░░░░░░░░░░  20% │  │
│ │  ...                               │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── Tips ─────────────────────────────┐  │
│ │  • Cut unnecessary subscriptions    │  │
│ │  • Redirect 50% of next bonus      │  │
│ │  • Reduce dining out by ₹500/mo    │  │
│ └──────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## 3. Component Hierarchy

```
EmergencyFundScreen
├── SafeAreaView
│   ├── Header (back + "Emergency Fund")
│   │
│   ├── ScrollView
│   │   ├── CoverageCard
│   │   │   ├── RingProgress (SVG, coverage/target)
│   │   │   ├── CoverageLabel ("3.4 / 6 months")
│   │   │   ├── ProgressBar (filled track)
│   │   │   ├── SavedAmount (editable inline)
│   │   │   └── TargetAmount (calculated)
│   │   │
│   │   ├── StatsCard
│   │   │   ├── StatRow ("Monthly Expenses" + value)
│   │   │   ├── StatRow ("Emergency Savings" + value)
│   │   │   ├── StatRow ("Still Needed" + value)
│   │   │   └── StatRow ("Target (6mo)" + value)
│   │   │
│   │   ├── AISuggestionCard
│   │   │   ├── SuggestionText
│   │   │   └── ActionButton ("Set Monthly Target")
│   │   │
│   │   ├── TimelineSection
│   │   │   ├── SectionHeader ("Progress Over Time")
│   │   │   └── TimelineRow[] (month + bar + percentage)
│   │   │
│   │   └── TipsSection
│   │       ├── SectionHeader ("Ways to Reach Faster")
│   │       └── TipRow[] (icon + text)
```

---

## 4. User Flow

### First-time user (no emergency fund set up)
```
EmergencyFundScreen
  → "Set up your emergency fund"
    → Enter monthly expenses → ₹30,000
      → Target calculated: ₹1,80,000
        → Enter current savings → ₹50,000
          → Coverage: 1.7 months
            → AI suggests ₹10,000/mo to reach 6mo in 13 months
```

### Returning user
```
EmergencyFundScreen
  → See current coverage (3.4 months)
  → Edit saved amount (after deposit)
  → See AI suggestion update
  → View progress timeline
```

---

## 5. API Contracts

### `GET /emergency-fund`

```
Response:
{
  data: {
    monthlyExpense: number,
    savedAmount: number,
    targetAmount: number,          // monthlyExpense × 6
    coverageMonths: number,        // savedAmount / monthlyExpense
    percentage: number,            // coverageMonths / 6 × 100
    history: [{
      date: string,               // snapshot date
      savedAmount: number,
      coverageMonths: number,
    }],
    aiSuggestion: {
      monthlyTarget: number,       // suggested monthly contribution
      monthsToTarget: number,      // months to reach 6mo at this rate
      message: string,
    } | null,
    tips: string[],
  }
}
```

### `PATCH /emergency-fund`

```
Body:
{
  monthlyExpense?: number,
  savedAmount?: number,
}

Response:
{
  data: {
    monthlyExpense: number,
    savedAmount: number,
    targetAmount: number,
    coverageMonths: number,
    percentage: number,
    aiSuggestion: {
      monthlyTarget: number,
      monthsToTarget: number,
      message: string,
    },
  }
}
```

---

## 6. Calculation Logic

```typescript
// Backend: emergency-fund.service.ts
function calculateEmergencyFund(data: EmergencyFundInput) {
  const targetAmount = data.monthlyExpense * 6;
  const coverageMonths = data.monthlyExpense > 0
    ? Math.round((data.savedAmount / data.monthlyExpense) * 10) / 10
    : 0;
  const percentage = Math.min(
    Math.round((coverageMonths / 6) * 100),
    100
  );

  // AI Suggestion: How much to save monthly to reach 6mo in 12 months
  const monthsToTarget = 12;
  const remaining = targetAmount - data.savedAmount;
  const monthlyTarget = remaining > 0
    ? Math.ceil(remaining / monthsToTarget)
    : 0;

  return {
    targetAmount,
    coverageMonths,
    percentage,
    aiSuggestion: {
      monthlyTarget,
      monthsToTarget: monthlyTarget > 0 ? monthsToTarget : 0,
      message: monthlyTarget > 0
        ? `Add ₹${monthlyTarget.toLocaleString('en-IN')}/month to reach 6 months in ${monthsToTarget} months`
        : "You've reached your 6-month emergency fund target!",
    },
    tips: generateTips(coverageMonths, monthlyTarget),
  };
}
```

---

## 7. Database Models (Already Exist)

```prisma
model EmergencyFund {
  id             String   @id @default(cuid())
  userId         String   @unique
  monthlyExpense Float    @default(0)
  savedAmount    Float    @default(0)
  updatedAt      DateTime @updatedAt
  createdAt      DateTime @default(now())
  user           User     @relation(fields: [userId], references: [id])
}
```

---

## 8. Where It Appears

| Screen | Element | Data Source |
|:-------|:--------|:------------|
| **HomeScreen** | Health Score component bar (emergency fund) | `GET /dashboard` |
| **EmergencyFundScreen** | Full detail page | `GET /emergency-fund` |
| **DabbuAI Savings tab** | Savings opportunity ("Build emergency fund") | `GET /ai/savings-opportunities` |
| **Health Score** | Emergency fund component score | `GET /ai/health-score` |

---

## 9. Premium Gating

| Feature | Free | Premium |
|:--------|:----:|:-------:|
| Current coverage (months) | ✅ | ✅ |
| Progress bar | ✅ | ✅ |
| Edit saved amount | ✅ | ✅ |
| **AI monthly target suggestion** | ❌ | ✅ |
| **Progress timeline** | ❌ | ✅ |
| **Tips & recommendations** | ❌ | ✅ |
| **Auto-track from transactions** | ❌ | ✅ |

---

## 10. AI Suggestion Logic (Existing Engine)

The `packages/ai-engine/` has `savings-opportunity-engine.ts` that generates emergency fund suggestions:

```typescript
// Example output from savings-opportunity-engine
{
  category: 'emergency_fund',
  title: 'Build emergency fund to 6 months',
  potentialSavings: 78000,  // remaining needed
  effort: 'medium',
  description: 'Increase monthly contribution by ₹6,500 to reach 6-month target in 12 months',
  actionRoute: 'EmergencyFund',
}
```

---

## 11. Implementation Checklist

- [ ] Verify `GET /emergency-fund` returns all required fields
- [ ] Verify `PATCH /emergency-fund` auto-calculates coverage
- [ ] Add progress timeline (historical snapshots)
- [ ] Add AI suggestion card with monthly target
- [ ] Add tips section (from AI engine)
- [ ] Wire emergency fund to Health Score component
- [ ] Add to DabbuAI Savings tab as opportunity
- [ ] Add Premium gating for AI features
- [ ] Add inline editing for saved amount
- [ ] Add monthly auto-snapshot (cron job)
