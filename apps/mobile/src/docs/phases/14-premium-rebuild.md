# Phase 14 — Premium Rebuild

## 1. Pricing Strategy

### Current State
- Single premium plan (₹199/mo or ₹1,999/yr)
- Limited differentiation in feature set
- No family plan
- No free trial

### Target State — 3 Tiers + Free

| Feature | Free | Premium | Family Plan |
|:--------|:----:|:-------:|:-----------:|
| **Price** | ₹0 | ₹199/mo · ₹1,999/yr | ₹299/mo · ₹2,999/yr |
| **Accounts** | 1 | 1 | Up to 5 |
| **Family Hubs** | 1 | 5 | Unlimited |
| **Goals** | 5 | Unlimited | Unlimited |
| **AI Chat** | 10/mo | Unlimited | Unlimited |
| **AI Insights** | Basic | Advanced | Advanced |
| **Net Worth** | ✅ | ✅ | ✅ |
| **Health Score** | ✅ | ✅ | ✅ |
| **Emergency Fund** | ✅ | ✅ | ✅ |
| **Historical Charts** | ❌ | ✅ | ✅ |
| **Financial Reports (PDF)** | 3/mo | Unlimited | Unlimited |
| **Tax Report** | ❌ | ✅ | ✅ |
| **Data Export (CSV)** | ❌ | ✅ | ✅ |
| **Couple AI Insights** | ❌ | ✅ | ✅ |
| **Priority Support** | ❌ | ✅ | ✅ |
| **Family Plan (5 users)** | ❌ | ❌ | ✅ |
| **7-day free trial** | ✅ | ✅ | ✅ |

---

## 2. Premium Benefits (Value Props)

### Core Benefits (visible everywhere)
1. **Unlimited AI Chat** — "Ask Dabbu anything about your money"
2. **Advanced Insights** — "AI-powered spending analysis"
3. **Unlimited Goals** — "Save for everything that matters"
4. **Financial Reports** — "Export professional PDF reports"
5. **Historical Charts** — "See your financial journey over time"
6. **Priority Support** — "Get help within 2 hours"

### Family Plan Additions
7. **5 Family Members** — "Whole family on one plan"
8. **Shared Premium** — "Everyone gets premium features"
9. **Combined Dashboard** — "See everyone's finances together"
10. **Family AI Insights** — "AI-powered family financial health"

---

## 3. Upsell Locations

| Screen | Upsell Type | Trigger |
|:-------|:------------|:--------|
| **HomeScreen** | Banner | When user has been active 7+ days |
| **GoalsListScreen** | Banner | When user has 5+ goals (free limit) |
| **DabbuAI** | Paywall | When user tries AI chat after 10 messages |
| **DabbuAI Insights** | Blur overlay | When tapping premium insight card |
| **NetWorthScreen** | Banner | When tapping historical chart |
| **HealthScoreScreen** | Banner | When tapping improvement tips |
| **FinancialCenter** | Lock icon | When tapping premium-only report |
| **EmergencyFundScreen** | Banner | When tapping AI suggestion |
| **Couple Dashboard** | Blur overlay | AI couple insights (free: blurred) |
| **Family Hub** | Banner | When creating 2nd family hub |
| **Profile** | Card | "Go Premium" badge in settings |
| **Splash Screen** | Modal | After 3rd app open (7-day trial offer) |

---

## 4. Conversion Flows

### Flow A: AI Chat Limit Hit
```
User sends 10th AI message
  → DabbuAI shows: "You've used all 10 free AI chats"
    → [Upgrade to Premium] [Dismiss]
      → Upgrade → PremiumScreen → Subscribe → Success → Unlimited AI
      → Dismiss → Chat disabled, "Upgrade" badge on tab
```

### Flow B: Goal Limit Hit
```
User tries to create 6th goal
  → CreateGoalModal shows: "Free plan: 5 goal limit"
    → "Upgrade to create unlimited goals"
    → [Upgrade] → PremiumScreen
    → [Back] → Goal stays in "draft" state
```

### Flow C: Report Download
```
User taps "Download PDF" on Tax Report
  → Premium paywall bottom sheet
    → "Tax reports are a Premium feature"
    → [Try Premium Free] [Upgrade] [Cancel]
```

### Flow D: 7-Day Trial Offer
```
After 3rd app open (non-premium user)
  → Bottom sheet: "Try Premium free for 7 days"
    → Features grid: AI Chat, Reports, Charts, Goals
    → [Start Free Trial] → PremiumScreen → Subscribe
    → [Maybe Later] → Dismiss, shows again in 7 days
```

