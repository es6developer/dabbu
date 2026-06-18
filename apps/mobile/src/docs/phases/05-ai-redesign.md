# Phase 5 — AI Redesign

## 1. UX Design

### Dabbu AI — Single Destination

```
DabbuAIScreen
├── TabBar (4 tabs)
│   ├── Insights       📊 AI-powered financial insights
│   ├── Savings        💰 Savings opportunities & predictions
│   ├── Goals          🎯 Goal coaching & motivation
│   └── Ask Dabbu      🤖 Chat interface
│
├── [Insights Tab]
│   ├── NarrativeSummary ("Here's your March overview...")
│   ├── InsightCard[] (severity, title, description, action)
│   │   ├── Critical (red) — "Over budget on dining"
│   │   ├── Warning (amber) — "Subscription due in 3 days"
│   │   ├── Success (green) — "Saved 18% on groceries"
│   │   └── Info (violet) — "Net worth grew by ₹45K"
│   └── PremiumBadge (for locked insights)
│
├── [Savings Tab]
│   ├── SavingsOpportunity[] ("Switch to ₹499 plan → save ₹200/mo")
│   ├── BillPrediction[] ("Electricity: ₹1,200 predicted this month")
│   └── HistoricalTrend chart
│
├── [Goals Tab]
│   ├── GoalCard (emotional template, progress ring, motivation)
│   ├── ContributionSuggestion ("Increase by ₹500/mo to finish 2 months early")
│   └── QuickContribute button
│
└── [Ask Dabbu Tab]
    ├── ChatInput ("Ask anything about your finances...")
    ├── SuggestedPrompts
    │   ├── "How much did I spend on food this month?"
    │   ├── "Can I afford a ₹50K vacation?"
    │   └── "Show me my top expense categories"
    └── MessageList (user + AI messages with markdown)
```

### AI Throughout App (not just Dabbu AI)

| Location | AI Element | Source |
|:---------|:-----------|:-------|
| **Home** | "You spent 18% more on food this week" | `GET /ai/insights?section=dashboard` |
| **Goal Detail** | "Increase monthly contribution by ₹1,000 to finish 2 months early" | `GET /ai/goals/:id/prediction` |
| **Family Hub** | "Partner spends 32% more on groceries" | `GET /ai/insights?section=couple` |
| **Net Worth** | "Your net worth grew ₹45K this month — keep it up!" | `GET /ai/narrative` |
| **Emergency Fund** | "You need ₹2,000/mo to reach 6 months in 12 months" | `GET /emergency-fund` (computed server-side) |

---

## 2. API Contracts

### `GET /ai/insights`

```
Query Parameters:
  section?     string    — dashboard | couple | family | savings | goals | all
  limit?       number    — default 10

Response:
{
  data: [{
    id: string,
    type: string,              // insight | alert | suggestion | achievement
    severity: string,          // critical | warning | success | info
    category: string,          // spending | saving | bill | goal | income | netWorth
    title: string,             // "Overspent on dining"
    description: string,       // "You spent ₹4,500 on dining — 18% more than last month"
    value?: number,            // 4500
    percentage?: number,       // 18
    trend?: 'up' | 'down' | 'flat',
    suggestedAction?: string,  // "Set a dining budget of ₹3,000/month"
    confidence: number,        // 0-100
    icon?: string,             // "restaurant-outline"
    actionRoute?: string,      // Deep link to relevant screen
    isPremium: boolean,
  }]
}
```

### `GET /ai/goals/:id/prediction`

```
Response:
{
  data: {
    goalId: string,
    predictedCompletionDate: string | null, // ISO date
    currentPace: 'ahead' | 'ontrack' | 'behind',
    successProbability: number,             // 0-100
    requiredMonthlyContribution: number,    // Suggested amount to stay on track
    improvementTip: string | null,          // "Try reducing dining out by ₹500/mo"
    milestoneDates: {                       // When each milestone is expected
      "25pct": string | null,
      "50pct": string | null,
      "75pct": string | null,
      "100pct": string | null,
    },
  }
}
```

### `GET /ai/savings-opportunities`

```
Response:
{
  data: [{
    id: string,
    title: string,            // "Switch to ₹499 broadband plan"
    potentialSavings: number, // 200
    category: string,         // bills | subscriptions | dining | shopping
    effort: 'easy' | 'medium' | 'hard',
    description: string,
    actionRoute?: string,
  }]
}
```

