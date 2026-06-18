# Phase 8 — Net Worth System

## 1. Product Overview

### What
A complete net worth tracking system showing total assets minus total liabilities, with historical trends across 8 asset types and 4 liability types.

### Why
- Net worth is the single best measure of financial health
- Users want to see their complete financial picture in one place
- Drives engagement through "wealth effect" (seeing number grow)
- Premium differentiator for advanced tracking

---

## 2. Data Model

### Assets (8 types)

| Type | Icon | Examples |
|:-----|:----:|:---------|
| Bank Account | 🏦 | Savings, Current accounts |
| Cash | 💵 | Physical cash |
| Gold | 🥇 | Physical gold, digital gold, SGBs |
| Stocks | 📈 | Direct equity holdings |
| Mutual Funds | 📊 | MF portfolio value |
| Crypto | ₿ | Bitcoin, ETH, other crypto |
| Property | 🏠 | Real estate (market value) |
| Other | 📦 | Vehicles, jewelry, collectibles |

### Liabilities (4 types)

| Type | Icon | Examples |
|:-----|:----:|:---------|
| Home Loan | 🏠 | Mortgage balance |
| Personal Loan | 📋 | Unsecured loans |
| Credit Card | 💳 | Outstanding balance |
| Other Loan | 📄 | Education loan, car loan |

---

## 3. UI Design — NetWorthScreen

```
┌──────────────────────────────────────────┐
│ ←                    Net Worth           │
├──────────────────────────────────────────┤
│                                          │
│ ┌── Net Worth Hero ───────────────────┐  │
│ │  ₹12,45,000                         │  │
│ │  ▲ ₹28,000 (2.3%) this month       │  │
│ │                                      │  │
│ │  Assets     ₹15,27,000              │  │
│ │  Liabilities  ₹2,82,000             │  │
│ │  [━━━━━━━━━━━━━━━━━━━━━━━━━━━━]    │  │
│ │  ████████████████████████░░░ 84%   │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ─── Assets ───                           │
│                                          │
│  🏦 Bank          ₹4,50,000   30%       │
│  💵 Cash          ₹25,000     2%        │
│  📈 Stocks        ₹3,20,000   21%       │
│  📊 Mutual Funds  ₹2,80,000   18%       │
│  🥇 Gold          ₹1,50,000   10%       │
│  🏠 Property      ₹2,50,000   16%       │
│  ₿ Crypto         ₹42,000     3%        │
│  📦 Other         ₹10,000     0%        │
│  ─────────────────────────────────       │
│  Total Assets     ₹15,27,000            │
│                                          │
│ ─── Liabilities ───                     │
│                                          │
│  🏠 Home Loan     ₹1,80,000   64%       │
│  📋 Personal Loan ₹60,000     21%       │
│  💳 Credit Card   ₹32,000     11%       │
│  📄 Other Loan    ₹10,000     4%        │
│  ─────────────────────────────────       │
│  Total Liabilities ₹2,82,000            │
│                                          │
│ ─── Historical Trend ───               │
│                                          │
│  12L ┤        ╱╲                         │
│  11L ┤  ╱╲  ╱  ╲                        │
│  10L ┤ ╱  ╲╱    ╲                       │
│      └──────────────────                  │
│        Jan  Feb  Mar  Apr  May  Jun      │
│                                          │
│ 💡 Your net worth grew ₹28,000 this      │
│    month — keep it up!                   │
└──────────────────────────────────────────┘
```

---

## 4. Component Hierarchy

```
NetWorthScreen
├── SafeAreaView
│   ├── Header (back + "Net Worth" + ? info)
│   │
│   ├── ScrollView
│   │   ├── NetWorthHeroCard
│   │   │   ├── Amount (animated count-up, 40px)
│   │   │   ├── TrendBadge (▲ 2.3%)
│   │   │   ├── AssetsLabel (amount + percentage bar)
│   │   │   └── LiabilitiesLabel (amount + percentage bar)
│   │   │
│   │   ├── AssetsSection
│   │   │   ├── SectionHeader ("Assets" + Add button)
│   │   │   └── AssetRow[] (8 items, inline editable)
│   │   │       ├── Icon + Label
│   │   │       ├── AmountInput (TextInput, numeric)
│   │   │       └── AllocationPill (% of total)
│   │   │
│   │   ├── LiabilitiesSection
│   │   │   ├── SectionHeader ("Liabilities" + Add button)
│   │   │   └── LiabilityRow[] (4 items, inline editable)
│   │   │
│   │   ├── HistoricalChartSection
│   │   │   ├── SectionHeader ("Trend — 6 Months")
│   │   │   ├── PeriodToggle (1M / 3M / 6M / 1Y)
│   │   │   └── AreaChart (net worth over time)
│   │   │
│   │   ├── AIInsightCard
│   │   │   └── "Your net worth grew ₹28K this month"
│   │   │
│   │   └── SnapshotCard
│   │       ├── "Net worth snapshots are saved weekly"
│   │       └── LastSnapshot timestamp
```