### Flow E: Family Plan Conversion
```
Existing Premium user creating 2nd Family Hub
  → "Family Hub limit reached (1)"
    → "Upgrade to Family Plan for unlimited hubs"
    → [Upgrade to Family Plan] → PremiumScreen → Switch plan
```

---

## 5. UI Design — PremiumScreen

```
┌──────────────────────────────────────────┐
│ ← Profile              Dabbu Premium     │
├──────────────────────────────────────────┤
│                                          │
│  ┌── Hero ────────────────────────────┐  │
│  │  👑                                 │  │
│  │  Unlock the full Dabbu experience   │  │
│  │                                      │  │
│  │  [7-Day Free Trial]                 │  │
│  │  Cancel anytime                     │  │
│  └──────────────────────────────────────┘  │
│                                          │
│ ─── Plans ───                            │
│                                          │
│ ┌── Premium ──── Popular ────────────┐   │
│ │  ₹199 / month                       │   │
│ │  ₹1,999 / year  (save 16%)         │   │
│ │                                      │   │
│ │  ✅ Unlimited AI Chat               │   │
│ │  ✅ Advanced Insights               │   │
│ │  ✅ Unlimited Goals                  │   │
│ │  ✅ Financial Reports               │   │
│ │  ✅ Historical Charts                │   │
│ │  ✅ Priority Support                 │   │
│ │                                      │   │
│ │  [Subscribe Monthly] [Subscribe Yearly]│
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── Family Plan ───────────────────────┐  │
│ │  ₹299 / month                        │   │
│ │  ₹2,999 / year  (save 16%)          │   │
│ │                                      │   │
│ │  Everything in Premium, plus:        │   │
│ │  ✅ Up to 5 family members           │   │
│ │  ✅ Unlimited Family Hubs            │   │
│ │  ✅ Family dashboard                 │   │
│ │  ✅ Shared premium features          │   │
│ │                                      │   │
│ │  [Subscribe Monthly] [Subscribe Yearly]│
│ └──────────────────────────────────────┘  │
│                                          │
│ ─── Feature Comparison ───              │
│                                          │
│ | Feature          | Free | Premium | Family |
│ |:-----------------|:----:|:-------:|:-----:|
│ | AI Chat          | 10/mo | ✅ | ✅ |
│ | Goals            | 5 | ♾️ | ♾️ |
│ | Family Hubs      | 1 | 5 | ♾️ |
│ | Reports          | 3/mo | ♾️ | ♾️ |
│ | Charts           | ❌ | ✅ | ✅ |
│ | Support          | Basic | Priority | Priority |
│ | Members          | 1 | 1 | 5 |
│                                          │
│ ─── What Users Say ───                  │
│  "⭐ Dabbu Premium saved us ₹45K/year"  │
│  "⭐ The AI insights are eye-opening"   │
└──────────────────────────────────────────┘
```

---

## 6. Subscription Management (SubscriptionCenterScreen)

### Active Premium User
```
┌──────────────────────────────────────────┐
│ ← Profile          Subscription Center   │
├──────────────────────────────────────────┤
│                                          │
│ ┌── Current Plan ─────────────────────┐  │
│  │  👑 Premium                        │   │
│  │  ₹199/month · Renews Dec 15, 2024 │   │
│  │  [Cancel Subscription]             │   │
│  └──────────────────────────────────────┘  │
│                                          │
│ ┌── Usage ────────────────────────────┐   │
│  │  AI Chat:      12/∞ messages       │   │
│  │  Goals:        8/∞ goals           │   │
│  │  Family Hubs:  2/5 active          │   │
│  │  Reports:      5/∞ this month      │   │
│  └──────────────────────────────────────┘  │
│                                          │
│ ┌── Features ─────────────────────────┐   │
│  │  ✅ AI Chat (Unlimited)            │   │
│  │  ✅ Advanced Insights              │   │
│  │  ✅ Unlimited Goals                 │   │
│  │  ...                               │   │
│  └──────────────────────────────────────┘  │
│                                          │
│ ┌── Billing History ──────────────────┐   │
│  │  📄 Dec 15, 2024   ₹199  Paid     │   │
│  │  📄 Nov 15, 2024   ₹199  Paid     │   │
│  │  📄 Oct 15, 2024   ₹199  Paid     │   │
│  └──────────────────────────────────────┘  │
│                                          │
│  [Change Plan] [Cancel Subscription]    │
└──────────────────────────────────────────┘
```