### `POST /ai/chat`

```
Body:
{
  message: string,           // User message
  context?: {                // Optional context for personalized responses
    screen: string,          // Current screen name
    goalId?: string,
    groupId?: string,
  }
}

Response:
{
  data: {
    message: string,         // AI response (markdown)
    suggestions?: string[],  // Follow-up prompt suggestions
    actions?: [{             // Action buttons
      label: string,
      route: string,
      params?: object,
    }],
    source: string,          // "rule-engine" | "ai-model"
  }
}
```

### `GET /ai/narrative`

```
Query Parameters:
  period?    string   — month | quarter | year (default: month)

Response:
{
  data: {
    summary: string,             // "March was a strong month for your finances..."
    highlights: string[],        // ["Net worth grew 2.3%", "Saved ₹8,000"]
    concerns: string[],          // ["Dining spending up 18%"]
    tip: string,                 // "Try the 50-30-20 rule for budgeting"
    overallMood: 'positive' | 'neutral' | 'negative',
  }
}
```

---

## 3. Prompt Architecture

### Rule Engine (Primary — no external AI API cost)

The app uses a **rule-based financial health engine** (`FinancialHealth2Engine`) for:
- Health score calculation (0-100)
- Savings rate analysis
- Budget compliance tracking
- Goal progress monitoring
- Anomaly detection (unusual spending)

### Prompt Templates for AI Chat

When using an external LLM (OpenAI/Gemini), prompts follow this structure:

```
System Prompt:
"You are Dabbu AI, a financial assistant for an Indian personal finance app.
Your role is to help users understand their spending, save money, and reach financial goals.
Give concise, actionable advice in Indian rupees (₹).
Be encouraging but honest. Use simple English with occasional Hinglish if appropriate.
Never share specific financial advice that requires SEBI registration.
If asked about investments, suggest consulting a SEBI-registered advisor."

Context Injection:
{
  "userContext": {
    "monthlyIncome": {{monthlyIncome}},
    "monthlyExpense": {{monthlyExpense}},
    "savingsRate": {{savingsRate}},
    "netWorth": {{netWorth}},
    "healthScore": {{healthScore}},
    "topExpenseCategories": {{topCategories}},
    "activeGoals": {{activeGoals}},
    "upcomingBills": {{upcomingBills}},
    "userType": "{{userType}}",  // "single" | "couple" | "family" | "friends"
    "isPremium": {{isPremium}},
  }
}

Response Format:
{
  "message": "Text response with optional **markdown**",
  "suggestions": ["Follow-up question 1", "Follow-up question 2"],
  "actions": [{"label": "View Budget", "route": "BudgetsList"}]
}
```

### Prompt Categories

| Category | Trigger | Example |
|:---------|:--------|:--------|
| **Spending Analysis** | "How much did I spend on food?" | "You spent ₹4,500 on dining this month — 18% more than last month. Want to set a dining budget?" |
| **Goal Advice** | "Can I afford a vacation?" | "Your emergency fund is at 3.4 months. I'd recommend building that to 6 months first — that would take about 4 months at your current savings rate." |
| **Bill Insights** | "Show my upcoming bills" | "You have 3 bills due this week: Electricity ₹1,200 (due in 2d), Internet ₹899 (due in 5d), Rent ₹18,000 (due in 7d). Total: ₹20,099." |
| **Savings Tips** | "How can I save more?" | "You spend ₹2,500/month on subscriptions you don't use. Canceling them could save you ₹30,000/year." |
| **Couple Insights** | "Compare my spending" | "Your partner spends 32% more on groceries but 15% less on dining. Together you're saving 22% of combined income — great!" |

### Premium vs Free Gating

| Feature | Free | Premium |
|:--------|:----:|:-------:|
| Basic insights (3/mo) | ✅ | ✅ |
| Goal prediction | ✅ | ✅ |
| Savings opportunities (limited) | ✅ | ✅ |
| Chat (10 messages/mo) | ✅ | ✅ |
| Unlimited chat | ❌ | ✅ |
| Financial DNA report | ❌ | ✅ |
| Cash flow prediction | ❌ | ✅ |
| Family/couple AI insights | ❌ | ✅ |
| Anomaly detection | ❌ | ✅ |
| Export AI reports | ❌ | ✅ |
