# Phase 11 — Goals Rebuild

## 1. Product Overview

### Current State
- Goals are functional but boring: text input for name, target amount, saved amount
- No emotional connection — users don't feel motivated by spreadsheets
- Goal templates exist but are not prominently surfaced
- No contribution suggestions, milestones, or celebration moments

### Target State
- Goals are **emotional**: each goal has an emoji, template, tagline, and personality
- Goals are **motivational**: progress rings, milestones, AI encouragement
- Goals are **actionable**: one-tap contribute, suggested amounts, auto-save
- Goals are **shareable**: couple/family goals with combined progress

---

## 2. Goal Templates (8 Emotional Types)

| Template | Emoji | Default Tagline | Color |
|:---------|:-----:|:----------------|:------|
| House | 🏠 | "Your dream home awaits" | Violet |
| Car | 🚗 | "Freedom on four wheels" | Blue |
| Baby | 👶 | "Welcome to the family" | Rose |
| Education | 🎓 | "Invest in your future" | Amber |
| Vacation | ✈️ | "Adventure is calling" | Emerald |
| Wedding | 💍 | "Happily ever after" | Pink |
| Emergency | 🛡️ | "Peace of mind" | Red |
| Custom | ⭐ | "Your goal, your way" | Gray |

---

## 3. UI Design — GoalsListScreen

```
┌──────────────────────────────────────────┐
│ ←                    My Goals        ＋  │
├──────────────────────────────────────────┤
│                                          │
│ ┌── Overall Progress ────────────────┐   │
│ │  ₹3.2L saved of ₹8.5L target      │   │
│ │  ████████░░░░░░░░░░ 37%           │   │
│ │  4 goals · 2 on track             │   │
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── 🏠 House ─────────────────────────┐  │
│ │  "Your dream home awaits"           │  │
│ │  ╭──────╮                           │  │
│ │  │  42% │  ₹21L / ₹50L             │  │
│ │  ╰──────╯  On track · 3yr left     │  │
│ │  ● ● ● ○ ○ ○ ○ milestone           │  │
│ │  [Contribute ₹5,000]               │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── 🚗 Car ──────────────────────────┐  │
│ │  "Freedom on four wheels"          │  │
│ │  ╭──────╮                           │  │
│ │  │  8%  │  ₹60K / ₹8L             │  │
│ │  ╰──────╯  Behind · 4yr left       │  │
│ │  ● ○ ○ ○ ○ ○ ○                      │  │
│ │  💡 Increase by ₹2,000/mo           │  │
│ │  [Contribute ₹2,000]               │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── ✈️ Vacation ─────────────────────┐  │
│ │  "Adventure is calling"             │  │
│ │  ╭──────╮                           │  │
│ │  │  65% │  ₹97K / ₹1.5L           │  │
│ │  ╰──────╯  Ahead · 4mo left        │  │
│ │  ● ● ● ● ○ ○ ○                      │  │
│ │  [Contribute ₹5,000]               │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── 🎓 Education ────────────────────┐   │
│ │  "Invest in your future"           │  │
│ │  ╭──────╮                           │  │
│ │  │  50% │  ₹5L / ₹10L             │  │
│ │  ╰──────╯  On track · 5yr left     │  │
│ │  ● ● ● ● ○ ○ ○                      │  │
│ │  [Contribute ₹10,000]              │  │
│ └──────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## 4. UI Design — GoalDetailScreen

```
┌──────────────────────────────────────────┐
│ ← ← Goals                        Edit ⋮ │
├──────────────────────────────────────────┤
│                                          │
│  🏠                                      │
│  House                                   │
│  "Your dream home awaits"                │
│                                          │
│ ╭────────────────────────────╮            │
│ │         ╭──────╮           │            │
│ │         │ 42%  │           │            │
│ │         ╰──────╯           │            │
│ │     ₹21,00,000 / ₹50,00,000            │
│ ╰────────────────────────────╯            │
│                                          │
│ ┌── Stats ────────────────────────────┐  │
│ │  Saved      ₹21,00,000              │  │
│ │  Remaining  ₹29,00,000              │  │
│ │  Monthly    ₹35,000                  │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── AI Forecast ──────────────────────┐  │
│ │  📅 Expected: March 2028            │  │
│ │  📈 On track · 3 years 2 months    │  │
│ │  💡 Increase by ₹5,000/mo to        │  │
│ │     finish 2 months early!          │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── Milestones ───────────────────────┐  │
│ │  🎉 25%  ₹12.5L  Achieved! 🎊      │  │
│ │  🎯 50%  ₹25L    ▓▓▓░░░░░ 42%      │  │
│ │  🎯 75%  ₹37.5L  ░░░░░░░░ 0%       │  │
│ │  🏆 100% ₹50L    ░░░░░░░░ 0%       │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── Contribution ─────────────────────┐  │
│ │  [₹5,000] [₹10,000] [₹25,000]      │  │
│ │  [Custom Amount]                    │  │
│ │  [Add to Goal]                      │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ 💡 Tip: You're spending ₹4,500/mo on     │
│    dining. Reducing by ₹1,500 could      │
│    help you reach this goal 1 month      │
│    earlier.                              │
└──────────────────────────────────────────┘
```

---

## 5. Contribution Flow

### Quick Contribute (from GoalsListScreen)
```
Tap "Contribute ₹5,000" on GoalCard
  → Bottom sheet slides up
    → Amount: [₹5,000]
    → From: [Bank Account ▼]
    → [Confirm]
      → Success toast + spring animation on progress ring
      → GoalCard updates in real-time