### Cancellation Flow
```
Tap "Cancel Subscription"
  → Confirmation dialog: "Are you sure?"
    → Reason selection: [Too expensive] [Not using] [Missing feature] [Other]
      → Recovery offer:
        "How about 1 month free? Stay on Premium at no cost."
        → [Accept] → Free month, stays active
        → [No, cancel] → Subscription ends at billing period
          → "You'll lose access to: AI Chat, Reports, Charts..."
            → [Keep Premium] [Confirm Cancel]
              → Downgraded to Free
```

---

## 7. PremiumGuard Component

```typescript
// components/premium/PremiumGuard.tsx
interface PremiumGuardProps {
  feature: string;                          // entitlement key
  children: React.ReactNode;               // premium content
  fallback?: React.ReactNode;              // locked state (default: blur + upgrade CTA)
}

// Usage:
<PremiumGuard feature="ai_chat_unlimited">
  <AIChatInterface />
</PremiumGuard>
```

### Entitlement Keys

| Key | Description | Free Limit |
|:----|:------------|:----------:|
| `ai_chat_unlimited` | Unlimited AI chat messages | 10/month |
| `ai_insights_advanced` | Detailed AI insights | Basic only (3/month) |
| `goals_unlimited` | Unlimited goals | 5 goals |
| `family_hubs` | Number of family hubs | 1 hub |
| `reports_unlimited` | Unlimited PDF exports | 3/month |
| `historical_charts` | Historical financial charts | ❌ |
| `data_export_csv` | CSV data export | ❌ |
| `tax_report` | Tax report generation | ❌ |
| `couple_ai_insights` | Couple AI insights | ❌ |
| `priority_support` | Priority customer support | ❌ |

---

## 8. Database Models (Already Exist)

```prisma
model SubscriptionPlan {
  id          String   @id
  name        String                    // "premium_monthly" | "premium_yearly" | "family_monthly" | "family_yearly"
  displayName String                   // "Premium Monthly" | "Premium Yearly"
  price       Float
  currency    String   @default("INR")
  interval    String                    // "month" | "year"
  tier        String                    // "premium" | "family"
  active      Boolean  @default(true)
}

model Subscription {
  id              String   @id @default(cuid())
  userId          String   @unique
  planId          String
  status          String                  // "active" | "cancelled" | "expired" | "trialing"
  currentPeriodStart DateTime
  currentPeriodEnd DateTime
  trialEnd        DateTime?
  cancelledAt     DateTime?
  createdAt       DateTime @default(now())
  user            User     @relation(fields: [userId], references: [id])
  plan            SubscriptionPlan @relation(fields: [planId], references: [id])
}

model PremiumEntitlement {
  id          String   @id @default(cuid())
  userId      String
  key         String                    // entitlement key
  value       String                    // "true" | "5" | "unlimited"
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
}
```

---

## 9. Premium Analytics Tracking

```typescript
// Events to track
analytics.track('premium:screen_viewed', { source: 'dabbu_ai_paywall' });
analytics.track('premium:trial_started', { plan: 'premium_yearly' });
analytics.track('premium:subscribed', { plan: 'family_monthly', amount: 299 });
analytics.track('premium:paywall_shown', { screen: 'goals_list', limit: 'goals_5' });
analytics.track('premium:paywall_dismissed', { screen: 'goals_list' });
analytics.track('premium:cancellation_started', { reason: 'too_expensive' });
analytics.track('premium:cancellation_recovered', { offer: 'free_month' });
analytics.track('premium:cancellation_completed', { reason: 'not_using' });
```

### Conversion Funnel
```
1. User sees upsell (banner/paywall/blur) → impression
2. User taps upsell → interest
3. User views PremiumScreen → consideration
4. User taps subscribe → intent
5. User completes payment → conversion
6. User activates premium → activation
7. User uses premium feature → engagement
```

---

## 10. Implementation Checklist

- [ ] Refine pricing tiers (Free / Premium / Family Plan)
- [ ] Update PremiumScreen with comparison table + hero
- [ ] Update SubscriptionCenterScreen with usage + billing
- [ ] Add PremiumGuard component for entitlement gating
- [ ] Add upsell banners to all key screens (Goals, AI, Net Worth, etc.)
- [ ] Add 7-day free trial flow
- [ ] Add cancellation flow with recovery offer
- [ ] Add Family Plan subscription option
- [ ] Add premium analytics tracking
- [ ] Add push notification for trial ending (3 days before)
- [ ] Add "popular" badge on yearly plan
- [ ] Add savings badge on yearly vs monthly comparison
