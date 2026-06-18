# Phase 12 — Reports + Analytics Merge → Financial Center

## 1. Product Overview

### Current State
- `AnalyticsScreen` (823 lines) — spending breakdown, trends, charts
- `ReportsScreen` (831 lines) — exportable PDF reports (dead, not in any navigator)
- `CoupleReportsScreen` (557 lines) — couple-specific reports (dead)
- `MonthlyAiReviewScreen` (511 lines) — AI-powered monthly review (dead)
- `FinancialCenterScreen` (338 lines) — new unified screen (live, in Wallet tab)

### Target State
- Single **FinancialCenter** with 3 tabs: **Overview** · **Reports** · **AI**
- All analytics, reports, and AI review accessible from one place
- PDF/CSV export for Premium users
- Couple/family reports accessible from Family Hub

---

## 2. UI Design — FinancialCenterScreen

```
┌──────────────────────────────────────────┐
│ ← Wallet          Financial Center       │
├──────────────────────────────────────────┤
│                                          │
│  [Overview]  [Reports]  [AI Analysis]    │
│                                          │
│ ─── Overview Tab ───                    │
│                                          │
│ ┌── Period Selector ──────────────────┐  │
│ │  [Month] [Quarter] [Year] [Custom] │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── Spending Overview ────────────────┐  │
│ │  Total Spent: ₹1,12,000             │  │
│ │  Total Income: ₹1,85,000             │  │
│ │  Net Savings: ₹73,000 (39%)         │  │
│ │                                      │  │
│ │  ┌────────────────────────┐         │  │
│ │  │   Spending Trend       │         │  │
│ │  │   ╱╲   ╱╲              │         │  │
│ │  │  ╱  ╲ ╱  ╲             │         │  │
│ │  │ ╱    ╲╱    ╲            │         │  │
│ │  └────────────────────────┘         │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── Category Breakdown ───────────────┐  │
│ │                                      │  │
│ │  🍕 Dining      ₹18,000   16%       │  │
│ │  🏠 Rent        ₹18,000   16%       │  │
│ │  🚗 Transport   ₹12,000   11%       │  │
│ │  🛒 Groceries   ₹15,000   13%       │  │
│ │  📱 Subscriptions ₹3,500  3%       │  │
│ │  Other          ₹45,500   41%       │  │
│ │                                      │  │
│ │  [Pie Chart]                         │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ─── Reports Tab ───                     │
│                                          │
│ ┌── Available Reports ────────────────┐  │
│ │                                      │  │
│ │  📄 Monthly Summary    [Download]   │  │
│ │  📄 Category Analysis  [Download]   │  │
│ │  📄 Year to Date       [Download]   │  │
│ │  📄 Tax Report         [Premium]    │  │
│ │  📄 Spending Forecast   [Premium]   │  │
│ │                                      │  │
│ │  🔒 3 more reports with Premium     │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ─── AI Analysis Tab ───                 │
│                                          │
│ ┌── AI Monthly Review ────────────────┐  │
│ │  💬 "March was a great month for     │  │
│ │     your finances. Here's your       │  │
│ │     breakdown..."                    │  │
│ │                                      │  │
│ │  ✅ Highlights:                      │  │
│ │    • Net worth grew ₹45K             │  │
│ │    • Saved 39% of income             │  │
│ │    • Stayed within budget             │  │
│ │                                      │  │
│ │  ⚠️ Concerns:                        │  │
│ │    • Dining spending up 18%          │  │
│ │    • Emergency fund still at 3.4mo   │  │
│ │                                      │  │
│ │  💡 Tip: The 50-30-20 rule...        │  │
│ └──────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## 3. Component Hierarchy

```
FinancialCenterScreen
├── SafeAreaView
│   ├── Header (back + "Financial Center")
│   │
│   ├── TabBar (3 tabs: Overview / Reports / AI Analysis)
│   │   └── AnimatedIndicator (slide between tabs)
│   │
│   ├── PeriodSelector (month / quarter / year / custom)
│   │   └── Chip[] (4 period options)
│   │
│   ├── [Tab 1] OverviewContent
│   │   ├── SummaryCard (income, spent, saved, rate)
│   │   ├── TrendChart (line chart, configurable period)
│   │   ├── CategoryBreakdown
│   │   │   ├── PieChart (spending by category)
│   │   │   └── CategoryRow[] (icon, name, amount, %)
│   │   ├── CashFlowChart (income vs expense bars)
│   │   └── TopMerchants (top spending merchants)
│   │
│   ├── [Tab 2] ReportsContent
│   │   ├── ReportCard[] (premium-gated)
│   │   │   ├── Icon + Name
│   │   │   ├── Description
│   │   │   ├── PremiumBadge (if locked)
│   │   │   └── DownloadButton / UpgradeButton
│   │   └── ExportHistory (recent exports)
│   │
│   └── [Tab 3] AIContent
│       ├── NarrativeCard (AI summary text)
│       ├── HighlightCard[] (green items)
│       ├── ConcernCard[] (amber/red items)
│       └── TipCard (AI recommendation)
```

---

## 4. API Contracts

### `GET /analytics/dashboard?startDate=&endDate=`

```
Response:
{
  data: {
    summary: {
      totalIncome: number,
      totalExpenses: number,
      netSavings: number,
      savingsRate: number,         // percentage
    },
    trend: [{                     // daily/monthly data points
      date: string,
      income: number,
      expenses: number,
    }],
    categoryBreakdown: [{
      category: string,
      icon: string,
      amount: number,
      percentage: number,
      color: string,
    }],
    topMerchants: [{
      name: string,
      amount: number,
      transactionCount: number,
    }],
    cashFlow: [{                  // monthly comparison
      month: string,
      income: number,
      expenses: number,
    }],
  }
}
```

### `GET /ai/narrative?period=month|quarter|year`

```
Response:
{
  data: {
    summary: string,              // "March was a strong month..."
    highlights: [{
      title: string,
      description: string,
      type: 'savings' | 'income' | 'goal' | 'bill',
      value?: number,
    }],
    concerns: [{
      title: string,
      description: string,
      severity: 'warning' | 'critical',
    }],
    tip: {
      message: string,
      actionLabel?: string,
      actionRoute?: string,
    },
    overallMood: 'positive' | 'neutral' | 'negative',
  }
}
```

### `GET /analytics/export?type=monthly-summary|category-analysis|year-to-date&format=pdf|csv`

```
Response: File download (PDF or CSV)
Headers:
  Content-Type: application/pdf (or text/csv)
  Content-Disposition: attachment; filename="dabbu-monthly-summary-march-2024.pdf"
