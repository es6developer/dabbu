# Phase 13 — Onboarding Rebuild

## 1. Product Overview

### Current State
- Single `OnboardingScreen` (256 lines) with 4 generic slides
- After onboarding: `ProfileSetupScreen` (name, phone, photo)
- No user-type branching
- Same experience for single users, couples, and families

### Target State
- **Dynamic onboarding** based on user type selection
- 4 user types: **Single** · **Married** · **Family** · **Friends Sharing**
- Each type gets tailored questions, suggestions, and initial state
- "First-run experience" sets up the right default screens

---

## 2. User Type Selection Screen

```
┌──────────────────────────────────────────┐
│                                          │
│            Welcome to Dabbu              │
│                                          │
│     India's Family Finance App           │
│                                          │
│  ┌──────────────────────┐               │
│  │  👤                   │               │
│  │  Single               │               │
│  │  Track personal       │               │
│  │  finances             │               │
│  └──────────────────────┘               │
│                                          │
│  ┌──────────────────────┐               │
│  │  💑                   │               │
│  │  Married              │               │
│  │  Manage together      │               │
│  └──────────────────────┘               │
│                                          │
│  ┌──────────────────────┐               │
│  │  👨‍👩‍👧‍👦                 │               │
│  │  Family               │               │
│  │  Household finances   │               │
│  └──────────────────────┘               │
│                                          │
│  ┌──────────────────────┐               │
│  │  🤝                   │               │
│  │  Friends              │               │
│  │  Split expenses       │               │
│  └──────────────────────┘               │
│                                          │
│  [Get Started]                          │
└──────────────────────────────────────────┘
```

---

## 3. Dynamic Flows by User Type

### Single Flow
```
Select: Single
→ Slide 1: "Track your spending"
  💳 Connect bank account or add manually
→ Slide 2: "Set your first goal"
  🏠 🚗 ✈️ 🎓 (pick a template)
→ Slide 3: "Know your score"
  📊 See your financial health score
→ Done → HomeScreen (personal dashboard)
  Default state: Personal finance mode
  Tab bar: Home · Wallet · + · Family (hidden) · Profile
```

### Married Flow
```
Select: Married
→ Slide 1: "Manage together"
  💑 Invite your partner (phone number or share code)
→ Slide 2: "Track shared expenses"
  💳 Set up your first shared category
→ Slide 3: "Shared goals"
  🏠 ✈️ 💍 (pick a couple goal template)
→ Slide 4: "Combined view"
  📊 See your couple dashboard
→ Done → CoupleDashboard (in Family tab)
  Default state: Couple mode enabled
  Tab bar: Home · Wallet · + · Family · Profile
  Couple theme (rose) activated
```

### Family Flow
```
Select: Family
→ Slide 1: "Welcome the family"
  👨‍👩‍👧‍👦 Create family hub (name + members)
→ Slide 2: "Household bills"
  🏠 Add rent, electricity, groceries as shared
→ Slide 3: "Family goals"
  🏠 🚗 🎓 (pick a family goal)
→ Slide 4: "Family dashboard"
  📊 See combined family view
→ Done → FamilyHubScreen
  Default state: Family mode
  Tab bar: Home · Wallet · + · Family · Profile
```

### Friends Flow
```
Select: Friends
→ Slide 1: "Split easily"
  🤝 Create a group (name + invite friends)
→ Slide 2: "First expense"
  💳 Split your first expense (trip, dinner, etc.)
→ Slide 3: "Settle up"
  🤝 See how settlement works
→ Done → FamilyHubScreen (friends filter)
  Default state: Friends sharing mode
  Tab bar: Home · Wallet · + · Family · Profile
```

---

## 4. Brand Slides (shown before type selection, first-time only)

### Slide 1 — "One App for All"
```
┌──────────────────────────────────────┐
│                                      │
│          🏠 💑 👨‍👩‍👧‍👦 🤝           │
│                                      │
│    Personal · Couple · Family        │
│                                      │
│    One app for every relationship    │
│    with your money.                  │
│                                      │
│    Swipe to learn more →             │
└──────────────────────────────────────┘
```

### Slide 2 — "Smart AI"
```
┌──────────────────────────────────────┐
│                                      │
│              🤖                       │
│                                      │
│    Your financial co-pilot           │
│                                      │
│    AI-powered insights, savings      │
│    tips, and goal coaching.          │
│                                      │
│    Swipe to learn more →             │
└──────────────────────────────────────┘
```

