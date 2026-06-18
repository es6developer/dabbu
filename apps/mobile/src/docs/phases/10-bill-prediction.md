# Phase 10 — Bill Prediction

## 1. Product Overview

### What
AI-powered bill prediction that forecasts next month's bill amounts for recurring expenses (electricity, internet, mobile, rent, subscriptions, etc.).

### Why
- Reduces bill shock ("I didn't expect ₹4,500 electricity bill")
- Helps users budget more accurately
- Creates "savings opportunities" (switch plans, reduce usage)
- Drives engagement through proactive notifications

---

## 2. Prediction Algorithm

### Data Sources
- Historical bill payments (last 12 months for each bill)
- Seasonality adjustments (summer → higher electricity)
- Trend detection (increasing/decreasing over time)
- User corrections (user adjusts predicted amount → model learns)

### Formula
```
PredictedAmount = BaseAmount × SeasonalityFactor × TrendFactor

Where:
  BaseAmount = median of last 3 months
  SeasonalityFactor = month_with_highest_avg / yearly_avg (for weather-sensitive bills)
  TrendFactor = avg_change_per_month (for subscription bills)
```

### Algorithm (rule-based, no ML API needed)

```typescript
// Backend: forecast module
function predictNextAmount(billHistory: BillRecord[]): Prediction {
  if (billHistory.length === 0) return { predicted: null, confidence: 0 };

  const last3Months = billHistory.slice(-3);
  const medianAmount = median(last3Months.map(b => b.amount));

  // Seasonality: compare this month's historical avg to yearly avg
  const thisMonth = new Date().getMonth();
  const sameMonthBills = billHistory.filter(b =>
    new Date(b.date).getMonth() === thisMonth
  );
  const seasonalFactor = sameMonthBills.length > 0
    ? avg(sameMonthBills.map(b => b.amount)) / medianAmount
    : 1.0;

  // Trend: average month-over-month change (last 6 months)
  const recent6Months = billHistory.slice(-6);
  let trendFactor = 1.0;
  if (recent6Months.length >= 2) {
    const changes = [];
    for (let i = 1; i < recent6Months.length; i++) {
      changes.push(
        (recent6Months[i].amount - recent6Months[i - 1].amount)
        / recent6Months[i - 1].amount
      );
    }
    trendFactor = 1 + avg(changes);
  }

  const predicted = Math.round(medianAmount * seasonalFactor * trendFactor);
  const confidence = Math.min(billHistory.length / 12, 1) * 100;

  return {
    predicted,
    confidence: Math.round(confidence),
    range: {
      low: Math.round(predicted * 0.85),
      high: Math.round(predicted * 1.15),
    },
  };
}
```

---

## 3. UI Design — DabbuAI Savings Tab

