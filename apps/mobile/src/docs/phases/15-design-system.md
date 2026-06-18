# Phase 15 — Design System

> Built at `apps/mobile/src/theme/` and `apps/mobile/src/components/ui/`

## 1. Design Tokens

### Spacing (8pt grid)

```typescript
// theme/design.ts
spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 56,
  '7xl': 64,
  '8xl': 80,
}
PADDING = 16  // canonical card padding
```

### Border Radius

| Token | Value | Usage |
|:------|:-----:|:------|
| `sm` | 6 | Small labels, badges |
| `md` | 8 | Form inputs |
| `lg` | 10 | Small cards |
| `xl` | 12 | Standard cards |
| `2xl` | 16 | Cards, modals |
| `3xl` | 20 | Feature cards |
| `4xl` | 24 | Bottom sheets |
| `5xl` | 28 | Hero sections |
| `6xl` | 32 | Large modals |
| `full` | 9999 | Pills, buttons |

### Typography (Apple HIG naming, Inter font)

| Style | Size | Weight | Line Ht | Letter Spacing | Usage |
|:------|:----:|:------:|:-------:|:--------------:|:------|
| `largeTitle` | 34 | Bold | 41 | -0.5 | Screen titles |
| `title1` | 28 | Bold | 34 | -0.3 | Section headers |
| `title2` | 22 | Bold | 28 | -0.2 | Card titles |
| `title3` | 20 | SemiBold | 25 | -0.1 | Subheaders |
| `headline` | 17 | SemiBold | 22 | -0.05 | Body emphasis |
| `body` | 17 | Regular | 22 | -0.05 | Body text |
| `subheadline` | 15 | Regular | 20 | 0 | Captions |
| `caption` | 13 | Regular | 18 | 0 | Labels |
| `caption2` | 11 | Regular | 13 | 0 | Tiny text |
| `balanceAmount` | 40 | Bold | 48 | -2 | Net worth amount |
| `amountLarge` | 56 | Bold | 64 | -3 | Hero amounts |

### Shadows

```typescript
shadows = {
  sm: { shadowColor, shadowOffset: {0, 0.5}, shadowOpacity: 0.02, shadowRadius: 1, elevation: 0.5 },
  md: { shadowColor, shadowOffset: {0, 1}, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  lg: { shadowColor, shadowOffset: {0, 2}, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
}
```

### Colors (4 schemes)

| Scheme | Brand Primary | Background | Text Primary |
|:-------|:------------:|:----------:|:------------:|
| Light | `#7C3AED` (Vibrant Violet) | `#FFFFFF` | `#0F172A` |
| Dark | `#A78BFA` | `#121214` | `#FFFFFF` |
| Couple Light | `#F43F5E` (Rose) | `#FFFFFF` | `#0F172A` |
| Couple Dark | `#FB7185` | `#121214` | `#FFFFFF` |

Full palette: `accent.primary/secondary/tertiary`, `bg.primary/secondary/tertiary/card/elevated/glass`, `text.primary/secondary/tertiary/inverse`, `status.success/warning/error/info` (each with light variants), `border.subtle/default/active`, `chart.{1-4}`.

---

## 2. SF Pro Font

**Current font**: Inter (loaded via `@expo-google-fonts/inter`)

**SF Pro setup** (for iOS-native look):

```json
// package.json
{
  "dependencies": {
    "expo-font": "~12.0.0",
    "expo-google-fonts": "^1.0.0"
  }
}
```

```typescript
// theme/typography.ts
// Load both fonts — SF Pro for iOS, Inter as fallback
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Platform } from 'react-native';

const FONT_FAMILY = Platform.select({
  ios: {
    regular: 'SF Pro Display',
    medium: 'SF Pro Display Medium',
    semiBold: 'SF Pro Display Semibold',
    bold: 'SF Pro Display Bold',
  },
  android: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semiBold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  default: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semiBold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
});
```

Note: SF Pro is a system font on iOS (no download needed). Simply reference it:
```typescript
// iOS automatically has SF Pro; no expo-google-fonts needed
const FONT = Platform.select({
  ios: {
    regular: 'SFProDisplay-Regular',
    medium: 'SFProDisplay-Medium',
    semiBold: 'SFProDisplay-Semibold',
    bold: 'SFProDisplay-Bold',
  },
  android: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semiBold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
});
```

---

## 3. Glassmorphism Component

A reusable `GlassCard` component for transparent/glass surfaces:

```typescript
// components/ui/GlassCard.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../theme';

interface GlassCardProps {
  children: React.ReactNode;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  style?: ViewStyle;
}

export function GlassCard({ children, intensity = 30, tint = 'dark', style }: GlassCardProps) {
  const { isDark } = useTheme();
  const actualTint = tint === 'default' ? (isDark ? 'dark' : 'light') : tint;
  
  return (
    <BlurView intensity={intensity} tint={actualTint} style={[styles.glass, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
});
```

Used in: Tab bar (MainTabNavigator), overlay modals (ConfirmDialog, SettleUpModal), premium feature cards.

---

## 4. Component Library

### AppButton

```typescript
interface AppButtonProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}
// Height: 44 (sm), 50 (md), 56 (lg)
// Border radius: 12 (xl)
// Font: Inter-SemiBold, 15px
```

### AppCard

```typescript
interface AppCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'balance';
  padding?: keyof typeof spacing;
  onPress?: () => void;
  style?: ViewStyle;
}
// Default: bg.card, borderRadius 2xl (16), shadow md
// Balance: bg.card.balance, no shadow
```

### BottomSheet

```typescript
interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: number[]; // e.g., [300, 500]
}
// Implementation: Modal + Animated.View with spring
// Handle bar: 36x4 rounded, centered
// Border radius: 4xl (24) top corners
```

### FormInput

```typescript
interface FormInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  prefix?: string; // "₹"
  error?: string;
  multiline?: boolean;
}
// Border radius: xl (12)
// Background: bg.tertiary
// Label: 12px, uppercase tracking, text.secondary
```

### Chart (FinancialCenterScreen reuse)

```typescript
// Reusable chart wrapper using react-native-chart-kit
interface FinanceChartProps {
  type: 'line' | 'pie' | 'bar';
  data: any;
  height?: number;
  width?: number;
  color?: string;
}
// Width: Screen width - 64 (accounting for card padding)
// Config: theme-aware colors from chartConfig
```

### FAB (QuickActionSheet)

```typescript
// MainTabNavigator.tsx
// Center button between Wallet and Family tabs
// On press: shows QuickActionSheet with 6+ actions
// Actions: Add Expense, Add Income, Create Group, Create Goal, Financial Center, Scan Bill, Net Worth
// Glassmorphism background: BlurView with intensity 80
```

---

## 5. iOS Quality Checklist

- [ ] All screens use `<ScrollView>` with `bounces={true}` for iOS rubber-band
- [ ] SafeAreaInsets respected on all screens (`useSafeAreaInsets()`)
- [ ] KeyboardAvoidingView with `behavior="padding"` on iOS
- [ ] Tab bar uses `BlurView` for glassmorphism
- [ ] Navigation transitions use `iosTransitionOptions` (slide from right)
- [ ] Bottom sheets slide up with spring animation
- [ ] All modals dismiss on backdrop tap
- [ ] Haptic feedback on primary actions (add transaction, contribute)
- [ ] Pull-to-refresh on all list screens
- [ ] Large titles where appropriate (Home, Financial Center)