```

### Full Contribute (from GoalDetailScreen)
```
GoalDetailScreen → QuickContributeModal
  → Amount chips: [₹5,000] [₹10,000] [₹25,000]
  → Custom amount input
  → From account selector
  → Frequency toggle: [One-time] [Monthly Auto]
  → [Confirm]
    → Progress ring animation
    → Milestone celebration (if crossed threshold)
    → Updated AI forecast
```

---

## 6. Motivation System

### Achievement Celebrations
```
Crossing 25%:        "🎉 You're a quarter way there!"
Crossing 50%:        "🎉 Halfway to your dream home!"
Crossing 75%:        "🎉 Almost there — 75% done!"
100% Complete:       "🎊🏆🎊 GOAL COMPLETE! 🎊🏆🎊"
```

### Streak-Based Motivation
```
3 contributions this month:  "🔥 3 contributions this month — keep going!"
5 consecutive months:        "⭐ 5-month streak! You're unstoppable!"
```

### AI Coach Messages
```
Behind schedule:  "You're 12% behind. Increase by ₹2,000/mo to catch up."
On track:         "Great progress! At this rate, you'll finish by March 2028."
Ahead:            "You're 2 months ahead of schedule! Want to set a stretch target?"
```

---

## 7. API Contracts

### `GET /goals`

```
Response:
{
  data: [{
    id: string,
    template: 'house' | 'car' | 'baby' | 'education' | 'vacation' | 'wedding' | 'emergency' | 'custom',
    emoji: string,
    name: string,
    tagline: string,
    color: string,
    savedAmount: number,
    targetAmount: number,
    progress: number,                // 0-100
    monthlyContribution: number,
    status: 'active' | 'completed' | 'paused',
    pace: 'ahead' | 'ontrack' | 'behind',
    predictedCompletionDate: string | null,
    milestones: [{
      percentage: number,           // 25 | 50 | 75 | 100
      amount: number,
      achieved: boolean,
      achievedAt: string | null,
    }],
    contributionStreak: number,
    isPremium: boolean,
  }],
  overallStats: {
    totalSaved: number,
    totalTarget: number,
    overallProgress: number,
    activeGoals: number,
    onTrackGoals: number,
  }
}
```

### `POST /goals/:id/contribute`

```
Body:
{
  amount: number,
  accountId: string,
  frequency?: 'one-time' | 'monthly',
}