```

---

## 5. Reports List

| Report | Format | Premium | Description |
|:-------|:------:|:-------:|:------------|
| Monthly Summary | PDF | ✅ Free | Income, expenses, savings, top categories |
| Category Analysis | PDF | ✅ Free | Deep dive into each spending category |
| Year to Date | PDF | ✅ Free | Cumulative YTD financial snapshot |
| Tax Report | PDF | ❌ Premium | Expense categories grouped for tax filing |
| Spending Forecast | PDF | ❌ Premium | AI-predicted spending for next 3 months |
| Net Worth Statement | PDF | ❌ Premium | Assets, liabilities, net worth snapshot |
| Goal Progress Report | PDF | ❌ Premium | All goals with progress, forecasts, milestones |
| Couple Report | PDF | ❌ Premium | Combined couple finances report |

---

## 6. Migration Plan (from old screens)

### Delete (after FinancialCenter is verified)
- `screens/analytics/AnalyticsScreen.tsx` (823 lines) — fully replaced
- `screens/reports/ReportsScreen.tsx` (831 lines) — was dead, now replaced
- `screens/couple/CoupleReportsScreen.tsx` (557 lines) — dead
- `screens/ai/MonthlyAiReviewScreen.tsx` (511 lines) — dead

### Keep
- `screens/finance/FinancialCenterScreen.tsx` (338 lines) — current unified screen
- `GET /analytics/*` backend endpoints — still used by FinancialCenter

### Merge
- Monthly review narrative → AI Analysis tab
- Couple reports → Family Hub (filter by couple type)
- Export reports → Reports tab

---

## 7. Where FinancialCenter Appears

| Screen | Entry Point | Action |
|:-------|:------------|:-------|
| **Wallet tab** | FinancialCenter screen | Direct tab navigation |
| **HomeScreen** | "See All" on transactions | → FinancialCenter Overview tab |
| **FAB** | Quick action: Financial Center | Direct navigation |
| **Profile** | Settings → Data Export | → FinancialCenter Reports tab |
| **Family Hub** | Couple → View Reports | → FinancialCenter with couple filter |

---

## 8. Premium Gating

| Feature | Free | Premium |
|:--------|:----:|:-------:|
| Spending overview | ✅ | ✅ |
| Category breakdown (pie) | ✅ | ✅ |
| Trend chart | ✅ | ✅ |
| Cash flow chart | ✅ | ✅ |
| **Monthly Summary PDF** | ✅ | ✅ |
| **Category Analysis PDF** | ✅ | ✅ |
| **Year to Date PDF** | ✅ | ✅ |
| AI monthly review | ✅ | ✅ |
| **Tax Report PDF** | ❌ | ✅ |
| **Spending Forecast PDF** | ❌ | ✅ |
| **Net Worth Statement** | ❌ | ✅ |
| **Goal Progress Report** | ❌ | ✅ |
| **CSV data export** | ❌ | ✅ |

---

## 9. Implementation Checklist

- [ ] Verify FinancialCenterScreen is the single source for analytics
- [ ] Add Reports tab with downloadable PDF/CSV
- [ ] Add AI Analysis tab with monthly narrative
- [ ] Add download backend endpoints (PDF generation)
- [ ] Delete old AnalyticsScreen, ReportsScreen, CoupleReportsScreen, MonthlyAiReviewScreen
- [ ] Add Premium gating for export reports
- [ ] Wire FinancialCenter from HomeScreen "See All" → Overview tab
- [ ] Add couple reports filter from Family Hub
- [ ] Add period selector (Month/Quarter/Year/Custom)
- [ ] Add export history section
