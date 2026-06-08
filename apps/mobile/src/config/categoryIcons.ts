import { Ionicons } from '@expo/vector-icons';

type IonIconName = keyof typeof Ionicons.glyphMap;

export const EXPENSE_CATEGORIES: { name: string; icon: IonIconName; color: string }[] = [
  { name: 'Housing', icon: 'home-outline', color: '#FB923C' },
  { name: 'Groceries', icon: 'cart-outline', color: '#34C759' },
  { name: 'Food & Dining', icon: 'fast-food-outline', color: '#FF6B6B' },
  { name: 'Utilities', icon: 'flash-outline', color: '#FBBF24' },
  { name: 'Transportation', icon: 'car-outline', color: '#38BDF8' },
  { name: 'Healthcare', icon: 'medkit-outline', color: '#FF4D4F' },
  { name: 'Shopping', icon: 'bag-outline', color: '#F472B6' },
  { name: 'Entertainment', icon: 'film-outline', color: '#14B8A6' },
  { name: 'Travel', icon: 'airplane-outline', color: '#60A5FA' },
  { name: 'Children & Baby', icon: 'happy-outline', color: '#FF9F0A' },
  { name: 'Financial', icon: 'shield-outline', color: '#00CEC9' },
  { name: 'Other', icon: 'ellipsis-horizontal-outline', color: '#636E72' },
];

export const INCOME_CATEGORIES: { name: string; icon: IonIconName; color: string }[] = [
  { name: 'Employment', icon: 'briefcase-outline', color: '#00B894' },
  { name: 'Business', icon: 'storefront-outline', color: '#14B8A6' },
  { name: 'Freelancing', icon: 'laptop-outline', color: '#3498DB' },
  { name: 'Investments', icon: 'trending-up-outline', color: '#14B8A6' },
  { name: 'Rental', icon: 'home-outline', color: '#FB923C' },
  { name: 'Gifts & Rewards', icon: 'gift-outline', color: '#F472B6' },
  { name: 'Family Contributions', icon: 'people-outline', color: '#14B8A6' },
  { name: 'Other', icon: 'ellipsis-horizontal-outline', color: '#636E72' },
];

const ALL_ENTRIES: { name: string; icon: string; color: string }[] = [
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
];

export const CATEGORY_ICONS: Record<string, string> = {};
export const CATEGORY_COLORS: Record<string, string> = {};

for (const c of ALL_ENTRIES) {
  CATEGORY_ICONS[c.name] = c.icon;
  CATEGORY_COLORS[c.name] = c.color;
}

// Legacy aliases for backward compatibility with existing transaction data
const LEGACY_ALIASES: [string, string, string][] = [
  ['Food', 'fast-food-outline', '#FF6B6B'],
  ['Grocery', 'basket-outline', '#00CEC9'],
  ['Dining', 'restaurant-outline', '#FDCB6E'],
  ['Transport', 'car-outline', '#38BDF8'],
  ['Gym', 'fitness-outline', '#14B8A6'],
  ['Fitness', 'fitness-outline', '#14B8A6'],
  ['Water', 'water-outline', '#38BDF8'],
  ['Internet', 'wifi-outline', '#38BDF8'],
  ['Rent', 'home-outline', '#FB923C'],
  ['Home', 'home-outline', '#FB923C'],
  ['Bills', 'receipt-outline', '#F59E0B'],
  ['Bills & Utilities', 'receipt-outline', '#F59E0B'],
  ['Electricity', 'flash-outline', '#FDCB6E'],
  ['Gas', 'flame-outline', '#FF6B6B'],
  ['Phone', 'call-outline', '#00B894'],
  ['Medical', 'medkit-outline', '#FF4D4F'],
  ['Health', 'medkit-outline', '#FF4D4F'],
  ['Health & Medical', 'medkit-outline', '#FF4D4F'],
  ['Education', 'school-outline', '#14B8A6'],
  ['Fuel', 'flame-outline', '#F59E0B'],
  ['EMI', 'card-outline', '#636E72'],
  ['Salary', 'cash-outline', '#00B894'],
  ['Income', 'cash-outline', '#00B894'],
  ['Transfer', 'swap-horizontal-outline', '#B2BEC3'],
  ['Transfers', 'swap-horizontal-outline', '#B2BEC3'],
  ['Subscriptions', 'repeat-outline', '#14B8A6'],
  ['Subscription', 'repeat-outline', '#14B8A6'],
  ['Insurance', 'shield-outline', '#00CEC9'],
  ['Refunds', 'return-down-back-outline', '#00B894'],
  ['Pets', 'paw-outline', '#FDCB6E'],
  ['Clothing', 'shirt-outline', '#F472B6'],
  ['Other Income', 'cash-outline', '#00B894'],
  ['Other Expenses', 'ellipsis-horizontal-outline', '#636E72'],
  ['Uncategorized', 'receipt-outline', '#636E72'],
];

for (const [name, icon, color] of LEGACY_ALIASES) {
  CATEGORY_ICONS[name] = icon;
  CATEGORY_COLORS[name] = color;
}

export function getCategoryIcon(
  cat: string | null | undefined,
  defaultIcon: string = 'receipt-outline',
): string {
  if (!cat) {
    return defaultIcon;
  }
  const key = Object.keys(CATEGORY_ICONS).find(
    (k) => k.toLowerCase().trim() === cat.toLowerCase().trim(),
  );
  return key ? CATEGORY_ICONS[key] : defaultIcon;
}

export function getCategoryColor(
  cat: string | null | undefined,
  defaultColor: string = '#14B8A6',
): string {
  try {
    if (!cat || typeof cat !== 'string') {
      return defaultColor;
    }
    const key = Object.keys(CATEGORY_COLORS).find(
      (k) => k.toLowerCase().trim() === cat.toLowerCase().trim(),
    );
    return key ? CATEGORY_COLORS[key] : defaultColor;
  } catch {
    return defaultColor;
  }
}
