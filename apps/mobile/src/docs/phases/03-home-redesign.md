# Phase 3 — Home Screen Redesign

## 1. Wireframe

```
┌──────────────────────────────────────┐
│ status bar                        │
├──────────────────────────────────────┤
│  Good evening, Karthik      🔔     │
│                                      │
│ ┌─ Net Worth ──────────────────────┐ │
│ │ ₹12,45,000          ↑ 2.3%      │ │
│ │ Assets ₹15.2L · Liabilities ₹2.7L│ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ Health Score ───────────────────┐ │
│ │ 〇 74  ·  Stable                 │ │
│ │ Savings Rate ████████░░ 68%      │ │
│ │ Debt Ratio   ████████░░ 32%      │ │
│ └──────────────────────────────────┘ │
│                                      │
│ 💡 You spent 12% less on dining     │
│    this month — great job!           │
│                                      │
│ ┌─ Upcoming Bills ─────────────────┐ │
│ │ 📄 Electricity    ₹1,200  · 5d  │ │
│ │ 📄 Internet       ₹899   · 8d  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ Recent Transactions ────────────┐ │
│ │ -₹499  Swiggy           Today    │ │
│ │ -₹200  Metro            Today    │ │
│ │ +₹80K  Salary          Mar 1    │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌─ Goals ──────────────────────────┐ │
│ │ 🏠 House     ₹2.5L/50L  · 5%    │ │
│ │ 🚗 Car       ₹50K/8L   · 6%     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ──────── Home · Wallet · + · Family · Profile │
└──────────────────────────────────────┘
```

## 2. Component Hierarchy

```
HomeScreen
├── SafeAreaView
│   ├── Header
│   │   ├── Greeting ("Good evening, {name}")
│   │   └── NotificationBell (badge count)
│   │
│   ├── ScrollView (vertical, refreshable)
│   │   ├── NetWorthCard
│   │   │   ├── Amount (animated count-up)
│   │   │   ├── TrendBadge (↑2.3%)
│   │   │   └── Subtitle (Assets · Liabilities)
│   │   │
│   │   ├── HealthScoreCard
│   │   │   ├── ScoreRing (SVG, 0-100)
│   │   │   ├── LevelBadge (Critical/Building/Stable/Thriving/Exceptional)
│   │   │   └── ComponentBars (savings rate, debt ratio, budget, goals, bills, emergency)
│   │   │
│   │   ├── AIInsightBanner
│   │   │   └── Text ("💡 {insight message}")
│   │   │
│   │   ├── UpcomingBillsSection
│   │   │   ├── SectionHeader ("Upcoming Bills" → See All)
│   │   │   └── BillRow[] (icon, name, amount, days left)
│   │   │
│   │   ├── RecentTransactionsSection
│   │   │   ├── SectionHeader ("Recent" → See All)
│   │   │   └── TransactionRow[] (icon, description, amount, date)
│   │   │
│   │   ├── GoalsSnapshotSection
│   │   │   ├── SectionHeader ("Goals" → See All)
│   │   │   └── GoalRow[] (emoji, name, progress, amount)
│   │   │
│   │   └── DabbuAIFAB (floating "Ask Dabbu" button)
```

## 3. User Flow

```
Launch → SplashScreen
  → hasSeenOnboarding?
    → No → OnboardingScreen (3 slides + user type selection) → Auth
    → Yes → Auth
      → Logged in?
        → No → LoginScreen
        → Yes → HomeScreen (dashboard)
```

### Home Screen Interactions

| Action | Target | Taps |
|:-------|:-------|:----:|
| View net worth | → NetWorthScreen | 1 |
| View health score | → HealthScoreScreen | 1 |
| Tap AI insight | → DabbuAI (Insights tab) | 1 |
| Tap bill | → BillDetailScreen | 1 |
| See all bills | → BillsListScreen | 1 |
| Tap transaction | → TransactionDetailScreen | 1 |
| See all transactions | → WalletHomeScreen | 1 |
| Tap goal | → GoalDetailScreen | 1 |
| See all goals | → GoalsListScreen | 1 |
| Ask Dabbu | → DabbuAI (Ask tab) | 1 |

## 4. UI Specifications

### Layout
- **8pt spacing grid** (`spacing.lg = 16` for cards, `spacing.xl` for sections)
- **Card border radius**: `borderRadius['2xl']` (16px)
- **Avatar**: 40×40 with notification dot
- **Max scroll content width**: 100% with `paddingHorizontal: spacing.lg`

### Net Worth Card
- Background: `colors.card.balance` (violet gradient or solid)
- Amount: `typography.balanceAmount` (40px, Inter-Bold, letter-spacing -2)
- Trend badge: pill shape, green if positive, red if negative
- Tap → NetWorthScreen

### Health Score Card
- Score ring: SVG circle, 60px diameter, stroke-width 5
- Score color: 0-30 red, 31-50 orange, 51-70 yellow, 71-90 green, 91-100 violet
- Level label: lowercase, 12px, uppercase tracking
- Component bars: 6 horizontal bars, 4px height, 10px gap
- Tap → HealthScoreScreen

### AI Insight Banner
- Single line, 14px, text-secondary
- Icon prefix (💡 or bulb)
- Background: `colors.bg.glass` with left accent border
- Tap → DabbuAI (Insights tab)

### Upcoming Bills
- Horizontal scroll or vertical list of max 5
- Each row: document icon + merchant name + amount + days badge
- Days badge: green (>30d), yellow (7-30d), red (<7d)
- "See All" link → BillsListScreen

### Recent Transactions
- Vertical list of last 5
- Each row: category dot (6px) + description + amount (green for income, red for expense) + relative date
- Amount font: `typography.expenseAmount` (20px, Inter-SemiBold)
- "See All" → WalletHomeScreen

### Goals Snapshot
- Vertical list of max 3 incomplete goals
- Each row: emoji + name + progress bar (3px height) + amount text
- Progress fill color: goal-specific color from template
- "See All" → GoalsListScreen

### Data Source
- **Primary**: `GET /dashboard` (consolidated, replaces 7 individual calls)
- **Fallback**: individual endpoints (`/net-worth`, `/ai/health-score`, `/bills`, `/transactions`, `/goals`, `/transactions/stats`, `/ai/insights`)
- **Refresh**: pull-to-refresh on ScrollView
- **Loading**: skeleton cards matching card shapes