---

## 5. API Contracts

### `GET /net-worth`

```
Response:
{
  data: {
    totalAssets: number,
    totalLiabilities: number,
    netWorth: number,
    change: number,                   // month-over-month
    changePercentage: number,
    assets: {
      bank: number,
      cash: number,
      gold: number,
      stocks: number,
      mutualFunds: number,
      crypto: number,
      property: number,
      other: number,
    },
    liabilities: {
      homeLoan: number,
      personalLoan: number,
      creditCard: number,
      otherLoan: number,
    },
    history: [{                       // snapshot history
      date: string,
      netWorth: number,
      totalAssets: number,
      totalLiabilities: number,
    }],
    lastSnapshot: string,            // ISO date
    aiInsight: string | null,
  }
}
```

### `PATCH /net-worth`

```
Body:
{
  assets?: {
    bank?: number,
    cash?: number,
    gold?: number,
    stocks?: number,
    mutualFunds?: number,
    crypto?: number,
    property?: number,
    other?: number,
  },
  liabilities?: {
    homeLoan?: number,
    personalLoan?: number,
    creditCard?: number,
    otherLoan?: number,
  },
}

Response:
{
  data: {
    netWorth: number,
    change: number,
    changePercentage: number,
  }
}
```

### `GET /net-worth/history?period=1M|3M|6M|1Y`

```
Response:
{
  data: [{
    date: string,
    netWorth: number,
    totalAssets: number,
    totalLiabilities: number,
  }]
}
```

---

## 6. Database Models (Already Exist)

```prisma
model UserNetWorth {
  id            String  @id @default(cuid())
  userId        String  @unique
  bank          Float   @default(0)
  cash          Float   @default(0)
  gold          Float   @default(0)
  stocks        Float   @default(0)
  mutualFunds   Float   @default(0)
  crypto        Float   @default(0)
  property      Float   @default(0)
  other         Float   @default(0)
  homeLoan      Float   @default(0)
  personalLoan  Float   @default(0)
  creditCard    Float   @default(0)
  otherLoan     Float   @default(0)
  updatedAt     DateTime @updatedAt
  user          User    @relation(fields: [userId], references: [id])
}

model NetWorthSnapshot {
  id              String   @id @default(cuid())
  userId          String
  netWorth        Float
  totalAssets     Float
  totalLiabilities Float
  createdAt       DateTime @default(now())
  user            User     @relation(fields: [userId], references: [id])
}
```

---

## 7. Weekly Snapshot Cron Job

```typescript
// Backend: net-worth.service.ts
@Cron(CronExpression.EVERY_WEEK)
async snapshotAllUsers() {
  const users = await this.prisma.userNetWorth.findMany();
  const snapshots = users.map(u => ({
    userId: u.userId,
    netWorth: this.calculateNetWorth(u),
    totalAssets: this.calculateAssets(u),
    totalLiabilities: this.calculateLiabilities(u),
  }));
  await this.prisma.netWorthSnapshot.createMany({ data: snapshots });
}
```

---

## 8. Where It Appears

| Screen | Element | Data Source |
|:-------|:--------|:------------|
| **HomeScreen** | Net Worth card (hero) | `GET /dashboard` |
| **NetWorthScreen** | Full detail page | `GET /net-worth` |
| **DabbuAI Insights** | Net worth narrative | `GET /ai/narrative` |
| **Couple Dashboard** | Combined net worth | `GET /couple/dashboard` |

---

## 9. Premium Gating

| Feature | Free | Premium |
|:--------|:----:|:-------:|
| Net worth total | ✅ | ✅ |
| 8 assets + 4 liabilities | ✅ | ✅ |
| Edit values | ✅ | ✅ |
| **Historical chart (6 months)** | ❌ | ✅ |
| **Weekly snapshots** | ❌ | ✅ |
| **AI net worth insights** | ❌ | ✅ |
| **Export net worth report** | ❌ | ✅ |

---

## 10. Implementation Checklist

- [ ] Verify `GET /net-worth` returns all 12 fields
- [ ] Verify `PATCH /net-worth` auto-saves with debounce
- [ ] Add historical chart with period selector
- [ ] Add net worth insight from AI engine
- [ ] Add weekly snapshot cron job
- [ ] Add Premium gating for history + insights
- [ ] Wire net worth to HomeScreen hero card
- [ ] Wire combined net worth to Couple Dashboard
- [ ] Add animated count-up on mount
- [ ] Add percentage allocation visualization (pie chart or bar)
