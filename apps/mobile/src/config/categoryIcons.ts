import { AntDesign } from '@expo/vector-icons';
type IonIconName = string;

export const EXPENSE_CATEGORIES: { name: string; icon: IonIconName; color: string }[] = [
  { name: 'Housing', icon: 'home', color: '#FB923C' },
  { name: 'Groceries', icon: 'shoppingcart', color: '#34C759' },
  { name: 'Food & Dining', icon: 'rest', color: '#FF6B6B' },
  { name: 'Utilities', icon: 'star', color: '#FBBF24' },
  { name: 'Transportation', icon: 'car', color: '#38BDF8' },
  { name: 'Healthcare', icon: 'heart', color: '#FF4D4F' },
  { name: 'Shopping', icon: 'shoppingcart', color: '#F472B6' },
  { name: 'Entertainment', icon: 'playcircleo', color: '#14B8A6' },
  { name: 'Subscription', icon: 'retweet', color: '#7C3AED' },
  { name: 'Sports', icon: 'playcircleo', color: '#22C55E' },
  { name: 'Travel', icon: 'earth', color: '#60A5FA' },
  { name: 'Children & Baby', icon: 'smileo', color: '#FF9F0A' },
  { name: 'Financial', icon: 'Safety', color: '#00CEC9' },
  { name: 'Other', icon: 'ellipsis1', color: '#636E72' },
];

export const INCOME_CATEGORIES: { name: string; icon: IonIconName; color: string }[] = [
  { name: 'Employment', icon: 'solution1', color: '#00B894' },
  { name: 'Business', icon: 'appstore1', color: '#14B8A6' },
  { name: 'Freelancing', icon: 'laptop', color: '#3498DB' },
  { name: 'Investments', icon: 'linechart', color: '#14B8A6' },
  { name: 'Rental', icon: 'home', color: '#FB923C' },
  { name: 'Gifts & Rewards', icon: 'gift', color: '#F472B6' },
  { name: 'Family Contributions', icon: 'team', color: '#14B8A6' },
  { name: 'Other', icon: 'ellipsis1', color: '#636E72' },
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
  ['Food', 'rest', '#FF6B6B'],
  ['Grocery', 'shoppingcart', '#00CEC9'],
  ['Dining', 'rest', '#FDCB6E'],
  ['Transport', 'car', '#38BDF8'],
  ['Gym', 'hearto', '#14B8A6'],
  ['Fitness', 'hearto', '#14B8A6'],
  ['Water', 'enviromento', '#38BDF8'],
  ['Internet', 'wifi', '#38BDF8'],
  ['Rent', 'home', '#FB923C'],
  ['Home', 'home', '#FB923C'],
  ['Bills', 'filetext1', '#F59E0B'],
  ['Bills & Utilities', 'filetext1', '#F59E0B'],
  ['Electricity', 'bulb1', '#FDCB6E'],
  ['Gas', 'rocket1', '#FF6B6B'],
  ['Phone', 'phone', '#00B894'],
  ['Medical', 'heart', '#FF4D4F'],
  ['Health', 'heart', '#FF4D4F'],
  ['Health & Medical', 'heart', '#FF4D4F'],
  ['Education', 'book', '#14B8A6'],
  ['Fuel', 'rocket1', '#F59E0B'],
  ['EMI', 'creditcard', '#636E72'],
  ['Salary', 'wallet', '#00B894'],
  ['Income', 'wallet', '#00B894'],
  ['Transfer', 'swap', '#B2BEC3'],
  ['Transfers', 'swap', '#B2BEC3'],
  ['Subscriptions', 'retweet', '#14B8A6'],
  ['Subscription', 'retweet', '#14B8A6'],
  ['Insurance', 'Safety', '#00CEC9'],
  ['Refunds', 'reload1', '#00B894'],
  ['Sports', 'playcircleo', '#22C55E'],
  ['Sport', 'playcircleo', '#22C55E'],
  ['Pets', 'hearto', '#FDCB6E'],
  ['Clothing', 'skin', '#F472B6'],
  ['Other Income', 'wallet', '#00B894'],
  ['Other Expenses', 'ellipsis1', '#636E72'],
  ['Uncategorized', 'filetext1', '#636E72'],
];

for (const [name, icon, color] of LEGACY_ALIASES) {
  CATEGORY_ICONS[name] = icon;
  CATEGORY_COLORS[name] = color;
}

export function getCategoryIcon(
  cat: string | null | undefined,
  defaultIcon: string = 'filetext1',
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
