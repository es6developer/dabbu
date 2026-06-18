# Phase 7 — Financial Health Score

## 1. Product Overview

### What
**Dabbu Health Score** — a 0–100 numerical score that measures a user's overall financial health.

### Why
- Users need a single, trusted, actionable metric to track progress
- Gamifies financial discipline (who doesn't want a higher score?)
- Creates a natural upsell for Premium (detailed breakdowns + AI tips)
- Differentiator from other Indian finance apps

### Where It Appears
- **Home Screen**: Score ring in the health card
- **DabbuAI**: Insights tab (score + trend)
- **Family Hub**: Couple/family health score
- **HealthScoreScreen**: Full detail page

---

## 2. Scoring Formula

### Components (6 factors, weighted)

| Component | Weight | Calculation | Range |
|-----------|:------:|:------------|:-----:|
| **Savings Rate** | 25% | `(income - expenses) / income * 100` | 0–25 |
| **Debt Ratio** | 20% | `max(0, 1 - (totalDebt / annualIncome)) * 20` | 0–20 |
| **Emergency Fund** | 20% | `min(coverageMonths / 6, 1) * 20` | 0–20 |
| **Budget Compliance** | 15% | `(categories within budget / total categories) * 15` | 0–15 |
| **Goal Progress** | 10% | `avg(goalProgress%) * 10` | 0–10 |
| **Bill Consistency** | 10% | `(onTimePayments / totalBills) * 10` | 0–10 |

### Formula
```
HealthScore = savingsRateScore + debtRatioScore + emergencyFundScore
             + budgetComplianceScore + goalProgressScore + billConsistencyScore
```

### Score Levels

| Range | Label | Color | Emoji |
|:-----:|:------|:-----:|:-----:|
| 0–30 | Critical | Red (#EF4444) | 🚨 |
| 31–50 | Building | Orange (#F97316) | ⚠️ |
| 51–70 | Stable | Yellow (#EAB308) | ✅ |
| 71–90 | Thriving | Green (#22C55E) | 💪 |
| 91–100 | Exceptional | Violet (#7C3AED) | 👑 |

---

## 3. UI Design

### HealthScoreScreen

```
┌──────────────────────────────────────────┐
│ ←                    Dabbu Health Score  │
├──────────────────────────────────────────┤
│                                          │
│              ╭─────────╮                 │
│              │   74    │                 │
│              │  Stable │                 │
│              ╰─────────╯                 │
│              ▲ 2 pts from last month     │
│                                          │
│ ─── Component Breakdown ───             │
│                                          │
│ Savings Rate    68%   ████████░░  17/25 │
│ Debt Ratio      32%   ████░░░░░░  7/20  │
│ Emergency Fund  3.4mo █████░░░░░  11/20 │
│ Budget Disc.    100%  ██████████  15/15 │
│ Goal Progress   60%   ██████░░░░  6/10  │
│ Bills           90%   █████████░  9/10  │
│                                          │
│ ─── Tips ───                            │
│                                          │
│ 💡 Build emergency fund to 6 months     │
│    → Add ₹15,000 to emergency savings   │
│                                          │
│ 💡 Reduce debt ratio below 30%          │
│    → Consider ₹5,000 extra EMI          │
│                                          │
│ ─── Historical Trend ───               │
│                                          │
│  80 ┤        ╱╲                          │
│  70 ┤  ╱╲  ╱  ╲                         │
│  60 ┤ ╱  ╲╱    ╲                        │
│     └──────────────────                  │
│       Mar  Apr  May  Jun                 │
└──────────────────────────────────────────┘
```

### Component Bars (color-coded)
- Each bar: full-width background track (4px height, rounded)
- Fill: component-specific color from theme chart palette
- Label: left-aligned, Score: right-aligned

### Historical Trend (HealthScoreScreen)
- Line chart: score values over last 30 days
- X-axis: dates, Y-axis: 0–100
- Background fill under the line (gradient)
- Annotated with major financial events (bonus, large purchase)

---

## 4. Component Hierarchy

```
HealthScoreScreen
├── SafeAreaView
│   ├── Header (back + "Dabbu Health Score")
│   │
│   ├── ScrollView (refreshable)
│   │   ├── ScoreHero
│   │   │   ├── ScoreRing (animated SVG ring, 100px)
│   │   │   ├── LevelBadge (label + color)
│   │   │   └── DeltaBadge (↑2 pts)
│   │   │
│   │   ├── ComponentBreakdownSection
│   │   │   ├── SectionHeader ("Component Breakdown")
│   │   │   └── ComponentBar[] (6 items)
│   │   │       ├── Label (e.g. "Savings Rate")
│   │   │       ├── Value (e.g. "68%")
│   │   │       ├── ProgressBar (filled track)
│   │   │       └── Score (e.g. "17/25")
│   │   │
│   │   ├── TipsSection
│   │   │   ├── SectionHeader ("Tips")
│   │   │   └── TipCard[] (icon + message + action)
│   │   │
│   │   ├── HistoricalChartSection
│   │   │   ├── SectionHeader ("30-Day Trend")
│   │   │   └── LineChart (score over time)
│   │   │
│   │   └── PremiumUpgradeBanner
│   │       ├── Blurred detailed analysis preview
│   │       └── "Upgrade for detailed analysis"
│   │
│   └── BottomCTA ("Improve Your Score" → AI tips)
```

---

## 5. API Contracts

### `GET /ai/health-score`

```
Response:
{
  data: {
    score: number,                // 0-100
    previousScore: number,       // last month score
    change: number,               // monthly delta
    level: 'critical' | 'building' | 'stable' | 'thriving' | 'exceptional',
    components: {
      savingsRate: {
        score: number,            // 0-25
        percentage: number,       // 0-100
        value: number,            // e.g. 68
        label: string,            // "68%"
      },
      debtRatio: {
        score: number,            // 0-20
        percentage: number,
        value: number,
        label: string,
      },
      emergencyFund: {
        score: number,            // 0-20
        percentage: number,
        value: number,            // e.g. 3.4 (months)
        label: string,            // "3.4mo"
      },
      budgetCompliance: {
        score: number,            // 0-15
        percentage: number,
        value: number,
        label: string,
      },
      goalProgress: {
        score: number,            // 0-10
        percentage: number,
        value: number,
        label: string,
      },
      billConsistency: {
        score: number,            // 0-10
        percentage: number,
        value: number,
        label: string,
      },
    },
    tips: [{
      icon: string,
      message: string,
      actionLabel: string,
      actionRoute: string,
      priority: 'high' | 'medium' | 'low',
    }],
    history: [{                   // 30-day trend (daily snapshots)
      date: string,              // ISO date
      score: number,
      event?: string,            // e.g. "Salary credited"
    }],
    isPremium: boolean,          // true = detailed tips visible
  }
}
```

---

## 6. Where It Appears

| Screen | Element | Data Source |
|:-------|:--------|:------------|
| **HomeScreen** | Score ring card (compact) | `GET /dashboard` |
| **DabbuAI Insights tab** | Score badge + trend | `GET /ai/health-score` |
| **Family Hub** | Couple score ring (if coupled) | `GET /couple/dashboard` |
| **HealthScoreScreen** | Full breakdown (detail page) | `GET /ai/health-score` |

### Home Screen Integration
```
┌─ Health Score ─────────────────────────┐
│ 〇 74 · Stable          ▲ 2 pts       │
│ Savings Rate ████████░░ 68%           │
│ Debt Ratio   ████░░░░░░ 32%           │
│ ─── 4 more components ───             │
│ [Tap for full breakdown]              │
└────────────────────────────────────────┘
```

---

## 7. Premium Gating

| Feature | Free | Premium |
|:--------|:----:|:-------:|
| Score number + level | ✅ | ✅ |
| Monthly trend delta | ✅ | ✅ |
| 6-component breakdown | ✅ | ✅ |
| Component percentage bars | ✅ | ✅ |
| **Personalized tips** | ❌ | ✅ |
| **30-day historical chart** | ❌ | ✅ |
| **AI improvement recommendations** | ❌ | ✅ |
| **Export score report** | ❌ | ✅ |

---

## 8. AI Engine Integration

The health score is computed by the existing `FinancialHealth2Engine` in `packages/ai-engine/`.

### Engine Inputs
```typescript
interface HealthScoreInput {
  monthlyIncome: number;
  monthlyExpenses: number;
  totalSavings: number;
  totalDebt: number;
  emergencyFundBalance: number;
  monthlyExpenseAverage: number;
  budgets: { category: string; spent: number; limit: number }[];
  goals: { saved: number; target: number }[];
  bills: { paid: boolean }[];
}
```

### Engine Output
```typescript
interface HealthScoreOutput {
  score: number;
  components: {
    savingsRate: number;
    debtRatio: number;
    emergencyFund: number;
    budgetCompliance: number;
    goalProgress: number;
    billConsistency: number;
  };
  recommendations: string[];
}
```

---

## 9. Implementation Checklist

- [ ] Verify `GET /ai/health-score` returns all required fields
- [ ] Add health score ring card to HomeScreen (already in spec)
- [ ] Add score badge to DabbuAI Insights tab
- [ ] Add couple score to Family Hub (when type=couple)
- [ ] Add 30-day historical chart to HealthScoreScreen
- [ ] Wire tips section with actionable deep links
- [ ] Add Premium gating for tips + history
- [ ] Add monthly change indicator (delta badge)
- [ ] Test with sample data for each score level
- [ ] Add score improvement push notifications (monthly)