```
┌──────────────────────────────────────────┐
│ ← Dabbu AI     Insights | Savings | ...  │
├──────────────────────────────────────────┤
│                                          │
│ ┌── Bill Predictions ────────────────┐   │
│ │                                      │   │
│ │ December Bill Forecast              │   │
│ │                                      │   │
│ │  ⚡ Electricity    ₹1,200  ₹1,150  │   │
│ │                    predicted actual │   │
│ │                    ▲ 4% accuracy    │   │
│ │                                      │   │
│ │  🌐 Internet       ₹899   ₹899     │   │
│ │                    ✓ exact match    │   │
│ │                                      │   │
│ │  📱 Mobile         ₹799   ₹749     │   │
│ │                    ▼ cheaper!       │   │
│ │                                      │   │
│ │  🏠 Rent           ₹18,000 ₹18,000 │   │
│ │                    ✓ exact match    │   │
│ │                                      │   │
│ │  📺 Netflix        ₹649   ₹649     │   │
│ │                    ✓ exact match    │   │
│ │                                      │   │
│ │ [See Full Forecast →]               │   │
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── Savings Opportunities ────────────┐  │
│ │  💡 Switch to ₹499 broadband        │  │
│ │     → Save ₹200/month               │  │
│ │  💡 Downgrade Netflix to Mobile      │  │
│ │     → Save ₹250/month               │  │
│ └──────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### Bill Detail View

```
┌──────────────────────────────────────────┐
│ ← Bills              Electricity Bill    │
├──────────────────────────────────────────┤
│                                          │
│  ⚡ Electricity Department               │
│  Account: 1234 5678 9012                │
│                                          │
│ ┌── Prediction ───────────────────────┐  │
│ │  This Month                        │  │
│ │  ₹1,250  predicted                  │  │
│ │  Range: ₹1,060 – ₹1,440            │  │
│ │  Confidence: 85%                    │  │
│ │  Based on last 8 months             │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ ┌── History ──────────────────────────┐  │
│ │  🗓️ Nov  ₹1,150                    │  │
│ │  🗓️ Oct  ₹980                      │  │
│ │  🗓️ Sep  ₹1,200                    │  │
│ │  🗓️ Aug  ₹1,100                    │  │
│ │  🗓️ Jul  ₹890    (low usage)       │  │
│ │  [Line Chart]                       │  │
│ └──────────────────────────────────────┘  │
│                                          │
│ 💡 Tip: Electricity is 15% higher in     │
│    summer months. Consider pre-cooling.  │
└──────────────────────────────────────────┘
```

---

## 4. API Contracts

### `GET /forecast/bills`

```
Response:
{
  data: [{
    billId: string,
    name: string,                  // "Electricity"
    icon: string,                  // "flash-outline"
    predictedAmount: number,
    actualAmount: number | null,   // if current month bill exists
    confidence: number,            // 0-100
    range: {
      low: number,
      high: number,
    },
    trend: 'up' | 'down' | 'stable',
    history: [{
      date: string,
      amount: number,
      isPredicted: boolean,
    }],
    savingsOpportunities: [{
      title: string,              // "Switch to ₹499 plan"
      potentialSavings: number,
      effort: 'easy' | 'medium' | 'hard',
    }],
  }]
}
```

### `GET /forecast/bills/:id`

```
Response:
{
  data: {
    bill: { id, name, icon, accountNumber },
    prediction: {
      predictedAmount: number,
      confidence: number,
      range: { low, high },
      dataPoints: number,         // months of history used
    },
    history: [{ date, amount, isPredicted }],
    tips: string[],
  }
}
```

### `GET /forecast/monthly`

```
Response:
{
  data: {
    totalPredicted: number,
    totalActual: number | null,
    bills: [{
      name, predictedAmount, actualAmount, confidence, trend,
    }],
    month: string,                // "December 2024"
  }
}
```

---

## 5. Database Models (Already Exist)

```prisma
model AiPrediction {
  id            String   @id @default(cuid())
  userId        String
  category      String   // "bill" | "income" | "expense"
  targetId      String?  // billId, goalId, etc.
  predictedValue Float
  confidence    Float
  rangeLow      Float?
  rangeHigh     Float?
  actualValue   Float?
  createdAt     DateTime @default(now())
  user          User     @relation(fields: [userId], references: [id])
}
```

---

## 6. Push Notifications

### Prediction Ready (beginning of month)
```
Dabbu: Your December bills are predicted 💰
⚡ Electricity: ₹1,200
🌐 Internet: ₹899
📱 Mobile: ₹799
Total predicted: ₹2,898
[View Forecast]
```

### Bill Higher Than Predicted
```
Dabbu: Your electricity bill arrived ₹150 higher than predicted ⚡
Predicted: ₹1,200 | Actual: ₹1,350
[View Bill]
```

### Savings Opportunity
```
Dabbu: Switch to ₹499 broadband plan and save ₹200/month 💡
Your current: ₹699 | Suggested: ₹499
[View Opportunity]
```

---

## 7. Where It Appears

| Screen | Element | Data Source |
|:-------|:--------|:------------|
| **HomeScreen** | Upcoming Bills section | `GET /bills` |
| **DabbuAI Savings tab** | Bill predictions list | `GET /forecast/bills` |
| **Bill Detail** | Prediction card | `GET /forecast/bills/:id` |
| **BillsListScreen** | Predicted amount badge | `GET /bills` (augmented) |
| **FinancialCenter** | Cash flow forecast | `GET /forecast/monthly` |

---

## 8. Premium Gating

| Feature | Free | Premium |
|:--------|:----:|:-------:|
| Current month prediction | ✅ | ✅ |
| Confidence indicator | ✅ | ✅ |
| **Historical trend chart** | ❌ | ✅ |
| **Savings opportunities** | ❌ | ✅ |
| **Push notifications** | ❌ | ✅ |
| **12-month forecast** | ❌ | ✅ |
| **Category breakdown** | ❌ | ✅ |

---

## 9. Implementation Checklist

- [ ] Implement prediction algorithm in backend forecast module
- [ ] Add `GET /forecast/bills` endpoint
- [ ] Add `GET /forecast/bills/:id` endpoint (detail + history)
- [ ] Add `GET /forecast/monthly` endpoint (aggregate)
- [ ] Add bill predictions to DabbuAI Savings tab
- [ ] Add prediction card to Bill Detail screen
- [ ] Add predicted amount badges to BillsListScreen
- [ ] Add savings opportunities (bill switch suggestions)
- [ ] Wire push notifications for prediction alerts
- [ ] Add Premium gating for history + opportunities