### Slide 3 — "Safety First"
```
┌──────────────────────────────────────┐
│                                      │
│              🔒                       │
│                                      │
│    Bank-grade security               │
│                                      │
│    Biometric lock, encrypted data,   │
│    and complete privacy control.     │
│                                      │
│    Swipe to learn more →             │
└──────────────────────────────────────┘
```

---

## 5. Onboarding Screen Flow

```
App Launch → SplashScreen
  → hasSeenOnboarding?
    → No → OnboardingScreen
      → Brand Slides (3 slides)
        → User Type Selection (4 types)
          → Dynamic Slides (2-4 per type)
            → ProfileSetup (name, phone, photo)
              → Set hasSeenOnboarding = true
                → Auth flow (signup / login)
                  → HomeScreen (type-appropriate dashboard)
    → Yes → Auth flow (check session)
      → Valid → HomeScreen
      → Invalid → LoginScreen
```

---

## 6. Profile Setup (After Onboarding)

### Screen Content
```
┌──────────────────────────────────────────┐
│                                          │
│         Set Up Your Profile              │
│                                          │
│  [Avatar Picker]                        │
│       👤                                 │
│                                          │
│  Full Name                               │
│  [________________________]              │
│                                          │
│  Phone Number                            │
│  [+91 ___ ___ ____]                      │
│                                          │
│  (Based on your selection as "Single")   │
│  we'll set up your personal dashboard.   │
│                                          │
│  [Continue →]                            │
│                                          │
│  ┌────────────────────────┐             │
│  │ We'll send an OTP to   │             │
│  │ verify your number.    │             │
│  └────────────────────────┘             │
└──────────────────────────────────────────┘
```

---

## 7. API Contracts

### `POST /auth/register`

```
Body:
{
  name: string,
  phone: string,
  userType: 'single' | 'married' | 'family' | 'friends',
  partnerPhone?: string,          // if married
  familyName?: string,            // if family
  photo?: string,                 // base64 or URL
}

Response:
{
  data: {
    userId: string,
    accessToken: string,
    refreshToken: string,
    setup: {
      coupleInviteSent?: boolean,
      familyId?: string,
      suggestedFirstActions: string[],
    },
  }
}
```

### `POST /auth/onboarding-complete`

```
Body:
{
  userType: 'single' | 'married' | 'family' | 'friends',
  selectedGoalTemplate?: string,   // goal emoji key
}

Response:
{
  data: {
    message: string,
    redirectTo: string,            // screen name
  }
}
```

---

## 8. Database Changes

The `User` model already has:
```
userType    String?   @default("single")   // single | married | family | friends
```

No schema changes needed. The `userType` field should be set during onboarding.

---

## 9. First-Run Experience (Post-Onboarding)

### Single User — First Home Screen
- Sample net worth card with guidance
- "Add your first transaction" CTA
- Suggested goal template
- Empty state with friendly messaging

### Married User — First Home Screen
- "Invite partner" CTA prominently
- Sample couple dashboard preview
- Suggested shared goal
- "Split your first expense" CTA

### Family User — First Home Screen
- "Add family members" CTA
- Suggested household bill setup
- Family goal template
- "Create family hub" CTA

### Friends User — First Home Screen
- "Create a group" CTA
- "Split your first expense" CTA
- Sample trip/friend group template

---

## 10. Premium Onboarding Upsells

| Point in Flow | Upsell |
|:--------------|:-------|
| After user type selection | "Start with 7-day free trial of Premium" |
| After goal selection | "Unlock unlimited goals with Premium" |
| After partner invite | "Get AI couple insights with Premium" |
| During profile setup | "Premium gives you advanced analytics" |

---

## 11. Implementation Checklist

- [ ] Add user type selection screen to onboarding flow
- [ ] Add dynamic slides per user type
- [ ] Set `userType` on User model during registration
- [ ] Wire user type to tab bar defaults (couple mode toggle, family hub visibility)
- [ ] Add first-run experience (personalized empty states + CTAs)
- [ ] Add premium upsell during onboarding
- [ ] Update `OnboardingScreen` to handle dynamic content
- [ ] Test all 4 user type flows end-to-end
- [ ] Handle partner invite during married flow
- [ ] Add "skip for now" to all optional onboarding steps