Response:
{
  data: {
    goalId: string,
    newSavedAmount: number,
    newProgress: number,
    newMilestones: [{
      percentage: number,
      amount: number,
      achieved: boolean,
      achievedAt: string | null,
    }],
    celebration?: {
      type: 'milestone' | 'streak' | 'complete',
      message: string,
      emoji: string,
    },
  }
}
```

### `GET /ai/goals/:id/prediction`

```
Response:
{
  data: {
    predictedCompletionDate: string | null,
    currentPace: 'ahead' | 'ontrack' | 'behind',
    successProbability: number,
    requiredMonthlyContribution: number,
    improvementTip: string | null,
    milestoneDates: {
      "25pct": string | null,
      "50pct": string | null,
      "75pct": string | null,
      "100pct": string | null,
    },
  }
}
```

---

## 8. Component Hierarchy (Shared)

Both `GoalsListScreen` and `GoalDetailScreen` should extract these shared components:

```
components/goals/
├── GoalCard.tsx            # Card used in list (progress ring, milestones, contribute)
├── GoalCardSkeleton.tsx    # Loading skeleton
├── GoalEmptyState.tsx      # Empty state with suggested goals
├── ProgressRing.tsx        # Animated SVG-like ring (shared, single source)
├── GoalProgressBar.tsx     # Linear progress bar variant
├── MilestoneTimeline.tsx   # Vertical milestone timeline
├── QuickContributeSheet.tsx # Bottom sheet for quick contribution
├── ContributionChips.tsx   # Amount suggestion chips
├── GoalCelebration.tsx     # Milestone/goal completion overlay
└── goalConfig.ts           # GOAL_CONFIGS, fmt, daysRemaining, helpers (single source)
```

---

## 9. Premium Gating

| Feature | Free | Premium |
|:--------|:----:|:-------:|
| 5 active goals | ✅ | ✅ |
| Goal templates (8 types) | ✅ | ✅ |
| Progress rings | ✅ | ✅ |
| Milestones | ✅ | ✅ |
| Quick contribute | ✅ | ✅ |
| **AI goal forecast** | ❌ | ✅ |
| **Goal rebalance suggestions** | ❌ | ✅ |
| **Unlimited goals** | 5 | Unlimited |
| **Shared couple goals** | ❌ | ✅ |
| **Goal completion celebration** | ❌ | ✅ |
| **Monthly auto-contribute** | ❌ | ✅ |

---

## 10. Refactoring Plan

The biggest code quality issue is massive duplication between GoalsListScreen (1086 lines) and GoalDetailScreen (1307 lines).

### Step 1: Extract shared config
- Create `components/goals/goalConfig.ts`
- Move: `GOAL_CONFIGS`, `fmt`, `daysRemaining`, `getMotivationalTagline`, `getGoalConfig`

### Step 2: Extract shared components
- Create `components/goals/ProgressRing.tsx` (merge both versions, keep the better animation params)
- Create `components/goals/GoalCard.tsx`
- Create `components/goals/QuickContributeSheet.tsx`
- Create `components/goals/GoalCelebration.tsx`

### Step 3: Simplify screens
- GoalsListScreen: use GoalCard, GoalCardSkeleton, GoalEmptyState
- GoalDetailScreen: use ProgressRing, MilestoneTimeline, QuickContributeSheet

### Step 4: Add missing features
- Goal rebalance suggestions (API exists: `GET /ai/goals/rebalance`)
- Contribution streak tracking
- Celebration overlay on milestone achievement

---

## 11. Implementation Checklist

- [ ] Extract shared goal config to `components/goals/goalConfig.ts`
- [ ] Extract `ProgressRing` to shared component
- [ ] Extract `QuickContributeSheet` to shared component
- [ ] Build `GoalCelebration` overlay component
- [ ] Add goal templates with emoji + tagline
- [ ] Add milestone timeline to GoalDetailScreen
- [ ] Add contribution streak to GoalCard
- [ ] Add AI forecast to GoalDetailScreen
- [ ] Add goal rebalance suggestions
- [ ] Add celebration on milestone / completion
- [ ] Add Premium upsell for AI features
